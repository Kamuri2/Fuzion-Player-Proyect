import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioProvider, useAudio } from './context/AudioContext';
import { ThemeProvider } from './context/ThemeContext';
import HomeScreen from './screens/HomeScreen';
import MiniPlayer from './components/MiniPlayer';
import Sidebar from './components/Sidebar';
import GlobalButtons from './components/GlobalButtons';
import Mascot from './components/Mascot';
import { useTranslation } from 'react-i18next';
import enDict from './locales/en.json';

import PlayerScreen from './screens/PlayerScreen';
import SettingsScreen from './screens/SettingsScreen';
import AlbumsScreen from './screens/AlbumsScreen';
import ArtistsScreen from './screens/ArtistsScreen';
import FoldersScreen from './screens/FoldersScreen';
import PlaylistsScreen from './screens/PlaylistsScreen';
import ListDetailScreen from './screens/ListDetailScreen';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const { isPlayerOpen, currentSong, toastMessage } = useAudio();
  const [renderPlayer, setRenderPlayer] = useState(isPlayerOpen);
  const { i18n } = useTranslation();

  // Load dynamic language cache on boot if needed
  useEffect(() => {
    const lang = i18n.language.split('-')[0];
    if (lang !== 'en' && lang !== 'es' && !i18n.hasResourceBundle(lang, 'translation')) {
      window.api.getTranslatedUI(lang).then(cached => {
        if (cached) {
          i18n.addResourceBundle(lang, 'translation', cached, true, true);
          // Force i18next to re-evaluate now that the bundle is added
          i18n.changeLanguage(lang);
        } else {
          // Fallback to English if cache is missing, but attempt to download it
          window.api.translateUI(lang, enDict).then(downloaded => {
            if (downloaded) {
              i18n.addResourceBundle(lang, 'translation', downloaded, true, true);
              i18n.changeLanguage(lang);
            } else {
              i18n.changeLanguage('en');
            }
          }).catch(() => i18n.changeLanguage('en'));
        }
      });
    }
  }, [i18n, i18n.language]);

  useEffect(() => {
    if (isPlayerOpen) {
      setRenderPlayer(true);
      return undefined;
    } else {
      const t = setTimeout(() => setRenderPlayer(false), 400);
      return () => clearTimeout(t);
    }
  }, [isPlayerOpen]);

  const location = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-transparent relative">
      <GlobalButtons />
      <Sidebar />
      <div id="main-scroll-container" className={`flex-1 overflow-y-auto overflow-x-hidden relative ${currentSong && !isPlayerOpen ? 'pb-[90px]' : 'pb-20 md:pb-0'}`}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/albums" element={<AlbumsScreen />} />
            <Route path="/artists" element={<ArtistsScreen />} />
            <Route path="/folders" element={<FoldersScreen />} />
            <Route path="/playlists" element={<PlaylistsScreen />} />
            <Route path="/detail/:type/:id" element={<ListDetailScreen />} />
          </Routes>
        </AnimatePresence>
      </div>
      <MiniPlayer />
      {renderPlayer && (
        <div 
          className={`absolute inset-0 z-50 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${isPlayerOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <PlayerScreen />
        </div>
      )}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border ${
              toastMessage.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-100' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100'
            }`}
          >
            <span className="font-bold">{toastMessage.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <Mascot />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AudioProvider>
          <Router>
            <AppContent />
          </Router>
        </AudioProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
