import { useState, ReactNode, useEffect } from 'react';

interface RadialItem {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  angle?: number;
  dist?: number;
}

interface RadialMenuProps {
  centerContent: ReactNode;
  centerSize?: number;
  centerGradient?: string;
  items: RadialItem[];
  defaultOpen?: boolean;
  size?: number;
}

function useResponsiveScale(baseSize: number) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const available = Math.min(vw - 32, vh - 100); // padding
      const s = Math.min(1, available / baseSize);
      setScale(Math.max(0.45, s));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [baseSize]);
  return scale;
}

const RadialMenu = ({
  centerContent,
  centerSize = 180,
  centerGradient = 'var(--gradient-primary)',
  items,
  defaultOpen = true,
  size = 500,
}: RadialMenuProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const scale = useResponsiveScale(size);
  const scaledSize = size * scale;
  const scaledCenter = centerSize * scale;
  const defaultDist = size * 0.44;

  return (
    <div className="relative flex items-center justify-center" style={{ width: scaledSize, height: scaledSize }}>
      {/* Center Button */}
      <button
        className="absolute rounded-full flex items-center justify-center text-center font-bold z-20 transition-all duration-300 border-4 cursor-pointer"
        style={{
          width: scaledCenter,
          height: scaledCenter,
          background: centerGradient,
          borderColor: 'rgba(255,255,255,0.3)',
          boxShadow: '0 0 40px rgba(102,126,234,0.4)',
          fontSize: Math.max(12, scaledCenter * 0.14),
          color: 'white',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {centerContent}
      </button>

      {/* Rays */}
      {items.map((item, i) => {
        const angle = item.angle ?? (360 / items.length) * i - 90;
        const dist = (item.dist ?? defaultDist) * scale;

        return (
          <div
            key={`ray-${i}`}
            className="absolute top-1/2 left-1/2 h-3 bg-gradient-to-r from-transparent to-white/40 origin-left -z-0 pointer-events-none transition-all duration-500"
            style={{
              width: isOpen ? dist : 0, // Animate width
              transform: `translate(0, -50%) rotate(${angle}deg)`, // Rotate from center
              opacity: isOpen ? 1 : 0,
              clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 60%)' // Triangle shape
            }}
          />
        );
      })}

      {/* Items */}
      {items.map((item, i) => {
        const angle = item.angle ?? (360 / items.length) * i - 90;
        const dist = (item.dist ?? defaultDist) * scale;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;

        return (
          <button
            key={i}
            className="absolute flex flex-col items-center justify-center cursor-pointer transition-all duration-500 z-10 radial-item group"
            style={{
              transform: isOpen
                ? `translate(${x}px, ${y}px) scale(${scale})`
                : 'translate(0, 0) scale(0)',
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
              transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
            }}
            onClick={item.onClick}
          >
            <div className="text-5xl mb-1 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
              {item.icon}
            </div>
            <p className="text-sm font-bold px-3 py-1 rounded-xl whitespace-nowrap"
              style={{
                color: 'white',
                textShadow: '0 2px 5px rgba(0,0,0,0.8)',
                background: 'rgba(0,0,0,0.3)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
              {item.label}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default RadialMenu;
