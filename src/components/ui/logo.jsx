import React from "react";

// Marca do ClimaPro: "C" em fluxo de ar (Clima + ventilação) com faísca de
// frio de 4 pontas no centro, sobre squircle com o degradê azul→roxo da
// identidade. Vetor puro — nítido de favicon a tela cheia.
export function LogoMark({ className = "w-10 h-10" }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="0.55" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-bg)`} />
      <rect width="64" height="64" rx="15" fill={`url(#${id}-shine)`} />
      <path
        d="M45.1 41.2 A 16 16 0 1 1 45.1 22.8"
        stroke="#ffffff"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M32 23.5 C33.6 29 35 30.4 40.5 32 C35 33.6 33.6 35 32 40.5 C30.4 35 29 33.6 23.5 32 C29 30.4 30.4 29 32 23.5 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

// Marca + wordmark, para headers. Use `dark` em fundos escuros.
export function Logo({ markClassName = "w-10 h-10", textClassName = "text-xl", dark = false, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark className={markClassName} />
      <div className="leading-tight">
        <p className={`font-bold tracking-tight ${textClassName} ${dark ? "text-white" : "text-foreground"}`}>
          Clima
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Pro</span>
        </p>
        {subtitle ? (
          <p className={`text-xs -mt-0.5 ${dark ? "text-gray-400" : "text-muted-foreground"}`}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
