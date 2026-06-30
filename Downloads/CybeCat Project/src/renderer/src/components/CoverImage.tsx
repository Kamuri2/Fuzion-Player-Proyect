import { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

interface CoverImageProps {
  coverUrl?: string | null;
  className?: string;
  placeholderClassName?: string;
  iconSize?: number;
  audioPath?: string;
  hq?: boolean;
}

const MAX_CACHE_SIZE = 500;
const coverCache = new Map<string, string | null>();
const pendingFetches = new Map<string, Promise<string | null>>();

function setCache(key: string, value: string | null) {
  if (coverCache.size >= MAX_CACHE_SIZE) {
    const firstKey = coverCache.keys().next().value;
    if (firstKey) coverCache.delete(firstKey);
  }
  coverCache.set(key, value);
}

export default function CoverImage({ coverUrl, className = '', placeholderClassName = '', iconSize = 24, audioPath, hq = true }: CoverImageProps) {
  const [, forceUpdate] = useState({});

  let displayCover = coverUrl;
  if (hq && audioPath && coverCache.has(audioPath)) {
    const cached = coverCache.get(audioPath);
    if (cached) displayCover = cached;
  }

  useEffect(() => {
    let mounted = true;
    if (hq && audioPath && !coverCache.has(audioPath)) {
      if (!pendingFetches.has(audioPath)) {
        const promise = window.api.getCover(audioPath).then(cover => {
          setCache(audioPath, cover || null);
          pendingFetches.delete(audioPath);
          return cover || null;
        }).catch(() => {
          setCache(audioPath, null);
          pendingFetches.delete(audioPath);
          return null;
        });
        pendingFetches.set(audioPath, promise);
      }
      
      pendingFetches.get(audioPath)?.then(() => {
        if (mounted) forceUpdate({});
      });
    }
    return () => { mounted = false; };
  }, [audioPath, hq]);

  if (displayCover) {
    return (
      <div 
        className={`overflow-hidden bg-cover bg-center ${className}`}
        style={{ backgroundImage: `url("${displayCover}")` }}
      >
        <img 
          src={displayCover} 
          alt="Cover"
          decoding="sync"
          className="w-full h-full object-cover opacity-0" 
        />
      </div>
    );
  }

  return (
    <div className={`bg-white flex justify-center items-center border-2 border-black ${placeholderClassName} ${className}`}>
      <Music size={iconSize} color="#000000" />
    </div>
  );
}
