import React from 'react';

interface VehicleIconProps {
  type: 'economy' | 'standard' | 'premium' | 'suv';
  size?: number;
  className?: string;
}

const VehicleIcon = ({ type, size = 48, className = '' }: VehicleIconProps) => {
  const icons: Record<string, React.JSX.Element> = {
    economy: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Compact hatchback */}
        <rect x="8" y="30" width="48" height="16" rx="4" fill="#818cf8" />
        <path d="M18 30 L24 18 H40 L48 30" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5" />
        <rect x="26" y="20" width="6" height="8" rx="1" fill="#c7d2fe" opacity="0.8" />
        <rect x="34" y="20" width="6" height="8" rx="1" fill="#c7d2fe" opacity="0.8" />
        <rect x="18" y="22" width="6" height="6" rx="1" fill="#c7d2fe" opacity="0.8" />
        <circle cx="20" cy="46" r="6" fill="#334155" stroke="#1e293b" strokeWidth="2" />
        <circle cx="20" cy="46" r="2.5" fill="#94a3b8" />
        <circle cx="44" cy="46" r="6" fill="#334155" stroke="#1e293b" strokeWidth="2" />
        <circle cx="44" cy="46" r="2.5" fill="#94a3b8" />
        <rect x="6" y="36" width="8" height="3" rx="1.5" fill="#fbbf24" />
        <rect x="50" y="36" width="8" height="3" rx="1.5" fill="#ef4444" opacity="0.8" />
      </svg>
    ),
    standard: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Sedan */}
        <rect x="6" y="30" width="52" height="16" rx="4" fill="#6366f1" />
        <path d="M16 30 L22 16 H44 L50 30" fill="#4f46e5" stroke="#4338ca" strokeWidth="1.5" />
        <rect x="24" y="18" width="7" height="10" rx="1.5" fill="#c7d2fe" opacity="0.85" />
        <rect x="33" y="18" width="7" height="10" rx="1.5" fill="#c7d2fe" opacity="0.85" />
        <rect x="16" y="20" width="6" height="8" rx="1.5" fill="#c7d2fe" opacity="0.85" />
        <circle cx="18" cy="46" r="6" fill="#334155" stroke="#1e293b" strokeWidth="2" />
        <circle cx="18" cy="46" r="2.5" fill="#94a3b8" />
        <circle cx="46" cy="46" r="6" fill="#334155" stroke="#1e293b" strokeWidth="2" />
        <circle cx="46" cy="46" r="2.5" fill="#94a3b8" />
        <rect x="4" y="35" width="10" height="4" rx="2" fill="#fbbf24" />
        <rect x="50" y="35" width="10" height="4" rx="2" fill="#ef4444" opacity="0.8" />
        <rect x="18" y="32" width="28" height="1.5" rx="0.75" fill="#4338ca" opacity="0.3" />
      </svg>
    ),
    premium: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* Luxury sedan */}
        <rect x="4" y="30" width="56" height="16" rx="5" fill="#1e1b4b" />
        <path d="M14 30 L20 14 H46 L52 30" fill="#312e81" stroke="#1e1b4b" strokeWidth="1.5" />
        <rect x="22" y="16" width="8" height="12" rx="2" fill="#6366f1" opacity="0.4" />
        <rect x="32" y="16" width="8" height="12" rx="2" fill="#6366f1" opacity="0.4" />
        <rect x="14" y="18" width="6" height="10" rx="2" fill="#6366f1" opacity="0.4" />
        <circle cx="16" cy="46" r="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <circle cx="16" cy="46" r="2.5" fill="#6366f1" />
        <circle cx="48" cy="46" r="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <circle cx="48" cy="46" r="2.5" fill="#6366f1" />
        <rect x="2" y="34" width="12" height="4" rx="2" fill="#fbbf24" />
        <rect x="50" y="34" width="12" height="4" rx="2" fill="#ef4444" opacity="0.9" />
        {/* Chrome trim */}
        <rect x="14" y="30" width="36" height="1" fill="#a5b4fc" opacity="0.5" />
        {/* Star badge */}
        <circle cx="32" cy="26" r="3" fill="#fbbf24" opacity="0.6" />
      </svg>
    ),
    suv: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        {/* SUV / MPV */}
        <rect x="6" y="26" width="52" height="20" rx="5" fill="#6366f1" />
        <path d="M14 26 L18 12 H46 L50 26" fill="#4f46e5" stroke="#4338ca" strokeWidth="1.5" />
        <rect x="20" y="14" width="7" height="10" rx="1.5" fill="#c7d2fe" opacity="0.85" />
        <rect x="29" y="14" width="7" height="10" rx="1.5" fill="#c7d2fe" opacity="0.85" />
        <rect x="38" y="14" width="7" height="10" rx="1.5" fill="#c7d2fe" opacity="0.85" />
        <circle cx="18" cy="46" r="7" fill="#334155" stroke="#1e293b" strokeWidth="2.5" />
        <circle cx="18" cy="46" r="3" fill="#94a3b8" />
        <circle cx="46" cy="46" r="7" fill="#334155" stroke="#1e293b" strokeWidth="2.5" />
        <circle cx="46" cy="46" r="3" fill="#94a3b8" />
        <rect x="4" y="32" width="10" height="5" rx="2.5" fill="#fbbf24" />
        <rect x="50" y="32" width="10" height="5" rx="2.5" fill="#ef4444" opacity="0.8" />
        {/* Roof rack */}
        <rect x="20" y="10" width="24" height="2" rx="1" fill="#4338ca" opacity="0.5" />
      </svg>
    ),
  };

  return icons[type] || icons.standard;
};

export default VehicleIcon;
