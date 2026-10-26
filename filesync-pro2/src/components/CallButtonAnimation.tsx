import React, { useEffect, useState } from "react";
import { Phone } from "lucide-react";

interface CallButtonAnimationProps {
  isAnimating: boolean;
  originRect: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Call Button Animation:
 * Step A (0-300ms): Button scales up slightly (scale 1.0 -> 1.2) and gains a soft glow/shadow.
 * Step B (300-700ms): Moves from original position to screen center. Page background fades to a dark overlay.
 * Step C (700-900ms): Scales further (1.2 -> 1.8) while circular ripple expands outward from it.
 * Step D (900-1100ms): Button fades out and transitions into the full call screen.
 */
export const CallButtonAnimation: React.FC<CallButtonAnimationProps> = ({
  isAnimating,
  originRect,
}) => {
  const [viewportCenter, setViewportCenter] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setViewportCenter({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }
  }, [isAnimating]);

  if (!isAnimating || !originRect) return null;

  const btnWidth = originRect.width || 44;
  const btnHeight = originRect.height || 44;
  const startX = originRect.x;
  const startY = originRect.y;
  const targetX = viewportCenter.x - btnWidth / 2;
  const targetY = viewportCenter.y - btnHeight / 2;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      <style>{`
        @keyframes callOverlayFade {
          0% { opacity: 0; }
          27% { opacity: 0; }
          64% { opacity: 0.75; }
          100% { opacity: 0.95; }
        }
        @keyframes callButtonFly {
          0% {
            transform: translate3d(${startX}px, ${startY}px, 0) scale(1.0);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
            opacity: 1;
          }
          27% {
            transform: translate3d(${startX}px, ${startY}px, 0) scale(1.2);
            box-shadow: 0 0 26px rgba(225, 29, 72, 0.8), 0 0 45px rgba(225, 29, 72, 0.4);
            opacity: 1;
          }
          64% {
            transform: translate3d(${targetX}px, ${targetY}px, 0) scale(1.2);
            box-shadow: 0 0 35px rgba(225, 29, 72, 0.85), 0 0 60px rgba(225, 29, 72, 0.5);
            opacity: 1;
          }
          82% {
            transform: translate3d(${targetX}px, ${targetY}px, 0) scale(1.8);
            box-shadow: 0 0 50px rgba(244, 63, 94, 0.95), 0 0 80px rgba(244, 63, 94, 0.6);
            opacity: 1;
          }
          100% {
            transform: translate3d(${targetX}px, ${targetY}px, 0) scale(2.2);
            box-shadow: 0 0 60px rgba(244, 63, 94, 0);
            opacity: 0;
          }
        }
        @keyframes callPulseRipple {
          0%, 63% {
            transform: translate3d(${targetX}px, ${targetY}px, 0) scale(0.6);
            opacity: 0;
          }
          64% {
            transform: translate3d(${targetX}px, ${targetY}px, 0) scale(1.0);
            opacity: 0.9;
          }
          85% {
            transform: translate3d(${targetX}px, ${targetY}px, 0) scale(2.8);
            opacity: 0.45;
          }
          100% {
            transform: translate3d(${targetX}px, ${targetY}px, 0) scale(3.5);
            opacity: 0;
          }
        }
      `}</style>

      {/* Step B: Dark overlay */}
      <div
        className="absolute inset-0 bg-[#160605]"
        style={{
          animation: "callOverlayFade 1100ms ease-in-out forwards",
        }}
      />

      {/* Step C: Circular ripple pulse */}
      <div
        className="absolute rounded-full border-2 border-rose-500/80 bg-rose-500/20 shadow-lg shadow-rose-500/40"
        style={{
          left: 0,
          top: 0,
          width: btnWidth,
          height: btnHeight,
          animation: "callPulseRipple 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      />

      {/* Step A -> B -> C -> D: The animated call button */}
      <div
        className="absolute flex items-center justify-center rounded-2xl bg-[#8e1b12] text-white shadow-xl"
        style={{
          left: 0,
          top: 0,
          width: btnWidth,
          height: btnHeight,
          animation: "callButtonFly 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        <Phone className="size-5 text-rose-100" />
      </div>
    </div>
  );
};
