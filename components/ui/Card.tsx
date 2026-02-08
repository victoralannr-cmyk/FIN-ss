
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  // Added style prop to support custom CSS like transitionDelay
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, style }) => {
  return (
    <div 
      className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm ${className}`}
      style={style}
    >
      {title && <h3 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">{title}</h3>}
      {children}
    </div>
  );
};
