import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, style }) => {
  return (
    <div 
      className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm transition-all duration-300 ${className}`}
      style={style}
    >
      {title && <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider animate-fade-up">{title}</h3>}
      {children}
    </div>
  );
};