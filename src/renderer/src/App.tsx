import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioProvider, useAudio } from './context/AudioContext';
import { ThemeProvider } from './context/ThemeContext';
import HomeScreen from './screens/HomeScreen';
import MiniPlayer from './components/MiniPlayer';
import Sidebar from './components/Sidebar';
import GlobalButtons from './components/GlobalButtons';
import Mascot from './components/Mascot';
import SplashScreen from './components/SplashScreen';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import enDict from './locales/en.json';

import PlayerScreen from './screens/PlayerScreen';
import SettingsScreen from './screens/SettingsScreen';
import AlbumsScreen from './screens/AlbumsScreen';
import ArtistsScreen from './screens/ArtistsScreen';
import FoldersScreen from './screens/FoldersScreen';
import PlaylistsScreen from './screens/PlaylistsScreen';
import ListDetailScreen from './screens/ListDetailScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { useTheme } from './context/ThemeContext';
import { Music } from 'lucide-react';

function AppContent() {
  const { isPlayerOpen, currentSong, toastMessage } = useAudio();
  const { albumZenMode, isZenLoading } = useTheme();
  const { i18n, t } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);

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

  const location = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-transparent relative">
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        
        {isZenLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl"
          >
            <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
               <motion.div 
                 initial={{ x: 0 }}
                 animate={{ x: -50 }}
                 transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                 className="absolute w-48 h-48 bg-zinc-800 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 flex items-center justify-center border border-zinc-700"
               >
                 <Music size={64} className="text-zinc-500 opacity-50" />
               </motion.div>
               <motion.div 
                 initial={{ x: 0, rotate: 0 }}
                 animate={{ x: 50, rotate: 360 }}
                 transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                 className="absolute w-44 h-44 bg-[#0a0a0a] rounded-full shadow-2xl border-4 border-[#222] flex items-center justify-center z-0"
               >
                 <div className="w-14 h-14 bg-red-700 rounded-full border border-zinc-900 flex items-center justify-center shadow-inner">
                   <div className="w-3 h-3 bg-black rounded-full" />
                 </div>
               </motion.div>
            </div>
            
            <motion.h2 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="text-4xl font-black tracking-[0.3em] uppercase text-white drop-shadow-lg"
            >
              {t('settings.albumMode')}
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Draggable Top Bar for frameless window */}
      <div
        className="fixed top-0 left-0 right-0 h-10 z-[100]"
        style={{ WebkitAppRegion: 'drag' } as any}
      />

      {(!albumZenMode || location.pathname !== '/albums') && <GlobalButtons />}
      {(!albumZenMode || location.pathname !== '/albums') && <Sidebar />}
      
      <div id="main-scroll-container" className={`flex-1 overflow-y-auto overflow-x-hidden relative ${currentSong && !isPlayerOpen && (!albumZenMode || location.pathname !== '/albums') ? 'pb-[90px]' : 'pb-20 md:pb-0'}`}>
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
      {(!albumZenMode || location.pathname !== '/albums') && <MiniPlayer />}
      {/* Player Screen (Genie Effect Simulation) */}
      <div className="absolute inset-0 z-50 pointer-events-none" style={{ perspective: '1200px' }}>
        <motion.div
          animate={isPlayerOpen ? "open" : "closed"}
          initial="closed"
          variants={{
            open: {
              opacity: 1,
              scale: 1,
              y: 0,
              rotateX: 0,
              borderRadius: '0px',
              pointerEvents: 'auto',
              transition: { duration: 0.50, ease: [0.25, 1, 0.35, 1], delay: 0.23 }
            },
            closed: {
              opacity: 0,
              scale: 0.15,
              y: '45vh',
              rotateX: -55,
              borderRadius: '150px',
              pointerEvents: 'none',
              transition: { duration: 0.50, ease: [0.65, 0, 0.35, 1] }
            }
          }}
          className="absolute inset-0 bg-[#0a0a0a] overflow-hidden shadow-2xl"
          style={{ transformOrigin: 'bottom center' }}
        >
          <PlayerScreen />
        </motion.div>
      </div>
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border ${toastMessage.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-100' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100'
              }`}
          >
            <span className="font-bold">{toastMessage.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {(!albumZenMode || location.pathname !== '/albums') && <Mascot />}
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
