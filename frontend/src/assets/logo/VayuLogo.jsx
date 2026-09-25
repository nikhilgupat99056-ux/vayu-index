import React from 'react';

export default function VayuLogo({ size = 42, showText = true, textClass = '', subtitle = true }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div 
        className="relative flex items-center justify-center transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]"
        >
          <defs>
            {/* National Saffron to White to Blue Gradient */}
            <linearGradient id="vayuGradient" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>

            <linearGradient id="orbitGlow" x1="0" y1="60" x2="120" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="barGradient" x1="0" y1="100" x2="0" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
            </linearGradient>
            
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Aviation Orbit */}
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="url(#orbitGlow)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="opacity-70 animate-[spin_30s_linear_infinite]"
          />

          {/* Inner Radar Range Ring */}
          <circle
            cx="60"
            cy="60"
            r="44"
            stroke="#38BDF8"
            strokeOpacity="0.2"
            strokeWidth="1"
          />

          {/* Compass / Navigation Ticks */}
          <line x1="60" y1="4" x2="60" y2="10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="110" x2="60" y2="116" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="60" x2="10" y2="60" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <line x1="110" y1="60" x2="116" y2="60" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />

          {/* Stylized India Geography Sub-Silhouette */}
          <path
            d="M58 24 C 62 26, 68 28, 67 33 C 66 38, 73 40, 77 44 C 82 48, 86 52, 81 57 C 76 62, 74 69, 70 75 C 66 81, 62 89, 60 96 C 58 89, 54 81, 50 75 C 46 69, 44 62, 39 57 C 34 52, 38 48, 43 44 C 47 40, 54 38, 53 33 C 52 28, 55 26, 58 24 Z"
            fill="#1E293B"
            fillOpacity="0.45"
            stroke="#38BDF8"
            strokeOpacity="0.3"
            strokeWidth="1.2"
          />

          {/* Analytics Bar Graph Foundation (Rising under the flight) */}
          <rect x="36" y="74" width="7" height="16" rx="2" fill="url(#barGradient)" />
          <rect x="47" y="66" width="7" height="24" rx="2" fill="url(#barGradient)" />
          <rect x="58" y="56" width="7" height="34" rx="2" fill="url(#barGradient)" />
          <rect x="69" y="46" width="7" height="44" rx="2" fill="url(#barGradient)" />
          <rect x="80" y="34" width="7" height="56" rx="2" fill="url(#barGradient)" />

          {/* Flight Trajectory Curve (Arcing Upwards) */}
          <path
            d="M26 88 C 42 86, 60 74, 82 40"
            stroke="url(#vayuGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#glowEffect)"
          />
          <path
            d="M26 88 C 42 86, 60 74, 82 40"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Ascending Jet Airplane at trajectory peak */}
          <g transform="translate(82, 40) rotate(38) scale(1.15)">
            {/* Contrail Sparkle */}
            <circle cx="-14" cy="0" r="2" fill="#F59E0B" opacity="0.9" />
            <circle cx="-24" cy="0" r="1.5" fill="#38BDF8" opacity="0.7" />
            
            {/* Sleek Modern Airplane */}
            <path
              d="M 12 0 L -4 -6 L -2 -1.5 L -10 -4 L -11 -2 L -8 0 L -11 2 L -10 4 L -2 1.5 L -4 6 Z"
              fill="#FFFFFF"
              stroke="#020817"
              strokeWidth="0.8"
              filter="url(#glowEffect)"
            />
          </g>

          {/* Central Pulse Dot */}
          <circle cx="60" cy="60" r="3" fill="#38BDF8" />
          <circle cx="60" cy="60" r="6" stroke="#38BDF8" strokeWidth="1" opacity="0.6" className="animate-ping" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold tracking-wider text-xl sm:text-2xl bg-gradient-to-r from-amber-400 via-white to-sky-400 bg-clip-text text-transparent">
              VAYU
            </span>
            <span className="font-bold text-xs uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 tracking-widest">
              INDEX
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] text-slate-400 tracking-tight font-medium mt-1">
              India's Real-Time Airfare Intelligence Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
