import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-block group ${className}`}>
      {children}
      <div 
        className="absolute -top-1 -right-1 z-30 cursor-help group/help opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <div className="bg-white rounded-full shadow-sm border border-zinc-200 p-0.5 hover:border-app-primary transition-colors">
          <HelpCircle className="w-2.5 h-2.5 text-zinc-400 group-hover/help:text-app-primary" />
        </div>
        
        {isVisible && (
          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-zinc-900 text-white text-[10px] font-bold rounded-none shadow-xl z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-200">
            {text}
            <div className="absolute top-full right-2 w-2 h-2 bg-zinc-900 rotate-45 -translate-y-1" />
          </div>
        )}
      </div>
    </div>
  );
};
