import { X, Plus, Music2 } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTranslation } from 'react-i18next';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string | null;
  onOpenCreateNew: () => void;
}

export default function AddToPlaylistModal({ isOpen, onClose, songId, onOpenCreateNew }: AddToPlaylistModalProps) {
  const { playlists, addSongToPlaylist } = useAudio();
  const { t } = useTranslation();

  if (!isOpen || !songId) return null;

  // Filtrar la lista de "Me Gusta" si no queremos que agreguen manualmente por aquí, 
  // aunque está bien que lo hagan. Dejaremos que puedan agregar a cualquiera.
  const customPlaylists = playlists; 

  const handleAddToPlaylist = (playlistId: string) => {
    addSongToPlaylist(playlistId, songId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-all"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-6 text-white text-center">{t('player.addToPlaylist', 'Añadir a Playlist')}</h2>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <button
            onClick={() => {
              onClose();
              onOpenCreateNew();
            }}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors w-full text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Plus size={24} className="text-white" />
            </div>
            <span className="font-bold text-white">{t('player.createPlaylist', 'Crear nueva lista')}</span>
          </button>

          <div className="h-[1px] bg-white/10 my-2 w-full" />

          {customPlaylists.map(playlist => (
            <button
              key={playlist.id}
              onClick={() => handleAddToPlaylist(playlist.id)}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors w-full text-left"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                {playlist.cover ? (
                  <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-blue-900/40">
                    <Music2 size={20} className="text-white/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{playlist.id === 'favorites' ? t('playlists.favorites', 'Me Gusta') : playlist.name}</p>
                <p className="text-xs text-gray-400 truncate">{playlist.songIds.length} {t('detail.songs', 'canciones')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
