
import React from 'react';

const CoinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.828l.707-.707a4.5 4.5 0 00-6.364-6.364l-.707.707M15 18.828l-.707-.707a4.5 4.5 0 006.364-6.364l.707.707M9 6.172l.707.707a4.5 4.5 0 016.364 6.364l.707.707"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9 9 0 100-18 9 9 0 000 18z"
    />
  </svg>
);

export default CoinIcon;
