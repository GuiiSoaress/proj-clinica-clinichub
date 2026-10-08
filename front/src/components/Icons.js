// src/components/Icons.js
import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

// Ícones do protótipo (viewBox 24x24). `filled` preenche o ícone (aba ativa).
export default function Icon({ name, size = 24, color = '#1d2b28', strokeWidth = 1.9, filled = false }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'plus':
      return (
        <Svg {...common} strokeWidth={2.6}>
          <Path d="M12 5v14M5 12h14" />
        </Svg>
      );
    case 'calendarPlus':
      return (
        <Svg {...common}>
          <Rect x="3.5" y="5" width="17" height="15" rx="3" />
          <Path d="M8 3v4M16 3v4M12 10v6M9 13h6" />
        </Svg>
      );
    case 'clipboard':
      return (
        <Svg {...common}>
          <Rect x="5" y="4" width="14" height="17" rx="3" />
          <Path d="M9 4V3h6v1M9 11h6M9 15h4" />
        </Svg>
      );
    case 'user':
      return (
        <Svg {...common} fill={filled ? color : 'none'} strokeWidth={1.8}>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M4.5 20c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5z" />
        </Svg>
      );
    case 'flask':
      return (
        <Svg {...common}>
          <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M8 15h8" />
        </Svg>
      );
    case 'home':
      return (
        <Svg {...common} fill={filled ? color : 'none'} strokeWidth={1.8}>
          <Path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...common} strokeWidth={2}>
          <Circle cx="11" cy="11" r="7" />
          <Path d="M20 20l-4-4" />
        </Svg>
      );
    case 'back':
      return (
        <Svg {...common} strokeWidth={2.2}>
          <Path d="M15 5l-7 7 7 7" />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...common} strokeWidth={2.6}>
          <Path d="M5 12.5l4.5 4.5L19 7.5" />
        </Svg>
      );
    case 'checkCircle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" fill={color} />
          <Path d="M7.5 12.5l3 3 6-6.5" stroke="#1d2b28" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'fingerprint':
      return (
        <Svg {...common} strokeWidth={1.8}>
          <Path d="M12 11c0 3-1 5-2 7M8 8a4 4 0 0 1 8 0c0 1.5-.2 3-.5 4.5M5 10a7 7 0 0 1 14 0v1M5 14c0-1 0-2 .2-3M16 17c-.4 1.4-1 2.6-1.8 3.6" />
        </Svg>
      );
    default:
      return null;
  }
}

// Mini mapa estilizado usado no card "Local".
export function MiniMap() {
  return (
    <Svg width={120} height={84} viewBox="0 0 120 84">
      <Path d="M0 60 L120 30 M30 0 L50 84 M85 0 L70 84" stroke="#ffffff" strokeWidth={6} fill="none" />
      <Path d="M60 22a9 9 0 0 1 9 9c0 7-9 17-9 17s-9-10-9-17a9 9 0 0 1 9-9z" fill="#ff7f5f" />
      <Circle cx="60" cy="31" r="3.2" fill="#1d2b28" />
    </Svg>
  );
}
