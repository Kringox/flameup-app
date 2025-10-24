import React from 'react';

const ShareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.195.025.39.042.586.042h2.406a2.25 2.25 0 012.122 1.583m-4.528-1.583A2.25 2.25 0 005.25 12.001v.002c0 .541.205 1.041.558 1.432M12 3.75a2.25 2.25 0 012.25 2.25c0 1.24-1.01 2.25-2.25 2.25S9.75 7.24 9.75 6A2.25 2.25 0 0112 3.75zM12 18a2.25 2.25 0 002.25-2.25c0-1.24-1.01-2.25-2.25-2.25S9.75 14.51 9.75 15.75A2.25 2.25 0 0012 18z"
    />
  </svg>
);

export default ShareIcon;
