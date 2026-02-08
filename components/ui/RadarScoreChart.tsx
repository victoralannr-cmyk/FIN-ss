
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
  const radius = (size / 2) * 0.7;

  const averageScore = useMemo(() => {
    return Math.round(data.reduce((acc, curr) => acc + curr.value, 0) / data.length);
  }, [data]);

  // Helper to calculate coordinates for a point on the radar
  const getCoordinates = (index: number, value: number, total: number, r: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    return {
      x: centerX + r * (value / 100) * Math.cos(angle),
      y: centerY + r * (value / 100) * Math.sin(angle),
    };
  };

  const getLabelCoordinates = (index: number, total: number, r: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const labelOffset = size * 0.12; // Dynamic offset based on size
    return {
      x: centerX + (r + labelOffset) * Math.cos(angle),
      y: centerY + (r + labelOffset) * Math.sin(angle),
    };
  };

  // Generate grid polygons (the "spider web")
  const gridLevels = [25, 50, 75, 100];
  const gridPaths = gridLevels.map((level) => {
    return data.map((_, i) => {
      const { x, y } = getCoordinates(i, level, data.length, radius);
      return `${x},${y}`;
    }).join(' ');
  });

  // Generate the actual data polygon
  const dataPoints = data.map((d, i) => {
    const { x, y } = getCoordinates(i, d.value, data.length, radius);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative flex items-center justify-center select-none group animate-in fade-in zoom-in-95 duration-1000">
      <svg width={size} height={size} className="overflow-visible drop-shadow-[0_0_30px_rgba(16,185,129,0.1)]">
        {/* Background Grid */}
        {gridPaths.map((path, i) => (
          <polygon
            key={i}
            points={path}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
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
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data Polygon Fill */}
        <polygon
          points={dataPoints}
          fill="rgba(16, 185, 129, 0.15)"
          stroke="rgba(16, 185, 129, 0.6)"
          strokeWidth="2.5"
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
              fill={d.color}
              fontSize={size * 0.03} // Dynamic font size
              fontWeight="900"
              textAnchor="middle"
              className="uppercase tracking-widest opacity-80"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Central Score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-none">{averageScore}</span>
        <span className="text-[8px] sm:text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] mt-1">Score</span>
      </div>
    </div>
  );
};
