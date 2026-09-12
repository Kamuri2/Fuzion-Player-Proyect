import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, X, Pencil, RefreshCcw } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface LyricLine {
  time: number;
  text: string;
  translatedText?: string;
}

export default function LyricsView() {
  const { t } = useTranslation();
  const { metadata, subscribeToProgress, currentSong, showToast } = useAudio();
  const { lyricsFontSize, showTranslatedLyrics, lyricsLanguage } = useTheme();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [staticLyrics, setStaticLyrics] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(true);
  const [progress, setProgress] = useState(0);

  const [availableTranslations, setAvailableTranslations] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editableLyrics, setEditableLyrics] = useState<string>('');
  const [editingLang, setEditingLang] = useState<string | null>(null);

  const ALL_LANGUAGES = [
    { code: 'es', name: 'Español' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh-CN', name: '中文' },
    { code: 'ar', name: 'العربية' },
    { code: 'hi', name: 'हिन्दी' }
  ];

  // Fetch available translations when song changes
  useEffect(() => {
    if (currentSong?.id) {
      window.api.getAvailableTranslations(currentSong.id).then(langs => {
        setAvailableTranslations(langs || []);
        setSelectedLang(null); // Reset when song changes
      }).catch(console.error);
    }
  }, [currentSong?.id]);

  useEffect(() => {
    return subscribeToProgress((p) => {
      setProgress(p);
    });
  }, [subscribeToProgress]);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isLyricsEmpty = !metadata.lyrics || (typeof metadata.lyrics === 'string' && metadata.lyrics.trim() === '');

    if (isLyricsEmpty) {
      setLyrics([]);
      setStaticLyrics(null);
      setIsSynced(false);
      return;
    }

    const lrcRaw = metadata.lyrics;

    // 1. SYLT Object Support (from music-metadata)
    if (lrcRaw && typeof lrcRaw === 'object' && Array.isArray((lrcRaw as any).syncText)) {
      setIsSynced(true);
      const parsed = (lrcRaw as any).syncText.map((item: any) => ({
        time: item.timestamp / 1000,
        text: item.text || ''
      }));
      setLyrics(parsed);
      setStaticLyrics(null);
      return;
    }

    // 2. String Parsing Support (Aligning with Android Logic)
    const content = typeof lrcRaw === 'string' ? lrcRaw : ((lrcRaw as any)?.text || String(lrcRaw));
    const lines = content.split('\n');
    const parsed: LyricLine[] = [];
    const timeRegexGlobal = /\[(?:(\d{1,}):)?(\d{1,}):(\d{2})(?:[\.,](\d{1,3}))?\]/g;

    let isLrc = false;

    lines.forEach(line => {
      let match;
      const text = line.replace(/\[.*?\]/g, '').trim();
      timeRegexGlobal.lastIndex = 0; // Reset lastIndex for each line!

      while ((match = timeRegexGlobal.exec(line)) !== null) {
        isLrc = true;
        let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;

        if (match[1] !== undefined) {
          hours = parseInt(match[1], 10);
          minutes = parseInt(match[2], 10);
          seconds = parseInt(match[3], 10);
        } else {
          minutes = parseInt(match[2], 10);
          seconds = parseInt(match[3], 10);
        }

        if (match[4]) {
          const msStr = match[4];
          milliseconds = msStr.length === 1 ? parseInt(msStr) * 100 : (msStr.length === 2 ? parseInt(msStr) * 10 : parseInt(msStr));
        }

        const time = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;

        // Remove the `if (text)` check so we preserve empty lines (paragraph gaps)
        parsed.push({ time, text });
      }
    });

    if (isLrc) {
      setIsSynced(true);
      setLyrics(parsed.sort((a, b) => a.time - b.time));
      setStaticLyrics(null);
    } else {
      setIsSynced(false);
      setLyrics([]);
      setStaticLyrics(content);
    }

  }, [metadata.lyrics]);

  const handleRetryTranslation = async (langCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong) return;
    const success = await window.api.deleteTranslation(currentSong.id, langCode);
    if (success) {
      setAvailableTranslations(prev => prev.filter(l => l !== langCode));
      showToast(t('player.retryTranslationSuccess', 'Traducción eliminada. Reintentando...'), 'success');

      if ((selectedLang || lyricsLanguage) === langCode) {
        setLyrics(prev => prev.map(l => ({ ...l, translatedText: undefined })));

        try {
          let newTranslations;
          if (isSynced) {
            const texts = lyrics.map(l => l.text);
            newTranslations = await window.api.translateLyrics(currentSong.id, texts, langCode);
            if (newTranslations && newTranslations.length > 0) {
              setLyrics(prev => prev.map((l, idx) => ({ ...l, translatedText: newTranslations[idx] || '' })));
              showToast(t('player.translationRetryCompleted', '¡Traducción completada con éxito!'), 'success');
            } else {
              setLyrics(prev => prev.map(l => ({ ...l, translatedText: '' })));
              showToast(t('player.translationRetryFailed', 'La traducción falló'), 'error');
            }
          } else {
            let baseLyrics = staticLyrics || '';
            if (baseLyrics.includes('--- Traducción ---')) baseLyrics = baseLyrics.split('--- Traducción ---')[0].trim();
            else if (baseLyrics.includes('--- Translation ---')) baseLyrics = baseLyrics.split('--- Translation ---')[0].trim();

            const lines = baseLyrics.split('\n');
            newTranslations = await window.api.translateLyrics(currentSong.id, lines, langCode);
            if (newTranslations && newTranslations.length > 0 && newTranslations.some(t => t.trim() !== '')) {
              setStaticLyrics(baseLyrics + '\n\n--- Traducción ---\n\n' + newTranslations.join('\n'));
              showToast(t('player.translationRetryCompleted', '¡Traducción completada con éxito!'), 'success');
            } else {
              showToast(t('player.translationRetryFailed', 'La traducción falló'), 'error');
            }
          }
          const langs = await window.api.getAvailableTranslations(currentSong.id);
          setAvailableTranslations(langs || []);
        } catch (e) {
          showToast(t('player.translationOfflineError', 'No hay conexión a internet para traducir la letra.'), 'error');
        }
      }
    } else {
      showToast(t('player.retryTranslationError', 'Error al eliminar la traducción'), 'error');
    }
  };

  const openEditor = (langCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLang(langCode);
    if (isSynced) {
      setEditableLyrics(lyrics.map(l => l.translatedText || '').join('\n'));
    } else {
      if (staticLyrics && staticLyrics.includes('--- Traducción ---')) {
        setEditableLyrics(staticLyrics.split('--- Traducción ---')[1].trim());
      } else if (staticLyrics && staticLyrics.includes('--- Translation ---')) {
        setEditableLyrics(staticLyrics.split('--- Translation ---')[1].trim());
      } else {
        setEditableLyrics('');
      }
    }
    setIsEditorOpen(true);
    setIsLangMenuOpen(false);
  };

  const handleSaveTranslation = async () => {
    if (!currentSong || !editingLang) return;
    const lines = editableLyrics.split('\n');
    const success = await window.api.saveTranslation(currentSong.id, editingLang, lines);
    if (success) {
      showToast(t('player.saveTranslationSuccess', 'Traducción guardada exitosamente'), 'success');
      setIsEditorOpen(false);
      if (isSynced) {
        setLyrics(prev => prev.map((l, idx) => ({ ...l, translatedText: lines[idx] || '' })));
      } else {
        let baseLyrics = staticLyrics || '';
        if (baseLyrics.includes('--- Traducción ---')) {
          baseLyrics = baseLyrics.split('--- Traducción ---')[0].trim();
        } else if (baseLyrics.includes('--- Translation ---')) {
          baseLyrics = baseLyrics.split('--- Translation ---')[0].trim();
        }
        setStaticLyrics(baseLyrics + '\n\n--- Traducción ---\n\n' + editableLyrics);
      }
    } else {
      showToast(t('player.saveTranslationError', 'Error al guardar la traducción'), 'error');
    }
  };

  // Handle translation for synced lyrics
  useEffect(() => {
    const activeLang = selectedLang || lyricsLanguage;
    if (showTranslatedLyrics && isSynced && lyrics.length > 0 && currentSong) {
      // Allow overriding previous translations if selectedLang changes
      if (selectedLang !== null || !lyrics.some(l => l.translatedText !== undefined)) {
        const isAlreadyOffline = availableTranslations.includes(activeLang);
        const texts = lyrics.map(l => l.text);
        window.api.translateLyrics(currentSong.id, texts, activeLang).then(translations => {
          if (translations && translations.length > 0) {
            setLyrics(prev => prev.map((l, idx) => ({ ...l, translatedText: translations[idx] || '' })));
            if (!isAlreadyOffline) showToast(t('player.translationRetryCompleted', '¡Traducción completada con éxito!'), 'success');
          } else {
            setLyrics(prev => prev.map(l => ({ ...l, translatedText: '' })));
            if (!isAlreadyOffline) showToast(t('player.translationRetryFailed', 'La traducción falló: El servidor no respondió o bloqueó la petición temporalmente.'), 'error');
          }
          window.api.getAvailableTranslations(currentSong.id).then(langs => setAvailableTranslations(langs || []));
        }).catch(err => {
          console.error("Translation error:", err);
          showToast(t('player.translationOfflineError', 'No hay conexión a internet para traducir la letra.'), 'error');
        });
      }
    }
  }, [lyrics.length, showTranslatedLyrics, selectedLang, lyricsLanguage, currentSong, isSynced]);

  // Handle translation for static lyrics
  useEffect(() => {
    const activeLang = selectedLang || lyricsLanguage;
    if (showTranslatedLyrics && !isSynced && staticLyrics && currentSong) {
      // Re-translate if selectedLang is manually set or if there's no translation block
      if (selectedLang !== null || (!staticLyrics.includes('--- Traducción ---') && !staticLyrics.includes('--- Translation ---'))) {
        const isAlreadyOffline = availableTranslations.includes(activeLang);
        // We need the original static lyrics without previous translations
        let baseLyrics = staticLyrics;
        if (staticLyrics.includes('--- Traducción ---')) {
          baseLyrics = staticLyrics.split('--- Traducción ---')[0].trim();
        } else if (staticLyrics.includes('--- Translation ---')) {
          baseLyrics = staticLyrics.split('--- Translation ---')[0].trim();
        }

        const lines = baseLyrics.split('\n');
        window.api.translateLyrics(currentSong.id, lines, activeLang).then(translations => {
          if (translations && translations.length > 0 && translations.some(t => t.trim() !== '')) {
            setStaticLyrics(baseLyrics + '\n\n--- Traducción ---\n\n' + translations.join('\n'));
            if (!isAlreadyOffline) showToast(t('player.translationRetryCompleted', '¡Traducción completada con éxito!'), 'success');
          } else {
            if (selectedLang === null) {
              setStaticLyrics(baseLyrics + '\n\n<!-- --- Translation --- -->');
            }
            if (!isAlreadyOffline) showToast(t('player.translationRetryFailed', 'La traducción falló: El servidor no respondió o bloqueó la petición temporalmente.'), 'error');
          }
          window.api.getAvailableTranslations(currentSong.id).then(langs => setAvailableTranslations(langs || []));
        }).catch(err => {
          console.error("Translation error:", err);
          showToast(t('player.translationOfflineError', 'No hay conexión a internet para traducir la letra.'), 'error');
        });
      }
    }
  }, [staticLyrics !== null, showTranslatedLyrics, selectedLang, lyricsLanguage, currentSong, isSynced]);

  // Find active line index
  let activeIndex = -1;
  if (isSynced && lyrics.length > 0) {
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= progress + 0.1) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  const [yOffset, setYOffset] = useState(0);

  // Auto-scroll
  useEffect(() => {
    if (isSynced && activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeEl = activeLineRef.current;
      // Calculate offset relative to the moving container so we can translate it
      const scrollPos = activeEl.offsetTop - container.offsetHeight / 2 + activeEl.offsetHeight / 2;
      setYOffset(-scrollPos);
    } else if (activeIndex === -1) {
      setYOffset(0);
    }
  }, [activeIndex, isSynced]);

  const isLyricsEmptyRender = !metadata.lyrics || (typeof metadata.lyrics === 'string' && metadata.lyrics.trim() === '');
  if (isLyricsEmptyRender) {
    return (
      <div className="flex-1 w-full flex items-center justify-center mb-8 px-4 h-full min-h-[300px]">
        <p className="text-white/40 text-2xl font-bold text-center tracking-widest uppercase">{t('player.lyricsNotAvailable', 'Letras no disponibles')}</p>
      </div>
    );
  }

  if (!isSynced && staticLyrics) {
    return (
      <div className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto mb-8 px-4 scrollbar-hide py-8 space-y-4">
        <div className="text-white/80 text-xl whitespace-pre-wrap text-center font-bold">
          {staticLyrics}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full relative">
      {/* Selector de Traducciones Offline/Online */}
      {showTranslatedLyrics && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full shadow-lg border border-white/10 text-white/80 hover:text-white transition-all flex items-center gap-2"
          >
            <Globe size={20} />
            <span className="text-sm font-bold uppercase">{selectedLang || lyricsLanguage}</span>
          </button>

          <AnimatePresence>
            {isLangMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl overflow-hidden min-w-[200px]"
              >
                <div className="p-2 border-b border-white/10 flex justify-between items-center">
                  <span className="text-xs text-white/50 font-bold px-2 uppercase tracking-wider">{t('settings.translationLanguage', 'Traducción')}</span>
                  <button onClick={() => setIsLangMenuOpen(false)} className="text-white/50 hover:text-white"><X size={14} /></button>
                </div>
                <div className="max-h-64 overflow-y-auto customized-scrollbar-light p-1 flex flex-col gap-1">
                  {ALL_LANGUAGES.map(lang => {
                    const isOffline = availableTranslations.includes(lang.code);
                    const isActive = (selectedLang || lyricsLanguage) === lang.code;
                    return (
                      <div
                        key={lang.code}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-bold rounded-lg transition-colors group cursor-pointer ${isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                        onClick={() => {
                          setSelectedLang(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                      >
                        <span>{lang.name}</span>
                        {isOffline && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-widest text-white/90">{t('player.offline', 'Offline')}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => openEditor(lang.code, e)} className="p-1 hover:bg-white/20 rounded text-white" title={t('player.editTranslation', 'Editar')}>
                                <Pencil size={12} />
                              </button>
                              <button onClick={(e) => handleRetryTranslation(lang.code, e)} className="p-1 hover:bg-white/20 rounded text-white" title={t('player.retryTranslation', 'Reintentar')}>
                                <RefreshCcw size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">{t('player.editTranslation', 'Editar Traducción')} - {editingLang?.toUpperCase()}</h3>
                <button onClick={() => setIsEditorOpen(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
              </div>
              <p className="text-xs text-white/50 mb-4">{t('player.editTranslationDesc', 'Modifica las líneas de la traducción. Cada línea corresponde a una línea original de la canción.')}</p>

              <textarea
                value={editableLyrics}
                onChange={e => setEditableLyrics(e.target.value)}
                className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-white/30 customized-scrollbar-light resize-none"
                style={{ minHeight: '300px' }}
              />

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2 rounded-lg font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  {t('player.cancel', 'Cancelar')}
                </button>
                <button onClick={handleSaveTranslation} className="px-6 py-2 rounded-lg font-bold bg-white text-black hover:bg-white/90 transition-colors">
                  {t('player.save', 'Guardar')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div
        ref={containerRef}
        className="flex-1 w-full max-w-2xl mx-auto overflow-hidden mb-8 px-4 h-full relative"
        style={{
          maxHeight: '70vh',
          maskImage: isSynced ? 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' : 'none',
          WebkitMaskImage: isSynced ? 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' : 'none'
        }}
      >
        <motion.div
          className="w-full relative"
          animate={{ y: yOffset }}
          transition={{ type: "tween", duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="py-[30vh]">
            {lyrics.map((line, i) => {
              const isActive = i === activeIndex;
              const isPassed = i < activeIndex;

              return (
                <div
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  className={`text-center transition-all duration-700 font-bold ${isActive
                    ? 'text-white scale-105 py-4 drop-shadow-lg'
                    : isPassed
                      ? 'text-white/40 py-2'
                      : 'text-white/20 py-2'
                    }`}
                  style={{
                    transformOrigin: 'center center',
                    fontSize: isActive ? `${36 * (lyricsFontSize / 100)}px` : `${20 * (lyricsFontSize / 100)}px`,
                    lineHeight: 1.4
                  }}
                >
                  {line.text || '\u00A0'}
                  {showTranslatedLyrics && line.translatedText && (
                    <div
                      className={`mt-1 transition-all duration-700 ${isActive ? 'text-white/60' : 'text-white/20'}`}
                      style={{ fontSize: isActive ? `${22 * (lyricsFontSize / 100)}px` : `${14 * (lyricsFontSize / 100)}px` }}
                    >
                      {line.translatedText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
