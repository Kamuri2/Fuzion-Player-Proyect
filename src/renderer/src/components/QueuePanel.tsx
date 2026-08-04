import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { X, GripVertical } from 'lucide-react';
import CoverImage from './CoverImage';
import SongContextMenu from './SongContextMenu';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QueuePanel({ onClose }: QueuePanelProps) {
  const { queue, queuePosition, currentSong, reorderQueue, playSound, currentContextId, playlists } = useAudio();
  const { colors, isFullMode } = useTheme();
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [ghostIndex, setGhostIndex] = useState<number | null>(null);
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

  useEffect(() => {
    const cleanupDrag = () => {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setGhostIndex(null);
      speedRef.current = 0;
    };

    window.addEventListener('dragend', cleanupDrag);
    window.addEventListener('drop', cleanupDrag);
    window.addEventListener('mouseup', cleanupDrag);

    return () => {
      window.removeEventListener('dragend', cleanupDrag);
      window.removeEventListener('drop', cleanupDrag);
      window.removeEventListener('mouseup', cleanupDrag);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';

    setTimeout(() => {
      setGhostIndex(index);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null) return;

    const currentIndex = draggedIndex;
    setDraggedIndex(null);
    setGhostIndex(null);
    speedRef.current = 0;

    if (currentIndex !== targetIndex) {
      reorderQueue(currentIndex + offset, targetIndex + offset);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setGhostIndex(null);
    speedRef.current = 0;
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
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
    setDragOverIndex(null);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col animate-fade-in bg-white/5 rounded-2xl overflow-hidden border border-white/10">
      <div className="flex flex-row items-center justify-between p-6 border-b border-white/10 bg-black/20">
        <div>
          <h2 className="text-xl font-bold text-white">Queue</h2>
          <p className="text-sm text-white/50">{upcomingQueue.length} {t('player.queueRemaining', 'canciones restantes')}</p>
        </div>
        {isFullMode && (
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
            <X size={24} />
          </button>
        )}
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

            let showHeader: string | null = null;
            if (index === 0 && song.isManualQueue) {
              showHeader = t('player.nextInQueue', 'A continuación en la cola');
            } else if (index === 0 && !song.isManualQueue && upcomingQueue.length > 1) { // If it's the first item and not manual, but wait: the first item is the CURRENT song!
              // Actually index 0 is currentSong (if offset = queuePosition - 1). 
              // Wait, offset = Math.max(0, queuePosition - 1);
              // If we are at queuePosition 1, offset is 0. 
              // upcomingQueue[0] is the current song.
            }

            // The logic: 
            // index === 0 is ALWAYS the currently playing song (because offset = queuePosition - 1).
            // Actually, if queuePosition > 0, offset = queuePosition - 1, so upcomingQueue[0] is queue[queuePosition - 1] (the current song).
            // So index 1 is the first "next" song.

            if (index === 1) {
              if (song.isManualQueue) {
                showHeader = t('player.nextInQueue', 'A continuación en la cola');
              } else {
                let contextName = currentContextId;
                if (contextName === 'all') contextName = t('sidebar.allSongs', 'Todas las canciones');
                else if (contextName === 'favorites') contextName = t('playlists.favorites', 'Me Gusta');
                else if (contextName.startsWith('folder:')) contextName = contextName.replace('folder:', '');
                else if (contextName.startsWith('album:')) contextName = contextName.replace('album:', '');
                else if (contextName.startsWith('artist:')) contextName = contextName.replace('artist:', '');
                else {
                  const p = playlists.find(p => p.id === contextName);
                  if (p) contextName = p.name;
                }
                showHeader = t('player.nextFrom', 'Siguiente de: {{context}}', { context: contextName });
              }
            } else if (index > 1 && !song.isManualQueue && upcomingQueue[index - 1].isManualQueue) {
              // Transition from manual queue to auto queue
              let contextName = currentContextId;
              if (contextName === 'all') contextName = t('sidebar.allSongs', 'Todas las canciones');
              else if (contextName === 'favorites') contextName = t('playlists.favorites', 'Me Gusta');
              else if (contextName.startsWith('folder:')) contextName = contextName.replace('folder:', '');
              else if (contextName.startsWith('album:')) contextName = contextName.replace('album:', '');
              else if (contextName.startsWith('artist:')) contextName = contextName.replace('artist:', '');
              else {
                const p = playlists.find(p => p.id === contextName);
                if (p) contextName = p.name;
              }
              showHeader = t('player.nextFrom', 'Siguiente de: {{context}}', { context: contextName });
            }

            return (
              <div
                className="flex flex-col"
                onDragOver={(e) => { handleDragOver(e); setDragOverIndex(index); }}
                onDragEnter={(e) => { handleDragOver(e); }}
                onDrop={(e) => handleDrop(e, index)}
              >
                {showHeader && (
                  <div className="px-5 py-3 mt-2 text-sm font-bold text-white/60 uppercase tracking-wider">
                    {showHeader}
                  </div>
                )}
                {/* Drop Indicator / Abertura */}
                <div
                  className={`w-full transition-all duration-300 ease-out flex items-center justify-center overflow-hidden px-6
                    ${dragOverIndex === index && draggedIndex !== index ? 'h-12 opacity-100' : 'h-0 opacity-0'}
                  `}
                >
                  <div
                    className="w-full h-[3px] rounded-full"
                    style={{
                      backgroundColor: colors.primary,
                      boxShadow: `0 0 15px ${colors.primary}, 0 0 5px ${colors.primary}`
                    }}
                  />
                </div>

                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-row items-center p-3 rounded-xl mb-2 mx-4 transition-all duration-300 cursor-pointer group relative
                  ${isPlaying ? 'bg-white/10' : 'hover:bg-white/5'}
                  ${ghostIndex === index ? 'opacity-60 border border-dashed border-white/40 bg-black/40 scale-95' : 'opacity-100 border border-transparent'}
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

                  {!isPlaying && (
                    <div className="ml-2">
                      <SongContextMenu song={song} inQueue={true} queueIndex={offset + index} />
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
