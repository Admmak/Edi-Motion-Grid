import * as Mp4Muxer from 'mp4-muxer';

export class VideoExporter {
  muxer: Mp4Muxer.Muxer<Mp4Muxer.ArrayBufferTarget> | null = null;
  videoEncoder: VideoEncoder | null = null;
  canvas: HTMLCanvasElement;
  recording: boolean = false;
  frameInterval: number = 1000 / 30; // 30 fps
  lastFrameTime: number = 0;
  frameId: number = 0;
  videoDts: number = 0;
  animationFrameId: number = 0;
  exportWidth: number = 0;
  exportHeight: number = 0;
  exportCanvas: HTMLCanvasElement | null = null;
  exportCtx: CanvasRenderingContext2D | null = null;
  hasEncoderError: boolean = false;
  encoderErrorString: string = "";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async start(autoCapture: boolean = true) {
    if (typeof VideoEncoder === 'undefined') {
      throw new Error("VideoEncoder no está disponible. Esto suele ocurrir cuando ejecutas la aplicación desde un archivo local (file://) en lugar de un servidor (http://). Chrome requiere un 'entorno seguro' para codificar vídeo.");
    }

    this.hasEncoderError = false;
    this.encoderErrorString = "";

    // Force multiple of 16 dimensions for H.264 macroblock strict compliance
    let exportWidth = Math.floor(this.canvas.width / 16) * 16;
    let exportHeight = Math.floor(this.canvas.height / 16) * 16;
    if (exportWidth < 128) exportWidth = 128;
    if (exportHeight < 128) exportHeight = 128;
    
    // Fallback scaling if dimensions are extremely large
    const maxDimension = 1920;
    if (exportWidth > maxDimension || exportHeight > maxDimension) {
      const ratio = Math.min(maxDimension / exportWidth, maxDimension / exportHeight);
      exportWidth = Math.floor((exportWidth * ratio) / 16) * 16;
      exportHeight = Math.floor((exportHeight * ratio) / 16) * 16;
    }

    // List of standard codec strings in descending order of quality and profiles
    const codecs = [
      'avc1.640033', // High Profile, Level 5.1 (up to 4K)
      'avc1.64002a', // High Profile, Level 4.2 (up to 1080p 60fps)
      'avc1.640028', // High Profile, Level 4.0 (up to 1080p 30fps)
      'avc1.4d0033', // Main Profile, Level 5.1
      'avc1.4d002a', // Main Profile, Level 4.2
      'avc1.4d0028', // Main Profile, Level 4.0
      'avc1.42e033', // Constrained Baseline, Level 5.1
      'avc1.42e02a', // Constrained Baseline, Level 4.2
      'avc1.42e028', // Constrained Baseline, Level 4.0
      'avc1.42001f', // Baseline profile, Level 3.1
      'avc1.4d001f', // Main profile, Level 3.1
    ];

    const accelerationOptions: ('prefer-software' | 'no-preference' | 'prefer-hardware')[] = [
      'prefer-software', // pure software openh264 is ultra-stable and rarely fails on custom resolutions/bounds
      'no-preference',
      'prefer-hardware'
    ];

    let selectedCodec = codecs[0];
    let selectedAccel: 'prefer-software' | 'prefer-hardware' | 'no-preference' = 'prefer-software';
    let isSupported = false;

    // Outer retry loop with dynamic resolution scaling down if probe fails completely
    for (let scaleAttempt = 0; scaleAttempt < 3; scaleAttempt++) {
      if (scaleAttempt > 0) {
        exportWidth = Math.floor((exportWidth * 0.75) / 16) * 16;
        exportHeight = Math.floor((exportHeight * 0.75) / 16) * 16;
        if (exportWidth < 128) exportWidth = 128;
        if (exportHeight < 128) exportHeight = 128;
        console.warn(`Encountered capability limits. Scaling down resolution to ${exportWidth}x${exportHeight}...`);
      }

      outerLoop: for (const accel of accelerationOptions) {
        for (const codec of codecs) {
          const testConfig = {
            codec,
            width: exportWidth,
            height: exportHeight,
            bitrate: 2500000,
            framerate: 30,
            hardwareAcceleration: accel,
            latencyMode: 'realtime',
            avc: { format: 'avc' },
            alpha: 'discard'
          };
          try {
            const support = await VideoEncoder.isConfigSupported(testConfig as any);
            if (support.supported) {
              selectedCodec = codec;
              selectedAccel = accel;
              isSupported = true;
              if (support.config) {
                if (support.config.width) exportWidth = support.config.width;
                if (support.config.height) exportHeight = support.config.height;
              }
              break outerLoop;
            }
          } catch (e) {
            // Try standard minimal config fallback
            try {
              const simpleConfig = {
                codec,
                width: exportWidth,
                height: exportHeight,
                bitrate: 2500000,
                framerate: 30,
                hardwareAcceleration: accel,
                latencyMode: 'realtime',
              };
              const support = await VideoEncoder.isConfigSupported(simpleConfig as any);
              if (support.supported) {
                selectedCodec = codec;
                selectedAccel = accel;
                isSupported = true;
                break outerLoop;
              }
            } catch (e2) {
              // ignore and advance
            }
          }
        }
      }

      if (isSupported) {
        break;
      }
    }

    const config: any = {
      codec: selectedCodec,
      width: exportWidth,
      height: exportHeight,
      bitrate: 2000000, // 2 Mbps is solid and fully compliant
      framerate: 30,
      hardwareAcceleration: selectedAccel,
      latencyMode: 'realtime',
      avc: { format: 'avc' },
      alpha: 'discard'
    };

    console.log("Configuring VideoEncoder with:", config);

    this.muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: config.width,
        height: config.height,
      },
      firstTimestampBehavior: 'offset',
      fastStart: 'in-memory',
    });

    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (this.muxer) {
          try {
            const chunkDuration = chunk.duration ?? 33333; // default to 30fps step if duration is unavailable
            const compositionTimeOffset = chunk.timestamp - this.videoDts;
            this.muxer.addVideoChunk(chunk, meta, chunk.timestamp, compositionTimeOffset);
            this.videoDts += chunkDuration;
          } catch (e) {
            console.error("Error adding video chunk:", e);
          }
        }
      },
      error: (e) => {
        console.error("VideoEncoder error callback triggered:", e);
        this.hasEncoderError = true;
        this.encoderErrorString = e instanceof Error ? e.message : String(e);
      },
    });

    try {
      this.videoEncoder.configure(config);
    } catch (e) {
      console.error("Direct configure failed. Trying fallback options:", e);
      delete config.alpha;
      delete config.avc;
      try {
        this.videoEncoder.configure(config);
      } catch (fallbackError) {
        throw new Error("No se pudo configurar el codificador de vídeo: " + (fallbackError instanceof Error ? fallbackError.message : String(fallbackError)));
      }
    }

    this.exportWidth = config.width;
    this.exportHeight = config.height;
    
    // Always use an intermediate canvas to prevent size mismatches or dynamic CSS effects
    this.exportCanvas = document.createElement('canvas');
    this.exportCanvas.width = this.exportWidth;
    this.exportCanvas.height = this.exportHeight;
    this.exportCtx = this.exportCanvas.getContext('2d', { willReadFrequently: true });

    this.recording = true;
    this.frameId = 0;
    this.videoDts = 0;
    this.lastFrameTime = performance.now();
    if (autoCapture) {
      this.captureFrame();
    }
  }

  encodeFrame(timestampMicroseconds: number) {
    if (!this.recording || !this.videoEncoder) return;
    
    let frameSource: HTMLCanvasElement = this.canvas;
    if (this.exportCanvas && this.exportCtx) {
      // Draw standard canvas scaled down nicely to exact export coordinates
      this.exportCtx.fillStyle = '#000000';
      this.exportCtx.fillRect(0, 0, this.exportWidth, this.exportHeight);
      this.exportCtx.drawImage(this.canvas, 0, 0, this.exportWidth, this.exportHeight);
      frameSource = this.exportCanvas;
    }

    try {
      const duration = 1000000 / 30;
      const frame = new VideoFrame(frameSource, { 
        timestamp: Math.round(timestampMicroseconds), 
        duration: Math.round(duration) 
      });
      
      const keyFrame = this.frameId % 30 === 0;
      this.videoEncoder.encode(frame, { keyFrame });
      frame.close();
      
      this.frameId++;
    } catch (err) {
      console.error("Error creating or encoding VideoFrame:", err);
    }
  }

  captureFrame = () => {
    if (!this.recording || !this.videoEncoder) return;

    const now = performance.now();
    if (now - this.lastFrameTime >= this.frameInterval) {
      const duration = 1000000 / 30;
      const timestamp = this.frameId * duration;
      this.encodeFrame(timestamp);
      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(this.captureFrame);
  }

  async stop(): Promise<Blob> {
    this.recording = false;
    cancelAnimationFrame(this.animationFrameId);
    
    if (this.videoEncoder) {
      try {
        await this.videoEncoder.flush();
        this.videoEncoder.close();
      } catch (err) {
        console.error("Error flushing/closing VideoEncoder:", err);
      }
    }

    if (this.hasEncoderError) {
      throw new Error(`La codificación de vídeo falló: ${this.encoderErrorString}. Te recomendamos seleccionar una resolución menor o usar otro navegador.`);
    }

    if (this.frameId === 0) {
      throw new Error("No se ha codificado ningún fotograma de vídeo. Es posible que tu sistema o navegador no sea compatible con la codificación de vídeo WebCodecs en esta resolución.");
    }
    
    if (this.muxer) {
      try {
        this.muxer.finalize();
        const buffer = this.muxer.target.buffer;
        return new Blob([buffer], { type: 'video/mp4' });
      } catch (err) {
        console.error("Error finalizing Mp4Muxer:", err);
        throw new Error("No se pudo finalizar el archivo MP4: " + (err instanceof Error ? err.message : String(err)));
      }
    }
    
    throw new Error("Muxer not initialized");
  }
}
