import { useState, ReactNode } from 'react';

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

const RadialMenu = ({
  centerContent,
  centerSize = 180,
  centerGradient = 'var(--gradient-primary)',
  items,
  defaultOpen = true,
  size = 500,
}: RadialMenuProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const defaultDist = size * 0.44;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Center Button */}
      <button
        className="absolute rounded-full flex items-center justify-center text-center font-bold z-20 transition-all duration-300 border-4 cursor-pointer"
        style={{
          width: centerSize,
          height: centerSize,
          background: centerGradient,
          borderColor: 'rgba(255,255,255,0.3)',
          boxShadow: '0 0 40px rgba(102,126,234,0.4)',
          fontSize: centerSize * 0.14,
          color: 'white',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {centerContent}
      </button>

      {/* Items */}
      {items.map((item, i) => {
        const angle = item.angle ?? (360 / items.length) * i - 90;
        const dist = item.dist ?? defaultDist;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;

        return (
          <button
            key={i}
            className="absolute flex flex-col items-center justify-center cursor-pointer transition-all duration-500 z-10"
            style={{
              transform: isOpen
                ? `translate(${x}px, ${y}px) scale(1)`
                : 'translate(0, 0) scale(0)',
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
              transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
            }}
            onClick={item.onClick}
          >
            <div className="text-5xl mb-1 transition-transform duration-300 hover:scale-110 drop-shadow-lg">
              {item.icon}
            </div>
            <p className="text-sm font-bold px-3 py-1 rounded-xl"
              style={{
                color: 'white',
                textShadow: '0 2px 5px rgba(0,0,0,0.8)',
                background: 'rgba(0,0,0,0.3)',
              }}>
              {label(item.label)}
            </p>
          </button>
        );
      })}
    </div>
  );
};

function label(text: string) {
  return text;
}

export default RadialMenu;
