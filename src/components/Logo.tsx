'use client';

import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  imgClassName?: string;
  fallbackText?: string;
  src?: string;
}

export default function Logo({
  className = '',
  imgClassName = 'w-10 h-10 rounded-2xl object-cover shadow-lg shadow-emerald-500/30 border border-emerald-500/20',
  fallbackText = 'T',
  src,
}: LogoProps) {
  // Try provided src or default paths (logo.jpg / logo.png / etc.)
  const candidates = src
    ? [src]
    : ['/images/logo.jpg', '/images/logo.png', '/logo.jpg', '/logo.png'];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div
        className={`bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/30 ${imgClassName} ${className}`}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={candidates[currentIndex]}
        alt="Ticco Logo"
        onError={handleError}
        className={imgClassName}
      />
    </div>
  );
}
