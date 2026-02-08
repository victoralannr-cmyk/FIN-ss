
import React, { useEffect, useState } from 'react';

interface AnimatedChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export const AnimatedChart: React.FC<AnimatedChartProps> = ({ 
  data, 
  color = '#10b981', 
  height = 100 
}) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 10;
  const width = 400;
  const step = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * step;
    const y = padding + (height - 2 * padding) * (1 - (val - min) / range);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-hidden">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={`M 0 ${height} L ${points} L ${width} ${height} Z`}
          fill="url(#chartGradient)"
          className={`transition-all duration-1000 ease-out ${animated ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Line path */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: animated ? 0 : 1000,
            transition: 'stroke-dashoffset 2s ease-in-out'
          }}
        />
        
        {/* Data points */}
        {data.map((val, i) => {
          const x = i * step;
          const y = padding + (height - 2 * padding) * (1 - (val - min) / range);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#0a0a0a"
              stroke={color}
              strokeWidth="2"
              className={`transition-all duration-500 delay-[${i * 100}ms] ${animated ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
            />
          );
        })}
      </svg>
    </div>
  );
};
