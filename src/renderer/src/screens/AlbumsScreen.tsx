import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import CoverImage from '../components/CoverImage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, GalleryHorizontal } from 'lucide-react';
import AlbumsCoverFlow from '../components/AlbumsCoverFlow';
// @ts-ignore
import React, { useMemo, useState, useEffect, useRef } from 'react';

const AlbumCard = ({ album, isFirst, letter, colors, t, navigate }: any) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
        }
      },
      { rootMargin: '500px' } // ~5 items buffer margin
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={isFirst ? `letter-${letter}` : undefined}
      className="flex flex-col items-center p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer group h-full"
      onClick={() => navigate(`/detail/album/${encodeURIComponent(album.name)}`)}
    >
      <div
        className="relative w-full aspect-square mb-3 rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:brightness-110 bg-black/5 dark:bg-white/5"
      >
        {inView && (
          <CoverImage
            coverUrl={album.cover}
            audioPath={album.songs[0]?.path}
            hq={true}
            className="w-full h-full object-cover rounded-xl"
          />
        )}
      </div>
      <h2 className="text-center font-bold text-sm truncate w-full" style={{ color: colors.text }}>{album.name}</h2>
      <p className="text-center text-xs opacity-70 truncate w-full" style={{ color: colors.subText }}>{album.artist} • {album.songs.length} {t('detail.tracks', 'pistas')}</p>
    </div>
  );
};

export default function AlbumsScreen() {
  const { albums } = useAudio();
  const { colors, albumZenMode } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'coverflow'>('grid');
  const [isCoverFlowExpanded, setIsCoverFlowExpanded] = useState(false);

  const sortedAlbums = useMemo(() => {
    return Object.values(albums).filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [albums, searchQuery]);

  const existingLetters = useMemo(() => {
    const letters = new Set<string>();
    sortedAlbums.forEach((a: any) => {
      const firstChar = a.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) {
        letters.add(firstChar);
      } else {
        letters.add("#");
      }
    });
    return letters;
  }, [sortedAlbums]);

  const firstOfLetter = useMemo(() => {
    const map = new Map<string, string>();
    sortedAlbums.forEach((a: any) => {
      const firstChar = a.name.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
      if (!map.has(letter)) {
        map.set(letter, a.name);
      }
    });
    return map;
  }, [sortedAlbums]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex-1 px-8 py-8 max-w-full w-full animate-fade-in relative flex flex-col">
      {!isCoverFlowExpanded && !albumZenMode && (
        <div className="animate-fade-in">
          <h1 className="text-4xl font-black uppercase tracking-widest mb-8" style={{ color: colors.text }}>{t('albums.title')}</h1>

          <div className="mb-8 flex gap-4 items-center">
            <input
              type="text"
              placeholder={t('albums.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 p-4 rounded-xl bg-black/5 dark:bg-white/5 outline-none transition-all focus:ring-2"
              style={{ color: colors.text }}
            />
            <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-1">
              <button
                className={`p-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-black/10 dark:bg-white/10 shadow-sm' : 'opacity-50 hover:opacity-100'}`}
                onClick={() => setViewMode('grid')}
                title="Cuadrícula"
                style={{ color: colors.text }}
              >
                <LayoutGrid size={24} />
              </button>
              <button
                className={`p-3 rounded-lg transition-all ${viewMode === 'coverflow' ? 'bg-black/10 dark:bg-white/10 shadow-sm' : 'opacity-50 hover:opacity-100'}`}
                onClick={() => setViewMode('coverflow')}
                title="Cover Flow"
                style={{ color: colors.text }}
              >
                <GalleryHorizontal size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!albumZenMode && viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pb-32 pr-12">
          {sortedAlbums.map((album: any) => {
            const firstChar = album.name.charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
            const isFirst = firstOfLetter.get(letter) === album.name;

            return (
              <AlbumCard
                key={album.name}
                album={album}
                isFirst={isFirst}
                letter={letter}
                colors={colors}
                t={t}
                navigate={navigate}
              />
            );
          })}
        </div>
      ) : (
        <AlbumsCoverFlow albums={sortedAlbums} navigate={navigate} onExpand={setIsCoverFlowExpanded} />
      )}

      {!albumZenMode && viewMode === 'grid' && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-[2px] z-50 p-2 rounded-full bg-black/5 dark:bg-white/5 backdrop-blur-md shadow-lg" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {alphabet.map(letter => {
            const exists = existingLetters.has(letter);
            return (
              <button
                key={letter}
                onClick={() => exists && scrollToLetter(letter)}
                disabled={!exists}
                className={`text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all ${exists ? 'hover:scale-125 cursor-pointer' : 'opacity-20 cursor-default'
                  }`}
                style={{
                  color: exists ? colors.text : colors.subText,
                  backgroundColor: exists ? 'transparent' : 'transparent'
                }}
              >
                {letter}
              </button>
            )
          })}
        </div>
      )}
    </div>
  );
}
