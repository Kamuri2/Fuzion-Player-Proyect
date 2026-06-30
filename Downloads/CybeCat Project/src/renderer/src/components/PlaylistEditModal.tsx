import { useState, type ReactElement } from 'react'
import { Camera, X } from 'lucide-react'
import { useAudio } from '../context/AudioContext'
import { Playlist } from '../types'
import { useTranslation } from 'react-i18next'

interface PlaylistEditModalProps {
  isOpen: boolean
  playlist: Playlist | null
  onClose: () => void
}

export default function PlaylistEditModal({
  isOpen,
  playlist,
  onClose
}: PlaylistEditModalProps): ReactElement | null {
  if (!isOpen || !playlist) return null

  return <PlaylistEditModalContent key={playlist.id} playlist={playlist} onClose={onClose} />
}

interface PlaylistEditModalContentProps {
  playlist: Playlist
  onClose: () => void
}

function PlaylistEditModalContent({
  playlist,
  onClose
}: PlaylistEditModalContentProps): ReactElement {
  const { updatePlaylist } = useAudio()
  const { t } = useTranslation()
  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description || '')
  const [coverUri, setCoverUri] = useState<string | null>(playlist.cover || null)

  const handleSelectCover = async (): Promise<void> => {
    try {
      const url = await window.api.openImageFile()
      if (url) {
        setCoverUri(url)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleSave = (): void => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    updatePlaylist(playlist.id, {
      name: trimmedName,
      description: description.trim() || undefined,
      cover: coverUri
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-all"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-white">{t('playlists.edit', 'Editar Playlist')}</h2>

        <div className="flex flex-col gap-4">
          <div className="flex justify-center mb-2">
            <button
              onClick={handleSelectCover}
              className="relative group w-32 h-32 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center overflow-hidden hover:border-white/50 transition-all"
            >
              {coverUri ? (
                <>
                  <img src={coverUri} alt={t('playlists.preview', 'Vista previa')} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={24} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="text-center text-white/50 group-hover:text-white transition-colors">
                  <Camera size={28} className="mx-auto mb-2" />
                  <span className="text-xs font-bold">{t('detail.changeCover', 'Subir foto')}</span>
                </div>
              )}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
              {t('playlists.name', 'Nombre')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
              {t('playlists.description', 'Descripción (Opcional)')}
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none h-24"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="mt-4 w-full bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3 rounded-xl transition-all"
          >
            {t('playlists.save', 'Guardar cambios')}
          </button>
        </div>
      </div>
    </div>
  )
}
