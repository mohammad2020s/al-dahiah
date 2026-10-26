import React from 'react';

export interface SaltBagCallProps {
  imageUrl?: string;
  externalAudioLevel?: number | null;
  isSpeaking?: boolean;
  analyserNode?: AnalyserNode | null;
  className?: string;
  style?: React.CSSProperties;
}

declare const SaltBagCall: React.FC<SaltBagCallProps>;
export default SaltBagCall;
