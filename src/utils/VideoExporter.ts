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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async start(autoCapture: boolean = true) {
    this.muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: this.canvas.width,
        height: this.canvas.height,
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

    this.videoEncoder.configure({
      codec: 'avc1.42001f', // Baseline profile
      width: this.canvas.width,
      height: this.canvas.height,
      bitrate: 5_000_000,
      framerate: 30,
    });

    this.recording = true;
    this.frameId = 0;
    this.lastFrameTime = performance.now();
    if (autoCapture) {
      this.captureFrame();
    }
  }

  encodeFrame(timestampMicroseconds: number) {
    if (!this.recording || !this.videoEncoder) return;
    
    const duration = 1000000 / 30;
    const frame = new VideoFrame(this.canvas, { 
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
      
      const frame = new VideoFrame(this.canvas, { 
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
