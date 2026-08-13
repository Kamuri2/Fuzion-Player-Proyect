import { useState, useEffect } from 'react';
import { Music, Cat, CircleHelp } from 'lucide-react';

interface CoverImageProps {
  coverUrl?: string | null;
  className?: string;
  placeholderClassName?: string;
  iconSize?: number;
  audioPath?: string;
  hq?: boolean;
  type?: 'artist' | 'album' | 'folder' | 'playlist' | 'song';
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

export default function CoverImage({ coverUrl, className = '', placeholderClassName = '', iconSize = 24, audioPath, hq = true, type }: CoverImageProps) {
  const [, forceUpdate] = useState({});

  // Regla solicitada: Si la pantalla es menor a 1920x1200, cargar siempre como HQ (normalmente)
  const isLargeScreen = window.innerWidth > 1920 || window.innerHeight > 1200;
  const effectiveHq = isLargeScreen ? hq : true;

  const cacheKey = audioPath ? `${audioPath}_${effectiveHq}` : '';
  let displayCover = coverUrl;
  
  if (audioPath && coverCache.has(cacheKey)) {
    const cached = coverCache.get(cacheKey);
    if (cached) displayCover = cached;
  }

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout;

    if (audioPath && !coverCache.has(cacheKey)) {
      timer = setTimeout(() => {
        if (!mounted) return;
        
        if (!pendingFetches.has(cacheKey)) {
          const promise = window.api.getCover(audioPath, effectiveHq).then(cover => {
            setCache(cacheKey, cover || null);
            pendingFetches.delete(cacheKey);
            return cover || null;
          }).catch(() => {
            setCache(cacheKey, null);
            pendingFetches.delete(cacheKey);
            return null;
          });
          pendingFetches.set(cacheKey, promise);
        }
        
        pendingFetches.get(cacheKey)?.then(() => {
          if (mounted) forceUpdate({});
        });
      }, 150);
    }
    
    return () => { 
      mounted = false; 
      if (timer) clearTimeout(timer);
    };
  }, [audioPath, effectiveHq, cacheKey]);

  if (displayCover) {
    return (
      <div 
        className={`overflow-hidden bg-cover bg-center ${className}`}
        style={{ backgroundImage: `url("${displayCover}")` }}
      >
        <img 
          src={displayCover} 
          alt="Cover"
          decoding="async"
          loading="lazy"
          className="w-full h-full object-cover opacity-0" 
        />
      </div>
    );
  }

  return (
    <div className={`bg-white flex justify-center items-center relative ${placeholderClassName} ${className}`}>
      {type === 'artist' ? (
        <div className="relative flex items-center justify-center">
          <Cat size={iconSize ? iconSize * 1.5 : 36} color="#000000" />
          <CircleHelp 
            size={iconSize ? iconSize * 0.6 : 16} 
            color="#000000" 
            className="absolute -top-2 -right-2 bg-white rounded-full shadow-sm" 
          />
        </div>
      ) : (
        <Music size={iconSize} color="#000000" />
      )}
    </div>
  );
}
