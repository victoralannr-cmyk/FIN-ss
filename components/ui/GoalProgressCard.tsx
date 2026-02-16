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
    <div className="flex flex-col h-full w-full">
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#CC5A5A] mb-6 lg:mb-8 text-center sm:text-left">PROGRESSO DE METAS</h3>
      
      <div className="flex-1 flex flex-col justify-between items-center w-full">
        <div className="flex items-center justify-center relative py-4 w-full">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0 w-32 h-32 transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="var(--border-color)"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress Circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="#CC5A5A"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                style={{ strokeDashoffset: offset }}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out shadow-sm"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-[var(--text-primary)] leading-none text-center tabular-nums">{percentage}%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end w-full mt-4 lg:mt-6 px-2">
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-[#CC5A5A] leading-none tabular-nums">{activeCount}</span>
            <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">Ativas</span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-[var(--text-primary)] leading-none tabular-nums">{completedCount}</span>
            <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">Completas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
