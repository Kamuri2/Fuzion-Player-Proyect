import React from 'react';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export default function GlassContainer({ children, className = '', tint = 'light' }: GlassContainerProps) {
  const bgColors = {
    light: 'bg-white/20',
    dark: 'bg-black/30',
    default: 'bg-transparent'
  };

  return (
    <div className={`backdrop-blur-md rounded-lg overflow-hidden border border-white/20 ${bgColors[tint]} ${className}`}>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
