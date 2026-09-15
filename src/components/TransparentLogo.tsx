import React, { useEffect, useRef, useState } from 'react';

export const TransparentLogo = ({ src, className, alt, tolerance = 30 }: { src: string, className?: string, alt?: string, tolerance?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Sample the top-left pixel as the background color
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];
        
        if (a === 0) continue; // Already transparent
        
        // Calculate distance from background color
        const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
        
        // If it's close to background color, make it transparent
        if (dist < tolerance) { 
          data[i+3] = 0; // Fully transparent
        } else if (dist < tolerance + 20) {
          // Anti-aliasing / soft edge blending
          const alpha = ((dist - tolerance) / 20) * 255;
          data[i+3] = Math.min(a, alpha);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      setImageLoaded(true);
    };
  }, [src, tolerance]);

  return (
    <>
      {!imageLoaded && <img src={src} alt={alt} className={className} />}
      <canvas 
        ref={canvasRef} 
        className={className} 
        style={{ objectFit: 'contain', display: imageLoaded ? 'block' : 'none' }}
        title={alt}
      />
    </>
  );
};
