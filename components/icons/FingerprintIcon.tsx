import React from 'react';

const FingerprintIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.588 8.188M5.25 9.75A3.75 3.75 0 019 6m12 0a3.75 3.75 0 01-3.75 3.75M9 15l1.076 1.076a3.75 3.75 0 005.304 0L19.5 15m-9 0a3.75 3.75 0 00-3.75 3.75M15 15a3.75 3.75 0 013.75 3.75m-15-6.375a3.75 3.75 0 013.75-3.75m9.375 0a3.75 3.75 0 01-3.75 3.75M4.5 19.5a3.75 3.75 0 013.75-3.75"
    />
  </svg>
);

export default FingerprintIcon;
