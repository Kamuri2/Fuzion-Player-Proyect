import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import CoverImage from './CoverImage';
import { Pause, Play, SkipBack, SkipForward, ListMusic, X, Settings, Mic2, Power } from 'lucide-react';
import LyricsView from './LyricsView';
import { useTranslation } from 'react-i18next';
import ArtistLinks from './ArtistLinks';

const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

// --- Estilo del tocadiscos: plinto blanco mate, inspirado en un giradiscos de mesa (vista superior) ---
const PLINTH_STYLE: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1.2px), linear-gradient(160deg, #fcfcfc 0%, #f2f2f3 55%, #e9e9eb 100%)',
  backgroundSize: '3px 3px, 100% 100%'
};
const KEY_BTN = 'bg-gradient-to-b from-white to-[#e7e7ea] border border-[#d4d4d8] shadow-[0_2px_0_#cfcfd3,0_5px_10px_rgba(0,0,0,0.12)] active:translate-y-[2px] active:shadow-[0_0_0_#cfcfd3,0_1px_3px_rgba(0,0,0,0.15)] transition-all';
const HINGE_STYLE: React.CSSProperties = { background: 'linear-gradient(#f9f9fa,#cfcfd4)', boxShadow: '0 1px 2px rgba(0,0,0,0.25), inset 0 1px 0 #fff' };

// --- Vinyl Player Component ---
const VinylPlayer = ({
  album, currentSong, isPlaying, subscribeToProgress, playSound,
  isPaperOpen, volume, setVolume, pauseOrResumeSound, playNext,
  playPrevious, isDiscOnPlatter, turntableRef, onDiscDragStart, isInstantSnap, onPowerOff, isDraggingDisc, onDiscReturn
}: any) => {
  const { t } = useTranslation();
  const { setPlaybackRate } = useAudio();
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
  const currentPlaybackRateRef = useRef(1);
  const targetPlaybackRateRef = useRef(1);
  const transitionRafRef = useRef<number>(0);

  useEffect(() => {
    vinylRpmRef.current = vinylRpm;
    targetPlaybackRateRef.current = vinylRpm / 33;

    const transitionRate = () => {
      const diff = targetPlaybackRateRef.current - currentPlaybackRateRef.current;
      if (Math.abs(diff) < 0.005) {
        currentPlaybackRateRef.current = targetPlaybackRateRef.current;
        setPlaybackRate(targetPlaybackRateRef.current);
        return;
      }
      currentPlaybackRateRef.current += diff * 0.03;
      setPlaybackRate(currentPlaybackRateRef.current);
      transitionRafRef.current = requestAnimationFrame(transitionRate);
    };

    cancelAnimationFrame(transitionRafRef.current);
    transitionRafRef.current = requestAnimationFrame(transitionRate);

    return () => cancelAnimationFrame(transitionRafRef.current);
  }, [vinylRpm, setPlaybackRate]);

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
    if (vinylRpmRef.current === 23) return 0.14;
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

  const handleWheelScale = (e: React.WheelEvent) => {
    e.stopPropagation();
    const step = e.shiftKey ? 5 : 1;
    const delta = e.deltaY < 0 ? step : -step;
    const newVal = Math.max(20, Math.min(250, customScale + delta));
    setCustomScale(newVal);
    localStorage.setItem(`vinyl_scale_${album.name}`, newVal.toString());
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

  const handleWheelOpacity = (e: React.WheelEvent) => {
    e.stopPropagation();
    const step = e.shiftKey ? 5 : 1;
    const delta = e.deltaY < 0 ? step : -step;
    const newVal = Math.max(0, Math.min(200, customTextureOpacity + delta));
    setCustomTextureOpacity(newVal);
    localStorage.setItem(`vinyl_opacity_${album.name}`, newVal.toString());
  };

  const handleOffsetXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCustomOffsetX(val);
    localStorage.setItem(`vinyl_offset_x_${album.name}`, val.toString());
  };

  const handleWheelOffsetX = (e: React.WheelEvent) => {
    e.stopPropagation();
    const step = e.shiftKey ? 5 : 1;
    const delta = e.deltaY < 0 ? step : -step;
    const newVal = Math.max(-100, Math.min(100, customOffsetX + delta));
    setCustomOffsetX(newVal);
    localStorage.setItem(`vinyl_offset_x_${album.name}`, newVal.toString());
  };

  const handleOffsetYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCustomOffsetY(val);
    localStorage.setItem(`vinyl_offset_y_${album.name}`, val.toString());
  };

  const handleWheelOffsetY = (e: React.WheelEvent) => {
    e.stopPropagation();
    const step = e.shiftKey ? 5 : 1;
    const delta = e.deltaY < 0 ? step : -step;
    const newVal = Math.max(-100, Math.min(100, customOffsetY + delta));
    setCustomOffsetY(newVal);
    localStorage.setItem(`vinyl_offset_y_${album.name}`, newVal.toString());
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
    setTimeout(() => {
      if (onDiscReturn) onDiscReturn();
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
    setTimeout(() => {
      if (onDiscReturn) onDiscReturn();
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
      // NUEVO: si el disco estaba fuera de la bandeja, vuelve a colocarse al reanudar
      if (onDiscReturn) onDiscReturn();
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
        if (onDiscReturn) onDiscReturn();
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
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-square rounded-t-[2rem] rounded-b-none border-[3px] border-white shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex items-center justify-center pointer-events-auto z-10"
        style={PLINTH_STYLE}
      >
        {/* Bisel del plinto */}
        <div className="absolute inset-0 rounded-t-[2rem] pointer-events-none shadow-[inset_0_2px_0_rgba(255,255,255,0.95),inset_0_-3px_8px_rgba(0,0,0,0.07),inset_0_0_0_1px_rgba(0,0,0,0.04)]" />

        {/* Bisagras de la tapa */}
        <div className="absolute top-[1.6%] left-[17%] w-[6%] h-[3.4%] rounded-[3px] pointer-events-none" style={HINGE_STYLE} />
        <div className="absolute top-[1.6%] right-[25%] w-[6%] h-[3.4%] rounded-[3px] pointer-events-none" style={HINGE_STYLE} />

        {/* Bandeja: hueco hundido en el plinto blanco */}
        <div
          className="absolute inset-[0.8%] rounded-full pointer-events-none"
          style={{ background: 'linear-gradient(145deg, #d4d4d8, #f4f4f5)', boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.28), inset 0 -2px 4px rgba(255,255,255,0.9), 0 1px 0 rgba(255,255,255,0.9)' }}
        />
        {/* Plato negro-gris (su borde asoma alrededor del disco) */}
        <div
          className="absolute inset-[1.6%] rounded-full pointer-events-none"
          style={{ background: 'conic-gradient(from 20deg, #2a2a2e, #4a4a50, #1c1c1f, #3d3d43, #232326, #4a4a50, #2a2a2e)', boxShadow: '0 0 0 1px #0d0d0f, 0 8px 18px rgba(0,0,0,0.45), inset 0 2px 3px rgba(255,255,255,0.25), inset 0 -3px 8px rgba(0,0,0,0.6)' }}
        />
        {/* Fieltro negro-gris */}
        <div
          className="absolute inset-[6.5%] rounded-full pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1.2px), radial-gradient(circle at 50% 42%, #3a3a40 0%, #2a2a2f 65%, #1d1d21 100%)', backgroundSize: '3px 3px, 100% 100%', boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.5), inset 0 8px 18px rgba(0,0,0,0.55)' }}
        />
        {/* Eje central */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2.4%] aspect-square rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 35% 30%, #ffffff, #a9a9b0)', boxShadow: '0 1px 3px rgba(0,0,0,0.45)' }}
        />

        <span className="absolute left-[5%] bottom-[3.5%] text-[10px] font-black tracking-[0.3em] text-zinc-600 uppercase pointer-events-none" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.95)' }}>Hi-Fi Turntable</span>

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
          className={`absolute top-6 left-6 p-3 rounded-full text-zinc-500 hover:text-red-500 z-20 cursor-pointer ${KEY_BTN}`}
          title={t('player.modeOff', 'MODO ÁLBUM DESACTIVADO')}
        >
          <span className={`absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full ${isPlaying && !isPendingPause ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-zinc-300'}`} />
          <Power size={22} />
        </button>

        {/* Pestaña de Reproducción */}
        <div
          className="absolute top-[calc(100%-2px)] left-[-3px] rounded-bl-[2rem] rounded-br-2xl shadow-xl border-[3px] border-t-0 border-white px-6 py-4 flex flex-col min-w-[220px] max-w-[280px]"
          style={{ ...PLINTH_STYLE, zIndex: -1 }}
        >
          {isThisAlbumActive && currentSong ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${isPlaying && !isPendingPause ? 'bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]' : 'bg-zinc-400'}`} />
                <span className="text-xs font-black text-zinc-600 tracking-widest">
                  {isPlaying && !isPendingPause ? t('player.playing', 'REPRODUCIENDO').toUpperCase() : t('player.paused', 'PAUSADO').toUpperCase()}
                </span>
              </div>
              <span className="text-lg font-black text-zinc-800 truncate leading-tight">
                {currentSong.title || currentSong.filename.replace(/\.[^/.]+$/, "")}
              </span>
              <span className="text-xs font-bold text-zinc-600 truncate mt-0.5">
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
          className="absolute top-[calc(100%-3px)] right-[-3px] h-[3.5rem] rounded-br-[2rem] rounded-bl-2xl shadow-xl border-[3px] border-t-0 border-white flex flex-row items-center gap-3 px-4 pointer-events-auto"
          style={{ ...PLINTH_STYLE, zIndex: -1 }}
        >
          <button onClick={(e) => { e.stopPropagation(); setShowVinylSettings(!showVinylSettings); }} className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-black transition-colors" title={t('player.discDesign', 'Diseño del Disco')}>
            <Settings size={16} />
          </button>
          <div className="w-[1px] h-6 bg-zinc-300 mx-1" />
          <button onClick={handlePlayPrevWithDust} className={`w-8 h-8 flex items-center justify-center text-zinc-800 rounded-md ${KEY_BTN}`}><SkipBack size={14} fill="currentColor" /></button>
          <button onClick={handlePauseOrResumeDelay} className={`w-9 h-9 flex items-center justify-center text-zinc-800 rounded-full ${KEY_BTN} ${isPlaying && !isPendingPause ? 'ring-2 ring-green-500/50' : ''}`}>
            {isPlaying && !isPendingPause ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={handlePlayNextWithDust} className={`w-8 h-8 flex items-center justify-center text-zinc-800 rounded-md ${KEY_BTN}`}><SkipForward size={14} fill="currentColor" /></button>
        </div>
      </motion.div>

      {/* 2. DISCO GIRANDO (z-20) */}
      <motion.div
        initial={{ x: 0, scale: 0.9, opacity: 1 }}
        animate={isVinylOut ? { x: '110%', scale: 1, opacity: 1 } : { x: 0, scale: 0.9, opacity: isDraggingDisc ? 0 : 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        transition={(isInstantSnap || isDraggingDisc) ? { duration: 0 } : { type: 'spring', damping: 15, mass: 1, stiffness: 100 }}
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
                <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={false} className="w-full h-full object-cover" />
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
                      fill="none" stroke="#222" strokeWidth={grooveWidth - 0.5} strokeOpacity="0.4"
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
                    <path id={`curve_${album.name.replace(/[^a-zA-Z0-9]/g, '')}`} d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" />
                    <text className="text-[8px] fill-zinc-300 font-bold uppercase tracking-[0.2em]" dy="0">
                      <textPath href={`#curve_${album.name.replace(/[^a-zA-Z0-9]/g, '')}`} startOffset="50%" textAnchor="middle">
                        {album.name.substring(0, 20)} • {album.year || '2024'} •
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
        {/* Tapa de acrílico: reflejo suave sobre el plato */}
        <div className="absolute inset-0 rounded-t-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(118deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.10) 26%, rgba(255,255,255,0) 40%)' }} />
          <div className="absolute inset-x-0 top-0 h-[4.5%]" style={{ background: 'linear-gradient(to bottom, rgba(190,200,210,0.22), rgba(255,255,255,0))', borderBottom: '1px solid rgba(255,255,255,0.55)' }} />
        </div>

        <div ref={pivotRef} className="absolute top-[8%] right-[8%] w-8 h-8 pointer-events-none">
          {/* Carcasa fija del pivote del brazo */}
          <div className="absolute -inset-3 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #ffffff, #d9d9de)', boxShadow: '0 0 0 1px #c4c4ca, 0 8px 16px rgba(0,0,0,0.28), inset 0 1px 2px rgba(255,255,255,0.9)' }}>
            <div className="absolute inset-[18%] rounded-full" style={{ background: 'linear-gradient(#e6e6ea,#f8f8f9)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.9)' }} />
          </div>
        </div>
        <div
          className={`absolute top-[8%] right-[8%] w-8 h-[65%] pointer-events-none ${isDragging ? '' : 'transition-transform duration-1000 ease-linear'}`}
          style={{ transformOrigin: '50% 16px', transform: `rotate(${tonearmAngle}deg)`, willChange: 'transform' }}
        >
          {/* Contrapeso (gira junto con el brazo) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-[28px] w-7 h-[24px] rounded-md pointer-events-none" style={{ background: 'linear-gradient(90deg,#c9c9ce,#f8f8f9 45%,#b7b7be)', boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.12)' }}>
            <div className="absolute inset-0 rounded-md" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 1px, transparent 1px 4px)' }} />
          </div>
          {/* Cojinete del brazo */}
          <div className="w-10 h-10 rounded-full absolute -top-1 -left-1 flex items-center justify-center pointer-events-auto" style={{ background: 'radial-gradient(circle at 35% 30%, #ffffff, #cfcfd5)', boxShadow: '0 0 0 3px #b9b9bf, 0 6px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.9)' }}>
            <div className="w-3.5 h-3.5 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #8a8a92, #3f3f46)', boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
          </div>
          <div className="w-[7px] h-[85%] absolute left-1/2 -translate-x-1/2 top-4 rounded-full origin-top pointer-events-auto" style={{ background: 'linear-gradient(90deg,#a3a3aa,#fafafa 45%,#b4b4bb)', boxShadow: '3px 6px 10px rgba(0,0,0,0.25)' }} />
          <div
            className={`w-8 h-20 absolute bottom-[3%] left-1/2 -translate-x-1/2 flex items-start justify-center cursor-grab pointer-events-auto touch-none ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{ transformOrigin: 'top center', transform: 'rotate(5deg)' }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setIsDragging(true); }}
          >
            <div className="relative w-[22px] h-12 rounded-[3px] flex flex-col items-center pointer-events-none" style={{ background: 'linear-gradient(90deg,#d4d4d9,#fbfbfc 50%,#c4c4ca)', boxShadow: '4px 8px 14px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.15)' }}>
              {/* lengüeta para levantar el brazo */}
              <div className="absolute -right-[7px] top-[30%] w-[9px] h-[3px] rounded-r bg-zinc-400" />
              {/* cápsula */}
              <div className="absolute bottom-0 inset-x-[2px] h-[45%] rounded-b-[3px]" style={{ background: 'linear-gradient(#52525b,#27272a)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }} />
              <div className="w-0.5 h-3 bg-zinc-500 absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-b-full" />
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
                    {[23, 33, 45, 78].map(rpm => (
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

                <div className="flex flex-col gap-1" onWheel={handleWheelScale}>
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold text-zinc-600">{t('player.imageScale', 'ESCALA DE IMAGEN')}</span>
                    <span className="text-xs text-zinc-500 font-mono">{customScale}%</span>
                  </div>
                  <input type="range" min="20" max="250" value={customScale} onChange={handleScaleChange} onWheel={handleWheelScale} className="w-full accent-zinc-800 cursor-ew-resize" />
                </div>
                {customTexture && (
                  <>
                    <div className="flex flex-col gap-1" onWheel={handleWheelOffsetX}>
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-zinc-600">{t('player.imageOffsetX', 'POSICIÓN HORIZONTAL')}</span>
                        <span className="text-xs text-zinc-500 font-mono">{customOffsetX}%</span>
                      </div>
                      <input type="range" min="-100" max="100" value={customOffsetX} onChange={handleOffsetXChange} onWheel={handleWheelOffsetX} className="w-full accent-zinc-800 cursor-ew-resize" />
                    </div>
                    <div className="flex flex-col gap-1" onWheel={handleWheelOffsetY}>
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-zinc-600">{t('player.imageOffsetY', 'POSICIÓN VERTICAL')}</span>
                        <span className="text-xs text-zinc-500 font-mono">{customOffsetY}%</span>
                      </div>
                      <input type="range" min="-100" max="100" value={customOffsetY} onChange={handleOffsetYChange} onWheel={handleWheelOffsetY} className="w-full accent-zinc-800 cursor-ew-resize" />
                    </div>
                    <div className="flex flex-col gap-1" onWheel={handleWheelOpacity}>
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-zinc-600">{t('player.imageOpacity', 'OPACIDAD')}</span>
                        <span className="text-xs text-zinc-500 font-mono">{customTextureOpacity}%</span>
                      </div>
                      <input type="range" min="0" max="200" value={customTextureOpacity} onChange={handleOpacityChange} onWheel={handleWheelOpacity} className="w-full accent-zinc-800 cursor-ew-resize" />
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
          <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={false} className="w-full h-full object-cover" />
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

// Reparte las canciones en lado A y B. Si hay duraciones, equilibra por tiempo; si no, parte la lista a la mitad.
const getSideSplit = (songs: any[]) => {
  const n = songs.length;
  const total = songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  if (n < 2 || total <= 0) return Math.ceil(n / 2);
  let acc = 0, best = Math.ceil(n / 2), bestDiff = Infinity;
  for (let i = 0; i < n - 1; i++) {
    acc += Number(songs[i].duration) || 0;
    const diff = Math.abs(acc - total / 2);
    if (diff < bestDiff) { bestDiff = diff; best = i + 1; }
  }
  return best;
};

// Foto + descripción del artista (pegatina en la hoja).
// Utiliza la info y portada del artista que ya existe en el contexto global (sección de artistas).
const ArtistSticker = ({ album }: { album: any }) => {
  const { t, i18n } = useTranslation();
  const { artists } = useAudio();
  const artistName: string = (album.artist || '').trim();

  const artistData = useMemo(() => {
    if (!artists || !artistName) return null;
    const lowerName = artistName.toLowerCase();
    return artists[artistName] || Object.values(artists).find((a: any) => a.name.toLowerCase() === lowerName);
  }, [artists, artistName]);

  const [bio, setBio] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const photo = artistData?.cover || album.artistImage || null;
  const initials = artistName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  useEffect(() => {
    if (!open || !artistName) return;

    const cacheKey = `artist_bio_cache_${artistName.toLowerCase()}`;
    const cachedBio = localStorage.getItem(cacheKey);
    if (cachedBio && cachedBio !== 'null') {
      setBio(cachedBio);
      return;
    }

    let cancelled = false;

    const fetchBio = async () => {
      setLoading(true);
      try {
        const adbRes = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(artistName)}`);
        const adbData = await adbRes.json();

        if (adbData.artists && adbData.artists.length > 0) {
          const exactArtist = adbData.artists.find((a: any) => a.strArtist.toLowerCase() === artistName.toLowerCase());
          const artistObj = exactArtist || adbData.artists[0];
          const fetchedBio = artistObj.strBiographyES || artistObj.strBiography;
          if (fetchedBio) {
            if (!cancelled) {
              setBio(fetchedBio);
              localStorage.setItem(cacheKey, fetchedBio);
            }
            setLoading(false);
            return;
          }
        }

        const hosts = Array.from(new Set([(i18n.language || 'en').slice(0, 2), 'en']));
        const capArtistName = artistName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const rawNames = [
          artistName, `${artistName} (band)`, `${artistName} (banda)`, `${artistName} (singer)`, `${artistName} (cantante)`, `${artistName} (musician)`, `${artistName} (músico)`, `${artistName} (DJ)`,
          capArtistName, `${capArtistName} (band)`, `${capArtistName} (banda)`, `${capArtistName} (singer)`, `${capArtistName} (cantante)`, `${capArtistName} (musician)`, `${capArtistName} (músico)`, `${capArtistName} (DJ)`
        ];
        const names = Array.from(new Set(rawNames));

        for (const host of hosts) {
          for (const name of names) {
            const r = await fetch(`https://${host}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`);
            if (!r.ok) continue;
            const d = await r.json();
            const text = `${d.description || ''} ${(d.extract || '').slice(0, 240)}`;
            if (d.type !== 'standard' || !d.extract || !/band|banda|singer|cantante|musician|músic|rapper|rapero|composer|compositor|producer|productor|group|grupo|duo|dúo|songwriter|\bDJ\b|artist|artista/i.test(text)) continue;

            if (!cancelled) {
              setBio(d.extract);
              localStorage.setItem(cacheKey, d.extract);
            }
            setLoading(false);
            return;
          }
        }
      } catch (e) {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBio();
    return () => { cancelled = true; };
  }, [open, artistName, i18n.language]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={t('artist.about', 'Sobre el artista')}
        className="relative bg-white p-2 pb-6 w-[30%] max-w-[9.5rem] min-w-[5.5rem] rotate-3 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-1 cursor-pointer text-left"
      >
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 bg-[#e6dca0]/80 -rotate-2" />
        <div className="aspect-square overflow-hidden bg-zinc-200 grid place-items-center">
          {photo
            ? <CoverImage coverUrl={photo} hq={false} className="w-full h-full object-cover" />
            : <span className="text-3xl font-black text-zinc-400 font-sans">{initials || '?'}</span>}
        </div>
        <span className="absolute bottom-1.5 left-2 right-2 text-[8px] font-bold tracking-widest uppercase text-zinc-600 truncate font-sans">{artistName}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-6 bottom-6 z-30 max-h-[80%] flex flex-col rounded-md bg-[#fffaf0] border border-[#4a3f2a]/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] text-[#1a160e]"
          >
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-zinc-200 grid place-items-center shadow-md">
                {photo
                  ? <CoverImage coverUrl={photo} hq={false} className="w-full h-full object-cover" />
                  : <span className="text-2xl font-black text-zinc-400 font-sans">{initials || '?'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black tracking-[0.28em] uppercase text-[#4a3f2a] font-sans">{t('artist.about', 'Sobre el artista')}</p>
                <h5 className="text-2xl font-black leading-tight truncate">{artistName}</h5>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-[#4a3f2a] hover:text-black rounded-full hover:bg-black/5"><X size={20} /></button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-2 customized-scrollbar-light text-[15px] leading-relaxed">
              {bio ? (
                <p className="whitespace-pre-wrap">{bio}</p>
              ) : (
                <p className="italic text-[#4a3f2a]">
                  {loading ? t('artist.loading', 'Buscando información…') : t('artist.noInfo', 'No se encontró información para este artista.')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function AlbumsCoverFlow({ albums, onExpand }: any) {
  const { colors, albumZenMode, setAlbumZenMode, reduceAnimations } = useTheme();
  const { playSound, pauseOrResumeSound, playNext, playPrevious, currentSong, subscribeToProgress, isPlaying: globalIsPlaying, volume, setVolume } = useAudio();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(Math.floor(albums.length / 2));
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isPaperOpen, setIsPaperOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [albumInfo, setAlbumInfo] = useState<string>('');
  const [isDiscOnPlatter, setIsDiscOnPlatter] = useState(false);
  const [isDraggingDisc, setIsDraggingDisc] = useState(false);
  const [discDragPos, setDiscDragPos] = useState<{ x: number, y: number } | null>(null);

  const [isInstantSnap, setIsInstantSnap] = useState(false);
  const discDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const turntableRef = useRef<HTMLDivElement>(null);

  const wasPaperOpen = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // NUEVO: el tocadiscos entra cuando termina el giro de la funda (ajusta 650 a la duración del giro)
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    if (expandedIndex === null) {
      setPlayerReady(false);
      return;
    }
    const id = setTimeout(() => setPlayerReady(true), 900);
    return () => clearTimeout(id);
  }, [expandedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // NUEVO: pantalla fija, sin barras de desplazamiento (bloquea el scroll de la página y de cualquier contenedor padre con scroll)
  useEffect(() => {
    const locked: { el: HTMLElement; prev: string }[] = [];
    const lock = (el: HTMLElement | null) => {
      if (el) { locked.push({ el, prev: el.style.overflow }); el.style.overflow = 'hidden'; }
    };
    lock(document.documentElement);
    lock(document.body);
    let node = containerRef.current?.parentElement || null;
    while (node && node !== document.body) {
      const cs = getComputedStyle(node);
      if (/auto|scroll/.test(`${cs.overflow} ${cs.overflowX} ${cs.overflowY}`)) lock(node);
      node = node.parentElement;
    }
    return () => locked.forEach(({ el, prev }) => { el.style.overflow = prev; });
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
  }, [expandedIndex, onExpand, albums, t]);

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

        if (turntableRef.current) {
          // The center of the platter we found earlier
        }
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
        style={{ perspective: '1500px' }}
      >
        {/* NUEVO: superficie de cristal donde "flotan" las portadas */}
        <div
          className={`absolute left-0 right-0 pointer-events-none transition-opacity duration-500 ${expandedIndex === null ? 'opacity-100' : 'opacity-0'}`}
          style={{ top: 'calc(50% + clamp(350px, min(65vh, 40vw), 1000px) * 0.395 + 4px)' }}
        >
          <div className="h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div
            className="h-48 bg-gradient-to-b from-white/[0.07] to-transparent"
            style={{ WebkitMaskImage: 'radial-gradient(60% 100% at 50% 0%, #000, transparent)', maskImage: 'radial-gradient(60% 100% at 50% 0%, #000, transparent)' }}
          />
        </div>

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
            if (Math.abs(activeIndex - index) > 6) return null;

            const isActive = index === activeIndex;
            const isExpanded = index === expandedIndex;
            // NUEVO: el reproductor y sus pestañas aparecen solo cuando terminó el giro
            const showPlayer = isExpanded && playerReady;
            const sideSplit = getSideSplit(album.songs);
            const totalSecsAlbum = album.songs.reduce((acc: number, s: any) => acc + (Number(s.duration) || 0), 0);
            const playFromPaper = (song: any) => {
              // --- BLOQUEO: Prevenir reproducir si hay otro álbum activo y sonando ---
              const isThisAlbumActive = currentSong && album.songs.some((s: any) => s.path === currentSong.path);
              if (globalIsPlaying && !isThisAlbumActive) return;

              if (isPaperOpen) {
                setIsPaperOpen(false);
                setTimeout(() => {
                  if (!isDiscOnPlatter) setIsDiscOnPlatter(true);
                  setTimeout(() => {
                    playSound(song, `album_${album.name}`, album.songs);
                  }, isDiscOnPlatter ? 200 : 800);
                }, 1000);
              } else if (!isDiscOnPlatter) {
                setIsDiscOnPlatter(true);
                setTimeout(() => playSound(song, `album_${album.name}`, album.songs), 800);
              } else {
                playSound(song, `album_${album.name}`, album.songs);
              }
            };

            const offset = index - activeIndex;
            const direction = Math.sign(offset);
            const absOffset = Math.abs(offset);

            // Abanico 3D: el central de frente y grande; los vecinos pegados, girados hacia el centro y alineados por abajo
            // (misma línea de base para que el reflejo del "cristal" quede continuo)
            let translateX: number | string = `${direction * (absOffset === 0 ? 0 : 58 + (absOffset - 1) * 32)}%`;
            let translateZ = absOffset === 0 ? 140 : -absOffset * 40;
            let rotateY = direction * -58;
            let scale = absOffset === 0 ? 0.72 : 0.6;
            let zIndex = 70 - absOffset;
            let opacity = 1 - absOffset * 0.1;
            let translateY = absOffset === 0 ? '-50%' : '-40%';

            if (isExpanded) {
              // NUEVO: rotateY = 360 -> la funda gira una vuelta completa sobre su eje mientras se desplaza a la izquierda
              translateX = '-53%'; translateY = '-46.5%'; translateZ = 200; rotateY = 360; scale = 0.96; zIndex = 200; opacity = 1;
            } else if (expandedIndex !== null) {
              translateZ -= 500; opacity = 0; scale = 0.5;
            }

            return (
              <motion.div
                key={album.name}
                className="absolute top-1/2 left-1/2 cursor-pointer group"
                initial={false}
                variants={{ hover: {} }}
                whileHover={expandedIndex === null ? 'hover' : undefined}
                animate={{ x: `calc(-50% + ${typeof translateX === 'number' ? translateX + 'px' : translateX})`, y: translateY, z: translateZ, scale: scale, opacity: opacity, rotateY: rotateY }}
                // NUEVO: resorte propio (más lento y con rebote suave) para el giro de la tarjeta activa
                transition={
                  isActive
                    ? {
                      type: 'spring', stiffness: 170, damping: 26, mass: 1.2,
                      rotateY: { type: 'tween', duration: 1.1, ease: [0.45, 0, 0.15, 1] }
                    }
                    : { type: 'spring', stiffness: 260, damping: 30, mass: 1.2 }
                }
                style={{ zIndex, width: 'min(65vh, 40vw)', minWidth: '350px', maxWidth: '1000px', height: 'min(65vh, 40vw)', minHeight: '350px', maxHeight: '1000px', transformStyle: 'preserve-3d', pointerEvents: (expandedIndex !== null && !isExpanded) ? 'none' : 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (expandedIndex === null) {
                    isActive ? setExpandedIndex(index) : setActiveIndex(index);
                  }
                }}
              >
                <motion.div
                  className="relative w-full h-full rounded-lg"
                  style={{ transformStyle: 'preserve-3d' }}
                  variants={{
                    hover: { scale: 1.1, z: 120, transition: { type: 'spring', stiffness: 300, damping: 32 } }
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                >
                  <AnimatePresence>
                    {showPlayer && (
                      <VinylPlayer
                        album={album} currentSong={currentSong} isPlaying={globalIsPlaying} subscribeToProgress={subscribeToProgress}
                        playSound={playSound} isPaperOpen={isPaperOpen} volume={volume} setVolume={setVolume}
                        pauseOrResumeSound={pauseOrResumeSound} playNext={playNext} playPrevious={playPrevious}
                        isDiscOnPlatter={isDiscOnPlatter} turntableRef={turntableRef} onDiscDragStart={handleDiscDragStart}
                        isInstantSnap={isInstantSnap} isDraggingDisc={isDraggingDisc} onDiscReturn={() => setIsDiscOnPlatter(true)}
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

                  <AnimatePresence>
                    {showPlayer && !isPaperOpen && (
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 0.5 } }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={(e) => { e.stopPropagation(); setIsPaperOpen(true); }}
                        className="absolute top-3 right-0 translate-x-[90%] w-10 h-32 bg-[#f4f0ea] rounded-r-xl shadow-xl border-y border-r border-[#d8cdbc] flex items-center justify-center cursor-pointer hover:bg-white transition-colors z-[15]"
                      >
                        <div className="rotate-90 whitespace-nowrap text-[#5c5444] font-bold tracking-widest text-[11px] flex items-center gap-1.5">
                          {t('player.infoTracks', 'INFO & TRACKS')} <ListMusic size={14} />
                        </div>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showPlayer && !isPaperOpen && (
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 0.6 } }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={(e) => { e.stopPropagation(); setShowLyrics(!showLyrics); }}
                        className="absolute bottom-3 right-0 translate-x-[90%] w-10 h-32 bg-[#f4f0ea] rounded-r-xl shadow-xl border-y border-r border-[#d8cdbc] flex items-center justify-center cursor-pointer hover:bg-white transition-colors z-[15]"
                      >
                        <div className="rotate-90 whitespace-nowrap text-[#5c5444] font-bold tracking-widest text-[11px] flex items-center gap-1.5">
                          {t('player.lyricsBtn', 'LETRAS')} <Mic2 size={14} />
                        </div>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* NUEVO: un solo disco de vinilo, continuo: asoma en el carrusel, se queda entre las dos caras de la funda mientras gira
                      (la cara trasera lo tapa) y se desliza un poco más cuando entra el reproductor */}
                  <AnimatePresence>
                    {isActive && (expandedIndex === null || (isExpanded && !isDiscOnPlatter && !isDraggingDisc)) && (
                      <motion.div
                        className={`absolute top-1/2 right-0 w-[92%] aspect-square z-[10] ${showPlayer ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        style={{ y: '-50%', pointerEvents: showPlayer ? 'auto' : 'none' }}
                        initial={{ x: '0%', opacity: 0 }}
                        animate={{ x: showPlayer ? '32%' : '24%', opacity: 1 }}
                        exit={isExpanded ? { opacity: 0, transition: { duration: 0 } } : { x: '0%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                        onPointerDown={(e) => {
                          if (!showPlayer) return;
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
                        <div className="relative w-full h-full rounded-full overflow-hidden border border-[#222] shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                          <PeekDiscVisuals album={album} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* NUEVO: solo la portada hace zoom frontal al abrir la hoja (el reproductor no cambia de tamaño) */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ transformStyle: 'preserve-3d' }}
                    initial={false}
                    animate={{ scale: isExpanded && isPaperOpen ? 1.07 : 1, z: isExpanded && isPaperOpen ? 24 : 0 }}
                    transition={
                      isExpanded && !isPaperOpen
                        ? { scale: { type: 'spring', stiffness: 180, damping: 24, delay: 1.3 }, z: { type: 'spring', stiffness: 180, damping: 24, delay: 1.3 } }
                        : { type: 'spring', stiffness: 180, damping: 24 }
                    }
                  >
                    {/* NUEVO: cara trasera = la misma portada, espejada, difuminada y translúcida (como vidrio) */}
                    <div
                      className="absolute inset-0 rounded-lg z-20 overflow-hidden pointer-events-none"
                      style={{ transform: 'translateZ(-2px) rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      <div className="absolute inset-0" style={{ transform: 'scaleX(-1)', filter: 'blur(18px) saturate(1.3) brightness(1.1)', opacity: 0.9 }}>
                        <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={false} className="w-full h-full object-cover scale-110" />
                      </div>
                      <div className="absolute inset-0 rounded-lg bg-white/10 border border-white/25 shadow-[inset_0_0_40px_rgba(255,255,255,0.15)]" />
                    </div>

                    <div
                      className="absolute inset-0 overflow-hidden rounded-lg z-20 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.9)]"
                      style={{ transform: 'translateZ(2px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={isActive} className="w-full h-full object-cover" />
                      {expandedIndex === null && (
                        <div className="absolute inset-0 pointer-events-none rounded-lg border-[3px] border-white/80 shadow-[inset_0_0_35px_rgba(255,255,255,0.3)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30" />
                      )}
                      <div className="absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_0_15px_rgba(255,255,255,0.1),inset_1px_1px_2px_rgba(255,255,255,0.3)] border border-white/10 z-20" />
                      {!reduceAnimations && (
                        <>
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
                        </>
                      )}

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

                    {/* NUEVO: grosor de la funda de vinilo (se nota al verla de lado) */}
                    <div className="absolute top-0 bottom-0 w-1 pointer-events-none" style={{ left: 0, transformOrigin: 'left center', transform: 'translateZ(2px) rotateY(90deg)', background: 'linear-gradient(to right, #26262b, #070708)' }} />
                    <div className="absolute top-0 bottom-0 w-1 pointer-events-none" style={{ right: 0, transformOrigin: 'right center', transform: 'translateZ(2px) rotateY(-90deg)', background: 'linear-gradient(to left, #26262b, #070708)' }} />

                    {/* NUEVO: reflejo de cristal = copia volteada de la portada con degradado que se desvanece */}
                    {expandedIndex === null && (
                      <div
                        className="absolute left-0 right-0 pointer-events-none rounded-lg overflow-hidden"
                        style={{
                          top: 'calc(100% + 6px)', height: '100%',
                          transform: 'translateZ(2px) scaleY(-1)',
                          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                          opacity: 0.6,
                          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 36%)',
                          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 36%)'
                        }}
                      >
                        <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={false} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
                      </div>
                    )}
                  </motion.div>

                  {/* HOJA INTERIOR (liner notes). Vive dentro del contenedor 3D: sale por encima del reproductor (z=1), por debajo de la funda (z=2), y luego pasa al frente de ambos (z=4). */}
                  <AnimatePresence>
                    {isExpanded && isPaperOpen && (
                      <motion.div
                        initial="hidden"
                        animate="open"
                        exit="closed"
                        variants={{
                          hidden: { x: '0%', z: 1, opacity: 0 },
                          open: {
                            x: ['0%', '118%', '118%', '17%'],
                            z: [1, 1, 50, 50],
                            opacity: [0, 1, 1, 1],
                            transition: {
                              x: { duration: 1.15, delay: 0.35, times: [0, 0.44, 0.54, 1], ease: 'easeInOut' },
                              z: { duration: 1.15, delay: 0.35, times: [0, 0.47, 0.51, 1], ease: 'linear' },
                              opacity: { duration: 0.25, delay: 0.35 }
                            }
                          },
                          closed: {
                            x: ['17%', '118%', '118%', '0%'],
                            z: [50, 50, 1, 1],
                            transition: {
                              x: { duration: 1.05, delay: 0.5, times: [0, 0.44, 0.54, 1], ease: 'easeInOut' },
                              z: { duration: 1.05, delay: 0.5, times: [0, 0.47, 0.51, 1], ease: 'linear' }
                            }
                          }
                        }}
                        className="absolute top-[2%] bottom-[2%] left-0 w-[88%] rounded-r-md font-serif"
                        style={{
                          transformOrigin: 'center',
                          perspective: '2000px',
                          background: '#f7f2e6',
                          backgroundImage: 'radial-gradient(rgba(110,90,60,0.10) 1px, transparent 1.2px)',
                          backgroundSize: '4px 4px',
                          boxShadow: '0 30px 60px rgba(0,0,0,0.55), inset -14px 0 24px -12px rgba(0,0,0,0.18)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* ---------- Página izquierda: info del álbum ---------- */}
                        <div className="relative w-full h-full flex flex-col px-9 py-8 text-[#1a160e] overflow-hidden rounded-r-md">
                          <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/15 to-transparent pointer-events-none" />

                          <div className="flex items-center justify-between text-[11px] font-black tracking-[0.3em] uppercase text-[#4a3f2a] font-sans">
                            <span>Stereo · 33⅓ RPM</span>
                            <span>Liner Notes</span>
                          </div>
                          <div className="mt-4 h-[2px] bg-[#1a160e]" />
                          <div className="mt-[3px] h-[3px] border-y border-[#1a160e]/60" />

                          <h3 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight break-words text-[#120e07]">{album.name}</h3>
                          <p className="mt-2 text-2xl italic font-semibold text-[#3d3324] truncate">{album.artist}</p>

                          <div className="mt-7 flex flex-col gap-3.5 text-[16px]">
                            {[
                              [t('detail.release', 'Lanzamiento'), album.year || '—'],
                              [t('detail.songs', 'Canciones'), String(album.songs.length)],
                              [t('detail.totalDuration', 'Duración total'), totalSecsAlbum ? fmtTime(totalSecsAlbum) : '—'],
                              [t('detail.sides', 'Lados'), album.songs.length > 1 ? 'A / B' : 'A']
                            ].map(([k, v]) => (
                              <div key={k} className="flex items-baseline gap-2">
                                <span className="uppercase tracking-[0.18em] text-[12px] font-black text-[#4a3f2a] font-sans">{k}</span>
                                <span className="flex-1 border-b border-dotted border-[#4a3f2a]/70 -translate-y-[3px]" />
                                <span className="font-black text-[#120e07]">{v}</span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-auto flex items-end gap-4">
                            <div className="relative bg-white p-2 pb-6 w-[30%] max-w-[9.5rem] min-w-[5.5rem] -rotate-3 shadow-[0_8px_20px_rgba(0,0,0,0.25)]" title={albumInfo}>
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 bg-[#e6dca0]/80 rotate-2" />
                              <div className="aspect-square overflow-hidden bg-zinc-200">
                                <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={false} className="w-full h-full object-cover" />
                              </div>
                              <span className="absolute bottom-1.5 left-2 right-2 text-[8px] font-bold tracking-widest uppercase text-zinc-600 truncate font-sans">{album.name}</span>
                            </div>

                            <ArtistSticker album={album} />

                            <div className="ml-auto text-right text-[10px] font-bold tracking-[0.25em] uppercase text-[#4a3f2a] leading-relaxed font-sans">
                              <div>Cat. Nº {String(index + 1).padStart(3, '0')}</div>
                              <div>℗ {album.year || ''}</div>
                            </div>
                          </div>
                        </div>

                        {/* ---------- Página derecha: tracklist (se abre como libro) ---------- */}
                        <motion.div
                          variants={{
                            hidden: { rotateY: -179.9 },
                            open: { rotateY: 0, transition: { type: 'tween', duration: 0.7, ease: [0.3, 0.7, 0.2, 1], delay: 1.5 } },
                            closed: { rotateY: -179.9, transition: { type: 'tween', duration: 0.5, ease: 'easeIn' } }
                          }}
                          className="absolute top-0 bottom-0 left-[99%] w-full"
                          style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                        >
                          <div
                            className="absolute inset-0 px-9 py-8 rounded-r-md flex flex-col text-[#1a160e]"
                            style={{
                              backfaceVisibility: 'hidden',
                              background: '#f7f2e6',
                              backgroundImage: 'radial-gradient(rgba(110,90,60,0.10) 1px, transparent 1.2px)',
                              backgroundSize: '4px 4px',
                              boxShadow: 'inset 14px 0 24px -12px rgba(0,0,0,0.18), 15px 0 30px rgba(0,0,0,0.3)'
                            }}
                          >
                            <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />

                            <button
                              onClick={(e) => { e.stopPropagation(); setIsPaperOpen(false); }}
                              className="absolute top-4 right-4 p-2 text-[#4a3f2a] hover:text-black transition rounded-full hover:bg-black/5 z-10"
                              title={t('detail.closeBooklet', 'Cerrar libreto y sacar tocadiscos')}
                            >
                              <X size={26} />
                            </button>

                            <div className="flex items-end justify-between pr-10">
                              <h4 className="text-4xl font-black tracking-tight">{t('detail.tracklist', 'Tracklist')}</h4>
                              <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#4a3f2a] font-sans pb-1">{album.songs.length} {t('detail.tracks', 'tracks')}</span>
                            </div>
                            <div className="mt-3 h-px bg-[#1a160e]/70" />
                            <div className="mt-[3px] h-[3px] border-y border-[#1a160e]/40 mb-4" />

                            <div className="flex-1 overflow-y-auto pr-3 customized-scrollbar-light">
                              {[
                                { label: 'Side A', start: 0, songs: album.songs.slice(0, sideSplit) },
                                { label: 'Side B', start: sideSplit, songs: album.songs.slice(sideSplit) }
                              ].filter(side => side.songs.length > 0).map(side => (
                                <div key={side.label} className="mb-5">
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <span title="Lados estimados: se reparten por duración (o por cantidad de pistas si no hay duraciones)" className="px-2 py-0.5 bg-[#1a160e] text-[#f7f2e6] text-[11px] font-bold tracking-[0.3em] uppercase font-sans">{side.label}</span>
                                    <span className="flex-1 h-px bg-[#1a160e]/30" />
                                  </div>
                                  {side.songs.map((song: any, i: number) => {
                                    const isSongPlaying = currentSong?.path === song.path;
                                    return (
                                      <div
                                        key={song.path}
                                        onClick={(e) => { e.stopPropagation(); playFromPaper(song); }}
                                        className={`flex items-baseline gap-3 px-2 py-2 rounded-sm cursor-pointer transition-colors ${isSongPlaying ? 'bg-[#1a160e]/10' : 'hover:bg-[#1a160e]/5'}`}
                                      >
                                        <span className="w-7 text-right font-mono text-[12px] font-bold text-[#4a3f2a]">{String(side.start + i + 1).padStart(2, '0')}</span>
                                        <span className={`min-w-0 truncate text-[17px] ${isSongPlaying ? 'font-black' : 'font-semibold'}`}>{song.title || song.filename}</span>
                                        <span className="flex-1 min-w-[12px] border-b border-dotted border-[#4a3f2a]/50 -translate-y-[3px]" />
                                        {isSongPlaying && globalIsPlaying && (
                                          <span className="flex items-end gap-[2px] h-3 self-center">
                                            <i className="w-[3px] h-full bg-[#1a160e] animate-pulse" />
                                            <i className="w-[3px] h-2/3 bg-[#1a160e] animate-pulse" style={{ animationDelay: '0.2s' }} />
                                            <i className="w-[3px] h-1/2 bg-[#1a160e] animate-pulse" style={{ animationDelay: '0.4s' }} />
                                          </span>
                                        )}
                                        <span className="font-mono text-[12px] font-bold text-[#3d3324]">{song.duration > 0 ? fmtTime(song.duration) : '--:--'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>

                            <div className="mt-2 pt-3 border-t border-[#1a160e]/30 flex justify-between text-[10px] font-bold tracking-[0.28em] uppercase text-[#4a3f2a] font-sans">
                              <span>{album.artist}</span>
                              <span>{totalSecsAlbum ? fmtTime(totalSecsAlbum) : ''}</span>
                            </div>
                          </div>

                          <div
                            className="absolute inset-0 bg-[#d8cdbc] rounded-r-md border border-[#c2b59b]"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
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



        {isDraggingDisc && discDragPos && expandedIndex !== null && !isDiscOnPlatter && (
          <motion.div
            layoutId="vinyl-disc"
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: discDragPos.x - (typeof window !== 'undefined' ? Math.max(450, Math.min(1200, Math.min(window.innerHeight * 0.75, window.innerWidth * 0.40))) * 0.92 / 2 : 150),
              top: discDragPos.y - (typeof window !== 'undefined' ? Math.max(450, Math.min(1200, Math.min(window.innerHeight * 0.75, window.innerWidth * 0.40))) * 0.92 / 2 : 150),
              width: typeof window !== 'undefined' ? Math.max(450, Math.min(1200, Math.min(window.innerHeight * 0.75, window.innerWidth * 0.40))) * 0.92 : 300,
              height: typeof window !== 'undefined' ? Math.max(450, Math.min(1200, Math.min(window.innerHeight * 0.75, window.innerWidth * 0.40))) * 0.92 : 300,
            }}
            initial={false}
            animate={{
              scale: 1
            }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0 }}
          >
            <div className="w-full h-full rounded-full bg-[#0a0a0a] border border-[#222] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden opacity-90">
              <PeekDiscVisuals album={albums[expandedIndex]} isDragging={true} />
            </div>
          </motion.div>
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
              <CoverImage coverUrl={currentSong?.cover || playingAlbum.cover} audioPath={currentSong?.path || playingAlbum.songs[0]?.path} hq={false} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <p className="text-[10px] text-white/50 mb-0.5 uppercase font-bold tracking-widest">{t('player.nowPlaying', 'Reproduciendo')}</p>
              <p className="text-base text-white font-black truncate leading-tight mb-0.5">{currentSong?.title || currentSong?.filename.replace(/\.[^/.]+$/, "") || playingAlbum.name}</p>
              <div className="text-xs text-white/70 font-medium truncate">
                <ArtistLinks
                  artist={currentSong?.artist || playingAlbum.artist}
                  onArtistClick={(artistName) => {
                    navigate(`/detail/artist/${encodeURIComponent(artistName)}`);
                  }}
                  linkClassName="hover:underline hover:text-white transition-colors cursor-pointer"
                />
              </div>
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