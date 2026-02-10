
import React from 'react';

interface GoalProgressCardProps {
  activeCount: number;
  completedCount: number;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ activeCount, completedCount }) => {
  const total = activeCount + completedCount;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  
  // SVG Ring properties
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white mb-8">PROGRESSO DE METAS</h3>
      
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-center relative py-4">
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-neutral-800"
            />
            {/* Progress Circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="#ff0000"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: offset }}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,0,0,0.5)]"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-white">{percentage}%</span>
          </div>
        </div>

        <div className="flex justify-between items-end mt-4">
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-[#ffae00] leading-none">{activeCount}</span>
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mt-1">Ativas</span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-[#ff0000] leading-none">{completedCount}</span>
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mt-1">Completas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
