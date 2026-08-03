import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, ListPlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAudio } from '../context/AudioContext';
import { Song } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SongContextMenuProps {
  song: Song;
  inQueue?: boolean;
  queueIndex?: number;
}

export default function SongContextMenu({ song, inQueue, queueIndex }: SongContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { addSongToNext, removeFromQueue } = useAudio();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    addSongToNext(song);
    setIsOpen(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inQueue && queueIndex !== undefined) {
      removeFromQueue(queueIndex);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors focus:outline-none"
      >
        <MoreHorizontal size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[999] overflow-hidden backdrop-blur-xl"
            style={{ backgroundColor: 'rgba(30, 30, 30, 0.95)' }}
          >
            <div className="flex flex-col p-1.5 gap-0.5">
              <button 
                onClick={handlePlayNext}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-white text-sm font-medium transition-colors"
              >
                <ListPlus size={18} style={{ color: colors.primary }} />
                {t('player.playNext', 'Añadir a continuación')}
              </button>
              
              {inQueue && (
                <button 
                  onClick={handleRemove}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-red-400 text-sm font-medium transition-colors"
                >
                  <Trash2 size={18} />
                  {t('player.removeFromQueue', 'Eliminar de la cola')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
