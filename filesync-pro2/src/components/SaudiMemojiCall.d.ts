import React from 'react';

export interface SaudiMemojiCallProps {
  imageUrl?: string;
  externalAudioLevel?: number | null;
  isSpeaking?: boolean;
  analyserNode?: AnalyserNode | null;
  className?: string;
  style?: React.CSSProperties;
}

declare const SaudiMemojiCall: React.FC<SaudiMemojiCallProps>;
export default SaudiMemojiCall;
