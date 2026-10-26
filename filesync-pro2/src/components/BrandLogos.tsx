import React, { useState } from "react";

/**
 * Malh Al-Qasab Official Brand Logo (from /images/Aldahiah-logo.jfif or /images/logo.png)
 * Displays the authentic terracotta salt-contour typography logo uploaded by the user.
 */
export const MalhAlQasabLogo: React.FC<{
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}> = ({ size = "md", className = "" }) => {
  const [imgSrc, setImgSrc] = useState("/images/Aldahiah-logo.jfif");

  const sizeClass = {
    sm: "size-10 rounded-xl",
    md: "size-12 rounded-2xl",
    lg: "size-20 rounded-3xl",
    xl: "size-28 sm:size-32 rounded-[2.2rem]",
  }[size];

  return (
    <div
      className={`relative overflow-hidden bg-[#a8432a] shadow-md flex items-center justify-center select-none ${sizeClass} ${className}`}
      aria-label="شعار ملح القصب"
    >
      <img
        src={imgSrc}
        alt="شعار ملح القصب"
        className="size-full object-cover"
        loading="eager"
        onError={() => {
          if (imgSrc === "/images/Aldahiah-logo.jfif") {
            setImgSrc("/images/logo.png");
          }
        }}
      />
    </div>
  );
};

/**
 * Tanmiah Logo (from /images/al-tanmiah.png or /images/tanmiah.png)
 * "جمعية التنمية الأهلية بالقصب"
 * Official emblem of the Social Development Committee in Al-Qasab.
 */
export const TanmiahLogo: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className = "" }) => {
  const [imgSrc, setImgSrc] = useState("/images/al-tanmiah.png");

  const sizeClass = {
    sm: "size-8",
    md: "size-10",
    lg: "size-14",
  }[size];

  return (
    <div className={`relative ${sizeClass} shrink-0 flex items-center justify-center select-none ${className}`}>
      <img
        src={imgSrc}
        alt="شعار جمعية التنمية الأهلية بالقصب"
        className="size-full object-contain"
        loading="eager"
        onError={() => {
          if (imgSrc === "/images/al-tanmiah.png") {
            setImgSrc("/images/tanmiah.png");
          }
        }}
      />
    </div>
  );
};
