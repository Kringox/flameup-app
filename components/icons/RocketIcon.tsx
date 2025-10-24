
import React from 'react';

const RocketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.3.05-3.1S5.34 15.64 4.5 16.5z" />
        <path d="M19.5 4.5c1.5-1.26 2-5 2-5s-3.74.5-5 2c-.71.84-.7 2.3-.05 3.1s.84 1.25 1.55 1.9" />
        <path d="M21.5 9.5l-1.6-1.6" />
        <path d="M16 8l-1.6-1.6" />
        <path d="M12 12l-1.6-1.6" />
        <path d="M8 16l-1.6-1.6" />
        <path d="M10 14l-1.5-1.5" />
        <path d="M14 10l-1.5-1.5" />
    </svg>
);

export default RocketIcon;