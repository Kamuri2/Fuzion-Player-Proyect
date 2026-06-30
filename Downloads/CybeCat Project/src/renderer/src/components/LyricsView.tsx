import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  const { metadata, progress, currentSong } = useAudio();
  const { lyricsFontSize, showTranslatedLyrics, lyricsLanguage } = useTheme();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [staticLyrics, setStaticLyrics] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!metadata.lyrics) {
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
    const timeRegexGlobal = /\[(\d{1,}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    
    let isLrc = false;

    lines.forEach(line => {
      let match;
      const text = line.replace(/\[.*?\]/g, '').trim();
      
      while ((match = timeRegexGlobal.exec(line)) !== null) {
        isLrc = true;
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        let milliseconds = 0;
        if (match[3]) {
          const msStr = match[3];
          milliseconds = msStr.length === 1 ? parseInt(msStr) * 100 : (msStr.length === 2 ? parseInt(msStr) * 10 : parseInt(msStr));
        }
        
        const time = minutes * 60 + seconds + milliseconds / 1000;
        
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

  // Handle translation for synced lyrics
  useEffect(() => {
    if (showTranslatedLyrics && isSynced && lyrics.length > 0 && currentSong) {
      // Check if we already have translations
      if (!lyrics.some(l => l.translatedText !== undefined)) {
        const texts = lyrics.map(l => l.text);
        window.api.translateLyrics(currentSong.id, texts, lyricsLanguage).then(translations => {
          if (translations && translations.length > 0) {
            setLyrics(prev => prev.map((l, idx) => ({ ...l, translatedText: translations[idx] || '' })));
          } else {
            setLyrics(prev => prev.map(l => ({ ...l, translatedText: '' })));
          }
        }).catch(err => console.error("Translation error:", err));
      }
    }
  }, [lyrics, showTranslatedLyrics, lyricsLanguage, currentSong, isSynced]);

  // Handle translation for static lyrics
  useEffect(() => {
    if (showTranslatedLyrics && !isSynced && staticLyrics && currentSong) {
      if (!staticLyrics.includes('--- Traducción ---') && !staticLyrics.includes('--- Translation ---')) {
        // Split and translate line by line to maintain formatting
        const lines = staticLyrics.split('\n');
        window.api.translateLyrics(currentSong.id, lines, lyricsLanguage).then(translations => {
          if (translations && translations.length > 0 && translations.some(t => t.trim() !== '')) {
            setStaticLyrics(prev => prev + '\n\n--- Traducción ---\n\n' + translations.join('\n'));
          } else {
            // Append a hidden marker to prevent retrying
            setStaticLyrics(prev => prev + '\n\n<!-- --- Translation --- -->');
          }
        }).catch(err => console.error("Translation error:", err));
      }
    }
  }, [staticLyrics, showTranslatedLyrics, lyricsLanguage, currentSong, isSynced]);

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

  if (!metadata.lyrics) {
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
    <div 
      ref={containerRef}
      className="flex-1 w-full max-w-2xl mx-auto overflow-hidden mb-8 px-4"
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
              className={`text-center transition-all duration-700 font-bold ${
                isActive 
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
  );
}
