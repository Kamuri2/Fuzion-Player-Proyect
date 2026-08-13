import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import CoverImage from './CoverImage';
import { Pause, Play, SkipBack, SkipForward, ListMusic, X, Settings, Mic2, Power } from 'lucide-react';
import LyricsView from './LyricsView';
import { useTranslation } from 'react-i18next';
import vinylDustSound from '../assets/vinyl dust.mp3';

// --- Vinyl Player Component ---
const VinylPlayer = ({
  album, currentSong, isPlaying, subscribeToProgress, playSound,
  isPaperOpen, volume, setVolume, pauseOrResumeSound, playNext,
  playPrevious, isDiscOnPlatter, turntableRef, onDiscDragStart, isInstantSnap, onPowerOff
}: any) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAngle, setDragAngle] = useState(0);
  const [showVinylSettings, setShowVinylSettings] = useState(false);
  const [customTexture, setCustomTexture] = useState<string | null>(null);
  const [customScale, setCustomScale] = useState<number>(100);
  const [hideCenterLabel, setHideCenterLabel] = useState<boolean>(false);
  const [hideGrooves, setHideGrooves] = useState<boolean>(false);
  const [textureHistory, setTextureHistory] = useState<string[]>([]);

  const [customTextureOpacity, setCustomTextureOpacity] = useState<number>(100);
  const [customOffsetX, setCustomOffsetX] = useState<number>(0);
  const [customOffsetY, setCustomOffsetY] = useState<number>(0);
  const [vinylRpm, setVinylRpm] = useState<number>(33);
  const vinylRpmRef = useRef(33);

  useEffect(() => {
    vinylRpmRef.current = vinylRpm;
  }, [vinylRpm]);

  const [isPendingPause, setIsPendingPause] = useState(false);
  const [isPendingResume, setIsPendingResume] = useState(false);
  const [isPendingTrackChange, setIsPendingTrackChange] = useState(false);
  const vinylRef = useRef<HTMLDivElement>(null);
  const pivotRef = useRef<HTMLDivElement>(null);
  const rotationAngleRef = useRef(0);
  const spinSpeedRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);
  const wasPaperOpen = useRef(isPaperOpen);

  useEffect(() => {
    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (spinSpeedRef.current > 0) {
        rotationAngleRef.current = (rotationAngleRef.current + spinSpeedRef.current * delta) % 360;
        if (vinylRef.current) {
          vinylRef.current.style.transform = `rotate(${rotationAngleRef.current}deg)`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const getSpinSpeed = () => {
    if (vinylRpmRef.current === 45) return 0.27;
    if (vinylRpmRef.current === 78) return 0.47;
    return 0.2;
  };

  useEffect(() => {
    if (isPlaying && !isPendingPause && !isPendingResume) {
      spinSpeedRef.current = getSpinSpeed();
    } else if (!isPlaying && !isPendingPause && !isPendingResume) {
      if (isPendingTrackChange) {
        spinSpeedRef.current = getSpinSpeed();
      } else {
        spinSpeedRef.current = 0;
      }
    }
  }, [isPlaying, isPendingPause, isPendingResume, isPendingTrackChange, vinylRpm]);

  useEffect(() => {
    const savedTexture = localStorage.getItem(`vinyl_texture_${album.name}`);
    const savedHistory = localStorage.getItem(`vinyl_textures_history_${album.name}`);
    const savedScale = localStorage.getItem(`vinyl_scale_${album.name}`);
    const savedHideLabel = localStorage.getItem(`vinyl_hide_label_${album.name}`);
    const savedOpacity = localStorage.getItem(`vinyl_opacity_${album.name}`);
    const savedOffsetX = localStorage.getItem(`vinyl_offset_x_${album.name}`);
    const savedOffsetY = localStorage.getItem(`vinyl_offset_y_${album.name}`);
    const savedRpm = localStorage.getItem(`vinyl_rpm_${album.name}`);

    if (savedRpm) setVinylRpm(Number(savedRpm));
    else setVinylRpm(33);

    if (savedOffsetX) setCustomOffsetX(Number(savedOffsetX));
    else setCustomOffsetX(0);

    if (savedOffsetY) setCustomOffsetY(Number(savedOffsetY));
    else setCustomOffsetY(0);

    if (savedTexture) setCustomTexture(savedTexture);
    else setCustomTexture(null);

    if (savedHistory) {
      try { setTextureHistory(JSON.parse(savedHistory)); } catch (e) { setTextureHistory([]); }
    } else {
      if (savedTexture) setTextureHistory([savedTexture]);
      else setTextureHistory([]);
    }

    if (savedScale) setCustomScale(Number(savedScale));
    else setCustomScale(100);

    if (savedHideLabel) setHideCenterLabel(savedHideLabel === 'true');
    else setHideCenterLabel(false);

    const savedHideGrooves = localStorage.getItem(`vinyl_hide_grooves_${album.name}`);
    if (savedHideGrooves) setHideGrooves(savedHideGrooves === 'true');
    else setHideGrooves(false);

    if (savedOpacity) setCustomTextureOpacity(Number(savedOpacity));
    else setCustomTextureOpacity(100);
  }, [album.name]);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      let img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        const compressed = await compressImage(result);
        setCustomTexture(compressed);
        localStorage.setItem(`vinyl_texture_${album.name}`, compressed);

        setTextureHistory(prev => {
          const newHistory = [compressed, ...prev.filter(t => t !== compressed)].slice(0, 4);
          localStorage.setItem(`vinyl_textures_history_${album.name}`, JSON.stringify(newHistory));
          return newHistory;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCustomScale(val);
    localStorage.setItem(`vinyl_scale_${album.name}`, val.toString());
  };

  const handleHideLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setHideCenterLabel(val);
    localStorage.setItem(`vinyl_hide_label_${album.name}`, val.toString());
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCustomTextureOpacity(val);
    localStorage.setItem(`vinyl_opacity_${album.name}`, val.toString());
  };

  const handleOffsetXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCustomOffsetX(val);
    localStorage.setItem(`vinyl_offset_x_${album.name}`, val.toString());
  };

  const handleOffsetYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCustomOffsetY(val);
    localStorage.setItem(`vinyl_offset_y_${album.name}`, val.toString());
  };

  const handleResetTexture = () => {
    setCustomTexture(null);
    setCustomScale(100);
    setHideCenterLabel(false);
    setCustomTextureOpacity(100);
    setCustomOffsetX(0);
    setCustomOffsetY(0);
    setVinylRpm(33);
    localStorage.removeItem(`vinyl_texture_${album.name}`);
    localStorage.removeItem(`vinyl_scale_${album.name}`);
    localStorage.removeItem(`vinyl_hide_label_${album.name}`);
    localStorage.removeItem(`vinyl_opacity_${album.name}`);
    localStorage.removeItem(`vinyl_offset_x_${album.name}`);
    localStorage.removeItem(`vinyl_offset_y_${album.name}`);
    localStorage.removeItem(`vinyl_rpm_${album.name}`);
  };

  useEffect(() => {
    wasPaperOpen.current = isPaperOpen;
  }, [isPaperOpen]);

  const handlePlayNextWithDust = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      setIsPendingTrackChange(true);
      pauseOrResumeSound();
    }
    const dust = new Audio(vinylDustSound);
    dust.volume = 0.5;
    dust.play();
    setTimeout(() => {
      playNext();
      setIsPendingTrackChange(false);
    }, 1200);
  };

  const handlePlayPrevWithDust = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      setIsPendingTrackChange(true);
      pauseOrResumeSound();
    }
    const dust = new Audio(vinylDustSound);
    dust.volume = 0.5;
    dust.play();
    setTimeout(() => {
      playPrevious();
      setIsPendingTrackChange(false);
    }, 1200);
  };

  const originalVolumeRef = useRef(1);
  const isThisAlbumActive = currentSong && album.songs.some((s: any) => s.path === currentSong.path);

  const handlePauseOrResumeDelay = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying && !isPendingPause) {
      setIsPendingPause(true);
      originalVolumeRef.current = volume;
      const steps = 15;
      const stepDuration = 100;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const fraction = 1 - currentStep / steps;
        const newVolume = Math.max(0, originalVolumeRef.current * fraction);
        setVolume(newVolume);
        spinSpeedRef.current = getSpinSpeed() * fraction;

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
        }
      }, stepDuration);

      setTimeout(() => {
        clearInterval(fadeInterval);
        pauseOrResumeSound();
        spinSpeedRef.current = 0;
        setIsPendingPause(false);
        setTimeout(() => setVolume(originalVolumeRef.current), 150);
      }, 1500);
    } else if (!isPlaying && !isPendingResume) {
      setIsPendingResume(true);
      setVolume(0);

      if (!isThisAlbumActive && album.songs.length > 0) {
        playSound(album.songs[0], `album_${album.name}`, album.songs);
      } else {
        pauseOrResumeSound();
      }

      const steps = 15;
      const stepDuration = 66;
      let currentStep = 0;

      const spinUpInterval = setInterval(() => {
        currentStep++;
        const fraction = currentStep / steps;
        spinSpeedRef.current = getSpinSpeed() * fraction;
        setVolume(originalVolumeRef.current * fraction);

        if (currentStep >= steps) {
          clearInterval(spinUpInterval);
        }
      }, stepDuration);

      setTimeout(() => {
        clearInterval(spinUpInterval);
        setVolume(originalVolumeRef.current);
        spinSpeedRef.current = getSpinSpeed();
        setIsPendingResume(false);
      }, 1000);
    }
  };

  const songDurations = album.songs.map((s: any) => s.duration || 180);
  const totalDuration = songDurations.reduce((a: number, b: number) => a + b, 0);

  const cumulativeDurations = useMemo(() => {
    let acc = 0;
    return songDurations.map((d: number) => {
      const current = acc;
      acc += d;
      return current;
    });
  }, [songDurations]);

  useEffect(() => {
    if (!isPlaying) return;
    const unsub = subscribeToProgress((prog: number) => {
      if (!isDragging) setProgress(prog);
    });
    return unsub;
  }, [isPlaying, isDragging, subscribeToProgress]);

  const minAngle = -1;
  const maxAngle = 31;

  let currentSongIndex = album.songs.findIndex((s: any) => s.path === currentSong?.path);
  if (currentSongIndex === -1) currentSongIndex = 0;

  const tonearmAngle = useMemo(() => {
    if (isDragging) return dragAngle;
    if (!totalDuration) return minAngle;

    let timeBeforeCurrent = 0;
    if (currentSongIndex < cumulativeDurations.length) {
      timeBeforeCurrent = cumulativeDurations[currentSongIndex];
    }
    const currentTimeTotal = timeBeforeCurrent + progress;
    const ratio = currentTimeTotal / totalDuration;

    if (ratio >= 0.99 && !isPlaying) {
      return -10;
    }

    return minAngle + (ratio * (maxAngle - minAngle));
  }, [isDragging, dragAngle, totalDuration, cumulativeDurations, currentSongIndex, progress, isPlaying]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!pivotRef.current) return;
      const rect = pivotRef.current.getBoundingClientRect();
      const pivotX = rect.left + rect.width / 2;
      const pivotY = rect.top + 16; // Center of the visual pivot circle is 16px down

      const dx = e.clientX - pivotX;
      const dy = e.clientY - pivotY;

      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      angle = (angle + 360) % 360;
      angle -= 90;

      if (angle < minAngle) angle = minAngle;
      if (angle > maxAngle) angle = maxAngle;

      setDragAngle(angle);
    };

    const handlePointerUp = () => {
      setIsDragging(false);

      const ratio = (dragAngle - minAngle) / (maxAngle - minAngle);
      const targetTime = ratio * totalDuration;

      let selectedSongIndex = 0;
      for (let i = 0; i < cumulativeDurations.length; i++) {
        if (targetTime >= cumulativeDurations[i] && (i === cumulativeDurations.length - 1 || targetTime < cumulativeDurations[i + 1])) {
          selectedSongIndex = i;
          break;
        }
      }

      const selectedSong = album.songs[selectedSongIndex];
      if (selectedSong && selectedSong.path !== currentSong?.path) {
        playSound(selectedSong, `album_${album.name}`, album.songs);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragAngle, totalDuration, songDurations, album, playSound, cumulativeDurations, currentSong]);

  const isVinylOut = isDiscOnPlatter;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>

      {/* 1. BASE DEL TOCADISCOS (z-10) */}
      <motion.div
        ref={turntableRef}
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: 1, x: '110%' }}
        exit={{ opacity: 0, x: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-square rounded-t-[2rem] rounded-b-none bg-[#f5f5f5] border-[3px] border-white shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex items-center justify-center pointer-events-auto z-10"
      >
        <div className="absolute inset-[3.5%] rounded-full bg-[#e8e8e8] shadow-[inset_0_10px_20px_rgba(0,0,0,0.1),inset_0_-2px_5px_rgba(255,255,255,1)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#d1d5db] rounded-full shadow-inner flex items-center justify-center pointer-events-none">
          <div className="w-2 h-2 bg-[#9ca3af] rounded-full shadow-sm" />
        </div>

        {/* Botón de Apagado (Power) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying && !isPendingPause) {
              handlePauseOrResumeDelay(e as any);
              setTimeout(() => {
                if (onPowerOff) onPowerOff();
              }, 1500);
            } else {
              if (onPowerOff) onPowerOff();
            }
          }}
          className="absolute top-6 left-6 p-3 bg-[#e0e0e0] hover:bg-[#d0d0d0] text-zinc-500 hover:text-red-500 rounded-full shadow-inner transition-colors z-20 cursor-pointer"
          title="Album Mode Off"
        >
          <Power size={22} />
        </button>

        {/* Pestaña de Reproducción */}
        <div
          className="absolute top-[calc(100%-2px)] left-[-3px] bg-[#f5f5f5] rounded-bl-[2rem] rounded-br-2xl shadow-xl border-[3px] border-t-0 border-white px-6 py-4 flex flex-col min-w-[220px] max-w-[280px]"
          style={{ zIndex: -1 }}
        >
          {isThisAlbumActive && currentSong ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${isPlaying && !isPendingPause ? 'bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]' : 'bg-zinc-400'}`} />
                <span className="text-xs font-bold text-zinc-500 tracking-widest">
                  {isPlaying && !isPendingPause ? t('player.playing', 'REPRODUCIENDO').toUpperCase() : t('player.paused', 'PAUSADO').toUpperCase()}
                </span>
              </div>
              <span className="text-lg font-black text-zinc-800 truncate leading-tight">
                {currentSong.title || currentSong.filename.replace(/\.[^/.]+$/, "")}
              </span>
              <span className="text-xs font-bold text-zinc-500 truncate mt-0.5">
                {currentSong.artist || album.artist}
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1.5 opacity-60">
                <div className="w-2 h-2 rounded-full bg-zinc-400" />
                <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">
                  {t('player.standby', 'En Espera')}
                </span>
              </div>
              <span className="text-lg font-black text-zinc-400 truncate leading-tight">
                {t('player.noActiveTrack', 'Sin pista activa')}
              </span>
            </>
          )}
        </div>

        {/* Pestaña de Controles - Siempre Visible */}
        <div
          className="absolute top-[calc(100%-3px)] right-[-3px] h-[3.5rem] bg-[#f5f5f5] rounded-br-[2rem] rounded-bl-2xl shadow-xl border-[3px] border-t-0 border-white flex flex-row items-center gap-3 px-4 pointer-events-auto"
          style={{ zIndex: -1 }}
        >
          <button onClick={(e) => { e.stopPropagation(); setShowVinylSettings(!showVinylSettings); }} className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-black transition-colors" title="Diseño de Vinilo">
            <Settings size={16} />
          </button>
          <div className="w-[1px] h-6 bg-zinc-300 mx-1" />
          <button onClick={handlePlayPrevWithDust} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-zinc-50 text-black rounded shadow-sm border border-zinc-200 active:shadow-inner active:translate-y-[1px] transition-all"><SkipBack size={14} fill="currentColor" /></button>
          <button onClick={handlePauseOrResumeDelay} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-zinc-50 text-black rounded-full shadow-md border border-zinc-200 active:shadow-inner active:translate-y-[1px] transition-all">
            {isPlaying && !isPendingPause ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={handlePlayNextWithDust} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-zinc-50 text-black rounded shadow-sm border border-zinc-200 active:shadow-inner active:translate-y-[1px] transition-all"><SkipForward size={14} fill="currentColor" /></button>
        </div>
      </motion.div>

      {/* 2. DISCO GIRANDO (z-20) */}
      <motion.div
        initial={{ x: 0, scale: 0.9, opacity: 1 }}
        animate={isVinylOut ? { x: '110%', scale: 1, opacity: 1 } : { x: 0, scale: 0.9, opacity: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        transition={isInstantSnap ? { duration: 0 } : { type: 'spring', damping: 15, mass: 1, stiffness: 100 }}
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-square flex items-center justify-center z-20 pointer-events-none"
      >
        <div
          className={`w-[92%] aspect-square rounded-full relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#0a0a0a] border border-[#222] overflow-hidden ${(!isPlaying && spinSpeedRef.current < 0.01) ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : 'pointer-events-none'}`}
          onPointerDown={(e) => {
            if (!isPlaying && spinSpeedRef.current < 0.01) {
              e.stopPropagation();
              e.preventDefault();
              if (onDiscDragStart) onDiscDragStart(e);
            }
          }}
        >
          <div
            ref={vinylRef}
            className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden pointer-events-none"
            style={{ backgroundColor: '#111', willChange: 'transform' }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${customScale / 100}) translate(${customOffsetX}%, ${customOffsetY}%)`, transformOrigin: 'center' }}>
              {customTexture ? (
                <img src={customTexture} className="w-full h-full object-cover" style={{ opacity: customTextureOpacity / 100 }} />
              ) : (
                <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={true} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="absolute inset-0 rounded-full bg-black/15 pointer-events-none" />
            <div className="absolute top-1 left-1/2 w-1.5 h-1.5 bg-white/20 rounded-full z-10" />

            {!(customTexture && hideGrooves) && (
              <svg viewBox="0 0 100 100" className="w-full h-full opacity-60 z-10 pointer-events-none">
                {album.songs.map((_: any, i: number) => {
                  const startRadius = 18;
                  const maxPlayableWidth = 30;
                  const grooveWidth = (songDurations[i] / (totalDuration || 1)) * maxPlayableWidth;
                  const prevWidths = cumulativeDurations[i] / (totalDuration || 1) * maxPlayableWidth;
                  const r = startRadius + prevWidths + (grooveWidth / 2);
                  return (
                    <circle
                      key={i}
                      cx="50" cy="50"
                      r={r}
                      fill="none"
                      stroke="#222"
                      strokeWidth={Math.max(0.1, grooveWidth - 0.2)}
                    />
                  );
                })}
                <circle cx="50" cy="50" r="49" fill="none" stroke="#111" strokeWidth="2" />
              </svg>
            )}

            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full z-10 flex items-center justify-center pointer-events-none ${customTexture && hideCenterLabel ? '' : 'bg-[#111] border-[4px] border-[#222] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]'}`}>
              {!(customTexture && hideCenterLabel) && (
                <>
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-70">
                    <path id="curve" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" />
                    <text className="text-[8px] fill-zinc-300 font-bold uppercase tracking-[0.2em]" dy="0">
                      <textPath href="#curve" startOffset="50%" textAnchor="middle">
                        {album.name.substring(0, 20)} • {album.year || '2024'} • {album.artist?.substring(0, 15) || 'UNKNOWN'} •
                      </textPath>
                    </text>
                  </svg>
                  <div className="w-[15%] aspect-square rounded-full border border-[#333] bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. BRAZO DE LA AGUJA (z-30) */}
      <motion.div
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: 1, x: '110%' }}
        exit={{ opacity: 0, x: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-square pointer-events-none z-30"
      >
        <div ref={pivotRef} className="absolute top-[8%] right-[8%] w-8 h-8 pointer-events-none" />
        <div
          className={`absolute top-[8%] right-[8%] w-8 h-[65%] pointer-events-none ${isDragging ? '' : 'transition-transform duration-1000 ease-linear'}`}
          style={{ transformOrigin: '50% 16px', transform: `rotate(${tonearmAngle}deg)`, willChange: 'transform' }}
        >
          <div className="w-12 h-12 rounded-full bg-zinc-300 shadow-2xl border-[5px] border-zinc-800 absolute -top-2 -left-2 flex items-center justify-center pointer-events-auto">
            <div className="w-4 h-4 bg-zinc-900 rounded-full" />
          </div>
          <div className="w-2.5 h-[85%] bg-[#c0c0c0] absolute left-1/2 -translate-x-1/2 top-4 shadow-xl rounded-full origin-top pointer-events-auto" />
          <div
            className={`w-8 h-20 absolute bottom-[3%] left-1/2 -translate-x-1/2 flex items-start justify-center cursor-grab pointer-events-auto touch-none ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{ transformOrigin: 'top center', transform: 'rotate(5deg)' }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setIsDragging(true); }}
          >
            <div className="relative w-5 h-12 bg-zinc-800 rounded-sm shadow-2xl border-t-2 border-zinc-500 flex flex-col items-center pointer-events-none">
              <div className="w-full h-1/2 bg-zinc-700 rounded-t-sm border-b border-zinc-900" />
              <div className="w-0.5 h-3 bg-zinc-400 absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-b-full" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. MODAL AJUSTES DEL VINILO (z-50) Componente hermano a la base para evitar el Stacking Context */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: '110%' }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-square pointer-events-none z-50"
      >
        <AnimatePresence>
          {showVinylSettings && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="absolute bottom-[0.2%] right-[-1px] w-64 bg-[#fcfcfc] p-4 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-[3px] border-white pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm text-zinc-800">{t('player.discDesign', 'Diseño del Disco')}</h3>
                <button onClick={() => setShowVinylSettings(false)} className="text-zinc-500 hover:text-black p-1 rounded-full hover:bg-zinc-100"><X size={16} /></button>
              </div>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 cursor-pointer">
                  <span className="text-xs font-semibold text-zinc-600">{t('player.vinylTexture', 'TEXTURA DEL VINILO')}</span>
                  <div className="w-full h-9 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded flex items-center justify-center text-xs font-medium transition-colors text-zinc-700">
                    {t('player.uploadImage', 'Subir Imagen...')}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleTextureUpload} />
                </label>

                {textureHistory.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-zinc-600">{t('player.history', 'HISTORIAL')}</span>
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {textureHistory.map((tex, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setCustomTexture(tex);
                            localStorage.setItem(`vinyl_texture_${album.name}`, tex);
                          }}
                          className={`w-10 h-10 rounded-full border-2 overflow-hidden cursor-pointer flex-shrink-0 transition-transform hover:scale-110 ${customTexture === tex ? 'border-blue-500 scale-110' : 'border-zinc-300'}`}
                        >
                          <img src={tex} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-zinc-600">{t('player.rpm', 'VELOCIDAD (RPM)')}</span>
                  <div className="flex bg-zinc-100 rounded p-1">
                    {[33, 45, 78].map(rpm => (
                      <button
                        key={rpm}
                        onClick={() => {
                          setVinylRpm(rpm);
                          localStorage.setItem(`vinyl_rpm_${album.name}`, rpm.toString());
                        }}
                        className={`flex-1 text-xs font-semibold py-1 rounded transition-colors ${vinylRpm === rpm ? 'bg-white shadow-sm text-black' : 'text-zinc-500 hover:text-zinc-700'}`}
                      >
                        {rpm}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold text-zinc-600">{t('player.imageScale', 'ESCALA DE IMAGEN')}</span>
                    <span className="text-xs text-zinc-500 font-mono">{customScale}%</span>
                  </div>
                  <input type="range" min="20" max="250" value={customScale} onChange={handleScaleChange} className="w-full accent-zinc-800 cursor-ew-resize" />
                </div>
                {customTexture && (
                  <>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-zinc-600">{t('player.imageOffsetX', 'POSICIÓN HORIZONTAL')}</span>
                        <span className="text-xs text-zinc-500 font-mono">{customOffsetX}%</span>
                      </div>
                      <input type="range" min="-100" max="100" value={customOffsetX} onChange={handleOffsetXChange} className="w-full accent-zinc-800 cursor-ew-resize" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-zinc-600">{t('player.imageOffsetY', 'POSICIÓN VERTICAL')}</span>
                        <span className="text-xs text-zinc-500 font-mono">{customOffsetY}%</span>
                      </div>
                      <input type="range" min="-100" max="100" value={customOffsetY} onChange={handleOffsetYChange} className="w-full accent-zinc-800 cursor-ew-resize" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-zinc-600">{t('player.imageOpacity', 'OPACIDAD')}</span>
                        <span className="text-xs text-zinc-500 font-mono">{customTextureOpacity}%</span>
                      </div>
                      <input type="range" min="0" max="200" value={customTextureOpacity} onChange={handleOpacityChange} className="w-full accent-zinc-800 cursor-ew-resize" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input type="checkbox" checked={hideCenterLabel} onChange={handleHideLabelChange} className="w-4 h-4 accent-zinc-800 rounded border-zinc-300" />
                      <span className="text-xs font-medium text-zinc-600">{t('player.hideCenterLabel', 'Ocultar etiqueta central')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={hideGrooves}
                        onChange={(e) => {
                          setHideGrooves(e.target.checked);
                          localStorage.setItem(`vinyl_hide_grooves_${album.name}`, e.target.checked ? 'true' : 'false');
                        }}
                        className="w-4 h-4 accent-zinc-800 rounded border-zinc-300"
                      />
                      <span className="text-xs font-medium text-zinc-600">{t('player.hideGrooves', 'Ocultar surcos')}</span>
                    </label>
                  </>
                )}

                <button onClick={handleResetTexture} className="mt-1 w-full h-8 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-xs font-semibold transition-colors">
                  {t('player.reset', 'Restablecer')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
};

const PeekDiscVisuals = ({ album, isDragging = false }: { album: any; isDragging?: boolean }) => {
  const savedTexture = localStorage.getItem(`vinyl_texture_${album.name}`);
  const customTextureOpacity = Number(localStorage.getItem(`vinyl_opacity_${album.name}`) || 100);
  const customScale = Number(localStorage.getItem(`vinyl_scale_${album.name}`) || 100);
  const customOffsetX = Number(localStorage.getItem(`vinyl_offset_x_${album.name}`) || 0);
  const customOffsetY = Number(localStorage.getItem(`vinyl_offset_y_${album.name}`) || 0);
  const hideCenterLabel = localStorage.getItem(`vinyl_hide_label_${album.name}`) === 'true';
  const hideGrooves = localStorage.getItem(`vinyl_hide_grooves_${album.name}`) === 'true';

  return (
    <div className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#111' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${customScale / 100}) translate(${customOffsetX}%, ${customOffsetY}%)`, transformOrigin: 'center' }}>
        {savedTexture ? (
          <img src={savedTexture} className="w-full h-full object-cover" style={{ opacity: customTextureOpacity / 100 }} />
        ) : (
          <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={true} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/15 pointer-events-none" />

      {!(savedTexture && hideGrooves) && (
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-60 z-10 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx="50" cy="50" r={18 + i * 3.8} fill="none" stroke="#222" strokeWidth="0.5" />
          ))}
          <circle cx="50" cy="50" r="49" fill="none" stroke="#111" strokeWidth="2" />
        </svg>
      )}

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full z-10 flex items-center justify-center pointer-events-none ${savedTexture && hideCenterLabel ? '' : 'bg-[#111] border-[4px] border-[#222] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]'}`}>
        {!(savedTexture && hideCenterLabel) && (
          <>
            {!isDragging && (
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-70">
                <path id={`peekCurve_${album.name.replace(/[^a-zA-Z0-9]/g, '')}`} d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" />
                <text className="text-[8px] fill-zinc-300 font-bold uppercase tracking-[0.2em]" dy="0">
                  <textPath href={`#peekCurve_${album.name.replace(/[^a-zA-Z0-9]/g, '')}`} startOffset="50%" textAnchor="middle">
                    {album.name.substring(0, 20)} • {album.year || '2024'} •
                  </textPath>
                </text>
              </svg>
            )}
            <div className="w-[15%] aspect-square rounded-full border border-[#333] bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
          </>
        )}
      </div>
    </div>
  );
};

export default function AlbumsCoverFlow({ albums, onExpand }: any) {
  const { colors, albumZenMode, setAlbumZenMode } = useTheme();
  const { playSound, pauseOrResumeSound, playNext, playPrevious, currentSong, subscribeToProgress, isPlaying: globalIsPlaying, volume, setVolume } = useAudio();
  const { t } = useTranslation();

  const [activeIndex, setActiveIndex] = useState(Math.floor(albums.length / 2));
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isPaperOpen, setIsPaperOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [albumInfo, setAlbumInfo] = useState<string>('');
  const [isDiscOnPlatter, setIsDiscOnPlatter] = useState(false);
  const [isDraggingDisc, setIsDraggingDisc] = useState(false);
  const [discDragPos, setDiscDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isInstantSnap, setIsInstantSnap] = useState(false);
  const discDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const turntableRef = useRef<HTMLDivElement>(null);

  const wasPaperOpen = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isPaperOpen) wasPaperOpen.current = true;
  }, [isPaperOpen]);

  useEffect(() => {
    onExpand?.(expandedIndex !== null);
    if (expandedIndex !== null) {
      setIsPaperOpen(false);
      const currentAlbum = albums[expandedIndex];
      if (currentAlbum) {
        const totalDurationSecs = currentAlbum.songs.reduce((acc: number, s: any) => acc + (Number(s.duration) || 0), 0);
        const totalDurationMins = Math.floor(totalDurationSecs / 60);
        setAlbumInfo(`${t('detail.album', 'Álbum')}: ${currentAlbum.name}\n\n${t('detail.artist', 'Artista')}: ${currentAlbum.artist}\n\n${t('detail.release', 'Lanzamiento')}: ${currentAlbum.year || t('detail.unknown', 'Desconocido')}\n\n${t('detail.songs', 'Canciones')}: ${currentAlbum.songs.length}\n\n${t('detail.totalDuration', 'Duración total')}: ${totalDurationMins} min`);
      }
    }
  }, [expandedIndex, onExpand, albums]);

  const handleCloseAlbum = () => {
    setShowLyrics(false);
    if (isPaperOpen) {
      setIsPaperOpen(false);
      setTimeout(() => {
        setExpandedIndex(null);
      }, 900);
    } else {
      setExpandedIndex(null);
    }
  };

  useEffect(() => {
    if (expandedIndex !== null) {
      const currentAlbum = albums[expandedIndex];
      const isPlayingThisAlbum = currentSong && currentAlbum?.songs.some((s: any) => s.path === currentSong.path);

      if (isPlayingThisAlbum) {
        setIsDiscOnPlatter(true);
      } else {
        setIsDiscOnPlatter(false);
      }
    }
    setIsDraggingDisc(false);
    setDiscDragPos(null);
  }, [expandedIndex, currentSong, albums]);

  const handleDiscDragStart = (e: React.PointerEvent | PointerEvent) => {
    setIsDraggingDisc(true);
    setIsDiscOnPlatter(false);
    discDragStartRef.current = { x: e.clientX, y: e.clientY };
    setDiscDragPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!isDraggingDisc) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (discDragStartRef.current) {
        setDiscDragPos({ x: e.clientX, y: e.clientY });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      setIsDraggingDisc(false);

      if (turntableRef.current) {
        const rect = turntableRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        const snapRadius = rect.width * 0.5;

        if (dist < snapRadius) {
          setIsInstantSnap(true);
          setIsDiscOnPlatter(true);
          if (isPaperOpen) {
            setIsPaperOpen(false);
          }
          setTimeout(() => setIsInstantSnap(false), 150);
        } else {
          setIsDiscOnPlatter(false);
        }
      }

      setDiscDragPos(null);
      discDragStartRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingDisc, isPaperOpen]);

  const playingAlbumIndex = albums.findIndex((a: any) => a.songs.some((s: any) => s.path === currentSong?.path));
  const playingAlbum = playingAlbumIndex >= 0 ? albums[playingAlbumIndex] : null;

  return (
    <>
      <div
        className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-visible"
        onWheel={(e) => { if (expandedIndex === null) e.deltaY > 0 ? setActiveIndex(p => Math.min(albums.length - 1, p + 1)) : setActiveIndex(p => Math.max(0, p - 1)) }}
        ref={containerRef}
        style={{ perspective: '1200px' }}
      >
        <AnimatePresence>
          {isScrubbing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`relative w-full h-full flex items-center justify-center transition-opacity duration-200 ${isScrubbing ? 'opacity-0' : 'opacity-100'}`} style={{ transformStyle: 'preserve-3d' }}>
          {albums.map((album: any, index: number) => {
            if (Math.abs(activeIndex - index) > 3) return null;

            const isActive = index === activeIndex;
            const isExpanded = index === expandedIndex;

            const offset = index - activeIndex;
            const direction = Math.sign(offset);
            const absOffset = Math.abs(offset);

            let translateX: number | string = offset * 320;
            let translateZ = -absOffset * 200;
            let rotateY = direction * -35;
            let scale = 1 - absOffset * 0.1;
            let zIndex = 100 - absOffset;
            let opacity = 1 - (absOffset * 0.15);
            let translateY = '-50%';

            if (isExpanded) {
              translateX = '-53%'; translateY = '-46.5%'; translateZ = 200; rotateY = 0; scale = 0.96; zIndex = 200; opacity = 1;
            } else if (expandedIndex !== null) {
              translateZ -= 500; opacity = 0; scale = 0.5;
            }

            return (
              <motion.div
                key={album.name}
                className="absolute top-1/2 left-1/2 cursor-pointer group"
                initial={false}
                animate={{ x: `calc(-50% + ${typeof translateX === 'number' ? translateX + 'px' : translateX})`, y: translateY, z: translateZ, scale: scale, opacity: opacity, rotateY: rotateY }}
                transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 1.2 }}
                style={{ zIndex, width: 'min(75vh, 40vw)', minWidth: '450px', maxWidth: '1200px', height: 'min(75vh, 40vw)', minHeight: '450px', maxHeight: '1200px', transformStyle: 'preserve-3d', pointerEvents: (expandedIndex !== null && !isExpanded) ? 'none' : 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (expandedIndex === null) {
                    isActive ? setExpandedIndex(index) : setActiveIndex(index);
                  }
                }}
              >
                <div className="relative w-full h-full shadow-[0_30px_80px_rgba(0,0,0,0.9)] rounded-lg bg-black/20" style={{ transformStyle: 'preserve-3d' }}>
                  <AnimatePresence>
                    {isExpanded && (
                      <VinylPlayer
                        album={album} currentSong={currentSong} isPlaying={globalIsPlaying} subscribeToProgress={subscribeToProgress}
                        playSound={playSound} isPaperOpen={isPaperOpen} volume={volume} setVolume={setVolume}
                        pauseOrResumeSound={pauseOrResumeSound} playNext={playNext} playPrevious={playPrevious}
                        isDiscOnPlatter={isDiscOnPlatter} turntableRef={turntableRef} onDiscDragStart={handleDiscDragStart}
                        isInstantSnap={isInstantSnap}
                        onPowerOff={() => {
                          setIsDiscOnPlatter(false);
                          if (albumZenMode) {
                            setTimeout(() => {
                              setAlbumZenMode(false, true);
                            }, 500);
                          } else {
                            setTimeout(() => {
                              setTimeout(() => {
                                handleCloseAlbum();
                              }, 500);
                            }, 400);
                          }
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {isExpanded && !isDiscOnPlatter && !isDraggingDisc && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-[32%] w-[92%] aspect-square cursor-grab active:cursor-grabbing z-[10]"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // --- BLOQUEO: Prevenir que arrastren el disco si otro álbum está sonando ---
                        const isThisAlbumActive = currentSong && album.songs.some((s: any) => s.path === currentSong.path);
                        if (globalIsPlaying && !isThisAlbumActive) {
                          return;
                        }
                        handleDiscDragStart(e);
                      }}
                    >
                      <div className="w-full h-full rounded-full bg-[#0a0a0a] border border-[#222] shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                        <PeekDiscVisuals album={album} />
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && !isPaperOpen && (
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 0.5 } }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={(e) => { e.stopPropagation(); setIsPaperOpen(true); }}
                        className="absolute top-0.4 right-0 translate-x-[80%] w-12 h-40 bg-[#f4f0ea] rounded-r-xl shadow-xl border-y border-r border-[#d8cdbc] flex items-center justify-center cursor-pointer hover:bg-white transition-colors z-[15]"
                      >
                        <div className="rotate-90 whitespace-nowrap text-[#5c5444] font-bold tracking-widest text-sm flex items-center gap-2">
                          {t('player.infoTracks', 'INFO & TRACKS')} <ListMusic size={16} />
                        </div>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isExpanded && !isPaperOpen && (
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 0.6 } }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={(e) => { e.stopPropagation(); setShowLyrics(!showLyrics); }}
                        className="absolute bottom-0 right-0 translate-x-[80%] w-12 h-32 bg-[#f4f0ea] rounded-r-xl shadow-xl border-y border-r border-[#d8cdbc] flex items-center justify-center cursor-pointer hover:bg-white transition-colors z-[15]"
                      >
                        <div className="rotate-90 whitespace-nowrap text-[#5c5444] font-bold tracking-widest text-sm flex items-center gap-2">
                          {t('player.lyricsBtn', 'LETRAS')} <Mic2 size={16} />
                        </div>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <div className="absolute inset-0 overflow-hidden rounded-lg z-20 bg-black">
                    <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={true} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_0_15px_rgba(255,255,255,0.1),inset_1px_1px_2px_rgba(255,255,255,0.3)] border border-white/10 z-20" />
                    <div className="absolute inset-0 pointer-events-none mix-blend-screen z-20 overflow-hidden rounded-lg">
                      <div className="absolute inset-[-100%] animate-shine pointer-events-none" style={{
                        background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.1) 35%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 65%, transparent 80%)'
                      }} />
                    </div>
                    <div className="absolute inset-0 pointer-events-none mix-blend-screen z-20" style={{
                      background: `
                      radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 30%),
                      radial-gradient(circle at 100% 100%, rgba(255,255,255,0.05) 0%, transparent 40%)
                    `
                    }} />

                    {isExpanded && (
                      <button
                        className="absolute top-4 left-4 p-3 rounded-full bg-black/70 hover:bg-black/90 transition text-white z-40"
                        onClick={(e) => { e.stopPropagation(); handleCloseAlbum(); }}
                      >
                        <X size={24} />
                      </button>
                    )}

                    {showLyrics && isExpanded && (
                      <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md overflow-hidden rounded-lg">
                        <button
                          className="absolute top-4 right-4 p-3 rounded-full bg-white/20 hover:bg-white/40 transition text-white z-40"
                          onClick={(e) => { e.stopPropagation(); setShowLyrics(false); }}
                        >
                          <X size={24} />
                        </button>
                        <div className="w-full h-full p-6 pt-16 pb-8" onClick={(e) => e.stopPropagation()}>
                          <LyricsView />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && isPaperOpen && (
                    <motion.div
                      initial="closed"
                      animate="open"
                      exit="closed"
                      variants={{
                        open: {
                          x: ['0%', '105%', '105%', '25%'],
                          z: [-10, -10, 20, 20],
                          zIndex: [30, 30, 30, 30],
                          opacity: [0, 1, 1, 1],
                          transition: { duration: 0.9, times: [0, 0.4, 0.5, 1], ease: 'easeInOut', delay: 0.5 }
                        },
                        closed: {
                          x: ['25%', '105%', '105%', '0%'],
                          z: [20, 20, -10, -10],
                          zIndex: [30, 30, 15, 15],
                          opacity: [1, 1, 1, 1],
                          transition: { duration: 0.9, times: [0, 0.4, 0.5, 1], ease: 'easeInOut', delay: 0.6 }
                        }
                      }}
                      className="absolute top-[2%] bottom-[2%] left-0 w-[88%] bg-[#f4f0ea] shadow-[inset_-10px_0_20px_rgba(0,0,0,0.05),_5px_0_15px_rgba(0,0,0,0.3)] flex flex-col p-8 rounded-r-lg border border-[#d8cdbc]"
                      style={{ transformOrigin: 'center', perspective: '2000px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.div
                        className="w-full h-full relative z-10 flex flex-col"
                        variants={{
                          open: { opacity: 1, transition: { delay: 0.4, duration: 0.3 } },
                          closed: { opacity: 0, transition: { duration: 0.2, delay: 0.4 } }
                        }}
                      >
                        <h3 className="text-4xl font-black text-black mb-2 leading-tight">{album.name}</h3>
                        <p className="text-xl text-zinc-600 mb-6 border-b border-zinc-300 pb-4">{album.artist}</p>

                        <div className="flex-1 overflow-auto customized-scrollbar-light text-zinc-800 text-sm leading-relaxed pr-4">
                          <p className="mb-4 whitespace-pre-wrap">{albumInfo}</p>
                          <div className="mt-8 flex justify-center">
                            <img src={album.cover} className="w-48 h-48 object-cover rounded shadow-lg grayscale opacity-70 border-4 border-white" />
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        variants={{
                          open: { rotateY: 0, transition: { type: 'tween', duration: 0.5, ease: 'easeOut', delay: 1.4 } },
                          closed: { rotateY: -179.9, transition: { type: 'tween', duration: 0.5, ease: 'easeIn' } }
                        }}
                        className="absolute top-0 bottom-0 left-[99%] w-full"
                        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                      >
                        <div
                          className="absolute inset-0 bg-[#f4f0ea] shadow-[inset_10px_0_20px_rgba(0,0,0,0.05),_15px_0_30px_rgba(0,0,0,0.3)] p-8 rounded-r-lg border border-[#d8cdbc] flex flex-col"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); setIsPaperOpen(false); }}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-black transition rounded-full hover:bg-black/5"
                            title="Cerrar libreto y sacar tocadiscos"
                          >
                            <X size={28} />
                          </button>

                          <div className="flex justify-between items-center mb-6 border-b border-zinc-300 pb-4">
                            <h4 className="font-bold text-black text-2xl">{t('detail.tracklist', 'Tracklist')}</h4>
                          </div>

                          <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-1 customized-scrollbar-light">
                            {album.songs.map((song: any, i: number) => {
                              const isSongPlaying = currentSong?.path === song.path;
                              return (
                                <div
                                  key={song.path}
                                  className={`flex items-center gap-4 p-3 rounded-md cursor-pointer transition ${isSongPlaying ? 'bg-black/10 shadow-sm' : 'hover:bg-black/5'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    // --- BLOQUEO: Prevenir reproducir si hay otro álbum activo y sonando ---
                                    const isThisAlbumActive = currentSong && album.songs.some((s: any) => s.path === currentSong.path);
                                    if (globalIsPlaying && !isThisAlbumActive) {
                                      return;
                                    }

                                    if (isPaperOpen) {
                                      setIsPaperOpen(false);
                                      setTimeout(() => {
                                        if (!isDiscOnPlatter) {
                                          setIsDiscOnPlatter(true);
                                        }
                                        setTimeout(() => {
                                          playSound(song, `album_${album.name}`, album.songs);
                                        }, isDiscOnPlatter ? 200 : 800);
                                      }, 1000);
                                    } else {
                                      if (!isDiscOnPlatter) {
                                        setIsDiscOnPlatter(true);
                                        setTimeout(() => {
                                          playSound(song, `album_${album.name}`, album.songs);
                                        }, 800);
                                      } else {
                                        playSound(song, `album_${album.name}`, album.songs);
                                      }
                                    }
                                  }}
                                >
                                  <div className="text-sm font-mono opacity-50 w-6 text-right text-zinc-800">{i + 1}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-base truncate ${isSongPlaying ? 'font-black text-black' : 'font-medium text-zinc-800'}`}>
                                      {song.title || song.filename}
                                    </p>
                                  </div>
                                  {song.duration > 0 && (
                                    <div className="text-sm opacity-50 font-mono text-zinc-800">
                                      {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div
                          className="absolute inset-0 bg-[#d8cdbc] rounded-r-lg border border-[#c2b59b]"
                          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Mini reproductor movido al final del componente para no verse afectado por la perspectiva */}



        <AnimatePresence>
          {expandedIndex === null && activeIndex >= 0 && activeIndex < albums.length && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute bottom-[-100px] left-0 right-0 flex flex-col items-center pointer-events-none z-10"
            >
              <h2 className="text-3xl font-bold max-w-[80%] truncate drop-shadow-xl" style={{ color: colors.text }}>
                {albums[activeIndex]?.name}
              </h2>
              <p className="text-lg opacity-70 drop-shadow-xl mt-2 mb-4" style={{ color: colors.subText }}>
                {albums[activeIndex]?.artist}
              </p>

              {/* Alphabet Scrubber */}
              <div
                className="relative flex items-center gap-0.5 sm:gap-1 pointer-events-auto px-6 h-12 touch-none"
                onWheel={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
                onPointerMove={(e) => {
                  if (e.buttons > 0) {
                    const element = document.elementFromPoint(e.clientX, e.clientY);
                    if (element && element.tagName === 'BUTTON') {
                      const letter = element.textContent;
                      if (letter && letter.length === 1) {
                        const targetIndex = albums.findIndex((a: any) => a.name?.[0]?.toUpperCase() === letter);
                        if (targetIndex !== -1 && targetIndex !== activeIndex) {
                          setIsScrubbing(true);
                          setActiveIndex(targetIndex);
                          if (scrubTimeoutRef.current) clearTimeout(scrubTimeoutRef.current);
                          scrubTimeoutRef.current = setTimeout(() => setIsScrubbing(false), 500);
                        }
                      }
                    }
                  }
                }}
              >


                {/* Thin background bar */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-7 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] pointer-events-none" />

                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter => {
                  const isActive = albums[activeIndex]?.name?.[0]?.toUpperCase() === letter;
                  const letterExists = albums.some((a: any) => a.name?.[0]?.toUpperCase() === letter);

                  return (
                    <div key={letter} className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center z-10">
                      {isActive && (
                        <motion.div
                          layoutId="activeLetterChrome"
                          className="absolute w-8 h-8 sm:w-9 sm:h-9 rounded-full z-0"
                          style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 45%, #a8a8a8 80%, #ffffff 100%)',
                            boxShadow: 'inset 0 3px 5px rgba(255,255,255,0.9), inset 0 -3px 5px rgba(0,0,0,0.4), 0 5px 15px rgba(0,0,0,0.5)',
                            border: '1px solid #d1d1d1'
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <button
                        disabled={!letterExists}
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetIndex = albums.findIndex((a: any) => a.name?.[0]?.toUpperCase() === letter);
                          if (targetIndex !== -1 && targetIndex !== activeIndex) {
                            setIsScrubbing(true);
                            setActiveIndex(targetIndex);
                            if (scrubTimeoutRef.current) clearTimeout(scrubTimeoutRef.current);
                            scrubTimeoutRef.current = setTimeout(() => setIsScrubbing(false), 500);
                          }
                        }}
                        className={`relative z-10 text-[10px] sm:text-[11px] font-black w-full h-full flex items-center justify-center transition-all duration-200 
                        ${isActive ? 'text-zinc-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]' :
                            letterExists ? 'text-white/60 hover:text-white cursor-pointer' :
                              'text-white/15 cursor-default'}`}
                      >
                        {letter}
                      </button>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {isDraggingDisc && discDragPos && expandedIndex !== null && (
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: discDragPos.x - (containerRef.current ? Math.max(450, Math.min(1200, Math.min(window.innerHeight * 0.75, window.innerWidth * 0.40))) * 0.92 / 2 : 150),
              top: discDragPos.y - (containerRef.current ? Math.max(450, Math.min(1200, Math.min(window.innerHeight * 0.75, window.innerWidth * 0.40))) * 0.92 / 2 : 150),
              width: containerRef.current ? Math.max(450, Math.min(1200, Math.min(window.innerHeight * 0.75, window.innerWidth * 0.40))) * 0.92 : 300,
              height: containerRef.current ? Math.max(450, Math.min(1200, Math.min(window.innerHeight * 0.75, window.innerWidth * 0.40))) * 0.92 : 300,
            }}
          >
            <div className="w-full h-full rounded-full bg-[#0a0a0a] border border-[#222] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden opacity-90">
              <PeekDiscVisuals album={albums[expandedIndex]} isDragging={true} />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {playingAlbum && expandedIndex === null && (
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="fixed bottom-8 left-8 w-[320px] flex items-center gap-4 bg-[#111]/95 p-4 pr-4 rounded-3xl shadow-2xl border border-white/10 hover:bg-black transition group z-[100] text-left"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(playingAlbumIndex);
              setTimeout(() => setExpandedIndex(playingAlbumIndex), 300);
            }}
          >
            <div className="relative w-18 h-18 rounded-2xl overflow-hidden shadow-lg border border-white/5 flex-shrink-0">
              <CoverImage coverUrl={currentSong?.cover || playingAlbum.cover} audioPath={currentSong?.path || playingAlbum.songs[0]?.path} hq={true} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <p className="text-[10px] text-white/50 mb-0.5 uppercase font-bold tracking-widest">{t('player.nowPlaying', 'Reproduciendo')}</p>
              <p className="text-base text-white font-black truncate leading-tight mb-0.5">{currentSong?.title || currentSong?.filename.replace(/\.[^/.]+$/, "") || playingAlbum.name}</p>
              <p className="text-xs text-white/70 font-medium truncate">{currentSong?.artist || playingAlbum.artist}</p>
            </div>
            {/* NUEVO BOTÓN PARA PAUSAR DESDE EL MINI REPRODUCTOR */}
            <div
              className="ml-auto flex-shrink-0 pl-2"
              onClick={(e) => {
                e.stopPropagation(); // Evita que se abra el álbum al hacer clic en play/pausa
                pauseOrResumeSound();
              }}
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
                {globalIsPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
