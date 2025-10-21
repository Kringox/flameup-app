
import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    isGradient?: boolean;
}

const FlameIcon: React.FC<IconProps> = ({ isGradient = false, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {isGradient && (
      <defs>
        <linearGradient id="flameGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#FF6B35' }} />
          <stop offset="100%" style={{ stopColor: '#FF4757' }} />
        </linearGradient>
      </defs>
    )}
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" stroke={isGradient ? "url(#flameGradient)" : "currentColor"}/>
  </svg>
);

export default FlameIcon;
