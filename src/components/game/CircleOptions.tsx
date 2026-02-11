import { ReactNode, useState, useEffect } from 'react';

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

function useResponsiveScale(baseSize: number) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const available = Math.min(vw - 32, vh - 160);
      const s = Math.min(1, available / baseSize);
      setScale(Math.max(0.5, s));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [baseSize]);
  return scale;
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
  const scale = useResponsiveScale(size);
  const scaledSize = size * scale;
  const scaledDist = dist * scale;
  const centerW = Math.max(80, 140 * scale);

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: scaledSize, height: scaledSize }}>
      {/* Center */}
      <button
        className="absolute rounded-full flex items-center justify-center z-20 cursor-pointer transition-all duration-300 hover:scale-110 border-4"
        style={{
          width: centerW,
          height: centerW,
          background: centerGradient,
          borderColor: 'rgba(255,255,255,0.3)',
          boxShadow: '0 8px 25px rgba(253,184,19,0.4)',
          fontSize: Math.max(28, 48 * scale),
        }}
        onClick={onCenterClick}
      >
        {centerIcon}
      </button>

      {/* Options */}
      {options.map((opt, i) => {
        const angle = (360 / options.length) * i - 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * scaledDist;
        const y = Math.sin(rad) * scaledDist;
        const isSelected = selectedValue === opt.value;
        const optSize = Math.max(60, 100 * scale);

        return (
          <button
            key={opt.value}
            className="absolute flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all duration-500 z-10 animate-bounce-in border-2"
            style={{
              width: optSize,
              height: optSize,
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
            <div style={{ fontSize: Math.max(20, 36 * scale), pointerEvents: 'none' }}>{opt.icon}</div>
            <p className="font-bold mt-0.5" style={{ fontSize: Math.max(9, 12 * scale), color: 'white', pointerEvents: 'none' }}>{opt.label}</p>
          </button>
        );
      })}
    </div>
  );
};

export default CircleOptions;
