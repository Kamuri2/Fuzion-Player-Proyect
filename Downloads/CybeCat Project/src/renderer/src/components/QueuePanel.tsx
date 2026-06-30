import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { X, GripVertical } from 'lucide-react';
import CoverImage from './CoverImage';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QueuePanel({ onClose }: QueuePanelProps) {
  const { queue, queuePosition, currentSong, reorderQueue, playSound, currentContextId } = useAudio();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const speedRef = useRef(0);

  const offset = Math.max(0, queuePosition - 1);
  const upcomingQueue = queue.slice(offset);

  useEffect(() => {
    if (virtuosoRef.current) {
      // Small timeout to allow the slice to update first
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' });
      }, 50);
    }
  }, [currentSong?.id]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== targetIndex) {
      reorderQueue(draggedIndex + offset, targetIndex + offset);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    speedRef.current = 0;
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const threshold = 80; // pixels from edge to trigger scroll

    let newSpeed = 0;
    if (y < threshold) {
      // Near top
      newSpeed = -15 * (1 - y / threshold);
    } else if (y > rect.height - threshold) {
      // Near bottom
      newSpeed = 15 * (1 - (rect.height - y) / threshold);
    }

    if (newSpeed !== 0) {
      speedRef.current = newSpeed;
      if (!scrollAnimationRef.current) {
        const scrollStep = () => {
          if (containerRef.current && speedRef.current !== 0) {
            const scroller = containerRef.current.querySelector('[data-virtuoso-scroller]') as HTMLElement;
            if (scroller) {
              scroller.scrollTop += speedRef.current;
            }
            scrollAnimationRef.current = requestAnimationFrame(scrollStep);
          } else {
            scrollAnimationRef.current = null;
          }
        };
        scrollAnimationRef.current = requestAnimationFrame(scrollStep);
      }
    } else {
      speedRef.current = 0;
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
    }
  };

  const handleContainerDragLeave = () => {
    speedRef.current = 0;
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col animate-fade-in bg-white/5 rounded-2xl overflow-hidden border border-white/10">
      <div className="flex flex-row items-center justify-between p-6 border-b border-white/10 bg-black/20">
        <div>
          <h2 className="text-xl font-bold text-white">Queue</h2>
          <p className="text-sm text-white/50">{upcomingQueue.length} {t('player.queueRemaining', 'canciones restantes')}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden p-0 pt-4"
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
      >
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: '100%' }}
          className="scrollbar-hide"
          data={upcomingQueue}
          itemContent={(index, song) => {
            const isPlaying = currentSong?.id === song.id;
            
            return (
              <div 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex flex-row items-center p-3 rounded-xl mb-2 mx-4 transition-colors cursor-pointer group
                  ${isPlaying ? 'bg-white/10' : 'hover:bg-white/5'}
                  ${draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100'}
                `}
                onClick={() => playSound(song, currentContextId, undefined, undefined, false)}
              >
                <div className="mr-3 cursor-grab text-white/30 hover:text-white/70 active:cursor-grabbing p-1" onClick={(e) => e.stopPropagation()}>
                  <GripVertical size={20} />
                </div>
                
                <div className="w-10 h-10 rounded mr-4 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                  <CoverImage 
                    coverUrl={song.cover} 
                    audioPath={song.path}
                    hq={true}
                    className="w-full h-full object-cover"
                    placeholderClassName="w-full h-full bg-white/10"
                    iconSize={16}
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-1.5 h-3 bg-white mx-0.5 animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-4 bg-white mx-0.5 animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-2 bg-white mx-0.5 animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <p className={`font-bold text-sm truncate ${isPlaying ? 'text-white' : 'text-white/90'}`} style={{ color: isPlaying ? colors.primary : undefined }}>
                    {song.title || song.filename.replace(/\.[^/.]+$/, "")}
                  </p>
                  <p className="text-xs text-white/50 truncate mt-0.5">{song.artist || t('artists.unknown', 'Desconocido')}</p>
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
