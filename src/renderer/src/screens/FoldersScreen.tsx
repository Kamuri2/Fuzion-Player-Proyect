import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import CoverImage from '../components/CoverImage';
import { Folder } from 'lucide-react';
// @ts-ignore
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function FoldersScreen() {
  const { folders } = useAudio();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex-1 px-8 py-8 max-w-full w-full animate-fade-in">
      <h1 className="text-4xl font-black uppercase tracking-widest mb-8" style={{ color: colors.text }}>{t('sidebar.folders', 'Carpetas')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pb-32">
        {Object.values(folders).map((folder: any) => (
          <div key={folder.name} className="flex flex-row items-center p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer h-full group"
               onClick={() => navigate(`/detail/folder/${encodeURIComponent(folder.name)}`)}>
            <div 
              className="w-16 h-16 rounded-lg overflow-hidden transition-all duration-300 group-hover:brightness-110"
            >
              <CoverImage 
                coverUrl={folder.cover} 
                audioPath={folder.songs[0]?.path}
                hq={true}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 ml-4 overflow-hidden">
              <h2 className="text-lg font-bold truncate" style={{ color: colors.text }}>{folder.name}</h2>
              <p className="text-sm opacity-70" style={{ color: colors.subText }}>
                {folder.songs.length} {t('detail.tracks', 'pistas')}
              </p>
            </div>
            <Folder size={24} className="opacity-20" style={{ color: colors.text }} />
          </div>
        ))}
      </div>
    </div>
  );
}
