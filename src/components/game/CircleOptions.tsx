import { ReactNode, useState } from 'react';

interface CircleOption {
  icon: ReactNode;
  label: string;
  value: string;
}

interface CircleOptionsProps {
  centerIcon: ReactNode;
  onCenterClick: () => void;
  options: CircleOption[];
  onSelect: (value: string) => void;
  size?: number;
  dist?: number;
  centerGradient?: string;
  selectedValue?: string | null;
}

const CircleOptions = ({
  centerIcon,
  onCenterClick,
  options,
  onSelect,
  size = 450,
  dist = 180,
  centerGradient = 'var(--gradient-warm)',
  selectedValue,
}: CircleOptionsProps) => {
  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      {/* Center */}
      <button
        className="absolute rounded-full flex items-center justify-center z-20 cursor-pointer transition-all duration-300 hover:scale-110 border-4"
        style={{
          width: 140,
          height: 140,
          background: centerGradient,
          borderColor: 'rgba(255,255,255,0.3)',
          boxShadow: '0 8px 25px rgba(253,184,19,0.4)',
          fontSize: 48,
        }}
        onClick={onCenterClick}
      >
        {centerIcon}
      </button>

      {/* Options */}
      {options.map((opt, i) => {
        const angle = (360 / options.length) * i - 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;
        const isSelected = selectedValue === opt.value;

        return (
          <button
            key={opt.value}
            className="absolute flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all duration-500 z-10 animate-bounce-in border-2"
            style={{
              width: 100,
              height: 100,
              transform: `translate(${x}px, ${y}px) scale(${isSelected ? 1.15 : 1})`,
              background: isSelected
                ? 'var(--gradient-warm)'
                : 'var(--gradient-primary)',
              borderColor: 'rgba(255,255,255,0.3)',
              boxShadow: isSelected
                ? '0 6px 25px rgba(253,184,19,0.6)'
                : '0 4px 15px rgba(102,126,234,0.3)',
              animationDelay: `${i * 0.08}s`,
            }}
            onClick={() => onSelect(opt.value)}
          >
            <div className="text-4xl" style={{ pointerEvents: 'none' }}>{opt.icon}</div>
            <p className="text-xs font-bold mt-1" style={{ color: 'white', pointerEvents: 'none' }}>{opt.label}</p>
          </button>
        );
      })}
    </div>
  );
};

export default CircleOptions;
