import { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Music2, Play, MoreVertical, Trash2, Edit } from 'lucide-react';
import PlaylistCreateModal from '../components/PlaylistCreateModal';
import PlaylistEditModal from '../components/PlaylistEditModal';

export default function PlaylistsScreen() {
  const { playlists, deletePlaylist, currentContextId } = useAudio();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleDelete = (e: React.MouseEvent, id: string): void => {
    e.stopPropagation();
    if (confirm(t('playlists.confirmDelete'))) {
      deletePlaylist(id);
      setContextMenuId(null);
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null);
  const handleEditPlaylist = (playlist: any) => {
    setEditingPlaylist(playlist);
    setIsEditModalOpen(true);
  };

  return (
    <div className="p-8 pt-20 pb-32 min-h-screen">
      <div className="flex justify-between items-center mb-8" style={{ color: colors.text }}>
        <div>
          <h1 className="text-4xl font-black uppercase tracking-widest mb-2" style={{ color: colors.text }}>{t('playlists.title')}</h1>
          <p className="text-gray-400" style={{ color: colors.subText }}>{playlists.length} {playlists.length === 1 ? t('playlists.singleCount', 'lista') : t('playlists.pluralCount', 'listas')}</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-6 py-3 rounded-full font-bold transition-all"
          style={{ backgroundColor: colors.primary, color: '#000' }}
        >
          + {t('playlists.create')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {playlists.map((playlist) => {
          const isPlayingContext = currentContextId === `playlist-${playlist.id}`;

          return (
            <div
              key={playlist.id}
              className="group relative flex flex-col cursor-pointer rounded-2xl p-4 transition-all duration-300"
              onMouseEnter={() => setHoveredId(playlist.id)}
              onMouseLeave={() => {
                setHoveredId(null);
                setContextMenuId(null);
              }}
              onClick={() => navigate(`/detail/playlist/${playlist.id}`)}
            >
              <div
                className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105"
                style={{ backgroundColor: colors.card }}
              >
                {playlist.cover ? (
                  <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center transition-transform duration-500" style={{ background: `linear-gradient(to bottom right, ${colors.primary}40, ${colors.secondary}40)` }}>
                    <Music2 size={64} style={{ color: colors.text + '30' }} />
                  </div>
                )}
                {/* Play Button Overlay */}
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${hoveredId === playlist.id || isPlayingContext ? 'opacity-100' : 'opacity-0'}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/detail/playlist/${playlist.id}`);
                    }}
                    className="w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center hover:scale-110 transition-all transform translate-y-2 group-hover:translate-y-0" style={{ backgroundColor: colors.primary + '40', color: colors.text }}
                  >
                    <Play fill="currentColor" size={24} className="ml-1" />
                  </button>
                </div>
                {/* Context Menu Button */}
                {!playlist.isAuto && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenuId(contextMenuId === playlist.id ? null : playlist.id);
                      }}
                      className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-opacity duration-300 ${hoveredId === playlist.id ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: colors.card + '80', color: colors.text }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </>
                )}
              </div>
              {/* Context Menu Dropdown */}
              {contextMenuId === playlist.id && (
                <div className="absolute top-14 right-6 w-48 border rounded-xl shadow-2xl py-2 z-50" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditPlaylist(playlist); setContextMenuId(null); }}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2" style={{ color: colors.text }}
                  >
                    <Edit size={16} />
                    {t('playlists.edit', 'Editar Playlist')}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, playlist.id)}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2" style={{ color: colors.accent }}
                  >
                    <Trash2 size={16} />
                    {t('playlists.delete', 'Eliminar Playlist')}
                  </button>
                </div>
              )}
              <h3 className="font-bold text-lg truncate group-hover:text-white transition-colors" style={{ color: colors.text }}>{playlist.id === 'favorites' ? t('playlists.favorites', 'Me Gusta') : playlist.name}</h3>
              <p className="text-sm truncate mt-1" style={{ color: colors.subText }}>
                {playlist.description || t('playlists.defaultDescription', 'Playlist')}
              </p>
            </div>
          );
        })}
      </div>

      <PlaylistCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {editingPlaylist && (
        <PlaylistEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          playlist={editingPlaylist}
        />
      )}
    </div>
  );
}
