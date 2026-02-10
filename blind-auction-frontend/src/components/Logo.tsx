"use client";

import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  animated?: boolean;
}

export function ArciumLogo({ size = 40, className = "", animated = true }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${className} ${animated ? 'logo-animated' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Main gradient */}
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
        
        {/* Glow effect */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Inner shadow */}
        <filter id="innerShadow">
          <feOffset dx="0" dy="1"/>
          <feGaussianBlur stdDeviation="1" result="offset-blur"/>
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
          <feFlood floodColor="#000" floodOpacity="0.2" result="color"/>
          <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
          <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
        </filter>

        {/* Animated gradient for outer ring */}
        <linearGradient id="animatedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6">
            <animate attributeName="stop-color" values="#8B5CF6;#06B6D4;#F472B6;#8B5CF6" dur="4s" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" stopColor="#06B6D4">
            <animate attributeName="stop-color" values="#06B6D4;#F472B6;#8B5CF6;#06B6D4" dur="4s" repeatCount="indefinite"/>
          </stop>
        </linearGradient>
      </defs>
      
      {/* Outer glowing ring */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="url(#animatedGradient)"
        strokeWidth="2"
        filter="url(#glow)"
        opacity="0.8"
      />
      
      {/* Background circle */}
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="#0F0F23"
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
      />
      
      {/* Shield shape */}
      <path
        d="M50 18 L72 28 L72 48 C72 62 62 74 50 80 C38 74 28 62 28 48 L28 28 Z"
        fill="url(#logoGradient)"
        filter="url(#innerShadow)"
        opacity="0.9"
      />
      
      {/* Lock body */}
      <rect
        x="40"
        y="44"
        width="20"
        height="16"
        rx="3"
        fill="#0F0F23"
      />
      
      {/* Lock shackle */}
      <path
        d="M44 44 L44 38 C44 34 46 32 50 32 C54 32 56 34 56 38 L56 44"
        fill="none"
        stroke="#0F0F23"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Lock keyhole */}
      <circle cx="50" cy="50" r="2.5" fill="url(#logoGradient)" />
      <rect x="49" y="50" width="2" height="5" rx="1" fill="url(#logoGradient)" />
      
      {/* Orbiting dots */}
      <g className="orbit-group">
        <circle cx="50" cy="8" r="3" fill="#8B5CF6">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="50" cy="8" r="3" fill="#06B6D4">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="120 50 50"
            to="480 50 50"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="50" cy="8" r="3" fill="#F472B6">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="240 50 50"
            to="600 50 50"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  );
}

export function BlindAuctionLogo({ size = 48, className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ArciumLogo size={size} animated={true} />
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight logo-text">
            Blind Auction
          </span>
          <span className="text-xs text-arcium-muted tracking-wider uppercase">
            Powered by Arcium
          </span>
        </div>
      )}
    </div>
  );
}

// Compact version for mobile/small areas
export function BlindAuctionMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="markGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      
      <rect width="40" height="40" rx="10" fill="#1A1A2E" />
      
      <path
        d="M20 6 L32 12 L32 22 C32 30 26 36 20 38 C14 36 8 30 8 22 L8 12 Z"
        fill="url(#markGradient)"
        opacity="0.9"
      />
      
      <rect x="15" y="18" width="10" height="8" rx="1.5" fill="#0F0F23" />
      <path
        d="M17 18 L17 15 C17 13 18 12 20 12 C22 12 23 13 23 15 L23 18"
        fill="none"
        stroke="#0F0F23"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="21" r="1.2" fill="url(#markGradient)" />
      <rect x="19.5" y="21" width="1" height="2.5" rx="0.5" fill="url(#markGradient)" />
    </svg>
  );
}
