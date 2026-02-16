import React, { useMemo } from 'react';

interface RadarData {
  label: string;
  value: number; // 0-100
  color: string;
}

interface RadarScoreChartProps {
  data: RadarData[];
  size?: number;
}

export const RadarScoreChart: React.FC<RadarScoreChartProps> = ({ data, size = 320 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) * 0.65;
  const themeColor = "#CC5A5A";

  const averageScore = useMemo(() => {
    return Math.round(data.reduce((acc, curr) => acc + curr.value, 0) / data.length);
  }, [data]);

  const getCoordinates = (index: number, value: number, total: number, r: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    return {
      x: centerX + r * (value / 100) * Math.cos(angle),
      y: centerY + r * (value / 100) * Math.sin(angle),
    };
  };

  const getLabelCoordinates = (index: number, total: number, r: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const labelOffset = size * 0.15;
    return {
      x: centerX + (r + labelOffset) * Math.cos(angle),
      y: centerY + (r + labelOffset) * Math.sin(angle),
    };
  };

  const gridLevels = [25, 50, 75, 100];
  const gridPaths = gridLevels.map((level) => {
    return data.map((_, i) => {
      const { x, y } = getCoordinates(i, level, data.length, radius);
      return `${x},${y}`;
    }).join(' ');
  });

  const dataPoints = data.map((d, i) => {
    const { x, y } = getCoordinates(i, d.value, data.length, radius);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative flex items-center justify-center select-none group animate-in fade-in zoom-in-95 duration-1000 w-full max-w-[320px] mx-auto">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible w-full h-auto drop-shadow-sm">
        {/* Background Grid */}
        {gridPaths.map((path, i) => (
          <polygon
            key={i}
            points={path}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {/* Axis Lines */}
        {data.map((_, i) => {
          const { x, y } = getCoordinates(i, 100, data.length, radius);
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="var(--border-color)"
              strokeWidth="1"
              opacity="0.3"
            />
          );
        })}

        {/* Data Polygon Fill */}
        <polygon
          points={dataPoints}
          fill="rgba(204, 90, 90, 0.2)"
          stroke={themeColor}
          strokeWidth="3"
          className="transition-all duration-700 ease-out"
        />

        {/* Labels */}
        {data.map((d, i) => {
          const { x, y } = getLabelCoordinates(i, data.length, radius);
          return (
            <text
              key={i}
              x={x}
              y={y}
              fill="var(--text-secondary)"
              fontSize={10} 
              fontWeight="900"
              textAnchor="middle"
              className="uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--font-main)' }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Central Score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-black text-[var(--text-primary)] tracking-tighter leading-none tabular-nums">{averageScore}</span>
        <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mt-1">Nível</span>
      </div>
    </div>
  );
};
