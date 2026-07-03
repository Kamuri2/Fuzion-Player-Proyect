import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';
import CoverImage from './CoverImage';

export default function MiniPlayer() {
  const { 
    currentSong, pauseOrResumeSound, playNext, playPrevious, metadata, 
    isPlaying, progress, duration, seekTo, isShuffle, toggleShuffle,
    repeatMode, toggleRepeatMode, isPlayerOpen, setIsPlayerOpen
  } = useAudio();
  const { colors } = useTheme();
  const navigate = useNavigate();

  if (!currentSong || isPlayerOpen) return null;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(e.target.value));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212] flex flex-col border-t border-white/10 animate-slide-up shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
      
      {/* Thin Progress Bar at top of MiniPlayer */}
      <div className="w-full h-1 bg-white/10 relative group cursor-pointer">
        <input 
          type="range" 
          min={0} 
          max={duration || 100} 
          value={progress} 
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        <div 
          className="h-full absolute left-0 top-0 z-0 pointer-events-none group-hover:bg-green-500 transition-colors"
          style={{ 
            width: `${(progress / (duration || 1)) * 100}%`,
            backgroundColor: colors.primary 
          }}
        />
      </div>

      <div 
        className="flex flex-row items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setIsPlayerOpen(true)}
      >
        <div className="flex flex-row items-center flex-1 min-w-0">
          <CoverImage 
            coverUrl={metadata.cover} 
            audioPath={currentSong.path}
            className="w-14 h-14 rounded shadow-md flex-shrink-0" 
            placeholderClassName="w-14 h-14 rounded bg-white/5 flex-shrink-0" 
            iconSize={24}
          />
          <div className="flex flex-col justify-center ml-4 overflow-hidden pr-4">
            <span className="font-bold text-sm text-white truncate hover:underline cursor-pointer">
              {currentSong.title || currentSong.filename.replace(/\.[^/.]+$/, "")}
            </span>
            <span 
              className="text-xs text-white/60 truncate font-medium mt-0.5 hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/detail/artist/${encodeURIComponent(currentSong.artist || 'Desconocido')}`);
              }}
            >
              {currentSong.artist || 'Desconocido'}
            </span>
          </div>
        </div>

        {/* Playback Controls (Center) */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-[40%]">
          <div className="flex flex-row items-center justify-center gap-6">
            <button 
              className="p-1 transition-colors relative hidden sm:block"
              onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
              style={{ color: isShuffle ? colors.primary : 'rgba(255,255,255,0.6)' }}
            >
              <Shuffle size={18} />
              {isShuffle && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }} />}
            </button>

            <button 
              className="p-1 opacity-70 hover:opacity-100 transition-transform active:scale-95 text-white"
              onClick={(e) => { e.stopPropagation(); playPrevious(); }}
            >
              <SkipBack size={22} fill="currentColor" />
            </button>

            <button 
              className="w-10 h-10 flex items-center justify-center rounded-full transition-transform active:scale-95 hover:scale-105 bg-white text-black"
              onClick={(e) => { e.stopPropagation(); pauseOrResumeSound(); }}
            >
              {isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" className="ml-1" />
              )}
            </button>
            
            <button 
              className="p-1 opacity-70 hover:opacity-100 transition-transform active:scale-95 text-white" 
              onClick={(e) => { e.stopPropagation(); playNext(); }}
            >
              <SkipForward size={22} fill="currentColor" />
            </button>

            <button 
              className="p-1 transition-colors relative hidden sm:block"
              onClick={(e) => { e.stopPropagation(); toggleRepeatMode(); }}
              style={{ color: repeatMode !== 'off' ? colors.primary : 'rgba(255,255,255,0.6)' }}
            >
              <Repeat size={18} />
              {repeatMode === 'track' && (
                <div className="absolute -top-1 -right-1 text-[8px] font-bold" style={{ color: colors.primary }}>1</div>
              )}
              {repeatMode !== 'off' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }} />}
            </button>
          </div>
        </div>

        {/* Right side (Volume placeholder) */}
        <div className="flex-1 hidden md:flex flex-row items-center justify-end min-w-0 pr-2">
           {/* Placeholder for Volume, Queue button could also go here in the future */}
        </div>

      </div>
    </div>
  );
}
