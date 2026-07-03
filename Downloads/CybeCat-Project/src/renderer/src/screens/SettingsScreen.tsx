import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Trash2, RefreshCw } from 'lucide-react';
import { useTheme, baseThemes, ParticleType } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import { Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import enDict from '../locales/en.json';

const popularFonts = [
  "Inter", "Roboto", "Outfit", "Space Grotesk", "Syne", 
  "Montserrat", "Poppins", "Oswald", "Raleway", "Nunito", 
  "Playfair Display", "Cinzel", "Cormorant Garamond", "Josefin Sans", 
  "Caveat", "Pacifico", "Dancing Script", "VT323", "Press Start 2P"
];

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { colors, isDarkMode, toggleTheme, themeFamily, setThemeFamily, particles, setParticles, customFont, setCustomFont, mascots, addMascot, removeMascot, lyricsFontSize, setLyricsFontSize, showTranslatedLyrics, setShowTranslatedLyrics, lyricsLanguage, setLyricsLanguage } = useTheme();
  const { loadSongsFromUri, songs, isScanning, isCrossfadeEnabled, setIsCrossfadeEnabled, crossfadeDuration, setCrossfadeDuration } = useAudio();
  const currentFolder = localStorage.getItem('@music_folder');

  const [draftFont, setDraftFont] = useState(customFont);
  const [isTranslatingUI, setIsTranslatingUI] = useState(false);
  const [languageMode, setLanguageMode] = useState(localStorage.getItem('app_language_mode') || 'system');

  useEffect(() => {
    setDraftFont(customFont);
  }, [customFont]);

  const handleClearFolder = () => {
    localStorage.removeItem('@music_folder');
    window.location.reload();
  };

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
    setIsTranslatingUI(true);
    try {
      const translatedDict = await window.api.translateUI(langCode, enDict);
      if (translatedDict) {
        i18n.addResourceBundle(langCode, 'translation', translatedDict, true, true);
        i18n.changeLanguage(langCode);
      } else {
        alert('Error downloading language pack. Please check your internet connection.');
        // Revert to English
        i18n.changeLanguage('en');
      }
    } catch (e) {
      console.error(e);
      i18n.changeLanguage('en');
    } finally {
      setIsTranslatingUI(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen px-6 py-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-row items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-black/10 transition-colors mr-4"
        >
          <ArrowLeft size={28} color={colors.text} />
        </button>
        <h1 className="text-3xl font-black" style={{ color: colors.text }}>
          {t('settings.title')}
        </h1>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-2xl border border-white/10 shadow-sm" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>{t('settings.appearance')}</h2>
          <div className="flex flex-row items-center justify-between mb-6">
            <span className="font-medium" style={{ color: colors.subText }}>{t('settings.darkMode')}</span>
            <button
              className="px-4 py-2 rounded-lg font-bold transition-transform active:scale-95"
              style={{ backgroundColor: colors.primary, color: '#000' }}
              onClick={toggleTheme}
            >
              {isDarkMode ? t('settings.active') : t('settings.inactive')}
            </button>
          </div>

          <span className="font-medium mb-3 block" style={{ color: colors.subText }}>{t('settings.globalTheme')}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
            {baseThemes.map(theme => (
              <button
                key={theme.id}
                onClick={() => setThemeFamily(theme.id)}
                className={`p-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center ${themeFamily === theme.id ? 'scale-105 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                style={{
                  backgroundColor: themeFamily === theme.id ? colors.primary : 'transparent',
                  borderColor: themeFamily === theme.id ? colors.primary : colors.border,
                  color: themeFamily === theme.id ? '#000' : colors.text
                }}
              >
                {t(`themes.${theme.id}`, theme.name)}
              </button>
            ))}
          </div>

          <span className="font-medium mb-3 block" style={{ color: colors.subText }}>{t('settings.particles')}</span>
          <div className="flex flex-row gap-3 flex-wrap">
            {(['none', 'snow', 'bubbles', 'stars'] as ParticleType[]).map(pType => (
              <button
                key={pType}
                onClick={() => setParticles(pType)}
                className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all capitalize ${particles === pType ? 'scale-105 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                style={{
                  backgroundColor: particles === pType ? colors.primary : 'transparent',
                  borderColor: particles === pType ? colors.primary : colors.border,
                  color: particles === pType ? '#000' : colors.text
                }}
              >
                {pType === 'none' ? t('settings.particlesNone') : pType === 'snow' ? t('settings.particlesSnow') : pType === 'bubbles' ? t('settings.particlesBubbles') : t('settings.particlesStars')}
              </button>
            ))}
          </div>

          <span className="font-medium mb-3 block mt-6" style={{ color: colors.subText }}>{t('settings.fonts')}</span>
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <select 
                value={popularFonts.includes(draftFont) ? draftFont : (draftFont === '' ? '' : 'custom')}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setDraftFont(e.target.value);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg border bg-transparent font-bold appearance-none cursor-pointer outline-none"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <option value="" style={{ color: '#000' }}>{t('settings.systemFont')}</option>
                {popularFonts.map(font => (
                  <option key={font} value={font} style={{ color: '#000', fontFamily: `"${font}", sans-serif` }}>{font}</option>
                ))}
                {!popularFonts.includes(draftFont) && draftFont !== '' && (
                  <option value="custom" style={{ color: '#000' }}>{t('settings.customFont')} ({draftFont})</option>
                )}
              </select>
              <button
                onClick={() => setCustomFont('')}
                className="px-4 py-3 rounded-lg border font-bold transition-transform active:scale-95 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                style={{ borderColor: colors.border }}
              >
                {t('settings.reset')}
              </button>
            </div>
            
            <div className="flex flex-row gap-3">
              <input 
                type="text" 
                placeholder={t('settings.fontPlaceholder')}
                value={draftFont}
                onChange={(e) => setDraftFont(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border bg-transparent font-bold outline-none focus:border-white/30"
                style={{ borderColor: colors.border, color: colors.text }}
              />
              <button
                onClick={() => setCustomFont(draftFont)}
                className="px-6 py-3 rounded-lg font-bold transition-transform active:scale-95"
                style={{ backgroundColor: colors.primary, color: '#000' }}
              >
                {t('settings.apply')}
              </button>
            </div>
          </div>
          <p className="text-xs opacity-70 mt-1" style={{ color: colors.subText }}>{t('settings.fontHelper')}</p>
          
          <span className="font-medium mb-3 block mt-8" style={{ color: colors.subText }}>{t('settings.lyricsSize')}</span>
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-sm opacity-70" style={{ color: colors.subText }}>{t('settings.smaller')}</span>
              <span className="font-bold" style={{ color: colors.text }}>{lyricsFontSize}%</span>
              <span className="text-sm opacity-70" style={{ color: colors.subText }}>{t('settings.larger')}</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="150" 
              step="5" 
              value={lyricsFontSize}
              onChange={(e) => setLyricsFontSize(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10 mt-1"
              style={{ accentColor: colors.primary }}
            />
            <p className="text-xs opacity-70 mt-1" style={{ color: colors.subText }}>{t('settings.lyricsHelper')}</p>
          </div>

          <span className="font-medium mb-3 block mt-8" style={{ color: colors.subText }}>{t('settings.translation')}</span>
          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium" style={{ color: colors.text }}>{t('settings.translationDesc1')}</span>
                <span className="text-xs opacity-70" style={{ color: colors.subText }}>{t('settings.translationDesc2')}</span>
              </div>
              <button
                className="px-4 py-2 rounded-lg font-bold transition-transform active:scale-95"
                style={{ backgroundColor: colors.primary, color: '#000' }}
                onClick={() => setShowTranslatedLyrics(!showTranslatedLyrics)}
              >
                {showTranslatedLyrics ? t('settings.active') : t('settings.inactive')}
              </button>
            </div>

            {showTranslatedLyrics && (
              <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-white/10">
                <span className="text-sm font-medium" style={{ color: colors.text }}>{t('settings.translationLanguage')}</span>
                <select 
                  value={lyricsLanguage}
                  onChange={(e) => setLyricsLanguage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-transparent font-bold appearance-none cursor-pointer outline-none text-sm"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <option value="es" style={{ color: '#000' }}>Español</option>
                  <option value="en" style={{ color: '#000' }}>English</option>
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
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/10 shadow-sm" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>{t('settings.mascot')}</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
              <div>
                <span className="font-medium" style={{ color: colors.subText }}>{t('settings.mascotDesc')}</span>
                <p className="text-xs opacity-70 mt-1" style={{ color: colors.subText }}>{t('settings.mascotHelper')}</p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-3 rounded-lg font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                style={{ backgroundColor: colors.primary, color: '#000' }}
                disabled={mascots.length >= 3}
                onClick={async () => {
                  try {
                    const url = await window.api.openImageFile();
                    if (url) addMascot(url);
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                <ImageIcon size={20} />
                {t('settings.import')}
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {mascots.map((m, index) => (
                <div key={m.id} className="flex flex-row justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <img src={m.url} className="w-12 h-12 object-contain" alt="Mascot" />
                    <span className="font-bold text-sm" style={{ color: colors.text }}>{t('settings.mascot')} {index + 1}</span>
                  </div>
                  <button
                    onClick={() => removeMascot(m.id)}
                    className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold transition-colors"
                  >
                    {t('settings.delete')}
                  </button>
                </div>
              ))}
              {mascots.length === 0 && (
                <p className="text-sm font-bold opacity-50 my-4" style={{ color: colors.text }}>{t('settings.noMascots')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/10 shadow-sm" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>{t('settings.library')}</h2>

          {currentFolder ? (
            <div className="mb-4 p-3 rounded-lg bg-black/5 dark:bg-white/5 break-all">
              <span className="text-sm font-bold opacity-70 block mb-1">{t('settings.currentFolder')}</span>
              <span className="text-sm font-medium" style={{ color: colors.text }}>{currentFolder}</span>
            </div>
          ) : (
            <p className="text-sm mb-4" style={{ color: colors.subText }}>
              {t('settings.noFolder')}
            </p>
          )}

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-row gap-4">
              <button
                className="flex-1 flex flex-row items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                style={{ backgroundColor: colors.primary, color: '#000' }}
                onClick={() => loadSongsFromUri()}
                disabled={isScanning}
              >
                <FolderOpen size={20} />
                {t('settings.selectFolder', 'Seleccionar Carpeta')}
              </button>

              {currentFolder && (
                <button
                  className="flex-1 flex flex-row items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                  style={{ backgroundColor: colors.primary, color: '#000' }}
                  onClick={() => loadSongsFromUri(currentFolder, false)}
                  disabled={isScanning}
                >
                  <RefreshCw size={20} className={isScanning ? 'animate-spin' : ''} />
                  {isScanning ? t('settings.scanning') : t('settings.scan')}
                </button>
              )}
            </div>

            {currentFolder && (
              <button
                className="flex flex-row items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-transform active:scale-95 bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 disabled:scale-100 w-full md:w-auto"
                onClick={handleClearFolder}
                disabled={isScanning}
              >
                <Trash2 size={20} />
                {t('settings.deleteFolder', 'Eliminar Carpeta')}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/10 shadow-sm" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>{t('settings.playback', 'Reproducción')}</h2>

          <div className="flex flex-row items-center justify-between">
            <div>
              <span className="font-medium block" style={{ color: colors.text }}>{t('settings.crossfade', 'Crossfade')}</span>
              <span className="text-sm opacity-70" style={{ color: colors.subText }}>{t('settings.crossfadeDesc', 'Desvanece la pista actual y comienza la siguiente sin cortes.')}</span>
            </div>

            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isCrossfadeEnabled ? 'bg-green-500' : 'bg-gray-400'}`}
              style={{ backgroundColor: isCrossfadeEnabled ? colors.primary : undefined }}
              onClick={() => setIsCrossfadeEnabled(!isCrossfadeEnabled)}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCrossfadeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {isCrossfadeEnabled && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex flex-row items-center justify-between mb-2">
                <span className="font-medium" style={{ color: colors.text }}>{t('settings.crossfadeDuration', 'Duración del Crossfade')}</span>
                <span className="font-bold" style={{ color: colors.primary }}>{crossfadeDuration} s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={crossfadeDuration}
                onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
                style={{ accentColor: colors.primary }}
              />
              <div className="flex flex-row justify-between mt-1">
                <span className="text-xs opacity-50" style={{ color: colors.subText }}>0.1s</span>
                <span className="text-xs opacity-50" style={{ color: colors.subText }}>10s</span>
              </div>
            </div>
          )}
        </div>

        {/* Language Section */}
        <div className="p-6 rounded-2xl border border-white/10 shadow-sm" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
            {t('settings.language')}
            {isTranslatingUI && <RefreshCw size={16} className="animate-spin text-primary" />}
          </h2>
          <div className="flex flex-col gap-2">
            <select 
              value={languageMode === 'system' ? 'system' : i18n.language.split('-')[0]}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={isTranslatingUI}
              className="w-full px-4 py-3 rounded-lg border bg-transparent font-bold appearance-none cursor-pointer outline-none disabled:opacity-50"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <option value="system" style={{ color: '#000' }}>{t('settings.systemDefault', 'Predeterminado del sistema')}</option>
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
            <p className="text-xs opacity-70 mt-1" style={{ color: colors.subText }}>
              {isTranslatingUI ? 'Descargando paquete de idioma (Tardará unos segundos)...' : t('settings.languageHelper')}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/10 shadow-sm" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>{t('settings.about', 'Acerca de')}</h2>
          <p className="text-sm" style={{ color: colors.subText }}>
            CybeCat Desktop v1.0.0<br />
            {t('settings.songsRead', 'Canciones Leídas:')} {songs.length}
          </p>
        </div>
      </div>
    </div>
  );
}
