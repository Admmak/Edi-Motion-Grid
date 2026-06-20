import jsPDF from 'jspdf';

export const generateManualPDF = () => {
  const doc = new jsPDF();
  
  const marginLeft = 20;
  let y = 20;
  const pageHeight = doc.internal.pageSize.height;

  const addText = (text: string, size = 12, isBold = false, color = [0, 0, 0]) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);
    
    const lines = doc.splitTextToSize(text, 170);
    
    // Si nos pasamos del alto de la página, creamos una nueva
    if (y + (lines.length * size * 0.4) > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(lines, marginLeft, y);
    y += lines.length * (size * 0.4) + 6; // Espaciado entre párrafos
  };

  // Título principal
  addText("Manual de Usuario: Edi Motion Grid v.1.5", 22, true, [39, 39, 42]); // Text zinc-900 approx
  y += 5;

  addText("¡Bienvenido a Edi Motion Grid! Esta aplicación te permite deformar imágenes de forma interactiva usando mallas (grids) y crear espectaculares animaciones en formato vídeo a partir de dichas deformaciones de manera fácil y rápida.", 12);
  y += 5;

  addText("1. Conceptos Básicos", 16, true, [9, 9, 11]);
  addText("La aplicación funciona aplicando una rejilla (grid) sobre una imagen. Puedes modificar esta rejilla moviendo sus líneas, añadiendo más columnas/filas, o fusionando celdas. Existen dos modos principales de interactuar con la malla:\n", 12);
  
  addText("MODO GUÍA (Ajuste libre):", 12, true);
  addText("Puedes mover las líneas de la malla para hacerla coincidir con la perspectiva o las características de tu foto, sin deformar la imagen original. Es ideal para preparar la malla inicial.", 12);
  
  addText("MODO IMÁN (Deformación):", 12, true);
  addText("La imagen se queda vinculada a la malla. Cualquier movimiento que hagas en las líneas o los puntos deformará la imagen junto a ellos. Aquí es donde empieza el proceso de animación.", 12);
  y += 5;

  addText("2. Interfaz Principal y Herramientas", 16, true, [9, 9, 11]);
  addText("• Subir Imágen: Arrastra una foto al lienzo o haz clic en el botón central para elegirla desde tu dispositivo.", 12);
  addText("• Columnas y Filas (+ / -): Añade o quita divisiones en la malla para mayor o menor precisión.", 12);
  addText("• Fusionar / Separar Celdas: Puedes hacer clic en el interior de varias celdas adyacentes para seleccionarlas y pulsar 'Fusionar'. Estas se comportarán como una sola celda. 'Separar' revierte el proceso.", 12);
  addText("• Modo Lupa (icono ratón): Cuando estés ajustando cruces o puntos muy finos, actívalo para hacer zoom directo sobre el cursor.", 12);
  addText("• Deshacer / Rehacer: Restaura pasos en caso de realizar movimientos equivocados.", 12);
  y += 5;

  addText("3. Creación de Animaciones (Fotogramas Clave)", 16, true, [9, 9, 11]);
  addText("Para animar, el programa utiliza 'Fotogramas Clave'. Cada uno guarda la forma exacta de la malla en un instante.", 12);
  addText("\n¿Cómo se crea un vídeo animado?", 12, true);
  addText("1. Ajusta la foto en su estado inicial.\n2. Ve a la sección inferior 'Fotogramas' y pulsa el botón 'Añadir'.\n3. Deforma la malla con el ratón hacia la forma deseada.\n4. Vuelve a hacer clic en 'Añadir'.\n\nAutomáticamente la aplicación calculará todo el movimiento fluido entre el paso 1 y el paso 2.", 12);
  addText("\nConfiguración del Fotograma:", 12, true);
  addText("Cada miniatura permite cambiar su duración de 'Pausa' (cuánto tiempo permanece quieto ese fotograma antes de comenzar a transicionar al siguiente). Podrás ordenar, mover, copiar o eliminar estas miniaturas.", 12);
  y += 5;
  
  addText("4. Exportar y Guardar tu trabajo", 16, true, [9, 9, 11]);
  addText("Una vez tu animación esté lista (necesitas al menos 2 fotogramas guardados), tienes varias opciones:\n", 12);
  addText("• RENDERIZAR VÍDEO (Botón Azul Inferior): Procesará tus fotogramas y creará un vídeo MP4 de alta definición (con animaciones ultra-suaves) que se descargará a tu dispositivo.", 12);
  addText("• EXPORTAR COMO FOTO: Extraerá un pantallazo en formato PNG del estado actual deformado.", 12);
  addText("• GRABACIÓN DIRECTA MANUAL: Si omites usar los fotogramas clave, puedes usar el botón 'Grabar'. Luego mueves la malla libremente con tu ratón en directo y pulsas 'Detener' para guardar ese recorrido tal cual.", 12);
  y += 5;
  
  addText("5. Consejos Prácticos", 16, true, [9, 9, 11]);
  addText("- Las deformaciones sutiles suelen proporcionar los vídeos hiperrealistas de mejor calidad.\n- Sitúa siempre las líneas principales en Modo Guía acordes al horizonte de la foto antes de empezar a deformar en Modo Imán.", 12);
  y += 5;
  
  addText("Este Manual fue generado automáticamente desde la aplicación.", 10, false, [150, 150, 150]);

  return doc;
};
