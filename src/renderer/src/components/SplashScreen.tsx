import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import logo from '../assets/CybeCat.png';
import loginSound from '../assets/login_sound.mp3';
import { ArrowRight, Globe, CheckCircle2 } from 'lucide-react';
import enDict from '../locales/en.json';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const [savedUsername, setSavedUsername] = useState(localStorage.getItem('app_username'));
  const [isSettingUp, setIsSettingUp] = useState(!savedUsername);
  const [inputValue, setInputValue] = useState('');

  // Download states: 'idle' | 'downloading' | 'almostThere' | 'done'
  const [downloadPhase, setDownloadPhase] = useState<'idle' | 'downloading' | 'almostThere' | 'done'>('idle');
  const [languageMode, setLanguageMode] = useState(localStorage.getItem('app_language_mode') || 'system');

  const displayName = savedUsername ? `${t('splash.welcome')} ${savedUsername}` : t('splash.welcome');
  // Instead, we use a global variable on the window object to prevent React StrictMode double-play,
  // but still allow it to play if the component is fully re-mounted later.
  useEffect(() => {
    if (!isSettingUp) {
      const now = Date.now();
      // @ts-ignore
      const lastPlayed = window.__lastLoginSoundTime || 0;

      // If it hasn't been played in the last 2 seconds, play it
      if (now - lastPlayed > 2000) {
        // @ts-ignore
        window.__lastLoginSoundTime = now;

        const storedVol = localStorage.getItem('app_startup_sound_volume');
        const vol = storedVol !== null ? parseFloat(storedVol) : 0.5;

        if (vol > 0) {
          const audio = new Audio(loginSound);
          audio.volume = vol;
          audio.play().catch(e => console.log('Audio auto-play prevented:', e));
        }
      }

      const timer = setTimeout(() => {
        onComplete();
      }, 1200); // 1 second total display time

      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingUp]);

  const handleLanguageChange = async (langCode: string) => {
    setLanguageMode(langCode);

    let targetLang = langCode;
    if (langCode === 'system') {
      localStorage.setItem('app_language_mode', 'system');
      localStorage.removeItem('i18nextLng');
      targetLang = navigator.language.split('-')[0];
    } else {
      localStorage.setItem('app_language_mode', 'manual');
    }

    if (targetLang === 'en' || targetLang === 'es') {
      i18n.changeLanguage(targetLang);
      return;
    }

    // Dynamic Translation
    setDownloadPhase('downloading');

    const almostThereTimer = setTimeout(() => {
      setDownloadPhase('almostThere');
    }, 3000); // 3 seconds until 'almost there' message

    try {
      const translatedDict = await window.api.translateUI(langCode, enDict);
      if (translatedDict) {
        i18n.addResourceBundle(langCode, 'translation', translatedDict, true, true);
        i18n.changeLanguage(langCode);
      }
      clearTimeout(almostThereTimer);
      setDownloadPhase('done');
      setTimeout(() => setDownloadPhase('idle'), 1500);
    } catch (e) {
      console.error(e);
      i18n.changeLanguage('en');
      clearTimeout(almostThereTimer);
      setDownloadPhase('idle');
    }
  };

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      localStorage.setItem('app_username', inputValue.trim());
      setSavedUsername(inputValue.trim());
      setIsSettingUp(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0d0d0d] overflow-hidden"
    >
      {/* Background decorations */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 0.2 }}
        transition={{ duration: 3, ease: 'easeOut' }}
        className="absolute w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full blur-[120px]"
        style={{ backgroundColor: colors.primary }}
      />

      <AnimatePresence mode="wait">
        {isSettingUp ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center justify-center w-full max-w-md px-6"
          >
            {/* Language Selector */}
            <div className="absolute -top-32 md:-top-40 right-0 left-0 flex flex-row items-center justify-center gap-2">
              <Globe size={18} className="text-white/60" />
              <select
                value={languageMode === 'system' ? 'system' : i18n.language.split('-')[0]}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={downloadPhase === 'downloading' || downloadPhase === 'almostThere'}
                className="bg-transparent text-white/80 font-bold outline-none cursor-pointer text-sm appearance-none border-b border-white/20 pb-1 focus:border-white/60 transition-colors"
                style={{ textAlign: 'center' }}
              >
                <option value="system" style={{ color: '#000' }}>{t('settings.systemDefault')}</option>
                <option value="en" style={{ color: '#000' }}>English</option>
                <option value="es" style={{ color: '#000' }}>Español</option>
                <option value="fr" style={{ color: '#000' }}>Français</option>
                <option value="de" style={{ color: '#000' }}>Deutsch</option>
                <option value="it" style={{ color: '#000' }}>Italiano</option>
                <option value="pt" style={{ color: '#000' }}>Português</option>
                <option value="ru" style={{ color: '#000' }}>Русский</option>
                <option value="ja" style={{ color: '#000' }}>日本語</option>
                <option value="ko" style={{ color: '#000' }}>한국어</option>
                <option value="zh-CN" style={{ color: '#000' }}>中文 (Simplified)</option>
                <option value="ar" style={{ color: '#000' }}>العربية</option>
                <option value="hi" style={{ color: '#000' }}>हिन्दी</option>
              </select>
            </div>

            <h2 className="text-3xl font-black text-white mb-2 text-center drop-shadow-md">
              {t('setup.welcome')}
            </h2>

            <AnimatePresence mode="wait">
              <motion.div
                key={downloadPhase}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-white/60 mb-8 text-center text-sm flex items-center justify-center gap-2 h-6"
              >
                {downloadPhase === 'downloading' || downloadPhase === 'almostThere' ? (
                  <div className="flex space-x-1 items-center mr-1">
                    <motion.div className="w-1.5 h-1.5 bg-white/60 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 bg-white/60 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 bg-white/60 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                  </div>
                ) : downloadPhase === 'done' ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                    <CheckCircle2 size={18} className="text-green-400" />
                  </motion.div>
                ) : null}

                {downloadPhase === 'idle' && <span>{t('setup.desc')}</span>}
                {downloadPhase === 'downloading' && <span>{t('setup.downloading')}</span>}
                {downloadPhase === 'almostThere' && <span>{t('setup.almostThere')}</span>}
                {downloadPhase === 'done' && <span className="text-green-400">{t('setup.done')}</span>}
              </motion.div>
            </AnimatePresence>

            <form onSubmit={handleSaveUsername} className="w-full relative group">
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t('setup.placeholder')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-xl font-bold outline-none focus:border-white/40 transition-colors shadow-inner backdrop-blur-md"
                style={{ caretColor: colors.primary }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || downloadPhase === 'downloading' || downloadPhase === 'almostThere'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-xl transition-all text-white"
              >
                <ArrowRight size={24} />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="splash"
            className="relative z-10 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            >
              <img src={logo} alt="Fuzion Player Logo" className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-2xl mb-8" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-4xl md:text-5xl font-black text-white tracking-wider mb-2 text-center drop-shadow-lg"
            >
              Fuzion Player
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-lg md:text-xl font-medium text-white/60 tracking-widest uppercase"
            >
              {displayName}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
