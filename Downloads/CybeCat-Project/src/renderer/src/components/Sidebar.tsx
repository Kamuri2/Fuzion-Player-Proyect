import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FolderOpen, ListMusic, Disc3, Mic2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import cybeCatLogo from '../assets/CybeCat.png';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Ocultar en el reproductor
  if (location.pathname === '/player') return null;

  const NavItem = ({ to, icon: Icon, label }: any) => {
    const active = location.pathname === to;
    return (
      <button
        onClick={() => navigate(to)}
        className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 p-2 md:p-3 rounded-xl transition-all w-full md:justify-start ${active ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
          }`}
        style={{ color: active ? colors.primary : colors.text }}
      >
        <Icon size={24} />
        <span className="text-[10px] md:text-sm font-bold truncate">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:relative md:w-64 md:h-screen flex md:flex-col items-center md:items-start justify-around md:justify-start p-2 md:p-6 z-40 border-t md:border-t-0 md:border-r border-white/10"
      style={{ backgroundColor: colors.background }}>

      <div className="hidden md:block w-full mb-8 px-2">
        <img src={cybeCatLogo} alt="CybeCat Logo" className="h-14 w-auto object-contain" />
      </div>

      <div className="flex flex-row md:flex-col w-full justify-around md:justify-start md:gap-2">
        <NavItem to="/" icon={Home} label={t('sidebar.home', 'Inicio')} />
        <NavItem to="/folders" icon={FolderOpen} label={t('sidebar.folders', 'Carpetas')} />
        <NavItem to="/playlists" icon={ListMusic} label={t('sidebar.playlists', 'Playlist')} />
        <NavItem to="/albums" icon={Disc3} label={t('sidebar.albums', 'Albums')} />
        <NavItem to="/artists" icon={Mic2} label={t('sidebar.artists', 'Artistas')} />
      </div>
    </div>
  );
}
