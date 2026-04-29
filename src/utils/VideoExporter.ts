import * as Mp4Muxer from 'mp4-muxer';

export class VideoExporter {
  muxer: Mp4Muxer.Muxer<Mp4Muxer.ArrayBufferTarget> | null = null;
  videoEncoder: VideoEncoder | null = null;
  canvas: HTMLCanvasElement;
  recording: boolean = false;
  frameInterval: number = 1000 / 30; // 30 fps
  lastFrameTime: number = 0;
  frameId: number = 0;
  animationFrameId: number = 0;
  exportWidth: number = 0;
  exportHeight: number = 0;
  exportCanvas: HTMLCanvasElement | null = null;
  exportCtx: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async start(autoCapture: boolean = true) {
    if (typeof VideoEncoder === 'undefined') {
      throw new Error("VideoEncoder no está disponible. Esto suele ocurrir cuando ejecutas la aplicación desde un archivo local (file://) en lugar de un servidor (http://). Chrome requiere un 'entorno seguro' para codificar vídeo.");
    }

    let exportWidth = this.canvas.width;
    let exportHeight = this.canvas.height;
    
    // Fallback scaling if dimensions are extremely large
    const maxDimension = 1920;
    if (exportWidth > maxDimension || exportHeight > maxDimension) {
      const ratio = Math.min(maxDimension / exportWidth, maxDimension / exportHeight);
      exportWidth = Math.floor((exportWidth * ratio) / 2) * 2;
      exportHeight = Math.floor((exportHeight * ratio) / 2) * 2;
    }

    const config: VideoEncoderConfig = {
      codec: 'avc1.42001f', // Baseline profile
      width: exportWidth,
      height: exportHeight,
      bitrate: 5_000_000,
      framerate: 30,
    };

    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (!support.supported) {
        // Fallback to high profile if baseline string fails, or scale down more
        config.codec = 'avc1.640028'; 
        const support2 = await VideoEncoder.isConfigSupported(config);
        if (!support2.supported) {
          // Force a lower safe resolution (like 720p maximum)
          const safeMax = 1280;
          if (exportWidth > safeMax || exportHeight > safeMax) {
            const ratio = Math.min(safeMax / exportWidth, safeMax / exportHeight);
            config.width = Math.floor((exportWidth * ratio) / 2) * 2;
            config.height = Math.floor((exportHeight * ratio) / 2) * 2;
          }
        }
      }
    } catch (e) {
      console.warn("isConfigSupported check failed", e);
    }

    this.muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: config.width,
        height: config.height,
      },
      fastStart: 'in-memory',
    });

    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (this.muxer) {
          try {
            this.muxer.addVideoChunk(chunk, meta);
          } catch (e) {
            console.error("Error adding video chunk:", e);
          }
        }
      },
      error: (e) => console.error("VideoEncoder error:", e),
    });

    this.videoEncoder.configure(config);

    this.exportWidth = config.width;
    this.exportHeight = config.height;
    
    if (this.exportWidth !== this.canvas.width || this.exportHeight !== this.canvas.height) {
      this.exportCanvas = document.createElement('canvas');
      this.exportCanvas.width = this.exportWidth;
      this.exportCanvas.height = this.exportHeight;
      this.exportCtx = this.exportCanvas.getContext('2d');
    }

    this.recording = true;
    this.frameId = 0;
    this.lastFrameTime = performance.now();
    if (autoCapture) {
      this.captureFrame();
    }
  }

  encodeFrame(timestampMicroseconds: number) {
    if (!this.recording || !this.videoEncoder) return;
    
    let frameSource: HTMLCanvasElement = this.canvas;
    if (this.exportCanvas && this.exportCtx) {
      this.exportCtx.drawImage(this.canvas, 0, 0, this.exportWidth, this.exportHeight);
      frameSource = this.exportCanvas;
    }

    const duration = 1000000 / 30;
    const frame = new VideoFrame(frameSource, { 
      timestamp: Math.round(timestampMicroseconds), 
      duration: Math.round(duration) 
    });
    
    const keyFrame = this.frameId % 30 === 0;
    this.videoEncoder.encode(frame, { keyFrame });
    frame.close();
    
    this.frameId++;
  }

  captureFrame = () => {
    if (!this.recording || !this.videoEncoder) return;

    const now = performance.now();
    if (now - this.lastFrameTime >= this.frameInterval) {
      // Create VideoFrame from canvas
      // timestamp and duration are in microseconds
      const duration = 1000000 / 30;
      const timestamp = this.frameId * duration;
      
      let frameSource: HTMLCanvasElement = this.canvas;
      if (this.exportCanvas && this.exportCtx) {
        this.exportCtx.drawImage(this.canvas, 0, 0, this.exportWidth, this.exportHeight);
        frameSource = this.exportCanvas;
      }

      const frame = new VideoFrame(frameSource, { 
        timestamp: Math.round(timestamp), 
        duration: Math.round(duration) 
      });
      
      // Force a keyframe every 30 frames
      const keyFrame = this.frameId % 30 === 0;
      this.videoEncoder.encode(frame, { keyFrame });
      frame.close();
      
      this.frameId++;
      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(this.captureFrame);
  }

  async stop(): Promise<Blob> {
    this.recording = false;
    cancelAnimationFrame(this.animationFrameId);
    
    if (this.videoEncoder) {
      await this.videoEncoder.flush();
      this.videoEncoder.close();
    }
    
    if (this.muxer) {
      this.muxer.finalize();
      const buffer = this.muxer.target.buffer;
      return new Blob([buffer], { type: 'video/mp4' });
    }
    
    throw new Error("Muxer not initialized");
  }
}
