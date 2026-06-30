import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import CoverImage from '../components/CoverImage';
// @ts-ignore
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function ArtistsScreen() {
  const { artists } = useAudio();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const sortedArtists = useMemo(() => {
    return Object.values(artists)
      .filter((a: any) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [artists, searchQuery]);

  const existingLetters = useMemo(() => {
    const letters = new Set<string>();
    sortedArtists.forEach((a: any) => {
      const firstChar = a.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) {
        letters.add(firstChar);
      } else {
        letters.add("#");
      }
    });
    return letters;
  }, [sortedArtists]);

  const firstOfLetter = useMemo(() => {
    const map = new Map<string, string>();
    sortedArtists.forEach((a: any) => {
      const firstChar = a.name.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
      if (!map.has(letter)) {
        map.set(letter, a.name);
      }
    });
    return map;
  }, [sortedArtists]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex-1 px-8 py-8 max-w-full w-full animate-fade-in relative">
      <h1 className="text-5xl font-black uppercase tracking-[5px] mt-8 mb-6" style={{ color: colors.text }}>{t('artists.title')}</h1>
      
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
        <input 
          type="text" 
          placeholder={t('artists.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-black/5 dark:bg-white/5 rounded-full py-3 pl-12 pr-6 outline-none focus:ring-2 ring-blue-500/50"
          style={{ color: colors.text }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full pb-32 pr-12">
        {sortedArtists.map((artist: any) => {
          const firstChar = artist.name.charAt(0).toUpperCase();
          const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
          const isFirst = firstOfLetter.get(letter) === artist.name;

          return (
            <div 
              key={artist.name} 
              id={isFirst ? `letter-${letter}` : undefined}
              className="flex flex-col items-center group cursor-pointer h-full"
              onClick={() => navigate(`/detail/artist/${encodeURIComponent(artist.name)}`)}
            >
              <div 
                className="w-full aspect-square rounded-full mb-4 overflow-hidden shadow-lg bg-black/5 dark:bg-white/5 transition-all duration-300 group-hover:brightness-110"
              >
                <CoverImage 
                  coverUrl={artist.cover} 
                  hq={true}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-center font-bold text-lg truncate w-full" style={{ color: colors.text }}>{artist.name}</h2>
              <p className="text-center text-sm opacity-70 truncate w-full" style={{ color: colors.subText }}>{artist.songs.length} pistas</p>
            </div>
          );
        })}
      </div>

      <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-[2px] z-50 p-2 rounded-full bg-black/5 dark:bg-white/5 backdrop-blur-md shadow-lg" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {alphabet.map(letter => {
          const exists = existingLetters.has(letter);
          return (
            <button
              key={letter}
              onClick={() => exists && scrollToLetter(letter)}
              disabled={!exists}
              className={`text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all ${
                exists ? 'hover:scale-125 cursor-pointer' : 'opacity-20 cursor-default'
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
    </div>
  );
}
