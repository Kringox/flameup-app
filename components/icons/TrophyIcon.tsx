
import React from 'react';

const TrophyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M16.5 18.75h-9a9.75 9.75 0 01-4.875-1.916m4.875 1.916v-2.25c0-1.22.99-2.25 2.25-2.25h4.5c1.24 0 2.25 1.03 2.25 2.25v2.25m-6.75-6.75h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zm18 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008zM4.5 9.75v6.75c0 1.22.99 2.25 2.25 2.25h9c1.24 0 2.25-1.03 2.25-2.25V9.75m-13.5 0V6c0-1.657 1.343-3 3-3h7.5c1.657 0 3 1.343 3 3v3.75"
    />
  </svg>
);

export default TrophyIcon;
