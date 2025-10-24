
import React from 'react';

const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962c.513-.464 1.203-.787 1.95-.918 1.066-.234 2.226.045 2.89.816M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18.75a9.094 9.094 0 013.742-.479 3 3 0 014.682-2.72M8.25 9.75a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export default UsersIcon;
