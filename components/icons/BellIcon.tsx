import React from 'react';

interface BellIconProps extends React.SVGProps<SVGSVGElement> {
    hasNotification?: boolean;
}

const BellIcon: React.FC<BellIconProps> = ({ hasNotification = false, ...props }) => (
    <div className="relative">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-600"
            {...props}
        >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasNotification && (
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-flame-red rounded-full border-2 border-white"></div>
        )}
    </div>
);

export default BellIcon;
