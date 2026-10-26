class MicProcessor extends AudioWorkletProcessor {
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

    // Compute RMS for UI visualizer
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    // TASK 2: Disable VAD filter for diagnostic - send all audio frames as Int16 PCM
    const pcm16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage({ pcm: pcm16.buffer, rms }, [pcm16.buffer]);
    return true;
  }
}

registerProcessor('mic-processor', MicProcessor);
