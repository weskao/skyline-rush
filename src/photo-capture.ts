import { Vector2, type WebGLRenderer } from 'three';
import { flipRgbaRows } from './photo-export.ts';

// Isolate canvas readback from the frame loop. The game simulation is not touched.
export function capturePhoto(renderer: WebGLRenderer): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const { x: width, y: height } = renderer.getDrawingBufferSize(new Vector2());
      if (width * height > 16_000_000) throw new RangeError('Screenshot too large');
      const pixels = new Uint8Array(width * height * 4);
      const gl = renderer.getContext();
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const output = document.createElement('canvas');
      output.width = width;
      output.height = height;
      const context = output.getContext('2d');
      if (!context) throw new Error('Canvas 2D unavailable');
      context.putImageData(new ImageData(flipRgbaRows(pixels, width, height), width, height), 0, 0);
      output.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export unavailable')), 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}
