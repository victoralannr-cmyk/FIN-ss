
import React from 'react';

interface WeeklyTaskChartProps {
  data: number[]; // 7 values for Sat-Fri
}

export const WeeklyTaskChart: React.FC<WeeklyTaskChartProps> = ({ data }) => {
  const days = ['Sáb', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  const max = Math.max(...data, 5); // Ensure at least scale of 5

  return (
    <div className="w-full pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
      <div className="flex justify-between items-end h-40 gap-2 sm:gap-4 px-2">
        {data.map((val, i) => {
          const heightPercent = (val / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex items-end justify-center h-full bg-neutral-900/50 rounded-xl overflow-hidden border border-neutral-800/30">
                <div 
                  className="w-full bg-[#ff0000] rounded-t-sm transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,0,0,0.3)] group-hover:bg-[#cc0000]"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#ff0000] opacity-0 group-hover:opacity-100 transition-opacity">
                  {val}
                </span>
              </div>
              <span className="text-[9px] font-black text-neutral-600 uppercase tracking-tighter sm:tracking-widest group-hover:text-neutral-400 transition-colors">
                {days[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
