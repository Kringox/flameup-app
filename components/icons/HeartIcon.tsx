import React from 'react';

interface HeartIconProps extends React.SVGProps<SVGSVGElement> {
    isLiked: boolean;
}

const HeartIcon: React.FC<HeartIconProps> = ({ isLiked, ...props }) => {
    const fillClass = isLiked ? "currentColor" : "none";
    const strokeClass = isLiked ? "none" : "currentColor";
    const colorClass = isLiked ? "text-red-500" : "text-gray-800";

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-6 w-6 cursor-pointer hover:text-red-500 transition-colors ${colorClass}`}
            fill={fillClass}
            viewBox="0 0 24 24"
            stroke={strokeClass}
            strokeWidth={2}
            {...props}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
    );
};

export default HeartIcon;
