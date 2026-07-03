import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Settings, RefreshCw } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';

export default function GlobalButtons() {
  const navigate = useNavigate();
  const { loadSongsFromUri, isPlayerOpen } = useAudio();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  if (isPlayerOpen) return null;

  return (
    <div className="fixed top-6 right-6 flex flex-row z-50">
      <button
        className="w-11 h-11 rounded-lg border-2 border-b-4 border-r-4 flex justify-center items-center ml-4 transition-transform active:scale-95 bg-black/5 dark:bg-white/5 backdrop-blur-md"
        style={{ borderColor: colors.border }}
        onClick={() => {
          const folder = localStorage.getItem('@music_folder');
          if (folder) loadSongsFromUri(folder);
          else loadSongsFromUri();
        }}
        title="Refrescar Música"
      >
        <RefreshCw size={20} color={colors.text} />
      </button>
      <button
        className="w-11 h-11 rounded-lg border-2 border-b-4 border-r-4 flex justify-center items-center ml-4 transition-transform active:scale-95 bg-black/5 dark:bg-white/5 backdrop-blur-md"
        style={{ borderColor: colors.border }}
        onClick={toggleTheme}
        title="Cambiar Tema"
      >
        {isDarkMode ? <Sun size={20} color={colors.text} /> : <Moon size={20} color={colors.text} />}
      </button>
      <button
        className="w-11 h-11 rounded-lg border-2 border-b-4 border-r-4 flex justify-center items-center ml-4 transition-transform active:scale-95 bg-black/5 dark:bg-white/5 backdrop-blur-md"
        style={{ borderColor: colors.border }}
        onClick={() => navigate('/settings')}
        title="Ajustes"
      >
        <Settings size={20} color={colors.text} />
      </button>
    </div>
  );
}
