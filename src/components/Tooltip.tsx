import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isVisible && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isVisible]);

  return (
    <div className={`relative inline-block group ${className}`}>
      {children}
      <div 
        ref={iconRef}
        className="absolute -top-1 -right-1 z-30 cursor-help group/help opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <div className="bg-white rounded-full shadow-sm border border-zinc-200 p-0.5 hover:border-app-primary transition-colors">
          <HelpCircle className="w-2.5 h-2.5 text-zinc-400 group-hover/help:text-app-primary" />
        </div>
        
        {isVisible && createPortal(
          <div 
            className="fixed z-[9999] pointer-events-none w-48 p-2 bg-zinc-900 text-white text-[10px] font-bold rounded-none shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-200 -translate-y-full"
            style={{ 
              top: coords.top - 8,
              right: coords.right - 8 // center arrow approximately
            }}
          >
            {text}
            <div className="absolute top-full right-2 w-2 h-2 bg-zinc-900 rotate-45 -translate-y-1" />
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
