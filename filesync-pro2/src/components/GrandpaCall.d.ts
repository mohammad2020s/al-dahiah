import React from 'react';

export interface GrandpaCallProps {
  imageUrl?: string;
  externalAudioLevel?: number | null;
  isSpeaking?: boolean;
  analyserNode?: AnalyserNode | null;
  className?: string;
  style?: React.CSSProperties;
}

declare const GrandpaCall: React.FC<GrandpaCallProps>;
export default GrandpaCall;
