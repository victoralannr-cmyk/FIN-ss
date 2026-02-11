import React from 'react';
import { Transaction } from '../../types';

interface CategoryExpensesChartProps {
  transactions: Transaction[];
}

export const CategoryExpensesChart: React.FC<CategoryExpensesChartProps> = ({ transactions }) => {
  const categoryMap = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc: Record<string, number>, t) => {
      const category = t.category;
      const amount = t.amount;
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

  const data = (Object.entries(categoryMap) as Array<[string, number]>)
    .map(([name, amount]) => ({ name, amount: amount as number }))
    .sort((a, b) => b.amount - a.amount);

  const total: number = data.reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0);
  
  const colors = [
    '#d4af37', // Gold
    '#b8860b', // Dark Gold
    '#f4a261', // Sandy Gold
    '#ffd700', // Bright Gold
    '#daa520', // Goldenrod
    '#8b4513', // Bronze/Saddle
  ];

  const size: number = 120;
  const strokeWidth: number = 18;
  const radius: number = (size - strokeWidth) / 2;
  const circumference: number = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col h-full w-full">
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white mb-6 lg:mb-8">GASTOS POR CATEGORIA</h3>
      
      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-neutral-800 rounded-2xl py-8">
          <p className="text-[10px] text-neutral-600 uppercase font-black tracking-widest text-center">Sem dados de gastos</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 lg:gap-8">
          {/* Donut Chart */}
          <div className="relative shrink-0">
            <svg width={size} height={size} className="transform -rotate-90">
              {data.map((item, i) => {
                const percentage = item.amount / total;
                const strokeDasharray = `${percentage * circumference} ${circumference}`;
                const strokeDashoffset = -cumulativeOffset;
                cumulativeOffset += percentage * circumference;

                return (
                  <circle
                    key={i}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={colors[i % colors.length]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                  />
                );
              })}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius - strokeWidth / 2 - 2}
                fill="#0a0a0a"
              />
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full space-y-3">
            {data.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: colors[i % colors.length] }} 
                  />
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-tight group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] font-black text-white ml-4 tabular-nums">
                  R$ {item.amount.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
            {data.length > 5 && (
               <div className="text-[8px] text-neutral-600 uppercase font-black tracking-widest text-right mt-2">
                 + {data.length - 5} Outras
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};