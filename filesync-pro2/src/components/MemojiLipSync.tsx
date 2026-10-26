import React, { useEffect, useRef, useState } from "react";

interface MemojiLipSyncProps {
  analyserNode?: AnalyserNode | null;
  isSpeaking?: boolean;
  status?: string;
  className?: string;
}

// 4 Mouth states of the Apple Memoji character:
export const MOUTH_IMAGES = {
  closed: "/avatar/mouth_closed.jpeg", // 1. Idle / Closed mouth (silence)
  low: "/avatar/mouth_low.jpeg",       // 2. Half-open mouth (low volume syllables)
  medium: "/avatar/mouth_medium.jpeg", // 3. Normal open mouth (regular speech)
  wide: "/avatar/mouth_wide.jpeg",     // 4. Wide-open mouth (loud speech / emphasis)
};

// Volume thresholds for switching mouth states (adjustable)
export const THRESHOLDS = {
  low: 0.08,    // Below this = closed
  medium: 0.22, // Between low and medium = half-open
  wide: 0.45,   // Between medium and wide = normal open; Above this = wide-open
};

export const MemojiLipSync: React.FC<MemojiLipSyncProps> = ({
  analyserNode,
  isSpeaking = false,
  status = "idle",
  className = "w-full max-w-md h-72 sm:h-84",
}) => {
  const [currentMouthSrc, setCurrentMouthSrc] = useState<string>(MOUTH_IMAGES.closed);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);

  // Smooth volume tracker to avoid erratic mouth jitter
  const smoothedVolumeRef = useRef<number>(0);
  const lastStateChangeRef = useRef<number>(0);
  const currentMouthRef = useRef<string>(MOUTH_IMAGES.closed);

  // Preload all 4 images in the browser cache to prevent image flickering
  useEffect(() => {
    Object.values(MOUTH_IMAGES).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let dataArray: Uint8Array | null = null;

    if (analyserNode) {
      dataArray = new Uint8Array(analyserNode.fftSize);
    }

    const updateLipSync = () => {
      const now = performance.now();
      let instantVolume = 0;

      if (analyserNode && dataArray) {
        // Read real-time time-domain audio data
        analyserNode.getByteTimeDomainData(dataArray as any);

        // Calculate Root Mean Square (RMS) volume
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        // Normalize and amplify RMS volume (0.0 to 1.0)
        instantVolume = Math.min(1.0, rms * 4.2);
      } else if (isSpeaking) {
        // Fallback procedural mouth variation when Gemini is active but analyser is initializing
        instantVolume = Math.sin(now * 0.012) * 0.35 + 0.35;
      }

      // Smooth volume with exponential moving average (hysteresis filter)
      const smoothingFactor = instantVolume > smoothedVolumeRef.current ? 0.35 : 0.18;
      smoothedVolumeRef.current += (instantVolume - smoothedVolumeRef.current) * smoothingFactor;
      const vol = smoothedVolumeRef.current;
      setVolumeLevel(vol);

      // Determine target mouth image based on volume thresholds
      let targetSrc = MOUTH_IMAGES.closed;

      if (vol >= THRESHOLDS.wide) {
        targetSrc = MOUTH_IMAGES.wide;
      } else if (vol >= THRESHOLDS.medium) {
        targetSrc = MOUTH_IMAGES.medium;
      } else if (vol >= THRESHOLDS.low) {
        targetSrc = MOUTH_IMAGES.low;
      } else {
        targetSrc = MOUTH_IMAGES.closed;
      }

      // Enforce a minimum hold time (35ms) between mouth shape changes for natural speech cadence
      if (targetSrc !== currentMouthRef.current && (now - lastStateChangeRef.current > 35 || targetSrc === MOUTH_IMAGES.wide)) {
        currentMouthRef.current = targetSrc;
        lastStateChangeRef.current = now;
        setCurrentMouthSrc(targetSrc);
      }

      animationFrameId = requestAnimationFrame(updateLipSync);
    };

    animationFrameId = requestAnimationFrame(updateLipSync);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserNode, isSpeaking]);

  // Gentle head scale bounce and rotation when talking
  const headScale = 1.0 + Math.min(0.04, volumeLevel * 0.05);
  const glowScale = 1.0 + Math.min(0.25, volumeLevel * 0.3);
  const glowOpacity = isSpeaking ? 0.65 + volumeLevel * 0.35 : 0.35;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Soft warm Al-Dahiya brand glow that pulses with Gemini's voice volume */}
      <div
        style={{
          transform: `scale(${glowScale})`,
          opacity: glowOpacity,
        }}
        className="absolute size-60 sm:size-76 rounded-full bg-gradient-to-tr from-rose-700/50 via-amber-600/40 to-red-600/50 blur-3xl pointer-events-none transition-transform duration-75"
      />

      {/* Decorative accent ring */}
      <div
        style={{
          transform: `scale(${glowScale * 0.95})`,
          opacity: glowOpacity * 0.7,
        }}
        className="absolute size-52 sm:size-64 rounded-full border border-rose-500/30 blur-md pointer-events-none"
      />

      {/* 2D Real-time Lip-Sync Avatar Container */}
      <div
        style={{
          transform: `scale(${headScale})`,
        }}
        className="relative size-56 sm:size-68 rounded-full flex items-center justify-center p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] transition-transform duration-75"
      >
        {/* State border highlight */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-300 border-3 ${
            isSpeaking
              ? "border-rose-400 shadow-[0_0_35px_rgba(251,113,133,0.6)]"
              : status === "listening"
              ? "border-red-400/80 shadow-[0_0_25px_rgba(239,68,68,0.4)]"
              : status === "user_speaking"
              ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)]"
              : "border-rose-500/40 shadow-[0_0_20px_rgba(184,46,36,0.3)]"
          }`}
        />

        {/* Circular mask framing the Apple Memoji head with statically anchored positioning */}
        <div className="relative size-full rounded-full overflow-hidden bg-[#222222] border border-white/10 shadow-inner flex items-center justify-center">
          <div className="relative w-full h-full overflow-hidden">
            <img
              id="avatar-memoji-image"
              src={currentMouthSrc}
              alt="الداهية - Al-Dahya Memoji"
              className="absolute inset-0 size-full pointer-events-none select-none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                transform: "scale(1.18)",
              }}
              draggable={false}
            />
          </div>

          {/* Vignette lighting overlay for deep integration with the call screen */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-[#240806]/40 via-transparent to-rose-500/10 pointer-events-none" />
        </div>

        {/* Real-time speaking status pill badge */}
        {isSpeaking && (
          <div className="absolute -bottom-2 px-3 py-1 rounded-full bg-[#b82e24] text-white text-[10px] font-bold shadow-lg border border-rose-300/40 flex items-center gap-1.5 animate-pulse">
            <span className="size-1.5 rounded-full bg-white" />
            <span>الداهية يتحدث...</span>
          </div>
        )}
      </div>
    </div>
  );
};
