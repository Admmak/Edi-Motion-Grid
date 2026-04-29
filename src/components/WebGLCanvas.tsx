import React, { useEffect, useRef, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Tooltip } from './Tooltip';

export interface GridLines {
  v: number[];
  h: number[];
}

export interface MergedCell {
  id: string;
  minI: number;
  maxI: number;
  minJ: number;
  maxJ: number;
}

interface WebGLCanvasProps {
  imageSrc: string;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  snapToGrid?: boolean;
  lines: GridLines;
  sourceLines?: GridLines | null;
  onLinesChange: (lines: GridLines) => void;
  onLinesChangeEnd?: (lines: GridLines) => void;
  resolution?: { width: number, height: number } | null;
  isPointerMode?: boolean;
  lockedCells?: string[];
  onToggleLock?: (key: string) => void;
  mergedCells?: MergedCell[];
  selectedCells?: string[];
  onSelectCell?: (cellKey: string, multi: boolean) => void;
  className?: string;
}

export default function WebGLCanvas({ imageSrc, onCanvasReady, snapToGrid = false, lines, sourceLines, onLinesChange, onLinesChangeEnd, resolution, isPointerMode = false, lockedCells = [], onToggleLock, mergedCells = [], selectedCells = [], onSelectCell, className = '' }: WebGLCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programInfoRef = useRef<any>(null);
  
  const [selectedV, setSelectedV] = useState<number[]>([]);
  const [selectedH, setSelectedH] = useState<number[]>([]);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const selectionBoxRef = useRef<{ startX: number; startY: number } | null>(null);

  const draggingRef = useRef<{
    vIndices: number[];
    hIndices: number[];
    startX: number;
    startY: number;
    startLines: GridLines;
    lockedCellKey?: string;
  } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let targetWidth = resolution ? resolution.width : img.width;
      let targetHeight = resolution ? resolution.height : img.height;
      
      // Ensure even dimensions for video encoding
      targetWidth = Math.floor(targetWidth / 2) * 2;
      targetHeight = Math.floor(targetHeight / 2) * 2;
      
      // Max size for actual canvas processing (to avoid memory crashes on mobile)
      const maxCanvasSize = 3000;
      if (targetWidth > maxCanvasSize || targetHeight > maxCanvasSize) {
        const clampRatio = Math.min(maxCanvasSize / targetWidth, maxCanvasSize / targetHeight);
        targetWidth = Math.floor((targetWidth * clampRatio) / 2) * 2;
        targetHeight = Math.floor((targetHeight * clampRatio) / 2) * 2;
      }
      
      // Calculate display size fitting within max bounds (e.g., 800x800)
      const maxWidth = 800;
      const maxHeight = 800;
      let displayWidth = targetWidth;
      let displayHeight = targetHeight;
      
      if (displayWidth > maxWidth || displayHeight > maxHeight) {
        const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
        displayWidth *= ratio;
        displayHeight *= ratio;
      }
      
      setDimensions({ width: displayWidth, height: displayHeight });
      
      if (canvasRef.current) {
        canvasRef.current.width = targetWidth;
        canvasRef.current.height = targetHeight;
        onCanvasReady(canvasRef.current);
        
        const gl = canvasRef.current.getContext('webgl', { preserveDrawingBuffer: true });
        if (gl) {
          glRef.current = gl;
          try {
            programInfoRef.current = initWebGL(gl, img);
            render(lines);
          } catch (err) {
            console.error("Error initializing WebGL:", err);
          }
        } else {
          console.error("WebGL not supported");
        }
      }
    };
    img.onerror = (err) => {
      console.error("Error loading image:", err);
    };
    img.src = imageSrc;
  }, [imageSrc, resolution]);

  const render = (currentLines: GridLines, currentMerged: MergedCell[] = mergedCells) => {
    if (glRef.current && programInfoRef.current) {
      const vx = [0, ...currentLines.v, 1];
      const vy = [0, ...currentLines.h, 1];
      
      const svx = sourceLines ? [0, ...sourceLines.v, 1] : vx;
      const svy = sourceLines ? [0, ...sourceLines.h, 1] : vy;
      
      drawScene(glRef.current, programInfoRef.current, vx, vy, svx, svy, currentMerged);
    }
  };

  useEffect(() => {
    render(lines, mergedCells);
  }, [lines, sourceLines, mergedCells]);

  useEffect(() => {
    setSelectedV([]);
    setSelectedH([]);
  }, [lines.v.length, lines.h.length]);

  const handlePointerDown = (vIndices: number[], hIndices: number[], isCell: boolean = false, cellKey?: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isShift = e.shiftKey;
    let finalV = [...vIndices];
    let finalH = [...hIndices];

    if (isShift) {
      const isVIn = vIndices.length > 0 && vIndices.every(idx => selectedV.includes(idx));
      const isHIn = hIndices.length > 0 && hIndices.every(idx => selectedH.includes(idx));
      const isAlreadySelected = (vIndices.length > 0 && hIndices.length > 0) ? (isVIn && isHIn) : (vIndices.length > 0 ? isVIn : isHIn);

      const newSelectedV = [...selectedV];
      const newSelectedH = [...selectedH];
      
      if (isAlreadySelected) {
        vIndices.forEach(idx => {
          const pos = newSelectedV.indexOf(idx);
          if (pos > -1) newSelectedV.splice(pos, 1);
        });
        hIndices.forEach(idx => {
          const pos = newSelectedH.indexOf(idx);
          if (pos > -1) newSelectedH.splice(pos, 1);
        });
      } else {
        vIndices.forEach(idx => {
          if (!newSelectedV.includes(idx)) newSelectedV.push(idx);
        });
        hIndices.forEach(idx => {
          if (!newSelectedH.includes(idx)) newSelectedH.push(idx);
        });
      }
      
      setSelectedV(newSelectedV);
      setSelectedH(newSelectedH);
      
      finalV = newSelectedV;
      finalH = newSelectedH;
      
      if (selectedCells.length > 0) {
        onSelectCell?.('', false);
      }
    } else {
      // If clicking something already selected, drag the whole selection
      const isVSelected = vIndices.length > 0 && vIndices.every(idx => selectedV.includes(idx));
      const isHSelected = hIndices.length > 0 && hIndices.every(idx => selectedH.includes(idx));
      
      // If clicking an intersection or cell (both axes), both must be selected to drag the whole selection.
      // If clicking a single line, either axis being selected is enough.
      const shouldDragSelection = (vIndices.length > 0 && hIndices.length > 0) 
        ? (isVSelected && isHSelected)
        : (isVSelected || isHSelected);
      
      if (shouldDragSelection) {
        finalV = selectedV;
        finalH = selectedH;
      } else {
        if (isCell) {
          // Clicked a cell without shift: clear selection
          setSelectedV([]);
          setSelectedH([]);
          finalV = vIndices;
          finalH = hIndices;
        } else {
          // Select only this one
          setSelectedV(vIndices);
          setSelectedH(hIndices);
          finalV = vIndices;
          finalH = hIndices;
        }
      }
      
      if (isCell && cellKey) {
        if (!selectedCells.includes(cellKey)) {
          onSelectCell?.(cellKey, false);
        }
      } else {
        if (selectedCells.length > 0) {
          onSelectCell?.('', false);
        }
      }
    }

    draggingRef.current = { 
      vIndices: finalV, 
      hIndices: finalH, 
      startX: e.clientX, 
      startY: e.clientY,
      startLines: { v: [...lines.v], h: [...lines.h] },
      lockedCellKey: cellKey && lockedCells.includes(cellKey) ? cellKey : undefined
    };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    if (isPointerMode && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      const clampedX = Math.max(0.005, Math.min(0.995, x));
      const clampedY = Math.max(0.005, Math.min(0.995, y));
      
      const threshold = 0.01;
      const tooCloseV = lines.v.some(v => Math.abs(v - clampedX) < threshold);
      const tooCloseH = lines.h.some(h => Math.abs(h - clampedY) < threshold);
      
      if (tooCloseV && tooCloseH) return;
      
      const newV = [...lines.v];
      const newH = [...lines.h];
      
      if (!tooCloseV && newV.length < 10) {
        newV.push(clampedX);
        newV.sort((a, b) => a - b);
      }
      
      if (!tooCloseH && newH.length < 10) {
        newH.push(clampedY);
        newH.sort((a, b) => a - b);
      }
      
      onLinesChange({ v: newV, h: newH });
      return;
    }

    if (e.target !== e.currentTarget) return;

    // Clicked on background, clear selection
    if (!e.shiftKey) {
      setSelectedV([]);
      setSelectedH([]);
      onSelectCell?.('', false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x, y });
    }

    if (!draggingRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - draggingRef.current.startX) / rect.width;
    const deltaY = (e.clientY - draggingRef.current.startY) / rect.height;
    
    const { vIndices, hIndices, startLines, lockedCellKey } = draggingRef.current;
    const newLines = { v: [...lines.v], h: [...lines.h] };

    const shouldSnap = snapToGrid ? !e.shiftKey : e.shiftKey;

    const getCellBoundaries = (key: string) => {
      let minI, maxI, minJ, maxJ;
      if (key.startsWith('merged-')) {
        const mcId = key.replace('merged-', '');
        const mc = mergedCells.find(m => m.id === mcId);
        if (!mc) return null;
        minI = mc.minI; maxI = mc.maxI; minJ = mc.minJ; maxJ = mc.maxJ;
      } else {
        const [iStr, jStr] = key.split('-');
        minI = parseInt(iStr, 10); maxI = minI + 1; minJ = parseInt(jStr, 10); maxJ = minJ + 1;
      }
      return { minI, maxI, minJ, maxJ };
    };

    if (lockedCellKey) {
      // Logic for dragging the interior of a locked cell (moves as a block)
      let bounds = getCellBoundaries(lockedCellKey);
      if (!bounds) return;
      const { minI, maxI, minJ, maxJ } = bounds;

      let actualDeltaX = deltaX;
      let actualDeltaY = deltaY;

      if (minI === 0 || maxI === startLines.v.length + 1) actualDeltaX = 0;
      if (minJ === 0 || maxJ === startLines.h.length + 1) actualDeltaY = 0;

      if (actualDeltaX !== 0) {
        let newLeft = startLines.v[minI - 1] + actualDeltaX;
        let newRight = startLines.v[maxI - 1] + actualDeltaX;
        if (shouldSnap) {
          newLeft = Math.round(newLeft * 20) / 20;
          actualDeltaX = newLeft - startLines.v[minI - 1];
        }
        const minLeft = minI > 1 ? startLines.v[minI - 2] + 0.005 : 0;
        const maxRight = maxI < startLines.v.length ? startLines.v[maxI] - 0.005 : 1;
        if (newLeft < minLeft) actualDeltaX = minLeft - startLines.v[minI - 1];
        else if (newRight > maxRight) actualDeltaX = maxRight - startLines.v[maxI - 1];

        for (let k = minI; k <= maxI; k++) {
          if (k > 0 && k <= startLines.v.length) newLines.v[k - 1] = startLines.v[k - 1] + actualDeltaX;
        }
      }

      if (actualDeltaY !== 0) {
        let newTop = startLines.h[minJ - 1] + actualDeltaY;
        let newBottom = startLines.h[maxJ - 1] + actualDeltaY;
        if (shouldSnap) {
          newTop = Math.round(newTop * 20) / 20;
          actualDeltaY = newTop - startLines.h[minJ - 1];
        }
        const minTop = minJ > 1 ? startLines.h[minJ - 2] + 0.005 : 0;
        const maxBottom = maxJ < startLines.h.length ? startLines.h[maxJ] - 0.005 : 1;
        if (newTop < minTop) actualDeltaY = minTop - startLines.h[minJ - 1];
        else if (newBottom > maxBottom) actualDeltaY = maxBottom - startLines.h[maxJ - 1];

        for (let k = minJ; k <= maxJ; k++) {
          if (k > 0 && k <= startLines.h.length) newLines.h[k - 1] = startLines.h[k - 1] + actualDeltaY;
        }
      }
    } else {
      // Normal dragging of lines
      const isInternalLineV = (index: number) => {
        return lockedCells.some(key => {
          const b = getCellBoundaries(key);
          if (!b) return false;
          return index >= b.minI && index < b.maxI - 1;
        });
      };
      const isInternalLineH = (index: number) => {
        return lockedCells.some(key => {
          const b = getCellBoundaries(key);
          if (!b) return false;
          return index >= b.minJ && index < b.maxJ - 1;
        });
      };

      const movableV = vIndices.filter(idx => !isInternalLineV(idx));
      const movableH = hIndices.filter(idx => !isInternalLineH(idx));

      if (movableV.length > 0) {
        const sortedV = [...movableV].sort((a, b) => deltaX > 0 ? b - a : a - b);
        sortedV.forEach(idx => {
          let newVal = startLines.v[idx] + deltaX;
          if (shouldSnap) newVal = Math.round(newVal * 20) / 20;
          let minIdx = idx - 1;
          while (minIdx >= 0 && isInternalLineV(minIdx)) minIdx--;
          const min = minIdx >= 0 ? newLines.v[minIdx] + 0.005 : 0;
          let maxIdx = idx + 1;
          while (maxIdx < newLines.v.length && isInternalLineV(maxIdx)) maxIdx++;
          const max = maxIdx < newLines.v.length ? newLines.v[maxIdx] - 0.005 : 1;
          newLines.v[idx] = Math.max(min, Math.min(max, newVal));
        });
      }

      if (movableH.length > 0) {
        const sortedH = [...movableH].sort((a, b) => deltaY > 0 ? b - a : a - b);
        sortedH.forEach(idx => {
          let newVal = startLines.h[idx] + deltaY;
          if (shouldSnap) newVal = Math.round(newVal * 20) / 20;
          let minIdx = idx - 1;
          while (minIdx >= 0 && isInternalLineH(minIdx)) minIdx--;
          const min = minIdx >= 0 ? newLines.h[minIdx] + 0.005 : 0;
          let maxIdx = idx + 1;
          while (maxIdx < newLines.h.length && isInternalLineH(maxIdx)) maxIdx++;
          const max = maxIdx < newLines.h.length ? newLines.h[maxIdx] - 0.005 : 1;
          newLines.h[idx] = Math.max(min, Math.min(max, newVal));
        });
      }

      // Proportional cross-scaling for locked cells
      lockedCells.forEach(key => {
        const bounds = getCellBoundaries(key);
        if (!bounds) return;
        const { minI, maxI, minJ, maxJ } = bounds;

        const leftIdx = minI - 1; const rightIdx = maxI - 1;
        const topIdx = minJ - 1; const bottomIdx = maxJ - 1;

        const isLeftD = vIndices.includes(leftIdx); const isRightD = vIndices.includes(rightIdx);
        const isTopD = hIndices.includes(topIdx); const isBottomD = hIndices.includes(bottomIdx);

        if (isLeftD || isRightD || isTopD || isBottomD) {
          const sL = minI > 0 ? startLines.v[leftIdx] : 0;
          const sR = maxI <= startLines.v.length ? startLines.v[rightIdx] : 1;
          const sT = minJ > 0 ? startLines.h[topIdx] : 0;
          const sB = maxJ <= startLines.h.length ? startLines.h[bottomIdx] : 1;
          const sW = sR - sL; const sH = sB - sT;
          if (sW <= 0 || sH <= 0) return;
          const ratio = sW / sH;

          // Current state after independent drags
          let cL = minI > 0 ? newLines.v[leftIdx] : 0;
          let cR = maxI <= newLines.v.length ? newLines.v[rightIdx] : 1;
          let cT = minJ > 0 ? newLines.h[topIdx] : 0;
          let cB = maxJ <= newLines.h.length ? newLines.h[bottomIdx] : 1;

          // Determine which axis changed most or which one should drive
          const dW = (cR - cL) - sW;
          const dH = (cB - cT) - sH;

          if (Math.abs(dW) >= Math.abs(dH * ratio)) {
            // Width drives height
            const targetH = (cR - cL) / ratio;
            const diffH = targetH - sH;
            if (isBottomD && bottomIdx < newLines.h.length) {
              newLines.h[bottomIdx] = Math.max(cT + 0.01, Math.min(bottomIdx < newLines.h.length - 1 ? newLines.h[bottomIdx + 1] - 0.005 : 1, sB + diffH));
            } else if (isTopD && topIdx >= 0) {
              newLines.h[topIdx] = Math.max(topIdx > 0 ? newLines.h[topIdx - 1] + 0.005 : 0, sT - diffH);
            } else if (bottomIdx < newLines.h.length) { // Auto-adjust bottom if nothing else
              newLines.h[bottomIdx] = Math.max(cT + 0.01, Math.min(bottomIdx < newLines.h.length - 1 ? newLines.h[bottomIdx + 1] - 0.005 : 1, sB + diffH));
            }
          } else {
            // Height drives width
            const targetW = (cB - cT) * ratio;
            const diffW = targetW - sW;
            if (isRightD && rightIdx < newLines.v.length) {
              newLines.v[rightIdx] = Math.max(cL + 0.01, Math.min(rightIdx < newLines.v.length - 1 ? newLines.v[rightIdx + 1] - 0.005 : 1, sR + diffW));
            } else if (isLeftD && leftIdx >= 0) {
              newLines.v[leftIdx] = Math.max(leftIdx > 0 ? newLines.v[leftIdx - 1] + 0.005 : 0, sL - diffW);
            } else if (rightIdx < newLines.v.length) {
              newLines.v[rightIdx] = Math.max(cL + 0.01, Math.min(rightIdx < newLines.v.length - 1 ? newLines.v[rightIdx + 1] - 0.005 : 1, sR + diffW));
            }
          }
        }
      });
    }

    // Proportional scaling for internal lines of merged/locked cells
    [...mergedCells, ...lockedCells.filter(k => k.startsWith('merged-')).map(k => {
      const id = k.replace('merged-', '');
      return mergedCells.find(m => m.id === id);
    }).filter(m => !!m)].forEach(mc => {
      if (!mc) return;
        
        // Vertical internal lines
        const startLeft = mc.minI > 0 ? startLines.v[mc.minI - 1] : 0;
        const startRight = mc.maxI <= startLines.v.length ? startLines.v[mc.maxI - 1] : 1;
        const startWidth = startRight - startLeft;
        
        const newLeft = mc.minI > 0 ? newLines.v[mc.minI - 1] : 0;
        const newRight = mc.maxI <= newLines.v.length ? newLines.v[mc.maxI - 1] : 1;
        const newWidth = newRight - newLeft;
        
        if (startWidth > 0) {
          for (let k = mc.minI + 1; k < mc.maxI; k++) {
            const idx = k - 1;
            const ratio = (startLines.v[idx] - startLeft) / startWidth;
            newLines.v[idx] = newLeft + ratio * newWidth;
          }
        }
        
        // Horizontal internal lines
        const startTop = mc.minJ > 0 ? startLines.h[mc.minJ - 1] : 0;
        const startBottom = mc.maxJ <= startLines.h.length ? startLines.h[mc.maxJ - 1] : 1;
        const startHeight = startBottom - startTop;
        
        const newTop = mc.minJ > 0 ? newLines.h[mc.minJ - 1] : 0;
        const newBottom = mc.maxJ <= newLines.h.length ? newLines.h[mc.maxJ - 1] : 1;
        const newHeight = newBottom - newTop;
        
        if (startHeight > 0) {
          for (let k = mc.minJ + 1; k < mc.maxJ; k++) {
            const idx = k - 1;
            const ratio = (startLines.h[idx] - startTop) / startHeight;
            newLines.h[idx] = newTop + ratio * newHeight;
          }
        }
    });
    
    render(newLines);
    onLinesChange(newLines);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingRef.current && containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
      if (onLinesChangeEnd) {
        onLinesChangeEnd(lines);
      }
    }
    draggingRef.current = null;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative touch-none select-none ${isPointerMode ? 'cursor-crosshair' : ''} ${className}`}
      style={{ 
        width: '100%', 
        maxWidth: dimensions.width > 0 ? dimensions.width : 'none',
        aspectRatio: dimensions.width && dimensions.height ? `${dimensions.width} / ${dimensions.height}` : 'auto'
      }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => setMousePos(null)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      
      {/* Magnifying Glass */}
      {isPointerMode && mousePos && dimensions.width > 0 && (
        <div 
          className="absolute pointer-events-none z-50 border-4 border-white shadow-2xl rounded-full overflow-hidden"
          style={{
            left: `${mousePos.x * 100}%`,
            top: `${mousePos.y * 100}%`,
            width: '140px',
            height: '140px',
            transform: mousePos.y < 0.2 ? 'translate(-50%, 20%)' : 'translate(-50%, -120%)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <div 
            className="w-full h-full bg-no-repeat"
            style={{
              backgroundImage: `url(${imageSrc})`,
              backgroundSize: `${dimensions.width * 4}px ${dimensions.height * 4}px`, // 4x zoom for better precision
              backgroundPosition: `${-mousePos.x * dimensions.width * 4 + 70}px ${-mousePos.y * dimensions.height * 4 + 70}px`,
            }}
          />
          {/* Crosshair in the center of the magnifier */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-[1px] bg-app-primary/60" />
            <div className="absolute h-full w-[1px] bg-app-primary/60" />
            {/* Center dot */}
            <div className="w-1 h-1 bg-app-primary rounded-full" />
          </div>
        </div>
      )}

      {/* Grid Lines */}
      {dimensions.width > 0 && (
        <div className={isPointerMode ? 'pointer-events-none' : ''}>
          {/* Cells (for dragging areas) */}
          {(() => {
            const vx = [0, ...lines.v, 1];
            const vy = [0, ...lines.h, 1];
            const cells = [];
            const skipCells = new Set<string>();

            mergedCells.forEach(mc => {
              for (let i = mc.minI; i < mc.maxI; i++) {
                for (let j = mc.minJ; j < mc.maxJ; j++) {
                  skipCells.add(`${i}-${j}`);
                }
              }
              
              const vIndices = [];
              for (let k = mc.minI; k <= mc.maxI; k++) {
                if (k > 0 && k < vx.length - 1) vIndices.push(k - 1);
              }
              const hIndices = [];
              for (let k = mc.minJ; k <= mc.maxJ; k++) {
                if (k > 0 && k < vy.length - 1) hIndices.push(k - 1);
              }

              const cellKey = `merged-${mc.id}`;
              const isSelected = selectedCells.includes(cellKey);
              
              const isLocked = lockedCells.includes(cellKey);
              
              cells.push(
                <div
                  key={cellKey}
                  className={`absolute cursor-move group/cell ${isLocked ? 'bg-black/10' : 'hover:bg-black/5'} ${isSelected ? 'bg-app-primary/30 border-2 border-app-primary shadow-[inset_0_0_12px_rgba(249,97,0,0.4)] z-20 animate-cell-pulse' : 'z-0'} ${isPointerMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
                  style={{
                    left: `${vx[mc.minI] * 100}%`,
                    top: `${vy[mc.minJ] * 100}%`,
                    width: `${(vx[mc.maxI] - vx[mc.minI]) * 100}%`,
                    height: `${(vy[mc.maxJ] - vy[mc.minJ]) * 100}%`,
                  }}
                  onPointerDown={(e) => {
                    if (e.shiftKey || e.metaKey || e.ctrlKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedV([]);
                      setSelectedH([]);
                      onSelectCell?.(cellKey, true);
                      return;
                    }
                    handlePointerDown(vIndices, hIndices, true, cellKey)(e);
                  }}
                >
                  {onToggleLock && (
                    <Tooltip 
                      text={isLocked ? "Desbloquea esta celda." : "Bloquea esta celda."}
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 opacity-0 group-hover/cell:opacity-100 ${isLocked ? 'opacity-100' : ''}`}
                    >
                      <button
                        className={`p-1.5 rounded-full bg-black/50 text-white ${isLocked ? 'bg-app-primary' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock(cellKey);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    </Tooltip>
                  )}
                </div>
              );
            });

            for (let j = 0; j < vy.length - 1; j++) {
              for (let i = 0; i < vx.length - 1; i++) {
                const cellKey = `${i}-${j}`;
                if (skipCells.has(cellKey)) continue;

                const vIndices = [];
                if (i > 0) vIndices.push(i - 1);
                if (i < vx.length - 2) vIndices.push(i);
                
                const hIndices = [];
                if (j > 0) hIndices.push(j - 1);
                if (j < vy.length - 2) hIndices.push(j);

                const isLocked = lockedCells.includes(cellKey);
                const isSelected = selectedCells.includes(cellKey);

                cells.push(
                  <div
                    key={`cell-${i}-${j}`}
                    className={`absolute cursor-move group/cell ${isLocked ? 'bg-black/10' : 'hover:bg-black/5'} ${isSelected ? 'bg-app-primary/30 border-2 border-app-primary shadow-[inset_0_0_12px_rgba(249,97,0,0.4)] z-20 animate-cell-pulse' : 'z-0'} ${isPointerMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
                    style={{
                      left: `${vx[i] * 100}%`,
                      top: `${vy[j] * 100}%`,
                      width: `${(vx[i+1] - vx[i]) * 100}%`,
                      height: `${(vy[j+1] - vy[j]) * 100}%`,
                    }}
                    onPointerDown={(e) => {
                      if (e.shiftKey || e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedV([]);
                        setSelectedH([]);
                        onSelectCell?.(cellKey, true);
                        return;
                      }
                      handlePointerDown(vIndices, hIndices, true, cellKey)(e);
                    }}
                  >
                    {onToggleLock && (
                      <Tooltip 
                        text={isLocked ? "Desbloquea esta celda." : "Bloquea esta celda."}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 opacity-0 group-hover/cell:opacity-100 ${isLocked ? 'opacity-100' : ''}`}
                      >
                        <button
                          className={`p-1.5 rounded-full bg-black/50 text-white ${isLocked ? 'bg-app-primary' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLock(cellKey);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </Tooltip>
                    )}
                  </div>
                );
              }
            }
            return cells;
          })()}

          {lines.v.map((v, i) => {
            const vxIndex = i + 1;
            const vy = [0, ...lines.h, 1];
            const isSelected = selectedV.includes(i);
            return (
              <div 
                key={`v-col-${i}`}
                className="absolute top-0 bottom-0 w-8 -ml-4 flex justify-center group z-10 pointer-events-none"
                style={{ left: `${v * 100}%` }}
              >
                <div className="w-[1px] h-full bg-transparent" />
                {vy.slice(0, -1).map((yStart, j) => {
                  const isInside = mergedCells.some(mc => 
                    vxIndex > mc.minI && vxIndex < mc.maxI && j >= mc.minJ && j < mc.maxJ
                  );
                  if (isInside) return null;
                  return (
                    <div 
                      key={`v-seg-${i}-${j}`}
                      className={`absolute w-full left-0 cursor-col-resize flex justify-center ${isPointerMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
                      style={{ 
                        top: `${yStart * 100}%`, 
                        height: `${(vy[j+1] - yStart) * 100}%` 
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown([i], [])(e);
                      }}
                    >
                      <div className={`w-[1px] h-full shadow-[0_0_4px_rgba(0,0,0,0.2)] ${isSelected ? 'bg-app-primary scale-x-150 border-transparent' : 'bg-black/85 group-hover:bg-black'}`} />
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {lines.h.map((h, i) => {
            const vyIndex = i + 1;
            const vx = [0, ...lines.v, 1];
            const isSelected = selectedH.includes(i);
            return (
              <div 
                key={`h-row-${i}`}
                className="absolute left-0 right-0 h-8 -mt-4 flex items-center group z-10 pointer-events-none"
                style={{ top: `${h * 100}%` }}
              >
                <div className="h-[1px] w-full bg-transparent" />
                {vx.slice(0, -1).map((xStart, j) => {
                  const isInside = mergedCells.some(mc => 
                    vyIndex > mc.minJ && vyIndex < mc.maxJ && j >= mc.minI && j < mc.maxI
                  );
                  if (isInside) return null;
                  return (
                    <div 
                      key={`h-seg-${i}-${j}`}
                      className={`absolute h-full top-0 cursor-row-resize flex items-center ${isPointerMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
                      style={{ 
                        left: `${xStart * 100}%`, 
                        width: `${(vx[j+1] - xStart) * 100}%` 
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown([], [i])(e);
                      }}
                    >
                      <div className={`h-[1px] w-full shadow-[0_0_4px_rgba(0,0,0,0.2)] ${isSelected ? 'bg-app-primary scale-y-150 border-transparent' : 'bg-black/85 group-hover:bg-black'}`} />
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {/* Intersections for visual feedback */}
          {lines.v.map((v, i) => 
            lines.h.map((h, j) => {
              const vxIndex = i + 1;
              const vyIndex = j + 1;
              const isInside = mergedCells.some(mc => 
                vxIndex > mc.minI && vxIndex < mc.maxI && vyIndex > mc.minJ && vyIndex < mc.maxJ
              );
              if (isInside) return null;

              const isSelected = selectedV.includes(i) && selectedH.includes(j);
              return (
                <div 
                  key={`${i}-${j}`}
                  className={`absolute w-4 h-4 rounded-full -ml-2 -mt-2 border border-zinc-500 shadow-[0_0_6px_rgba(0,0,0,0.3)] cursor-move z-20 hover:scale-125 ${isSelected ? 'bg-app-primary scale-125 ring-2 ring-white border-transparent' : 'bg-black/85'} ${isPointerMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
                  style={{ left: `${v * 100}%`, top: `${h * 100}%` }}
                  onPointerDown={handlePointerDown([i], [j])}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// WebGL Helpers
function initWebGL(gl: WebGLRenderingContext, image: HTMLImageElement) {
  const vsSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;
  const fsSource = `
    precision mediump float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;
    void main() {
      gl_FragColor = texture2D(u_image, v_texCoord);
    }
  `;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
  if (!vertexShader || !fragmentShader) return null;
  
  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) return null;

  const positionBuffer = gl.createBuffer();
  const texCoordBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  // Flip Y to match image orientation
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  
  // Use an intermediate canvas to load the image into the texture.
  // This helps with CORS/Security restrictions when running from file://
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  let uploadWidth = image.width;
  let uploadHeight = image.height;
  
  if (uploadWidth > maxTextureSize || uploadHeight > maxTextureSize) {
    const ratio = Math.min(maxTextureSize / uploadWidth, maxTextureSize / uploadHeight);
    uploadWidth = Math.floor(uploadWidth * ratio);
    uploadHeight = Math.floor(uploadHeight * ratio);
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = uploadWidth;
  tempCanvas.height = uploadHeight;
  const ctx = tempCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(image, 0, 0, uploadWidth, uploadHeight);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempCanvas);
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  return { program, positionBuffer, texCoordBuffer, indexBuffer, texture };
}

function drawScene(gl: WebGLRenderingContext, programInfo: any, vx: number[], vy: number[], svx: number[], svy: number[], mergedCells: MergedCell[] = []) {
  const { program, positionBuffer, texCoordBuffer, indexBuffer } = programInfo;

  const numV = vx.length;
  const numH = vy.length;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  // Update UVs based on source grid
  const uvs = new Float32Array(numV * numH * 2);
  for (let j = 0; j < numH; j++) {
    for (let i = 0; i < numV; i++) {
      uvs[(j * numV + i) * 2] = svx[i];
      uvs[(j * numV + i) * 2 + 1] = 1.0 - svy[j];
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);

  // Update Indices based on current grid size
  const indicesArray: number[] = [];
  
  for (let j = 0; j < numH - 1; j++) {
    for (let i = 0; i < numV - 1; i++) {
      const mergedCell = mergedCells.find(mc => 
        i >= mc.minI && i < mc.maxI && j >= mc.minJ && j < mc.maxJ
      );

      if (mergedCell) {
        if (i === mergedCell.minI && j === mergedCell.minJ) {
          const p00 = mergedCell.minJ * numV + mergedCell.minI;
          const p10 = mergedCell.minJ * numV + mergedCell.maxI;
          const p01 = mergedCell.maxJ * numV + mergedCell.minI;
          const p11 = mergedCell.maxJ * numV + mergedCell.maxI;
          
          indicesArray.push(p00, p10, p01, p10, p11, p01);
        }
      } else {
        const p0 = j * numV + i;
        const p1 = p0 + 1;
        const p2 = p0 + numV;
        const p3 = p0 + numV + 1;
        indicesArray.push(p0, p1, p2, p1, p3, p2);
      }
    }
  }
  
  const indices = new Uint16Array(indicesArray);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);

  const positions = new Float32Array(numV * numH * 2);
  for (let j = 0; j < numH; j++) {
    for (let i = 0; i < numV; i++) {
      positions[(j * numV + i) * 2] = vx[i] * 2 - 1;
      positions[(j * numV + i) * 2 + 1] = 1 - vy[j] * 2;
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}
