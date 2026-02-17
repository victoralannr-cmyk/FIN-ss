import React from 'react';

interface WeeklyExpensesChartProps {
  data: number[]; // 7 values for Sat-Fri
}

export const WeeklyExpensesChart: React.FC<WeeklyExpensesChartProps> = ({ data }) => {
  const days = ['Sáb', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  const max = Math.max(...data, 100); // Scale logic

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white mb-8">GASTOS DA SEMANA</h3>
      
      <div className="flex-1 flex items-end justify-between h-40 gap-2 px-1">
        {data.map((val, i) => {
          const heightPercent = (val / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex items-end justify-center h-full bg-neutral-900/50 rounded-lg overflow-hidden border border-neutral-800/20">
                <div 
                  className="w-full bg-[#fa7f72] transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(250,127,114,0.2)] group-hover:bg-[#fb988f]"
                  style={{ height: `${heightPercent}%` }}
                />
                {val > 0 && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-[#fa7f72] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    R$ {val}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-black text-neutral-600 uppercase tracking-tighter group-hover:text-neutral-400 transition-colors">
                {days[i]}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-neutral-800/50 flex justify-between items-center">
        <span className="text-[8px] text-neutral-600 uppercase font-black">Escala Dinâmica</span>
        <span className="text-[10px] font-black text-[#fa7f72]">R$ {data.reduce((a, b) => a + b, 0).toLocaleString('pt-BR')} Total</span>
      </div>
    </div>
  );
};