import React from "react";
import { MalhAlQasabLogo } from "./BrandLogos";

interface AlQasabLogoProps {
  size?: "small" | "normal" | "large" | "welcome" | "xl";
  className?: string;
  withRing?: boolean;
}

export const AlQasabLogo: React.FC<AlQasabLogoProps> = ({
  size = "normal",
  className = "",
}) => {
  const sizeMap: Record<string, "sm" | "md" | "lg" | "xl"> = {
    small: "sm",
    normal: "md",
    large: "lg",
    welcome: "xl",
    xl: "xl",
  };

  return <MalhAlQasabLogo size={sizeMap[size] || "md"} className={className} />;
};
