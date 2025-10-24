import React from 'react';

const CrownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M16.5 6a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM12 21.75l-5.25-3 5.25-6 5.25 6-5.25 3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21.75v-6.75"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 12l-5.25-3-5.25 3 5.25 3 5.25-3zM2.25 12l5.25-3 5.25 3-5.25 3-5.25-3z"
    />
  </svg>
);

export default CrownIcon;
