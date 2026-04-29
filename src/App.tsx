import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Video, Square, Download, Image as ImageIcon, Camera, Film, Magnet, RotateCcw, Copy, ChevronLeft, ChevronRight, Trash2, MousePointer2, Undo2, Redo2, HelpCircle } from 'lucide-react';
import WebGLCanvas, { GridLines, MergedCell } from './components/WebGLCanvas';
import { Tooltip } from './components/Tooltip';
import { HelpModal } from './components/HelpModal';
import { VideoExporter } from './utils/VideoExporter';

import logo from './logo.png';

const GridPreview = ({ lines }: { lines: GridLines }) => {
  return (
    <div className="w-full aspect-square bg-zinc-200/50 border border-zinc-200 relative overflow-hidden pointer-events-none">
      {lines.v.map((v, i) => (
        <div key={`v-${i}`} className="absolute top-0 bottom-0 w-[0.5px] bg-zinc-400" style={{ left: `${v * 100}%` }} />
      ))}
      {lines.h.map((h, i) => (
        <div key={`h-${i}`} className="absolute left-0 right-0 h-[0.5px] bg-zinc-400" style={{ top: `${h * 100}%` }} />
      ))}
    </div>
  );
};

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);
  
  const defaultLines: GridLines = { v: [1/3, 2/3], h: [1/3, 2/3] };
  const [lines, setLines] = useState<GridLines>(defaultLines);
  const [keyframes, setKeyframes] = useState<{ lines: GridLines; pause: number }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [defaultPause, setDefaultPause] = useState(1000);
  const [resolutionStr, setResolutionStr] = useState<string>('null');
  const [sourceLines, setSourceLines] = useState<GridLines | null>(null);
  const [isPointerMode, setIsPointerMode] = useState(false);
  
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);
  const [lockedCells, setLockedCells] = useState<string[]>([]);
  const [mergedCells, setMergedCells] = useState<MergedCell[]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const [historyState, setHistoryState] = useState({
    history: [{ lines: defaultLines, lockedCells: [], mergedCells: [] as MergedCell[], keyframes: [] as { lines: GridLines; pause: number }[] }],
    index: 0
  });

  const commitHistory = useCallback((newLines: GridLines, newLockedCells: string[], newMergedCells: MergedCell[], newKeyframes?: { lines: GridLines; pause: number }[]) => {
    setHistoryState(prev => {
      const lastEntry = prev.history[prev.index];
      const kfsToSave = newKeyframes || lastEntry.keyframes;
      
      if (JSON.stringify(lastEntry.lines) === JSON.stringify(newLines) && 
          JSON.stringify(lastEntry.lockedCells) === JSON.stringify(newLockedCells) &&
          JSON.stringify(lastEntry.mergedCells) === JSON.stringify(newMergedCells) &&
          JSON.stringify(lastEntry.keyframes) === JSON.stringify(kfsToSave)) {
        return prev;
      }
      const newHistory = prev.history.slice(0, prev.index + 1);
      newHistory.push({ lines: newLines, lockedCells: newLockedCells, mergedCells: newMergedCells, keyframes: kfsToSave });
      return { history: newHistory, index: newHistory.length - 1 };
    });
  }, []);

  const undo = useCallback(() => {
    setHistoryState(prev => {
      if (prev.index > 0) {
        const newIndex = prev.index - 1;
        const prevState = prev.history[newIndex];
        setLines(prevState.lines);
        setLockedCells(prevState.lockedCells);
        setMergedCells(prevState.mergedCells);
        setKeyframes(prevState.keyframes);
        setSelectedCells([]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryState(prev => {
      if (prev.index < prev.history.length - 1) {
        const newIndex = prev.index + 1;
        const nextState = prev.history[newIndex];
        setLines(nextState.lines);
        setLockedCells(nextState.lockedCells);
        setMergedCells(nextState.mergedCells);
        setKeyframes(nextState.keyframes);
        setSelectedCells([]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exporterRef = useRef<VideoExporter | null>(null);

  // Deactivate pointer mode when entering Warp Mode
  React.useEffect(() => {
    if (sourceLines) {
      setIsPointerMode(false);
    }
  }, [sourceLines]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setVideoUrl(null);
    }
  };

  const startRecording = async () => {
    if (!canvasRef.current) return;
    exporterRef.current = new VideoExporter(canvasRef.current);
    try {
      await exporterRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error al iniciar la grabación");
    }
  };

  const stopRecording = async () => {
    if (!exporterRef.current) return;
    try {
      const blob = await exporterRef.current.stop();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (err) {
      console.error("Error stopping recording", err);
    }
    setIsRecording(false);
  };

  const exportImage = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imagen-deformada.png';
    a.click();
  };

  const animateAndExport = async () => {
    if (keyframes.length < 2) return;
    
    setIsExporting(true);
    setIsAnimating(true);
    setVideoUrl(null);
    
    // Set initial state
    setLines(keyframes[0].lines);
    
    // Wait a bit for canvas to render
    await new Promise(r => setTimeout(r, 100));
    
    if (canvasRef.current) {
      exporterRef.current = new VideoExporter(canvasRef.current);
      try {
        await exporterRef.current.start(false);
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Error al iniciar la exportación");
        setIsExporting(false);
        setIsAnimating(false);
        return;
      }
    }
    
    const transitionDuration = 1000; // 1 second per transition
    
    // Calculate cumulative times for each segment
    // Segment i: Pause at kf[i] then Transition to kf[i+1]
    const segmentDurations = keyframes.slice(0, -1).map(kf => kf.pause + transitionDuration);
    const cumulativeTimes = [0];
    segmentDurations.forEach((d, i) => cumulativeTimes.push(cumulativeTimes[i] + d));
    
    const totalDuration = cumulativeTimes[cumulativeTimes.length - 1] + keyframes[keyframes.length - 1].pause;
    
    const fps = 30;
    const totalFrames = Math.ceil(totalDuration / (1000 / fps));
    
    const renderFrame = async (frame: number) => {
      if (frame > totalFrames) {
        // Finish
        setLines(keyframes[keyframes.length - 1].lines);
        try {
          const blob = await exporterRef.current?.stop();
          if (blob) {
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
          }
        } catch (err) {
          console.error(err);
        }
        setIsExporting(false);
        setIsAnimating(false);
        return;
      }
      
      const elapsed = frame * (1000 / fps);
      
      // Find current segment
      let currentSegment = 0;
      for (let i = 0; i < keyframes.length - 1; i++) {
        if (elapsed < cumulativeTimes[i + 1]) {
          currentSegment = i;
          break;
        }
        currentSegment = i;
      }
      
      // If we are past the last transition, we are in the final pause
      if (elapsed >= cumulativeTimes[keyframes.length - 1]) {
        setLines(keyframes[keyframes.length - 1].lines);
      } else {
        const segmentElapsed = elapsed - cumulativeTimes[currentSegment];
        const currentPause = keyframes[currentSegment].pause;
        
        let t = 0;
        if (segmentElapsed < currentPause) {
          t = 0;
        } else {
          const segmentProgress = Math.min((segmentElapsed - currentPause) / transitionDuration, 1);
          // Easing function (ease in and out 85%)
          const easeInOut85 = (p: number) => p < 0.5 ? 16 * p * p * p * p * p : 1 - Math.pow(-2 * p + 2, 5) / 2;
          t = easeInOut85(segmentProgress);
        }
        
        const kf1 = keyframes[currentSegment].lines;
        const kf2 = keyframes[currentSegment + 1].lines;
        
        setLines({
          v: kf1.v.map((v, i) => v + (kf2.v[i] - v) * t),
          h: kf1.h.map((h, i) => h + (kf2.h[i] - h) * t),
        });
      }
      
      // Wait for React to apply the state and WebGL to render
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 0));
      
      exporterRef.current?.encodeFrame(frame * (1000000 / fps));
      
      // Render next frame
      renderFrame(frame + 1);
    };
    
    renderFrame(0);
  };

  const addColumn = () => {
    if (lines.v.length >= 10) return;
    const newCount = lines.v.length + 1;
    const newV = Array.from({ length: newCount }, (_, i) => (i + 1) / (newCount + 1));
    const newLines = { ...lines, v: newV };
    const newKeyframes = keyframes.map(kf => ({ ...kf, lines: { ...kf.lines, v: newV } }));
    setLines(newLines);
    setKeyframes(newKeyframes);
    setSourceLines(null);
    setLockedCells([]);
    setMergedCells([]);
    setSelectedCells([]);
    commitHistory(newLines, [], [], newKeyframes);
  };

  const removeColumn = () => {
    if (lines.v.length <= 1) return;
    const newCount = lines.v.length - 1;
    const newV = Array.from({ length: newCount }, (_, i) => (i + 1) / (newCount + 1));
    const newLines = { ...lines, v: newV };
    const newKeyframes = keyframes.map(kf => ({ ...kf, lines: { ...kf.lines, v: newV } }));
    setLines(newLines);
    setKeyframes(newKeyframes);
    setSourceLines(null);
    setLockedCells([]);
    setMergedCells([]);
    setSelectedCells([]);
    commitHistory(newLines, [], [], newKeyframes);
  };

  const addRow = () => {
    if (lines.h.length >= 10) return;
    const newCount = lines.h.length + 1;
    const newH = Array.from({ length: newCount }, (_, i) => (i + 1) / (newCount + 1));
    const newLines = { ...lines, h: newH };
    const newKeyframes = keyframes.map(kf => ({ ...kf, lines: { ...kf.lines, h: newH } }));
    setLines(newLines);
    setKeyframes(newKeyframes);
    setSourceLines(null);
    setLockedCells([]);
    setMergedCells([]);
    setSelectedCells([]);
    commitHistory(newLines, [], [], newKeyframes);
  };

  const removeRow = () => {
    if (lines.h.length <= 1) return;
    const newCount = lines.h.length - 1;
    const newH = Array.from({ length: newCount }, (_, i) => (i + 1) / (newCount + 1));
    const newLines = { ...lines, h: newH };
    const newKeyframes = keyframes.map(kf => ({ ...kf, lines: { ...kf.lines, h: newH } }));
    setLines(newLines);
    setKeyframes(newKeyframes);
    setSourceLines(null);
    setLockedCells([]);
    setMergedCells([]);
    setSelectedCells([]);
    commitHistory(newLines, [], [], newKeyframes);
  };

  const duplicateKeyframe = (index: number) => {
    const newKeyframes = [...keyframes];
    newKeyframes.splice(index + 1, 0, { ...keyframes[index] });
    setKeyframes(newKeyframes);
    commitHistory(lines, lockedCells, mergedCells, newKeyframes);
  };

  const moveKeyframe = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === keyframes.length - 1) return;

    const newKeyframes = [...keyframes];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    [newKeyframes[index], newKeyframes[targetIndex]] = [newKeyframes[targetIndex], newKeyframes[index]];
    setKeyframes(newKeyframes);
    commitHistory(lines, lockedCells, mergedCells, newKeyframes);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isAnimating) {
      e.preventDefault();
      return;
    }
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    setDragOverItemIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverItemIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) {
      setDraggedItemIndex(null);
      setDragOverItemIndex(null);
      return;
    }

    const newKeyframes = [...keyframes];
    const draggedItem = newKeyframes[draggedItemIndex];
    newKeyframes.splice(draggedItemIndex, 1);
    newKeyframes.splice(index, 0, draggedItem);
    
    setKeyframes(newKeyframes);
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
    commitHistory(lines, lockedCells, mergedCells, newKeyframes);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
  };

  const handleMergeCells = () => {
    if (selectedCells.length < 2) return;

    let minI = Infinity, maxI = -Infinity, minJ = Infinity, maxJ = -Infinity;
    
    for (const cell of selectedCells) {
      if (cell.startsWith('merged-')) return; // Cannot merge already merged cells
      if (lockedCells.includes(cell)) {
        alert("No se pueden fusionar celdas bloqueadas. Desbloquéalas primero.");
        return;
      }
      const [iStr, jStr] = cell.split('-');
      const i = parseInt(iStr, 10);
      const j = parseInt(jStr, 10);
      minI = Math.min(minI, i);
      maxI = Math.max(maxI, i + 1);
      minJ = Math.min(minJ, j);
      maxJ = Math.max(maxJ, j + 1);
    }

    // Verify it's a perfect rectangle
    const expectedCount = (maxI - minI) * (maxJ - minJ);
    if (selectedCells.length !== expectedCount) {
      alert("Por favor, selecciona un área rectangular de celdas contiguas.");
      return;
    }

    const newMergedCell: MergedCell = {
      id: Math.random().toString(36).substr(2, 9),
      minI, maxI, minJ, maxJ
    };

    const newMergedCells = [...mergedCells, newMergedCell];
    setMergedCells(newMergedCells);
    setSelectedCells([]);
    commitHistory(lines, lockedCells, newMergedCells);
  };

  const handleUnmergeCells = () => {
    const mergedIds = selectedCells.filter(c => c.startsWith('merged-')).map(c => c.replace('merged-', ''));
    if (mergedIds.length === 0) return;

    if (selectedCells.some(c => lockedCells.includes(c))) {
      alert("No se pueden separar celdas bloqueadas. Desbloquéalas primero.");
      return;
    }

    const newMergedCells = mergedCells.filter(mc => !mergedIds.includes(mc.id));
    const newLockedCells = lockedCells.filter(lc => !selectedCells.includes(lc));
    
    setMergedCells(newMergedCells);
    setLockedCells(newLockedCells);
    setSelectedCells([]);
    commitHistory(lines, newLockedCells, newMergedCells);
  };

  return (
    <div className="min-h-screen bg-app-bg text-zinc-900 flex flex-col items-center py-4 md:py-8 px-4">
      <header className="w-full max-w-7xl flex items-center justify-between mb-6 md:mb-8">
        <img 
          src={logo} 
          alt="Edi Logo" 
          className="h-8 md:h-10 w-auto" 
        />
        <span className="text-[10px] md:text-xs font-bold text-zinc-400 font-sans tracking-[0.2em] uppercase">
          Edi Motion Grid v.1.5
        </span>
      </header>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
      {!imageSrc ? (
        <label className="flex flex-col items-center justify-center w-full max-w-xl h-64 border-2 border-zinc-300 border-dashed rounded-none cursor-pointer hover:bg-white/50 transition-colors group">
          <Upload className="w-12 h-12 text-zinc-400 mb-4 group-hover:text-app-primary transition-colors" />
          <span className="text-zinc-700 font-bold text-lg">Haz clic para subir una imagen</span>
          <span className="text-zinc-500 text-sm mt-2">Soporta 16:9, 9:16, 1:1, 3:4, 4:5</span>
          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
        </label>
      ) : (
        <div className="flex flex-col items-center w-full max-w-7xl">
          <div className="flex flex-col lg:flex-row items-start justify-center w-full gap-4 md:gap-8">
            {/* Left Column: Image */}
            <div className="flex-1 flex justify-center w-full lg:sticky lg:top-4">
              <div className={`relative bg-white rounded-none shadow-2xl border border-zinc-200 ${isAnimating ? 'pointer-events-none' : ''}`}>
                <WebGLCanvas 
                  imageSrc={imageSrc} 
                  onCanvasReady={(canvas) => canvasRef.current = canvas} 
                  snapToGrid={snapToGrid} 
                  lines={lines}
                  sourceLines={sourceLines}
                  onLinesChange={setLines}
                  onLinesChangeEnd={(newLines) => commitHistory(newLines, lockedCells, mergedCells)}
                  resolution={resolutionStr === 'null' ? null : JSON.parse(resolutionStr)}
                  isPointerMode={isPointerMode}
                  lockedCells={lockedCells}
                  mergedCells={mergedCells}
                  selectedCells={selectedCells}
                  onSelectCell={(cellKey, multi) => {
                    setSelectedCells(prev => {
                      if (multi) {
                        return prev.includes(cellKey) ? prev.filter(k => k !== cellKey) : [...prev, cellKey];
                      }
                      return cellKey ? [cellKey] : [];
                    });
                  }}
                  onToggleLock={(key) => {
                    const newLockedCells = lockedCells.includes(key) 
                      ? lockedCells.filter(k => k !== key) 
                      : [...lockedCells, key];
                    setLockedCells(newLockedCells);
                    commitHistory(lines, newLockedCells, mergedCells);
                  }}
                />
              </div>
            </div>

            {/* Right Column: Options */}
            <div className="w-full lg:w-[360px] flex flex-col gap-4">
              <div className="w-full flex flex-col items-stretch gap-4 bg-white p-4 md:p-6 border border-zinc-200 shadow-sm">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Modo de Rejilla</span>
                  <div className="flex bg-zinc-100 p-1 rounded-none gap-1">
                    <Tooltip className="w-full" text="Ajusta las guías de la rejilla sin deformar la imagen.">
                      <button
                        onClick={() => {
                          setSourceLines(null);
                        }}
                        className={`w-full px-2 py-1.5 text-[11px] font-bold transition-all ${!sourceLines ? 'bg-white text-app-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                      >
                        Guía
                      </button>
                    </Tooltip>
                    <Tooltip className="w-full" text="Fija la imagen a la rejilla actual para empezar a deformarla.">
                      <button
                        onClick={() => {
                          setSourceLines({ ...lines });
                          setIsPointerMode(false);
                        }}
                        className={`w-full px-2 py-1.5 text-[11px] font-bold transition-all ${sourceLines ? 'bg-white text-app-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                      >
                        Deformar
                      </button>
                    </Tooltip>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-100">
                    <div className={`w-2 h-2 rounded-full ${sourceLines ? 'bg-app-primary animate-pulse' : 'bg-zinc-300'}`} />
                    <span className="text-[11px] font-bold text-zinc-600">
                      {sourceLines ? 'Imagen fijada' : 'Ajustando guías'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                <div className="flex gap-2 col-span-2 lg:col-span-1 xl:col-span-2">
                  <Tooltip className="w-full" text="Revierte el último cambio realizado.">
                    <button
                      onClick={undo}
                      disabled={historyState.index <= 0}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 border border-zinc-200 rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Deshacer
                    </button>
                  </Tooltip>
                  <Tooltip className="w-full" text="Aplica de nuevo el cambio que acabas de deshacer.">
                    <button
                      onClick={redo}
                      disabled={historyState.index >= historyState.history.length - 1}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 border border-zinc-200 rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                      Rehacer
                    </button>
                  </Tooltip>
                </div>

                <Tooltip className="w-full" text="Elimina todas las guías y vuelve a una rejilla vacía.">
                  <button
                    onClick={() => {
                      const newLines = { v: [], h: [] };
                      setLines(newLines);
                      setSourceLines(null);
                      setLockedCells([]);
                      setMergedCells([]);
                      setSelectedCells([]);
                      commitHistory(newLines, [], []);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-100 rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpiar
                  </button>
                </Tooltip>

                <Tooltip className="w-full" text="Activa el modo lupa para ajustar las guías con precisión de píxel.">
                  <button
                    onClick={() => setIsPointerMode(!isPointerMode)}
                    disabled={!!sourceLines}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 ${
                      sourceLines 
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-50' 
                        : isPointerMode 
                          ? 'bg-app-primary text-white' 
                          : 'bg-white text-zinc-700 border border-zinc-200'
                    } rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs`}
                  >
                    <MousePointer2 className="w-3.5 h-3.5" />
                    Puntero
                  </button>
                </Tooltip>

                <div className="flex items-center justify-between bg-white p-1 rounded-none border border-zinc-200 shadow-sm">
                  <div className="px-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Cols</div>
                  <div className="flex items-center gap-1">
                    <Tooltip text="Elimina una columna de la rejilla.">
                      <button 
                        onClick={removeColumn}
                        disabled={lines.v.length <= 1}
                        className="w-6 h-6 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 rounded-none text-zinc-700 transition-colors font-bold text-xs"
                      >
                        -
                      </button>
                    </Tooltip>
                    <span className="w-4 text-center text-[11px] font-black text-app-primary">{lines.v.length}</span>
                    <Tooltip text="Añade una columna a la rejilla.">
                      <button 
                        onClick={addColumn}
                        disabled={lines.v.length >= 10}
                        className="w-6 h-6 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 rounded-none text-zinc-700 transition-colors font-bold text-xs"
                      >
                        +
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white p-1 rounded-none border border-zinc-200 shadow-sm">
                  <div className="px-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Filas</div>
                  <div className="flex items-center gap-1">
                    <Tooltip text="Elimina una fila de la rejilla.">
                      <button 
                        onClick={removeRow}
                        disabled={lines.h.length <= 1}
                        className="w-6 h-6 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 rounded-none text-zinc-700 transition-colors font-bold text-xs"
                      >
                        -
                      </button>
                    </Tooltip>
                    <span className="w-4 text-center text-[11px] font-black text-app-primary">{lines.h.length}</span>
                    <Tooltip text="Añade una fila a la rejilla.">
                      <button 
                        onClick={addRow}
                        disabled={lines.h.length >= 10}
                        className="w-6 h-6 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 rounded-none text-zinc-700 transition-colors font-bold text-xs"
                      >
                        +
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex gap-2 col-span-2 lg:col-span-1 xl:col-span-2">
                  <Tooltip className="w-full" text="Une las celdas seleccionadas en una sola celda más grande.">
                    <button
                      onClick={handleMergeCells}
                      disabled={selectedCells.length < 2 || selectedCells.some(c => c.startsWith('merged-'))}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 border border-zinc-200 rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs"
                    >
                      Fusionar
                    </button>
                  </Tooltip>
                  <Tooltip className="w-full" text="Divide una celda fusionada en sus celdas originales.">
                    <button
                      onClick={handleUnmergeCells}
                      disabled={!selectedCells.some(c => c.startsWith('merged-'))}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 border border-zinc-200 rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs"
                    >
                      Separar
                    </button>
                  </Tooltip>
                </div>

                <Tooltip className="w-full" text="Vuelve a la rejilla por defecto de 3x3.">
                  <button
                    onClick={() => {
                      setLines(defaultLines);
                      setSourceLines(null);
                      setLockedCells([]);
                      setMergedCells([]);
                      setSelectedCells([]);
                      commitHistory(defaultLines, [], []);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reiniciar
                  </button>
                </Tooltip>

                <Tooltip className="w-full" text="Guarda la imagen deformada actual en tu ordenador.">
                  <button
                    onClick={exportImage}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-app-secondary hover:opacity-90 text-white rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Exportar
                  </button>
                </Tooltip>

                {!isRecording ? (
                  <Tooltip className="w-full" text="Inicia la grabación de la animación entre fotogramas.">
                    <button
                      onClick={startRecording}
                      disabled={isExporting}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 ${isExporting ? 'bg-zinc-400 text-zinc-200' : 'bg-app-primary hover:opacity-90 text-white'} rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      Grabar
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip className="w-full" text="Detiene la grabación de la animación.">
                    <button
                      onClick={stopRecording}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-none font-bold transition-all animate-pulse shadow-sm active:scale-95 text-xs"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Detener
                    </button>
                  </Tooltip>
                )}
                
                <Tooltip className="w-full" text="Elimina la imagen actual y permite subir una nueva.">
                  <button
                    onClick={() => { 
                      setImageSrc(null); 
                      setVideoUrl(null); 
                      setKeyframes([]);
                      setLines(defaultLines);
                      setSourceLines(null);
                      setLockedCells([]);
                      setMergedCells([]);
                      setSelectedCells([]);
                      commitHistory(defaultLines, [], [], []);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-none font-bold transition-all shadow-sm active:scale-95 text-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Cambiar
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Keyframes Panel */}
          <div className="mt-8 w-full bg-white p-4 md:p-6 rounded-none border border-zinc-200 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-zinc-900 font-black flex items-center gap-2 text-lg md:text-xl uppercase tracking-tight">
                <Film className="w-5 h-5 md:w-6 md:h-6 text-app-primary" /> Fotogramas
              </h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <Tooltip className="w-full sm:w-auto" text="Guarda la posición actual de la rejilla como un punto clave en la animación.">
                  <button 
                    onClick={() => {
                      const newKeyframes = [...keyframes, { lines: { ...lines }, pause: defaultPause }];
                      setKeyframes(newKeyframes);
                      commitHistory(lines, lockedCells, mergedCells, newKeyframes);
                    }} 
                    disabled={isAnimating || isExporting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-app-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-none text-xs font-bold transition-all active:scale-95 shadow-md shadow-app-primary/10"
                  >
                    <Camera className="w-3.5 h-3.5" /> Añadir
                  </button>
                </Tooltip>
                {keyframes.length > 0 && (
                  <Tooltip className="w-full sm:w-auto" text="Elimina todos los fotogramas clave guardados.">
                    <button 
                      onClick={() => {
                        setKeyframes([]);
                        commitHistory(lines, lockedCells, mergedCells, []);
                      }} 
                      disabled={isAnimating || isExporting}
                      className="w-full sm:w-auto px-4 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 rounded-none text-xs font-bold transition-all active:scale-95"
                    >
                      Borrar
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
            
            {keyframes.length === 0 ? (
              <div className="bg-zinc-50 border border-zinc-100 rounded-none p-6 md:p-10 text-center">
                <p className="text-zinc-500 font-medium text-sm">No hay fotogramas clave.</p>
                <p className="text-zinc-400 text-xs mt-1">Mueve la rejilla y añade fotogramas para animar.</p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                {keyframes.map((kf, i) => (
                  <div 
                    key={i} 
                    draggable={!isAnimating}
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`flex-shrink-0 w-36 md:w-40 bg-zinc-50 border-2 ${isAnimating ? 'border-zinc-100' : 'border-zinc-100 hover:border-app-primary cursor-grab active:cursor-grabbing'} rounded-none p-3 flex flex-col gap-3 transition-all group relative shadow-sm ${draggedItemIndex === i ? 'opacity-50' : ''} ${dragOverItemIndex === i ? 'border-app-primary scale-105' : ''}`}
                    onClick={() => {
                      if (!isAnimating) {
                        setLines(kf.lines);
                        setLockedCells([]);
                        setMergedCells([]);
                        setSelectedCells([]);
                        commitHistory(kf.lines, [], [], []);
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-900 text-[10px] font-black uppercase tracking-wider">#{i + 1}</span>
                      <div className="flex gap-0.5">
                        <Tooltip text="Duplica este fotograma clave.">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (!isAnimating) duplicateKeyframe(i); 
                            }} 
                            disabled={isAnimating}
                            className="text-zinc-300 hover:text-app-primary disabled:hover:text-zinc-300 transition-colors p-1"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Elimina este fotograma clave.">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (!isAnimating) {
                                const newKeyframes = keyframes.filter((_, idx) => idx !== i);
                                setKeyframes(newKeyframes);
                                commitHistory(lines, lockedCells, mergedCells, newKeyframes);
                              }
                            }} 
                            disabled={isAnimating}
                            className="text-zinc-300 hover:text-red-500 disabled:hover:text-zinc-300 transition-colors p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    <GridPreview lines={kf.lines} />
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-0.5 text-[9px] text-zinc-400 font-bold">
                        <div className="flex justify-between"><span>V:</span> <span className="text-app-secondary">{kf.lines.v.length}</span></div>
                        <div className="flex justify-between"><span>H:</span> <span className="text-app-secondary">{kf.lines.h.length}</span></div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Pausa</label>
                        <select
                          value={kf.pause}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newKeyframes = [...keyframes];
                            newKeyframes[i] = { ...newKeyframes[i], pause: Number(e.target.value) };
                            setKeyframes(newKeyframes);
                            commitHistory(lines, lockedCells, mergedCells, newKeyframes);
                          }}
                          disabled={isAnimating}
                          className="bg-white border border-zinc-200 text-zinc-900 text-[9px] rounded-none p-0.5 outline-none font-bold"
                        >
                          <option value={0}>Sin pausa</option>
                          <option value={500}>0.5s</option>
                          <option value={1000}>1s</option>
                          <option value={1500}>1.5s</option>
                          <option value={2000}>2s</option>
                          <option value={3000}>3s</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-auto pt-1.5 border-t border-zinc-200/50">
                      <div className="flex gap-0.5">
                        <Tooltip text="Mueve este fotograma clave hacia la izquierda.">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveKeyframe(i, 'left');
                            }}
                            disabled={isAnimating || i === 0}
                            className="p-0.5 text-zinc-400 hover:text-app-primary disabled:opacity-20 transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Mueve este fotograma clave hacia la derecha.">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveKeyframe(i, 'right');
                            }}
                            disabled={isAnimating || i === keyframes.length - 1}
                            className="p-0.5 text-zinc-400 hover:text-app-primary disabled:opacity-20 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {keyframes.length >= 2 && (
              <div className="mt-8 pt-8 border-t border-zinc-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resolución</label>
                    <select
                      value={resolutionStr}
                      onChange={(e) => setResolutionStr(e.target.value)}
                      disabled={isAnimating || isExporting}
                      className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-none focus:ring-app-primary focus:border-app-primary block p-3 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                    >
                      <option value="null">Original</option>
                      <option value='{"width":1920,"height":1080}'>16:9 (1080p)</option>
                      <option value='{"width":1080,"height":1920}'>9:16 (Story)</option>
                      <option value='{"width":1200,"height":1200}'>1:1 (Cuadrado)</option>
                      <option value='{"width":1080,"height":1350}'>4:5 (Vertical)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pausa por defecto</label>
                    <select
                      value={defaultPause}
                      onChange={(e) => setDefaultPause(Number(e.target.value))}
                      disabled={isAnimating || isExporting}
                      className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-none focus:ring-app-primary focus:border-app-primary block p-3 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                    >
                      <option value={0}>Ninguna</option>
                      <option value={500}>0.5s</option>
                      <option value={1000}>1s</option>
                      <option value={1500}>1.5s</option>
                      <option value={2000}>2s</option>
                    </select>
                  </div>
                </div>
                <Tooltip className="w-full" text="Crea un vídeo animado basado en los fotogramas clave guardados.">
                  <button
                    onClick={animateAndExport}
                    disabled={isExporting || isAnimating}
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-app-secondary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-none font-black uppercase tracking-wider transition-all shadow-xl shadow-app-secondary/20 active:scale-95"
                  >
                    {isAnimating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Renderizando...
                      </>
                    ) : (
                      <>
                        <Video className="w-6 h-6" />
                        Exportar vídeo
                      </>
                    )}
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          {videoUrl && (
            <div className="mt-8 w-full max-w-2xl flex flex-col items-center bg-white rounded-none border border-zinc-200 shadow-xl p-4 md:p-8">
              <h2 className="text-xl md:text-2xl font-black mb-4 md:mb-6 text-zinc-900 uppercase tracking-tight">Vídeo exportado</h2>
              <video src={videoUrl} controls className="w-full rounded-none mb-6 md:mb-8 border border-zinc-100 shadow-lg" />
              <a
                href={videoUrl}
                download="animacion-deformada.mp4"
                className="flex items-center gap-2 md:gap-3 px-6 py-3 md:px-10 md:py-5 bg-app-accent text-zinc-900 rounded-none font-black uppercase tracking-widest transition-all shadow-xl shadow-app-accent/20 hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                <Download className="w-5 h-5 md:w-6 md:h-6" />
                Descargar MP4
              </a>
            </div>
          )}
        </div>
      )}

      <footer className="w-full max-w-7xl mt-auto pt-8 md:pt-16 pb-4 px-4 flex flex-col items-center gap-4">
        <button 
          onClick={() => setIsHelpOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-500 border border-zinc-200 rounded-none text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
        >
          <HelpCircle className="w-4 h-4 text-app-primary" />
          Guía de funcionamiento
        </button>
        <p className="text-[10px] md:text-xs text-zinc-500 font-sans text-center">
          Aplicación desarrollada por <a href="mailto:adrianmarzal@gmail.com" className="text-zinc-400 hover:text-app-primary transition-colors font-bold underline decoration-zinc-400/30 underline-offset-4">Adrián Marzal</a> para la Escuela Superior de la Región de Murcia. 2026
        </p>
        <p className="text-[10px] md:text-xs text-zinc-400 font-sans text-center max-w-xl mt-2 px-4 italic">
          Para usar esta app de forma local: Descarga el código de GitHub, instala las dependencias con <code className="bg-zinc-200 px-1 rounded">npm install</code> y lánzala con <code className="bg-zinc-200 px-1 rounded">npm run dev</code>.
        </p>
      </footer>
    </div>
  );
}
