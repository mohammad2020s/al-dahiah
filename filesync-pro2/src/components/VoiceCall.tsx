import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone,
  Mic,
  MicOff,
  X,
  Volume2,
  Sparkles,
  Camera,
  CameraOff,
  SwitchCamera,
} from "lucide-react";
import SaltBagCall from "./SaltBagCall";
import { matchPlaceTopic } from "../../server/alQasabKnowledge.ts";

// A burst of salt crystals flying out of a pressed button (pure CSS, see .vc-crystal in index.css)
const SaltBurst = ({ color = "#ffffff", x = "50%", y = "50%" }: { color?: string; x?: string; y?: string }) => (
  <>
    {Array.from({ length: 11 }, (_, i) => {
      const angle = (i / 11) * Math.PI * 2 + ((i * 37) % 10) / 20;
      const dist = 30 + ((i * 53) % 24);
      return (
        <span
          key={i}
          className="vc-crystal"
          style={{
            ["--x" as string]: x,
            ["--y" as string]: y,
            ["--c" as string]: color,
            ["--s" as string]: `${4 + ((i * 7) % 4)}px`,
            ["--dx" as string]: `${Math.cos(angle) * dist}px`,
            ["--dy" as string]: `${Math.sin(angle) * dist}px`,
            ["--rot" as string]: `${(i % 2 ? 1 : -1) * (90 + i * 20)}deg`,
          }}
        />
      );
    })}
  </>
);

interface VoiceCallProps {
  isOpen: boolean;
  onClose: () => void;
  language?: "ar" | "en";
}

// Downsample float audio buffer to 16kHz 16-bit PCM Mono for Gemini Live API
function downsampleTo16k(buffer: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return result;
  }
  const ratio = inputSampleRate / 16000;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const origPos = i * ratio;
    const index = Math.floor(origPos);
    const decimal = origPos - index;
    const s1 = buffer[index] || 0;
    const s2 = index + 1 < buffer.length ? buffer[index + 1] : s1;
    const sample = s1 + (s2 - s1) * decimal;
    const s = Math.max(-1, Math.min(1, sample));
    result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return result;
}

function int16ToBase64(int16Data: Int16Array): string {
  const bytes = new Uint8Array(int16Data.buffer, int16Data.byteOffset, int16Data.byteLength);
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, sub as unknown as number[]);
  }
  return btoa(binary);
}

export const VoiceCall: React.FC<VoiceCallProps> = ({
  isOpen,
  onClose,
  language = "ar",
}) => {
  const isEn = language === "en";
  const [status, setStatus] = useState<"idle" | "connecting" | "listening" | "user_speaking" | "speaking" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const isMutedRef = useRef<boolean>(false);
  const isSessionActiveRef = useRef<boolean>(false);
  const isGeminiSpeakingRef = useRef<boolean>(false);
  const [isGeminiSpeaking, setIsGeminiSpeaking] = useState<boolean>(false);
  const turnCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [outputAudioLevel, setOutputAudioLevel] = useState<number>(0);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const streamRef = useRef<MediaStream | null>(null);

  // Live camera: frames go to Gemini Live as realtimeInput.video so Al-Dahiya can see what the user shows him
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFlippingCamera, setIsFlippingCamera] = useState(false);
  const isCameraOnRef = useRef(false);
  useEffect(() => {
    isCameraOnRef.current = isCameraOn;
  }, [isCameraOn]);

  // Photos of the place being talked about, picked from the live transcription
  type Showcase = { id: string; title: string; images: { src: string; caption: string }[] };
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const showcaseIdRef = useRef<string | null>(null);
  const transcriptRef = useRef("");

  const noteTranscript = useCallback((text: string) => {
    // Keep a short rolling window so an older topic doesn't keep matching
    transcriptRef.current = (transcriptRef.current + " " + text).slice(-160);
    if (isCameraOnRef.current) return;
    const topic = matchPlaceTopic(transcriptRef.current);
    if (!topic?.images?.length || topic.id === showcaseIdRef.current) return;
    showcaseIdRef.current = topic.id;
    setShowcaseIndex(0);
    setShowcase({
      id: topic.id,
      title: isEn ? topic.titleEn : topic.titleAr,
      images: topic.images.map((img) => ({ src: img.src, caption: isEn ? img.captionEn : img.captionAr })),
    });
  }, [isEn]);

  const closeShowcase = useCallback(() => {
    setShowcase(null);
    transcriptRef.current = "";
    // Allow the same place to come back later in the call
    setTimeout(() => {
      showcaseIdRef.current = null;
    }, 0);
  }, []);

  // Slideshow: next photo every 3.5 s; hide after 45 s
  useEffect(() => {
    if (!showcase) return;
    const tick = setInterval(() => setShowcaseIndex((i) => (i + 1) % showcase.images.length), 3500);
    const hide = setTimeout(closeShowcase, 45_000);
    return () => {
      clearInterval(tick);
      clearTimeout(hide);
    };
  }, [showcase, closeShowcase]);

  // Press animations: each counter bump remounts that button's effect so it replays
  const [fx, setFx] = useState<Record<string, number>>({});
  const fire = useCallback((name: string) => setFx((prev) => ({ ...prev, [name]: (prev[name] || 0) + 1 })), []);
  const [ripple, setRipple] = useState({ x: "50%", y: "50%" });
  const [closingVia, setClosingVia] = useState<"end" | "x" | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // Real-time audio volume analyzer for AI speech lip-sync (0.0 to 1.0)
  useEffect(() => {
    let animId: number;
    let dataArray: Uint8Array | null = null;

    const measureVolume = () => {
      const analyser = outputAnalyserRef.current;
      const speaking = status === "speaking" || isGeminiSpeakingRef.current;

      if (analyser && speaking) {
        if (!dataArray || dataArray.length !== analyser.frequencyBinCount) {
          dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(dataArray as any);

        // Analyze speech frequency bins
        let sum = 0;
        const startBin = 2;
        const endBin = Math.min(40, dataArray.length);
        for (let i = startBin; i < endBin; i++) {
          sum += dataArray[i];
        }
        const count = endBin - startBin;
        const avg = sum / (count || 1);
        const normalized = Math.min(1.0, Math.max(0.0, (avg - 14) / 86));
        if (activeSourcesRef.current.size > 0 && normalized > 0.02) {
          setOutputAudioLevel(normalized);
        } else {
          setOutputAudioLevel(0);
        }
      } else {
        setOutputAudioLevel(0);
      }
      animId = requestAnimationFrame(measureVolume);
    };

    animId = requestAnimationFrame(measureVolume);
    return () => cancelAnimationFrame(animId);
  }, [status]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const updateGeminiSpeaking = useCallback((speaking: boolean) => {
    isGeminiSpeakingRef.current = speaking;
    // Mirror into state so the memoji re-renders (and closes its mouth) when speech ends
    setIsGeminiSpeaking(speaking);
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.port.postMessage({
          type: 'setSpeaking',
          value: speaking,
        });
      } catch (err) {
        console.warn("Failed to post speaking state to worklet:", err);
      }
    }
  }, []);

  const stopAllPlayback = useCallback(async () => {
    try {
      activeSourcesRef.current.forEach((source) => {
        try {
          source.onended = null;
          source.stop();
          source.disconnect();
        } catch {}
      });
      activeSourcesRef.current.clear();
    } catch (e) {
      console.warn("Error clearing active sources:", e);
    }

    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== "closed") {
      try {
        await outputAudioCtxRef.current.suspend();
        await outputAudioCtxRef.current.resume();
        nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
      } catch (e) {}
    } else {
      nextStartTimeRef.current = 0;
    }

    if (turnCooldownTimerRef.current) {
      clearTimeout(turnCooldownTimerRef.current);
      turnCooldownTimerRef.current = null;
    }
    updateGeminiSpeaking(false);
  }, [updateGeminiSpeaking]);

  const stopPlayback = useCallback(() => {
    stopAllPlayback();
    try {
      if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== "closed") {
        outputAudioCtxRef.current.close().catch(() => {});
      }
    } catch {}
    outputAudioCtxRef.current = null;
    outputAnalyserRef.current = null;
    setAudioAnalyser(null);
    nextStartTimeRef.current = 0;
  }, [stopAllPlayback]);

  const stopCapture = useCallback(() => {
    try {
      if (workletNodeRef.current) {
        try {
          workletNodeRef.current.port.onmessage = null;
          workletNodeRef.current.disconnect();
        } catch {}
        workletNodeRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        streamRef.current = null;
      }
      if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== "closed") {
        inputAudioCtxRef.current.close().catch(() => {});
        inputAudioCtxRef.current = null;
      }
    } catch (e) {
      console.warn("Error stopping capture:", e);
    }
  }, []);

  // Callback ref: attach the live stream the moment the <video> element mounts
  const attachCameraVideo = useCallback((video: HTMLVideoElement | null) => {
    cameraVideoRef.current = video;
    if (video && cameraStreamRef.current && video.srcObject !== cameraStreamRef.current) {
      video.srcObject = cameraStreamRef.current;
      video.play().catch(() => {});
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraTimerRef.current) {
      clearInterval(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => {
      try { track.stop(); } catch {}
    });
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setIsCameraOn(false);
  }, []);

  const sendCameraFrame = useCallback(() => {
    const video = cameraVideoRef.current;
    const ws = wsRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !ws || ws.readyState !== WebSocket.OPEN) return false;
    // Gemini Live takes ~1 fps of modest JPEGs; 640px on the long side is plenty to recognise a place
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = cameraCanvasRef.current || (cameraCanvasRef.current = document.createElement("canvas"));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
    ws.send(JSON.stringify({ realtimeInput: { video: { mimeType: "image/jpeg", data } } }));
    return true;
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setErrorMessage(isEn ? "Wait for the call to connect, then turn on the camera." : "انتظر لين يتصل الداهية وبعدها شغّل الكاميرا.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      // The <video> mounts with isCameraOn; attachCameraVideo hooks the stream up when it does
      setIsCameraOn(true);
      setErrorMessage(null);

      let askedToLook = false;
      cameraTimerRef.current = setInterval(() => {
        const sent = sendCameraFrame();
        if (sent && !askedToLook) {
          askedToLook = true;
          // Ask once per camera start, right after the first frame, so he describes what he sees without waiting
          wsRef.current?.send(JSON.stringify({
            clientContent: {
              turns: [{
                role: "user",
                parts: [{
                  text: isEn
                    ? "I just turned on my camera. Tell me what you see, and if it's an Al-Qasab landmark, tell me about it."
                    : "شغلت الكاميرا الحين، قل لي وش تشوف قدامي، وإذا هو من معالم القَصَب علّمني عنه.",
                }],
              }],
              turnComplete: true,
            },
          }));
        }
      }, 1000);
    } catch (err) {
      console.warn("Camera access issue:", err);
      stopCamera();
      setErrorMessage(isEn ? "Camera access was denied or is unavailable." : "تعذر تشغيل الكاميرا. تأكد إنك سمحت للموقع يستخدمها.");
    }
  }, [isEn, sendCameraFrame, stopCamera]);

  const toggleCamera = useCallback(() => {
    if (isCameraOn) stopCamera();
    else startCamera(cameraFacing);
  }, [isCameraOn, cameraFacing, startCamera, stopCamera]);

  const flipCamera = useCallback(async () => {
    const next = cameraFacing === "environment" ? "user" : "environment";
    setIsFlippingCamera(true);
    setTimeout(() => setIsFlippingCamera(false), 560);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      // Swap while the card is edge-on, halfway through the flip
      setTimeout(() => {
        cameraStreamRef.current?.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
        cameraStreamRef.current = stream;
        setCameraFacing(next);
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      }, 230);
    } catch (err) {
      console.warn("Camera switch issue:", err);
      setErrorMessage(isEn ? "Couldn't switch camera." : "ما قدرت أبدّل الكاميرا.");
    }
  }, [cameraFacing, isEn]);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const closeWithAnimation = useCallback((via: "end" | "x") => {
    if (closingVia) return;
    fire(via);
    setClosingVia(via);
    setTimeout(() => {
      setClosingVia(null);
      onClose();
    }, prefersReducedMotion() ? 0 : 440);
  }, [closingVia, fire, onClose]);

  const toggleMute = useCallback(() => {
    fire("mic");
    setIsMuted((prev) => !prev);
  }, [fire]);

  const disconnectLive = useCallback(() => {
    isSessionActiveRef.current = false;
    stopCamera();
    stopCapture();
    stopPlayback();
    if (wsRef.current) {
      const socket = wsRef.current;
      wsRef.current = null;
      try {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, "Normal Closure");
        }
      } catch (err) {
        console.warn("Error closing WebSocket:", err);
      }
    }
    setStatus("idle");
    setMicLevel(0);
  }, [stopCamera, stopCapture, stopPlayback]);

  const scheduleAudioChunk = useCallback((base64AudioData: string) => {
    if (!isSessionActiveRef.current) return;
    try {
      if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === "closed") {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        outputAudioCtxRef.current = new AudioCtxClass({ sampleRate: 24000 });
        console.log('Playback sample rate:', outputAudioCtxRef.current.sampleRate);
        nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
      }

      const playbackCtx = outputAudioCtxRef.current;
      if (playbackCtx.state === "suspended") {
        playbackCtx.resume().catch(() => {});
      }

      // CAUSE 3: Correct PCM decoding from base64 to Float32
      const binary = atob(base64AudioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const sampleCount = Math.floor(bytes.length / 2);
      const pcmView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const float32 = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        float32[i] = pcmView.getInt16(i * 2, true) / 32768.0;
      }

      // CAUSE 2: Every buffer created with 24000
      const buffer = playbackCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      if (!outputAnalyserRef.current) {
        const analyser = playbackCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        analyser.connect(playbackCtx.destination);
        outputAnalyserRef.current = analyser;
        setAudioAnalyser(analyser);
      }

      // Direct playback through AnalyserNode into destination for audio reactivity / lip-sync
      const source = playbackCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(outputAnalyserRef.current);

      source.onended = () => {
        activeSourcesRef.current.delete(source);
        try { source.disconnect(); } catch {}
        if (activeSourcesRef.current.size === 0) {
          if (turnCooldownTimerRef.current) {
            clearTimeout(turnCooldownTimerRef.current);
            turnCooldownTimerRef.current = null;
          }
          updateGeminiSpeaking(false);
          setOutputAudioLevel(0);
          setStatus((prev) => (prev === "speaking" ? "listening" : prev));
        }
      };

      activeSourcesRef.current.add(source);

      const currentTime = playbackCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;

      if (turnCooldownTimerRef.current) {
        clearTimeout(turnCooldownTimerRef.current);
        turnCooldownTimerRef.current = null;
      }
      updateGeminiSpeaking(true);
      setStatus((prev) => (prev !== "speaking" ? "speaking" : prev));
    } catch (e) {
      console.warn("Audio scheduling error:", e);
    }
  }, [updateGeminiSpeaking]);

  const startCapture = useCallback(async () => {
    try {
      // 1. إيقاف أي تيار مايكروفون سابق لمنع تعليق المايكروفون (Resource Lock)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
        streamRef.current = null;
      }
      if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== "closed") {
        try { await inputAudioCtxRef.current.close(); } catch {}
        inputAudioCtxRef.current = null;
      }

      // 2. طلب المايكروفون بدون قيود sampleRate إجبارية لمنع خطأ Could not start audio source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!isSessionActiveRef.current) {
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
        return;
      }

      streamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const captureCtx = new AudioCtxClass();
      inputAudioCtxRef.current = captureCtx;
      console.log('Mic AudioContext native sample rate:', captureCtx.sampleRate);

      if (captureCtx.state === "suspended") {
        await captureCtx.resume();
      }

      const workletCode = `class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isGeminiSpeaking = false;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'setSpeaking') {
        this.isGeminiSpeaking = Boolean(e.data.value);
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channelData = input[0];

    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    const floatSamples = new Float32Array(channelData);
    this.port.postMessage({ pcm: floatSamples.buffer, rms }, [floatSamples.buffer]);
    return true;
  }
}
registerProcessor('mic-processor', MicProcessor);`;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      try {
        await captureCtx.audioWorklet.addModule(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

      const workletNode = new AudioWorkletNode(captureCtx, 'mic-processor');
      workletNodeRef.current = workletNode;
      workletNode.port.postMessage({
        type: 'setSpeaking',
        value: isGeminiSpeakingRef.current,
      });

      const source = captureCtx.createMediaStreamSource(stream);
      source.connect(workletNode);

      const muteGain = captureCtx.createGain();
      muteGain.gain.value = 0;
      workletNode.connect(muteGain);
      muteGain.connect(captureCtx.destination);

      let audioBuffer: Float32Array[] = [];
      let audioBufferSamples = 0;
      const targetInputSamples = Math.max(1, Math.floor(captureCtx.sampleRate / 10)); // 100ms

      workletNode.port.onmessage = (event) => {
        if (!isSessionActiveRef.current) return;
        if (isMutedRef.current) {
          setMicLevel(0);
          return;
        }

        const { pcm, rms } = event.data || {};
        if (typeof rms === "number") {
          setMicLevel(Math.min(1, rms * 10));
        }

        if (!pcm) return;

        // Keep quiet frames so Gemini's VAD can detect trailing silence.
        // Resample using the actual device rate; AudioContext may not honor
        // 16kHz on every browser or audio device.
        const chunk = new Float32Array(pcm);
        audioBuffer.push(chunk);
        audioBufferSamples += chunk.length;

        if (audioBufferSamples < targetInputSamples) return;

        const merged = new Float32Array(audioBufferSamples);
        let offset = 0;
        for (const c of audioBuffer) {
          merged.set(c, offset);
          offset += c.length;
        }

        audioBuffer = [];
        audioBufferSamples = 0;
        const pcm16 = downsampleTo16k(merged, captureCtx.sampleRate);

        const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
        }
        const base64 = btoa(binary);

        const payload = {
          realtimeInput: {
            audio: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64
            }
          }
        };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(payload));
        }
      };

      setStatus("listening");
    } catch (err: any) {
      console.warn("Microphone capture issue:", err);
      setStatus("error");
      setErrorMessage(isEn ? "Microphone access denied or unavailable." : "تعذر الوصول للميكروفون.");
    }
  }, [isEn]);

  const connectLive = useCallback(async () => {
    isSessionActiveRef.current = true;
    nextStartTimeRef.current = 0;
    setStatus("connecting");
    try {
      if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === "closed") {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const outCtx = new AudioCtxClass({ sampleRate: 24000 });
        outputAudioCtxRef.current = outCtx;
        const analyser = outCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        analyser.connect(outCtx.destination);
        outputAnalyserRef.current = analyser;
        setAudioAnalyser(analyser);
      }
    } catch (e) {
      console.warn("Early output analyser init warning:", e);
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/live?lang=${language}`);
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        if (!isSessionActiveRef.current) return;
        try {
          const text = event.data.toString();
          const msg = JSON.parse(text);

          if (msg.setupComplete) {
            console.log("[Client] setupComplete received from Gemini Live API");
            await stopAllPlayback();
            if (!isSessionActiveRef.current) return;
            await startCapture();
            return;
          }

          if (msg.error) {
            setStatus("error");
            setErrorMessage(msg.error);
            return;
          }

          if (msg.status === "ready" || msg.reset) {
            await stopAllPlayback();
            setStatus("listening");
            return;
          }

          const said = msg.serverContent?.outputTranscription?.text || msg.serverContent?.inputTranscription?.text;
          if (said) noteTranscript(said);

          if (msg.serverContent?.interrupted || msg.interrupted) {
            await stopAllPlayback();
            setStatus("listening");
            return;
          }

          if (msg.serverContent?.turnComplete || msg.turnComplete) {
            if (activeSourcesRef.current.size === 0) {
              if (turnCooldownTimerRef.current) {
                clearTimeout(turnCooldownTimerRef.current);
                turnCooldownTimerRef.current = null;
              }
              updateGeminiSpeaking(false);
              setOutputAudioLevel(0);
              setStatus((prev) => (prev === "speaking" ? "listening" : prev));
            }
            return;
          }

          const parts = msg.serverContent?.modelTurn?.parts;
          if (parts && Array.isArray(parts)) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                scheduleAudioChunk(part.inlineData.data);
              }
            }
          } else if (msg.audio) {
            scheduleAudioChunk(msg.audio);
          }
        } catch (e) {
          console.warn("Error parsing incoming live audio message:", e);
        }
      };

      ws.onclose = (event) => {
        if (!isSessionActiveRef.current) return;
        console.log("[Client] WebSocket closed:", event.code, event.reason);
        setStatus((prev) => (prev !== "error" ? "idle" : prev));
      };

      ws.onerror = (err) => {
        if (!isSessionActiveRef.current) return;
        console.warn("[Client] Live WebSocket error:", err);
        setStatus("error");
        setErrorMessage(isEn ? "Couldn't open the live line. If you called many times, wait a few minutes and try again." : "تعذر فتح الخط المباشر. إذا اتصلت كثير، انتظر دقائق وحاول مرة ثانية.");
      };
    } catch (err: any) {
      console.warn("connectLive error:", err);
      setStatus("error");
      setErrorMessage(err.message);
    }
  }, [language, isEn, startCapture, scheduleAudioChunk, stopAllPlayback, updateGeminiSpeaking, noteTranscript]);

  useEffect(() => {
    if (isOpen) {
      connectLive();
    } else {
      disconnectLive();
    }
    return () => {
      disconnectLive();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
        streamRef.current = null;
      }
    };
  }, [isOpen, connectLive, disconnectLive]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#240b09]/95 p-3 sm:p-5 backdrop-blur-xl text-[#fef5f4] overflow-hidden ${
        closingVia ? "vc-closing" : "vc-call-enter"
      }`}
      dir={isEn ? "ltr" : "rtl"}
    >
      <div className="flex w-full justify-between items-center pb-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-3 h-3 rounded-full ${
              status === "speaking"
                ? "bg-rose-400 animate-ping"
                : status === "user_speaking"
                ? "bg-emerald-400 animate-pulse"
                : status === "listening"
                ? "bg-red-400 animate-pulse"
                : status === "error"
                ? "bg-rose-500"
                : "bg-red-300 animate-pulse"
            }`}
          />
          <div>
            <h3 className="font-bold text-sm text-[#fef5f4] flex items-center gap-2">
              {isEn ? "Live Voice Broadcast • Al-Dahiya" : "بث صوتي مباشر • الداهية"}
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 border border-rose-500/30">
                <Sparkles className="size-3" />
                Gemini Live Native Audio
              </span>
            </h3>
            <p className="text-[11px] text-[#e0b8b6]">
              {status === "connecting"
                ? isEn ? "Connecting live audio stream..." : "جاري ربط خط البث الصوتي المباشر..."
                : status === "user_speaking"
                ? isEn ? "Transmitting live speech..." : "جاري إرسال صوتك المباشر..."
                : status === "listening"
                ? isEn ? "Listening to you directly • Speak naturally" : "يستمع إليك مباشرة • تحدث بشكل طبيعي"
                : status === "speaking"
                ? isEn ? "Replying to you by voice..." : "يجيبك بصوته الآن..."
                : status === "error"
                ? isEn ? "Connection notice" : "تنبيه في الاتصال"
                : isEn ? "Ready" : "جاهز"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => closeWithAnimation("x")}
          className="relative rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-[#fef5f4] size-9 flex items-center justify-center transition"
          title={isEn ? "Close" : "إغلاق"}
        >
          <X key={`x-${fx.x || 0}`} className={`w-5 h-5 ${fx.x ? "vc-x-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-auto py-4 min-h-0 w-full max-w-xl mx-auto px-3">
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[260px] w-full">
          {/* Stage: the salt bag alone, or the camera view with the bag as a corner bubble */}
          <div
            className={`relative flex items-center justify-center my-auto w-full max-w-md transition-[height] duration-500 ease-out ${
              isCameraOn || showcase ? "h-[23rem] sm:h-[26rem]" : "h-72 sm:h-84"
            }`}
          >
            {/* Ambient pulsating glow behind the bag */}
            <div
              style={{
                transform: `scale(${1 + (status === "speaking" ? 0.25 : 0)})`,
                opacity: isCameraOn || showcase ? 0 : status === "speaking" ? 0.45 : 0.2,
              }}
              className="absolute size-64 sm:size-80 rounded-full bg-gradient-to-tr from-rose-700/50 via-amber-600/40 to-red-600/50 blur-3xl pointer-events-none transition-all duration-300"
            />

            {isCameraOn && (
              <div className="absolute inset-0 rounded-[1.75rem] overflow-hidden bg-black shadow-2xl ring-1 ring-white/15 vc-cam-open">
                <video
                  ref={attachCameraVideo}
                  playsInline
                  muted
                  className={`size-full object-cover ${cameraFacing === "user" ? "-scale-x-100" : ""} ${
                    isFlippingCamera ? "vc-cam-flip" : ""
                  }`}
                />
                {/* Soft vignette so the overlays stay readable on bright salt */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/35 pointer-events-none" />
                <div key={`scan-${fx.camOn || 0}`} className="vc-scan" />
                {[
                  { pos: "top-3 start-3", border: "border-t-[3px] border-s-[3px] rounded-ss-xl", fx: "14px", fy: "14px" },
                  { pos: "top-3 end-3", border: "border-t-[3px] border-e-[3px] rounded-se-xl", fx: "-14px", fy: "14px" },
                  { pos: "bottom-3 start-3", border: "border-b-[3px] border-s-[3px] rounded-es-xl", fx: "14px", fy: "-14px" },
                  { pos: "bottom-3 end-3", border: "border-b-[3px] border-e-[3px] rounded-ee-xl", fx: "-14px", fy: "-14px" },
                ].map((c) => (
                  <span
                    key={c.pos}
                    className={`vc-corner ${c.pos} ${c.border}`}
                    style={{ ["--fx" as string]: isEn ? c.fx : c.fx.startsWith("-") ? c.fx.slice(1) : `-${c.fx}`, ["--fy" as string]: c.fy }}
                  />
                ))}
                <span className="absolute top-4 inset-x-0 mx-auto w-fit flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isEn ? "Al-Dahiya is looking" : "الداهية يشوف معك"}
                </span>
                <button
                  type="button"
                  onClick={flipCamera}
                  className="absolute top-12 end-4 size-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 backdrop-blur-md ring-1 ring-white/25 text-white flex items-center justify-center transition"
                  title={isEn ? "Switch camera" : "تبديل الكاميرا"}
                >
                  <SwitchCamera className={`size-5 transition-transform duration-500 ${cameraFacing === "user" ? "rotate-180" : ""}`} />
                </button>
              </div>
            )}

            {/* Photos of the place he's talking about (crossfading slideshow) */}
            {showcase && !isCameraOn && (
              <div key={showcase.id} className="absolute inset-0 rounded-[1.75rem] overflow-hidden bg-black shadow-2xl ring-1 ring-white/15 vc-cam-open">
                {showcase.images.map((img, i) => (
                  <img
                    key={img.src}
                    src={img.src}
                    alt={img.caption}
                    className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 ${
                      i === showcaseIndex ? "opacity-100 vc-kenburns" : "opacity-0"
                    }`}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />
                <span className="absolute top-4 inset-x-0 mx-auto w-fit flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                  <span className="size-2 rounded-full bg-amber-300 animate-pulse" />
                  {showcase.title}
                </span>
                <button
                  type="button"
                  onClick={closeShowcase}
                  className="absolute top-3.5 end-4 size-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 backdrop-blur-md ring-1 ring-white/25 text-white flex items-center justify-center transition"
                  title={isEn ? "Hide photos" : "إخفاء الصور"}
                >
                  <X className="size-4" />
                </button>
                <p
                  key={`cap-${showcaseIndex}`}
                  className={`pg-fade absolute bottom-5 ${isEn ? "left-4 right-36" : "right-4 left-36"} text-sm font-semibold text-white drop-shadow`}
                >
                  {showcase.images[showcaseIndex]?.caption}
                </p>
                <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
                  {showcase.images.map((img, i) => (
                    <span key={img.src} className={`h-1.5 rounded-full transition-all duration-500 ${i === showcaseIndex ? "w-5 bg-white" : "w-1.5 bg-white/45"}`} />
                  ))}
                </div>
              </div>
            )}

            {/* White flash the moment the camera opens */}
            {isCameraOn && fx.camOn ? <span key={`flash-${fx.camOn}`} className="vc-flash" /> : null}

            <div
              className="vc-bag"
              style={{
                left: isCameraOn || showcase ? (isEn ? "calc(100% - 64px)" : "64px") : "50%",
                top: isCameraOn || showcase ? "calc(100% - 64px)" : "50%",
                scale: isCameraOn || showcase ? "0.34" : "1",
              }}
            >
              <SaltBagCall
                imageUrl="/salt-bag.png"
                externalAudioLevel={outputAudioLevel}
                isSpeaking={status === "speaking" || isGeminiSpeaking}
                analyserNode={outputAnalyserRef.current || audioAnalyser}
                className={(isCameraOn || showcase) && (status === "speaking" || isGeminiSpeaking) ? "vc-talk-ring" : ""}
                style={{
                  outline: isCameraOn || showcase ? "10px solid rgba(255,255,255,0.9)" : "0px solid rgba(255,255,255,0)",
                  transition: "outline 500ms ease",
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 h-8 px-4 my-4">
            {[0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.9, 0.6, 0.3].map((factor, idx) => {
              const height = isMuted
                ? 4
                : status === "listening" || status === "user_speaking"
                ? Math.max(6, Math.min(36, micLevel * 65 * factor + 6))
                : status === "speaking"
                ? Math.max(8, Math.sin((Date.now() / 180) + idx) * 18 + 18)
                : 6;
              return (
                <div
                  key={idx}
                  style={{ height: `${height}px` }}
                  className={`w-1.5 rounded-full transition-all duration-100 ${
                    isMuted
                      ? "bg-rose-500/40"
                      : status === "speaking"
                      ? "bg-rose-300"
                      : status === "user_speaking"
                      ? "bg-emerald-400"
                      : micLevel > 0.05
                      ? "bg-red-400"
                      : "bg-white/20"
                  }`}
                />
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-1.5 max-w-md text-center px-4">
            <h2 className="text-lg sm:text-2xl font-bold text-[#fef5f4]">
              {isMuted
                ? isEn ? "Microphone muted" : "المايك مغلق حالياً"
                : status === "user_speaking"
                ? isEn ? "Hearing your voice (live transmission)..." : "يسمع صوتك الآن (بث مباشر)..."
                : status === "listening"
                ? micLevel > 0.04
                  ? isEn ? "Hearing your voice clearly..." : "يسمعك بوضوح... تفضل..."
                  : isEn ? "Speak and I will reply instantly" : "تفضل بالحديث والرد فوري"
                : status === "speaking"
                ? isEn ? "Assistant is speaking..." : "المساعد يجيبك صوتياً..."
                : status === "connecting"
                ? isEn ? "Opening live line..." : "جاري فتح الخط المباشر..."
                : status === "error"
                ? isEn ? "Connection alert" : "تنبيه في الاتصال"
                : isEn ? "Ready" : "جاهز"}
            </h2>
            <p className="text-xs sm:text-sm text-[#e0b8b6] max-w-sm mt-1">
              {errorMessage ? (
                <span className="text-rose-300 font-medium">{errorMessage}</span>
              ) : isCameraOn ? (
                <span className="text-emerald-300 font-semibold">
                  {isEn ? "Al-Dahiya can see your camera • Ask him \"what is this?\"" : "الداهية يشوف كاميرتك • اسأله «وش هذا؟»"}
                </span>
              ) : isMuted ? (
                <span className="text-rose-300 font-semibold">
                  {isEn ? "Microphone is muted • Click mic button to un-mute" : "المايك مغلق • اضغط زر المايك للتحدث"}
                </span>
              ) : micLevel > 0.04 ? (
                <span className="text-red-300 font-semibold">
                  {isEn ? "Transmitting audio..." : "جاري التقاط الصوت..."}
                </span>
              ) : (
                isEn ? "Pure direct live voice broadcast with Gemini Live." : "بث صوتي تفاعلي حي ومباشر عبر تقنية Gemini Live."
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.5 w-full max-w-md mx-auto pt-2 shrink-0 pb-2">
        <div className="flex items-center gap-2.5 sm:gap-3 w-full justify-center">
          {/* Mic: sound rings + pop when it comes back on, a wiggle when muted */}
          <button
            type="button"
            onClick={toggleMute}
            className={`relative size-12 sm:size-14 min-w-[48px] min-h-[48px] shrink-0 rounded-2xl transition-all shadow-md flex items-center justify-center select-none active:scale-90 ${
              isMuted
                ? "bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/30"
                : "bg-white/10 hover:bg-white/20 text-[#fef5f4]"
            }`}
            title={isMuted ? (isEn ? "Unmute Mic" : "تشغيل المايك") : (isEn ? "Mute Mic" : "كتم المايك")}
          >
            {fx.mic && !isMuted ? (
              <span key={`rings-${fx.mic}`}>
                <span className="vc-ring" />
                <span className="vc-ring vc-delay" />
              </span>
            ) : null}
            <span key={`mic-${fx.mic || 0}`} className={fx.mic ? (isMuted ? "vc-wiggle" : "vc-pop") : ""}>
              {isMuted ? (
                <MicOff className="size-5 sm:size-6 text-white" />
              ) : (
                <Mic className="size-5 sm:size-6 text-rose-300" />
              )}
            </span>
            {fx.mic ? <SaltBurst key={`mic-burst-${fx.mic}`} color={isMuted ? "#fda4af" : "#ffffff"} /> : null}
          </button>

          {/* Camera: an aperture snaps shut and reopens, salt crystals fly */}
          <button
            type="button"
            onClick={() => {
              fire("cam");
              if (!isCameraOn) {
                fire("camOn");
                closeShowcase();
              }
              toggleCamera();
            }}
            className={`relative size-12 sm:size-14 min-w-[48px] min-h-[48px] shrink-0 rounded-2xl transition-all shadow-md flex items-center justify-center select-none active:scale-90 ${
              isCameraOn
                ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-500/30"
                : "bg-white/10 hover:bg-white/20 text-[#fef5f4]"
            }`}
            title={isCameraOn ? (isEn ? "Turn off camera" : "إيقاف الكاميرا") : (isEn ? "Show Al-Dahiya with your camera" : "شغّل الكاميرا وخل الداهية يشوف")}
          >
            <span key={`cam-icon-${fx.cam || 0}`} className={fx.cam ? "vc-pop" : ""}>
              {isCameraOn ? <CameraOff className="size-5 sm:size-6" /> : <Camera className="size-5 sm:size-6 text-rose-300" />}
            </span>
            {fx.cam ? <span key={`shutter-${fx.cam}`} className="vc-shutter" /> : null}
            {fx.cam ? <SaltBurst key={`cam-burst-${fx.cam}`} color="#a7f3d0" /> : null}
          </button>

          {/* Main mic: a ripple from the exact press point */}
          <button
            type="button"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setRipple({ x: `${e.clientX - r.left}px`, y: `${e.clientY - r.top}px` });
              fire("main");
              toggleMute();
            }}
            className={`relative overflow-hidden flex-1 py-3 sm:py-4 px-4 min-h-[48px] rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md select-none flex items-center justify-center active:scale-[0.97] ${
              isMuted
                ? "bg-rose-700 hover:bg-rose-800 text-white ring-4 ring-rose-500/30"
                : status === "user_speaking"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-500/30"
                : "bg-[#b82e24] hover:bg-[#992017] text-white"
            }`}
          >
            {fx.main ? (
              <span key={`ripple-${fx.main}`} className="vc-ripple" style={{ ["--x" as string]: ripple.x, ["--y" as string]: ripple.y }} />
            ) : null}
            <span key={`main-${fx.main || 0}`} className={`relative flex items-center ${fx.main ? "vc-pop" : ""}`}>
              {isMuted ? (
                <>
                  <MicOff className={`size-4 sm:size-5 ${isEn ? "mr-1.5" : "ml-1.5"}`} />
                  {isEn ? "Unmute Live Mic" : "إلغاء كتم المايك"}
                </>
              ) : (
                <>
                  <Mic className={`size-4 sm:size-5 ${isEn ? "mr-1.5" : "ml-1.5"} ${status === "user_speaking" ? "animate-pulse" : ""}`} />
                  {isEn
                    ? status === "user_speaking" ? "Transmitting Speech..." : "Live Microphone Active"
                    : status === "user_speaking" ? "جاري الإرسال المباشر..." : "المايك المباشر نشط"}
                </>
              )}
            </span>
          </button>

          {/* Hang up: the handset tips over and the whole call folds away */}
          <button
            type="button"
            onClick={() => closeWithAnimation("end")}
            className="relative size-12 sm:size-14 min-w-[48px] min-h-[48px] shrink-0 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white shadow-lg flex items-center justify-center transition active:scale-90"
            title={isEn ? "End Call" : "إنهاء المكالمة"}
          >
            <Phone className={`size-5 sm:size-6 ${closingVia === "end" ? "vc-hangup" : "rotate-[135deg]"}`} />
            {fx.end ? <SaltBurst key={`end-burst-${fx.end}`} color="#fb7185" /> : null}
          </button>
        </div>
      </div>
    </div>
  );
};
