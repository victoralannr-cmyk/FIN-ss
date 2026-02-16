import React, { useEffect, useState, useMemo } from 'react';

interface AnimatedChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export const AnimatedChart: React.FC<AnimatedChartProps> = ({ 
  data, 
  color = '#CC5A5A', 
  height = 120 
}) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const { points, areaPath, width } = useMemo(() => {
    if (data.length < 2) return { points: '', areaPath: '', width: 400 };
    
    const svgWidth = 400;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = (max - min) || 1;
    const padding = 15;
    const step = svgWidth / (data.length - 1);

    const pts = data.map((val, i) => {
      const x = i * step;
      const y = padding + (height - 2 * padding) * (1 - (val - min) / range);
      return { x, y };
    });

    // Generate smooth bezier curve path
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const controlX = (curr.x + next.x) / 2;
      d += ` C ${controlX} ${curr.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    const area = `${d} L ${svgWidth} ${height} L 0 ${height} Z`;
    
    return { points: d, areaPath: area, width: svgWidth };
  }, [data, height]);

  if (data.length < 2) {
    return (
      <div className="w-full h-full flex items-center justify-center italic text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
        Dados insuficientes para projeção
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-visible">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradientArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#chartGradientArea)"
          className={`transition-opacity duration-1000 ease-out ${animated ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Line path with glow */}
        <path
          d={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          style={{
            strokeDasharray: 1200,
            strokeDashoffset: animated ? 0 : 1200,
            transition: 'stroke-dashoffset 2.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </svg>
    </div>
  );
};