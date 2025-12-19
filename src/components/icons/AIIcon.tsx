import React from 'react'

interface AIIconProps {
  size?: number
  className?: string
}

const AIIcon: React.FC<AIIconProps> = ({ size = 24, className = '' }) => {
  const id = React.useId().replace(/:/g, ''); // Ensure safe ID for SVG
  const clipPathId = `lobe-icons-meta-ai-fill-0-${id}`;
  const filterId = `lobe-icons-meta-ai-fill-1-${id}`;
  const gradientId = `lobe-icons-meta-ai-fill-2-${id}`;

  return (
    <svg
      height={`${size}px`}
      width={`${size}px`}
      className={className}
      style={{ flex: 'none', lineHeight: 1 }}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>AIBot</title>
      <g>
        <path
          d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm0 3.627a8.373 8.373 0 100 16.746 8.373 8.373 0 000-16.746z"
          fill={`url(#${gradientId})`}
          fillRule="evenodd"
        ></path>
      </g>
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1="24"
          x2="0"
          y1="0"
          y2="24"
        >
          <stop offset=".13" stopColor="#FF97E3"></stop>
          <stop offset=".18" stopColor="#D14FE1"></stop>
          <stop offset=".338" stopColor="#0050E2"></stop>
          <stop offset=".666" stopColor="#0050E2"></stop>
          <stop offset=".809" stopColor="#00DDF4"></stop>
          <stop offset=".858" stopColor="#23F8CC"></stop>
        </linearGradient>
        <clipPath id={clipPathId}>
          <path d="M0 0h24v24H0z" fill="#fff"></path>
        </clipPath>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="24"
          id={filterId}
          width="24"
          x="0"
          y="0"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
          <feBlend
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          ></feBlend>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset></feOffset>
          <feGaussianBlur stdDeviation=".75"></feGaussianBlur>
          <feComposite
            in2="hardAlpha"
            k2="-1"
            k3="1"
            operator="arithmetic"
          ></feComposite>
          <feColorMatrix values="0 0 0 0 1 0 0 1 0 0 0 0 1 0 0 0 0.5 0"></feColorMatrix>
          <feBlend in2="shape" result="effect1_innerShadow_674_237"></feBlend>
        </filter>
      </defs>
    </svg>
  )
}

export default AIIcon
