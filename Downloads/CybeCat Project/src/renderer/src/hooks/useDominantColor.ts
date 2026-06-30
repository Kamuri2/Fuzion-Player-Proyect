import { useState, useEffect } from 'react';

export function useDominantColor(imageUrl: string | null | undefined): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      return;
    }

    const img = new Image();
    if (imageUrl.startsWith('http')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        let count = 0;

        // Skip pixels to speed up extraction
        const step = 4 * 10; 
        for (let i = 0; i < data.length; i += step) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        if (count > 0) {
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          
          setColor(`rgb(${r}, ${g}, ${b})`);
        }
      } catch (e) {
        // Tainted canvas exception if crossOrigin fails
        console.error('Error extracting color:', e);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return color;
}
