import React from 'react';
import { X, HelpCircle, Upload, Grid, Move, Camera, Video, Film, MousePointer2, Lock, Unlock, Layers, RotateCcw, Trash2, Undo2, Redo2, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-zinc-200"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-app-primary rounded-none text-white">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900">Guía de Usuario</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Aprende a usar Edi Motion Grid</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-200 rounded-none transition-colors text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-12">
                
                {/* Section: Concept */}
                <section>
                  <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-app-primary uppercase tracking-tight">
                    <div className="w-1.5 h-6 bg-app-primary" /> ¿Qué es Edi Motion Grid?
                  </h3>
                  <p className="text-zinc-600 leading-relaxed">
                    Es una herramienta profesional para la <strong>deformación y animación de imágenes</strong> mediante mallas interactivas. 
                    Permite dividir una imagen en secciones (celdas) y manipular sus puntos de unión para crear efectos de estiramiento, 
                    perspectiva o animaciones fluidas.
                  </p>
                </section>

                {/* Section: Workflow */}
                <section>
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-app-primary uppercase tracking-tight">
                    <div className="w-1.5 h-6 bg-app-primary" /> Flujo de Trabajo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-none">
                      <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-black mb-3">1</div>
                      <h4 className="font-bold text-sm mb-2 uppercase">Subir</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Carga tu imagen. El sistema detectará su proporción automáticamente.</p>
                    </div>
                    <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-none">
                      <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-black mb-3">2</div>
                      <h4 className="font-bold text-sm mb-2 uppercase">Guiar</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Ajusta las líneas de la rejilla para que coincidan con los bordes de los objetos.</p>
                    </div>
                    <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-none">
                      <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-black mb-3">3</div>
                      <h4 className="font-bold text-sm mb-2 uppercase">Deformar</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Mueve los puntos o celdas para distorsionar la imagen creativamente.</p>
                    </div>
                    <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-none">
                      <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-black mb-3">4</div>
                      <h4 className="font-bold text-sm mb-2 uppercase">Animar</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Guarda fotogramas clave y exporta el resultado como vídeo MP4.</p>
                    </div>
                  </div>
                </section>

                {/* Section: Buttons Guide */}
                <section>
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-app-primary uppercase tracking-tight">
                    <div className="w-1.5 h-6 bg-app-primary" /> Guía de Botones
                  </h3>
                  
                  <div className="space-y-8">
                    {/* Grid Modes */}
                    <div>
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Modos de Edición</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center font-bold text-app-primary">Guía</div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Modo Guía</p>
                            <p className="text-xs text-zinc-500">Mueve las líneas sin afectar a la imagen. Úsalo para preparar la rejilla.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center font-bold text-app-primary">Def.</div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Modo Deformar</p>
                            <p className="text-xs text-zinc-500">Fija la imagen a la rejilla. Al mover las líneas, la imagen se deformará.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tools */}
                    <div>
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Herramientas de Precisión</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><MousePointer2 className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Puntero (Lupa)</p>
                            <p className="text-xs text-zinc-500">Activa una lupa para colocar las guías con precisión milimétrica.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><Lock className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Bloqueo de Celda</p>
                            <p className="text-xs text-zinc-500">Haz clic en el candado de una celda para que mantenga su forma original mientras mueves el resto.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><Layers className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Fusionar / Separar</p>
                            <p className="text-xs text-zinc-500">Selecciona varias celdas (Shift + clic) y únelas para crear áreas de deformación más grandes.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><RotateCcw className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Reiniciar</p>
                            <p className="text-xs text-zinc-500">Vuelve a la rejilla inicial de 3x3 y borra todas las deformaciones.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* History & Export */}
                    <div>
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Historial y Exportación</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><Undo2 className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Deshacer / Rehacer</p>
                            <p className="text-xs text-zinc-500">Navega por tus cambios recientes. Atajos: Ctrl+Z / Ctrl+Y.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><Camera className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Exportar Imagen</p>
                            <p className="text-xs text-zinc-500">Guarda el estado actual de la deformación como un archivo PNG.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><Video className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Grabar / Exportar Vídeo</p>
                            <p className="text-xs text-zinc-500">Crea un archivo MP4 animando la transición entre tus fotogramas clave.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><Trash2 className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Limpiar</p>
                            <p className="text-xs text-zinc-500">Elimina todas las guías para empezar desde cero con una rejilla vacía.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Keyframes */}
                    <div>
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Panel de Fotogramas</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><Copy className="w-4 h-4" /></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Duplicar</p>
                            <p className="text-xs text-zinc-500">Crea una copia exacta del fotograma para hacer variaciones sutiles.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-600"><div className="flex"><ChevronLeft className="w-3 h-3"/><ChevronRight className="w-3 h-3"/></div></div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">Reordenar</p>
                            <p className="text-xs text-zinc-500">Mueve los fotogramas a la izquierda o derecha para cambiar el orden de la animación.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Exporting */}
                <section>
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-app-primary uppercase tracking-tight">
                    <div className="w-1.5 h-6 bg-app-primary" /> ¿Cómo Exportar?
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-app-secondary text-white flex items-center justify-center rounded-none"><Camera className="w-4 h-4" /></div>
                      <div>
                        <p className="text-sm font-bold text-zinc-800 uppercase tracking-tight">Exportar Imagen (PNG)</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Si solo quieres guardar la deformación actual, haz clic en el botón <strong>Exportar</strong> del panel lateral. 
                          Se descargará una imagen con la resolución original o la que hayas seleccionado.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-app-primary text-white flex items-center justify-center rounded-none"><Video className="w-4 h-4" /></div>
                      <div>
                        <p className="text-sm font-bold text-zinc-800 uppercase tracking-tight">Exportar Vídeo (MP4)</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Para crear una animación:
                        </p>
                        <ol className="text-xs text-zinc-500 list-decimal list-inside mt-2 space-y-1">
                          <li>Añade al menos <strong>dos fotogramas clave</strong> en el panel inferior.</li>
                          <li>Selecciona la <strong>Resolución</strong> deseada (1080p, Story, etc.).</li>
                          <li>Haz clic en <strong>Exportar Vídeo</strong>. La aplicación procesará la animación y te mostrará una vista previa para descargar.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Tips */}
                <section className="bg-app-primary/5 p-6 border-l-4 border-app-primary">
                  <h3 className="text-sm font-black mb-3 text-app-primary uppercase tracking-widest flex items-center gap-2">
                    💡 Consejos Pro
                  </h3>
                  <ul className="text-xs text-zinc-600 space-y-2 list-disc list-inside">
                    <li>Mantén pulsado <strong>Shift</strong> al mover una línea para desactivar el ajuste automático a la rejilla.</li>
                    <li>Usa <strong>Shift + Clic</strong> para seleccionar varias celdas antes de fusionarlas.</li>
                    <li>Puedes <strong>arrastrar y soltar</strong> los fotogramas en el panel inferior para reordenarlos rápidamente.</li>
                    <li>Ajusta la <strong>Pausa</strong> en cada fotograma para controlar cuánto tiempo se detiene la animación en ese punto.</li>
                  </ul>
                </section>

              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-zinc-900 text-white font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
