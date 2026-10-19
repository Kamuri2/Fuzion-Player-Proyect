import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import CoverImage from './CoverImage';
import { Pause, Play, SkipBack, SkipForward, ListMusic, X, Settings, Mic2, Power, Disc3 } from 'lucide-react';
import LyricsView from './LyricsView';
import AlbumTriptych from './AlbumTriptych';
import { useTranslation } from 'react-i18next';

const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

// --- Parámetros de la caja 3D de cada álbum (estantería) ---
// Grosor de la caja en px: 26 px originales + 3 %. Cambia el 1.03 si quieres más o menos grosor.
const BOX_DEPTH = 26 * 1.03;
const BOX_HALF = BOX_DEPTH / 2;
// Giro de cada caja en la estantería (como la imagen de referencia). 90 = totalmente de canto.
const SHELF_ANGLE = 78;
// Separación entre cajas, en % del ancho de la portada (menor = más juntas)
const SHELF_STEP_PCT = 14;
// NUEVO: factor de aumento del tamaño de las cajas del carrusel (1.17 = 17 % más grandes).
// Al abrir un álbum se compensa para que el reproductor conserve su tamaño de antes.
const CAROUSEL_BOOST = 1.0;
// NUEVO: carrusel mariposa. Las cajas se curvan hacia el fondo según su distancia a la activa
// (mayor valor = alas más cerradas) y se abre un hueco en el centro donde sobresale la activa.
const CURVE_Z = 16;
// NUEVO: hueco a cada lado de la caja activa, para que su portada quede libre y centrada
const CENTER_GAP_PCT = 14;
const ACTIVE_POP = 80;
// NUEVO: giro de la caja activa (las demás usan SHELF_ANGLE). Menor = la portada del centro se ve más de frente.
const ACTIVE_ANGLE = 71;
// NUEVO: inclinación de la curva según el lado del scroll. Con scroll hacia la derecha, el ala derecha se aleja
// más y la izquierda se acerca (y al revés). Pon 0 para una curva simétrica.
const CURVE_LEAN = 18;
// NUEVO: tamaño de la pantalla del reproductor (portada + tocadiscos) respecto al tamaño que tenía antes (1 = igual)
const PLAYER_BOOST = 1.12;
const EXPANDED_SCALE = (0.96 * PLAYER_BOOST) / CAROUSEL_BOOST;
const shelfX = (o: number) => o * SHELF_STEP_PCT + Math.sign(o) * CENTER_GAP_PCT;
const shelfZ = (o: number, dir: number) => -Math.pow(Math.abs(o), 1.5) * CURVE_Z - dir * o * CURVE_LEAN;
// Tope de cajas que se dibujan a cada lado de la activa (aunque la pantalla sea enorme)
const MAX_RENDER_RANGE = 16;
// NUEVO: cuánto sale hacia el frente (hacia ti) al pasar el mouse, sin moverse en X
const HOVER_Z = 90;
// NUEVO: cuánto sale la caja de su hueco al abrir/cerrar, antes de girar
const PULL_Z = 130;
// NUEVO: tiempo sin moverse en el selector de letras antes de mostrar el carrusel ya acomodado (ms)
const SCRUB_REVEAL_MS = 450;
// Mismo tamaño que usa el estilo de cada caja: min(58vh, 36vw) limitado entre 320 y 750 px
const getItemSize = (vw: number, vh: number) => Math.min(750 * CAROUSEL_BOOST, Math.max(320 * CAROUSEL_BOOST, Math.min(vh * 0.58 * CAROUSEL_BOOST, vw * 0.36 * CAROUSEL_BOOST)));

// --- Reproductor de CD: cuerpo blanco con rejilla de altavoz, compartimento circular con tapa de cristal ---
const PLAYER_ASPECT = 1.08;              // Compensación para el nuevo formato aspect-[1/1.08]
const CD_BAY = 82;                       // diámetro del compartimento del disco
const CD_BAY_TOP_VW = 3.5;               // distancia original en base al ancho
const CD_BAY_TOP = CD_BAY_TOP_VW / PLAYER_ASPECT; // convertido a % de altura real
const CD_CENTER_Y = (CD_BAY_TOP_VW + CD_BAY / 2) / PLAYER_ASPECT;
const CD_DISC = 78;                      // diámetro del CD
const CD_LID = 85;                       // diámetro de la tapa de cristal
const CD_LID_TOP = (CD_BAY_TOP_VW - (CD_LID - CD_BAY) / 2) / PLAYER_ASPECT;
const CD_LID_OPEN_ANGLE = 64;            // cuánto se levanta la tapa al abrirse
// Agujero central del CD (12,5 % del diámetro, como un CD real)
const CD_HOLE_MASK = 'radial-gradient(circle closest-side at 50% 50%, transparent 0, transparent 12.5%, #000 13.2%)';
const CD_BODY_STYLE: React.CSSProperties = {
  backgroundColor: '#f5f5f6',
  backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.17) 0, rgba(0,0,0,0.17) 1px, transparent 1.5px), linear-gradient(160deg, #ffffff 0%, #f1f1f3 55%, #e6e6e9 100%)',
  backgroundSize: '7px 7px, 100% 100%'
};
const KEY_BTN = 'bg-gradient-to-b from-white to-[#e7e7ea] border border-[#d4d4d8] shadow-[0_2px_0_#cfcfd3,0_5px_10px_rgba(0,0,0,0.12)] active:translate-y-[2px] active:shadow-[0_0_0_#cfcfd3,0_1px_3px_rgba(0,0,0,0.15)] transition-all';
const HINGE_STYLE: React.CSSProperties = { background: 'linear-gradient(#f9f9fa,#cfcfd4)', boxShadow: '0 1px 2px rgba(0,0,0,0.25), inset 0 1px 0 #fff' };

// Brillo irisado fijo sobre el CD (no gira con el disco)
const CdSheen = () => (
  <div
    className="absolute inset-0 rounded-full pointer-events-none"
    style={{
      background: 'conic-gradient(from 25deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.38) 22deg, rgba(255,255,255,0) 60deg, rgba(120,190,255,0.20) 110deg, rgba(255,255,255,0) 150deg, rgba(255,255,255,0.30) 205deg, rgba(255,170,220,0.20) 250deg, rgba(255,255,255,0) 290deg, rgba(255,255,255,0.34) 335deg, rgba(255,255,255,0) 360deg)',
      mixBlendMode: 'screen'
    }}
  />
);

// Cara impresa del CD: portada (o textura propia), pistas, aro central transparente y texto en el aro
const CdFace = ({
  album, texture, textureOpacity = 100, scale = 100, offsetX = 0, offsetY = 0,
  hideHub = false, showText = true, idPrefix = 'cd'
}: any) => {
  const key = `${idPrefix}_${album.name.replace(/[^a-zA-Z0-9]/g, '')}`;
  const customized = !!texture;
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${scale / 100}) translate(${offsetX}%, ${offsetY}%)`, transformOrigin: 'center' }}>
        {texture ? (
          <img src={texture} className="w-full h-full object-cover" style={{ opacity: textureOpacity / 100 }} />
        ) : (
          <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={false} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
        {!(customized && hideHub) && (
          <>
            <circle cx="50" cy="50" r="17" fill="rgba(235,238,242,0.30)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.35" />
            <circle cx="50" cy="50" r="12.2" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.25" />
            <circle cx="50" cy="50" r="6.9" fill="rgba(210,214,220,0.55)" stroke="rgba(255,255,255,0.8)" strokeWidth="0.3" />
            {showText && (
              <>
                <path id={`${key}_curve`} d="M 50,50 m -14.6,0 a 14.6,14.6 0 1,1 29.2,0 a 14.6,14.6 0 1,1 -29.2,0" fill="none" />
                <text fontSize="2.3" fontWeight="700" letterSpacing="0.5" fill="rgba(20,20,24,0.78)" style={{ textTransform: 'uppercase' }}>
                  <textPath href={`#${key}_curve`} startOffset="50%" textAnchor="middle">
                    {album.name.substring(0, 22)} • {album.year || '2024'} •
                  </textPath>
                </text>
              </>
            )}
          </>
        )}
        <circle cx="50" cy="50" r="49.6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
      </svg>
    </div>
  );
};

// --- CD Player Component ---
const CdPlayer = ({
  album, currentSong, isPlaying, subscribeToProgress, playSound,
  isPaperOpen, volume, setVolume, pauseOrResumeSound, playNext,
  playPrevious, isDiscOnPlatter, turntableRef, onDiscDragStart, isInstantSnap, onPowerOff, isDraggingDisc, onDiscReturn
}: any) => {
  const { t, i18n } = useTranslation();
  const L = (es: string, en: string) => ((i18n.language || 'es').startsWith('en') ? en : es);
  const { setPlaybackRate } = useAudio();
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [customTexture, setCustomTexture] = useState<string | null>(null);
  const [customScale, setCustomScale] = useState<number>(100);
  const [hideCenterLabel, setHideCenterLabel] = useState<boolean>(false);
  const [hideGrooves, setHideGrooves] = useState<boolean>(false);
  const [textureHistory, setTextureHistory] = useState<string[]>([]);

  const [customTextureOpacity, setCustomTextureOpacity] = useState<number>(100);
  const [customOffsetX, setCustomOffsetX] = useState<number>(0);
  const [customOffsetY, setCustomOffsetY] = useState<number>(0);

  // Un CD siempre gira a velocidad normal: se asegura que no quede una velocidad de reproducción heredada
  useEffect(() => { setPlaybackRate(1); }, []);

  const [isPendingPause, setIsPendingPause] = useState(false);
  const [isPendingResume, setIsPendingResume] = useState(false);
  const [isPendingTrackChange, setIsPendingTrackChange] = useState(false);
  const discRef = useRef<HTMLDivElement>(null);
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
        if (discRef.current) {
          discRef.current.style.transform = `rotate(${rotationAngleRef.current}deg)`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Velocidad de giro del CD (grados por milisegundo)
  const getSpinSpeed = () => 0.45;

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
  }, [isPlaying, isPendingPause, isPendingResume, isPendingTrackChange]);

  // (Se conservan las mismas claves de almacenamiento que usaba el disco anterior, para no perder texturas guardadas)
  useEffect(() => {
    const savedTexture = localStorage.getItem(`vinyl_texture_${album.name}`);
    const savedHistory = localStorage.getItem(`vinyl_textures_history_${album.name}`);
    const savedScale = localStorage.getItem(`vinyl_scale_${album.name}`);
    const savedHideLabel = localStorage.getItem(`vinyl_hide_label_${album.name}`);
    const savedOpacity = localStorage.getItem(`vinyl_opacity_${album.name}`);
    const savedOffsetX = localStorage.getItem(`vinyl_offset_x_${album.name}`);
    const savedOffsetY = localStorage.getItem(`vinyl_offset_y_${album.name}`);

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
    localStorage.removeItem(`vinyl_texture_${album.name}`);
    localStorage.removeItem(`vinyl_scale_${album.name}`);
    localStorage.removeItem(`vinyl_hide_label_${album.name}`);
    localStorage.removeItem(`vinyl_opacity_${album.name}`);
    localStorage.removeItem(`vinyl_offset_x_${album.name}`);
    localStorage.removeItem(`vinyl_offset_y_${album.name}`);
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
      // Si el disco estaba fuera del compartimento, vuelve a colocarse al reanudar
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
      setProgress(prog);
    });
    return unsub;
  }, [isPlaying, subscribeToProgress]);

  let currentSongIndex = album.songs.findIndex((s: any) => s.path === currentSong?.path);
  if (currentSongIndex === -1) currentSongIndex = 0;

  const isVinylOut = isDiscOnPlatter;
  const canGrabDisc = !isPlaying && spinSpeedRef.current < 0.01;

  // Tapa de cristal: se abre al seleccionar el álbum (y cuando no suena nada) y se cierra al empezar a reproducir
  const lidOpen = !isPlaying && !isPendingTrackChange;

  const hasTrack = !!(isThisAlbumActive && currentSong);
  const statusText = hasTrack
    ? (isPlaying && !isPendingPause ? t('player.playing', 'REPRODUCIENDO') : t('player.paused', 'PAUSADO'))
    : t('player.standby', 'En Espera');
  const lcdTitle = hasTrack
    ? (currentSong.title || currentSong.filename.replace(/\.[^/.]+$/, ''))
    : t('player.noActiveTrack', 'Sin pista activa');
  const trackLabel = hasTrack ? `${String(currentSongIndex + 1).padStart(2, '0')}/${String(album.songs.length).padStart(2, '0')}` : '--/--';
  const timeLabel = hasTrack ? fmtTime(progress) : '--:--';
  const playingNow = isPlaying && !isPendingPause;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>

      {/* 1. CUERPO DEL REPRODUCTOR DE CD (z-10) */}
      <motion.div
        ref={turntableRef}
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: 1, x: '110%' }}
        exit={{ opacity: 0, x: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-[1/1.08] rounded-[2.4rem] border-[3px] border-white shadow-[0_30px_100px_rgba(0,0,0,0.9)] pointer-events-auto z-10"
        style={CD_BODY_STYLE}
      >
        {/* Bisel del cuerpo */}
        <div className="absolute inset-0 rounded-[2.2rem] pointer-events-none shadow-[inset_0_2px_0_rgba(255,255,255,0.95),inset_0_-3px_8px_rgba(0,0,0,0.07),inset_0_0_0_1px_rgba(0,0,0,0.04)]" />

        {/* Compartimento circular del disco */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${(100 - CD_BAY) / 2}%`, top: `${CD_BAY_TOP}%`, width: `${CD_BAY}%`, aspectRatio: '1',
            background: 'linear-gradient(145deg, #cfcfd4, #fafafa)',
            boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.95), 0 0 0 5px rgba(255,255,255,0.92), 0 0 0 6px rgba(0,0,0,0.06)'
          }}
        >
          {/* Piso oscuro del compartimento */}
          <div
            className="absolute inset-[2.2%] rounded-full"
            style={{ background: 'radial-gradient(circle at 50% 40%, #34343a 0%, #202024 60%, #141417 100%)', boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.55), inset 0 10px 24px rgba(0,0,0,0.65)' }}
          />
          <div className="absolute inset-[13%] rounded-full" style={{ border: '2px solid rgba(255,255,255,0.07)' }} />
          {/* Eje central */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[9%] aspect-square rounded-full"
            style={{ background: 'radial-gradient(circle at 35% 30%, #ffffff, #8d8d95)', boxShadow: '0 1px 4px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,255,255,0.12)' }}
          />
        </div>

        <span className="absolute right-[5%] top-[3.2%] text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase pointer-events-none" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.95)' }}>CD Player</span>

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
          className={`absolute top-5 left-5 p-3 rounded-full text-zinc-500 hover:text-red-500 z-20 cursor-pointer ${KEY_BTN}`}
          title={t('player.modeOff', 'MODO ÁLBUM DESACTIVADO')}
        >
          <span className={`absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full ${playingNow ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-zinc-300'}`} />
          <Power size={22} />
        </button>

        {/* Panel de control integrado: pantalla + botones */}
        <div className="absolute left-[5%] right-[5%] bottom-[3%] h-[11%] flex items-center gap-[3%] pointer-events-auto">
          <div
            className="flex-1 min-w-0 h-[85%] rounded-lg px-4 flex items-center justify-between"
            style={{ background: 'linear-gradient(#17201c, #0e1411)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(0,0,0,0.25)' }}
          >
            {/* Lado izquierdo: Estado y Título */}
            <div className="flex flex-col justify-center min-w-0 pr-3 overflow-hidden">
              <span className="flex items-center gap-1.5 min-w-0 mb-[3px]">
                <i className={`w-1.5 h-1.5 rounded-full shrink-0 ${playingNow ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-900'}`} style={{ boxShadow: playingNow ? '0 0 8px #34d399, 0 0 4px #34d399' : 'none' }} />
                <span className="text-[12px] font-black tracking-[0.16em] text-emerald-400 uppercase truncate" style={{ textShadow: '0 0 5px rgba(52,211,153,0.8), 0 0 10px rgba(52,211,153,0.4)' }}>
                  {statusText}
                </span>
              </span>

              {/* Contenedor del título con efecto Marquee (Desplazamiento infinito) */}
              <div className="relative w-full overflow-hidden flex" style={{ maskImage: 'linear-gradient(to right, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}>
                <style>{`
                  @keyframes scrollLcd {
                    0%, 15% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                  .lcd-marquee {
                    display: flex;
                    width: max-content;
                    /* Cambia los 8s para hacerlo más rápido o más lento */
                    animation: scrollLcd 8s linear infinite; 
                  }
                `}</style>
                <div className="lcd-marquee">
                  <span className="pr-10 text-[17px] font-black text-emerald-300 leading-none whitespace-nowrap" style={{ textShadow: '0 0 6px rgba(110,231,183,0.9), 0 0 12px rgba(110,231,183,0.5)' }}>
                    {lcdTitle}
                  </span>
                  {/* Etiqueta duplicada para crear el bucle sin cortes visuales */}
                  <span className="pr-10 text-[17px] font-black text-emerald-300 leading-none whitespace-nowrap" style={{ textShadow: '0 0 6px rgba(110,231,183,0.9), 0 0 12px rgba(110,231,183,0.5)' }} aria-hidden="true">
                    {lcdTitle}
                  </span>
                </div>
              </div>
            </div>
            {/* Lado derecho: Track y Tiempo centrados verticalmente */}
            <span className="font-mono text-[15px] font-bold text-emerald-400 shrink-0" style={{ textShadow: '0 0 5px rgba(52,211,153,0.8), 0 0 10px rgba(52,211,153,0.4)' }}>
              {trackLabel} - {timeLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-black transition-colors" title={t('player.cdDesign', L('Diseño del CD', 'CD Design'))}>
              <Settings size={16} />
            </button>
            <div className="w-[1px] h-6 bg-zinc-300" />
            <button onClick={handlePlayPrevWithDust} className={`w-8 h-8 flex items-center justify-center text-zinc-800 rounded-full ${KEY_BTN}`}><SkipBack size={14} fill="currentColor" /></button>
            <button onClick={handlePauseOrResumeDelay} className={`w-10 h-10 flex items-center justify-center text-zinc-800 rounded-full ${KEY_BTN} ${playingNow ? 'ring-2 ring-green-500/50' : ''}`}>
              {playingNow ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={handlePlayNextWithDust} className={`w-8 h-8 flex items-center justify-center text-zinc-800 rounded-full ${KEY_BTN}`}><SkipForward size={14} fill="currentColor" /></button>
          </div>
        </div>
      </motion.div>

      {/* 2. CD GIRANDO (z-20) */}
      <motion.div
        initial={{ x: 0, scale: 0.9, opacity: 1 }}
        animate={isVinylOut ? { x: '110%', scale: 1, opacity: 1 } : { x: 0, scale: 0.9, opacity: isDraggingDisc ? 0 : 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        transition={(isInstantSnap || isDraggingDisc) ? { duration: 0 } : { type: 'spring', damping: 15, mass: 1, stiffness: 100 }}
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-[1/1.08] z-20 pointer-events-none"
      >
        <div
          className={`absolute rounded-full ${canGrabDisc ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : 'pointer-events-none'}`}
          style={{
            left: '50%', top: `${CD_CENTER_Y}%`, width: `${CD_DISC}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.55))', WebkitMaskImage: CD_HOLE_MASK, maskImage: CD_HOLE_MASK
          }}
          onPointerDown={(e) => {
            if (canGrabDisc) {
              e.stopPropagation();
              e.preventDefault();
              if (onDiscDragStart) onDiscDragStart(e);
            }
          }}
        >
          <div
            ref={discRef}
            className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
            style={{ backgroundColor: '#1a1a1d', willChange: 'transform' }}
          >
            <CdFace
              album={album} texture={customTexture} textureOpacity={customTextureOpacity} scale={customScale}
              offsetX={customOffsetX} offsetY={customOffsetY} hideHub={hideCenterLabel} hideRings={hideGrooves}
              idPrefix="cdplayer" durations={songDurations} cumulative={cumulativeDurations} total={totalDuration}
            />
          </div>
          <CdSheen />
        </div>
      </motion.div>

      {/* 3. TAPA DE CRISTAL (z-30): se abre al elegir el álbum y se cierra al empezar a sonar */}
      <motion.div
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: 1, x: '110%' }}
        exit={{ opacity: 0, x: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-[1/1.08] pointer-events-none z-30"
      >
        {/* Bisagras */}
        <div className="absolute top-[2.4%] left-[34%] w-[7%] h-[2.6%] rounded-[3px] pointer-events-none" style={HINGE_STYLE} />
        <div className="absolute top-[2.4%] right-[34%] w-[7%] h-[2.6%] rounded-[3px] pointer-events-none" style={HINGE_STYLE} />

        <div className="absolute inset-0 pointer-events-none" style={{ perspective: '2400px', perspectiveOrigin: '50% 12%' }}>
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${(100 - CD_LID) / 2}%`, top: `${CD_LID_TOP}%`, width: `${CD_LID}%`, aspectRatio: '1',
              transformOrigin: '50% 0%',
              background: 'radial-gradient(120% 90% at 28% 18%, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.10) 38%, rgba(190,210,225,0.08) 70%, rgba(255,255,255,0.20) 100%)',
              border: '3px solid rgba(255,255,255,0.75)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.35), inset 0 0 40px rgba(255,255,255,0.22)'
            }}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: lidOpen ? CD_LID_OPEN_ANGLE : 0 }}
            transition={{ type: 'spring', stiffness: 70, damping: 15, delay: lidOpen ? 0.35 : 0 }}
          >
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(118deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.12) 28%, rgba(255,255,255,0) 42%)' }} />
              <div className="absolute inset-[7%] rounded-full" style={{ border: '1px solid rgba(255,255,255,0.35)' }} />
            </div>
            {/* Asa para levantar la tapa */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-1.6%] w-[16%] h-[3.2%] rounded-b-lg" style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }} />
          </motion.div>
        </div>
      </motion.div>

      {/* 4. MODAL AJUSTES DEL CD (z-50) Componente hermano al cuerpo para evitar el Stacking Context */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: '110%' }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-1/2 -translate-y-1/2 w-[100%] aspect-[1/1.08] pointer-events-none z-50"
      >
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="absolute bottom-[0.2%] right-[-1px] w-64 bg-[#fcfcfc] p-4 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-[3px] border-white pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm text-zinc-800">{t('player.cdDesign', L('Diseño del CD', 'CD Design'))}</h3>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-black p-1 rounded-full hover:bg-zinc-100"><X size={16} /></button>
              </div>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 cursor-pointer">
                  <span className="text-xs font-semibold text-zinc-600">{t('player.cdTexture', L('TEXTURA DEL CD', 'CD TEXTURE'))}</span>
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
                      <span className="text-xs font-medium text-zinc-600">{t('player.cdHideHub', L('Ocultar aro central', 'Hide center ring'))}</span>
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

// CD que asoma del álbum y que se arrastra hacia el reproductor (lee la personalización guardada)
const PeekDiscVisuals = ({ album, isDragging = false }: { album: any; isDragging?: boolean }) => {
  const savedTexture = localStorage.getItem(`vinyl_texture_${album.name}`);
  const customTextureOpacity = Number(localStorage.getItem(`vinyl_opacity_${album.name}`) || 100);
  const customScale = Number(localStorage.getItem(`vinyl_scale_${album.name}`) || 100);
  const customOffsetX = Number(localStorage.getItem(`vinyl_offset_x_${album.name}`) || 0);
  const customOffsetY = Number(localStorage.getItem(`vinyl_offset_y_${album.name}`) || 0);
  const hideCenterLabel = localStorage.getItem(`vinyl_hide_label_${album.name}`) === 'true';
  const hideGrooves = localStorage.getItem(`vinyl_hide_grooves_${album.name}`) === 'true';

  return (
    <div className="absolute inset-0 rounded-full overflow-hidden" style={{ backgroundColor: '#1a1a1d' }}>
      <CdFace
        album={album} texture={savedTexture} textureOpacity={customTextureOpacity} scale={customScale}
        offsetX={customOffsetX} offsetY={customOffsetY} hideHub={hideCenterLabel} hideRings={hideGrooves}
        showText={!isDragging} idPrefix={isDragging ? 'cddrag' : 'cdpeek'}
      />
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
  const { playSound, pauseOrResumeSound, playNext, playPrevious, currentSong, subscribeToProgress, isPlaying: globalIsPlaying, volume, setVolume, artists } = useAudio();
  const { t } = useTranslation();

  const [activeIndex, setActiveIndex] = useState(Math.floor(albums.length / 2));
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isPaperOpen, setIsPaperOpen] = useState(false);
  const [isTriptychOpen, setIsTriptychOpen] = useState(false);
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

  // El tocadiscos entra cuando termina el giro de la funda
  const [playerReady, setPlayerReady] = useState(false);

  // NUEVO: etapa de la animación de apertura/cierre del álbum
  // 0 = reposo | 1 = sale del hueco y las demás se hacen a un lado | 2 = abierto (de frente)
  // 3 = vuelve a girar a su hueco | 4 = las demás regresan
  const [expandStage, setExpandStage] = useState(0);
  // NUEVO: caja bajo el mouse (sale hacia el frente sin moverse en X)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // NUEVO: referencia a la canción actual para decidir (sin re-disparar el efecto) si se abre el tríptico
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  // Tamaño de la ventana, para saber cuántas cajas caben realmente en pantalla
  const [view, setView] = useState({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1600,
    vh: typeof window !== 'undefined' ? window.innerHeight : 900
  });

  useEffect(() => {
    const update = () => setView({ vw: window.innerWidth, vh: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // NUEVO: secuencia de apertura.
  // 1) la caja sobresale en su hueco y las demás se abren a los lados
  // 2) gira (78° -> 0°) hasta quedar de frente a la pantalla
  // 3) entra el tocadiscos; el tríptico solo se abre solo si el álbum NO está ya en reproducción
  useEffect(() => {
    if (expandedIndex === null) {
      setExpandStage(0);
      setPlayerReady(false);
      setIsTriptychOpen(false);
      return;
    }
    setHoveredIndex(null);
    setExpandStage(1);
    const t1 = setTimeout(() => setExpandStage(2), 450);
    const t2 = setTimeout(() => {
      setPlayerReady(true);
      const cs = currentSongRef.current;
      const alreadyPlaying = !!cs && albums[expandedIndex]?.songs.some((s: any) => s.path === cs.path);
      if (!alreadyPlaying) setIsTriptychOpen(true);
    }, 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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

  // Pantalla fija, sin barras de desplazamiento (bloquea el scroll de la página y de cualquier contenedor padre con scroll)
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

  // NUEVO: secuencia de cierre.
  // se guarda el tocadiscos -> la caja gira de vuelta a su hueco (las demás siguen apartadas)
  // -> las demás regresan -> la caja se mete de nuevo al estante
  const handleCloseAlbum = () => {
    setShowLyrics(false);
    setIsTriptychOpen(false);
    const run = () => {
      setPlayerReady(false);
      setTimeout(() => setExpandStage(3), 500);
      setTimeout(() => setExpandStage(4), 1500);
      setTimeout(() => setExpandedIndex(null), 2150);
    };
    if (isPaperOpen) {
      setIsPaperOpen(false);
      setTimeout(run, 900);
    } else {
      run();
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

  // Cuántas cajas a cada lado caben en pantalla (más 1 de margen para que entren suavemente).
  // Todo lo que queda fuera de ese rango no se dibuja.
  const shelfItemSize = getItemSize(view.vw, view.vh);
  const shelfStepPx = shelfItemSize * (SHELF_STEP_PCT / 100);
  const visibleRange = Math.min(
    MAX_RENDER_RANGE,
    Math.ceil(((view.vw / 2 + shelfItemSize * 0.16 + BOX_DEPTH) / shelfStepPx) * 1.35) + 1
  );

  // NUEVO: lado hacia el que se hizo el último scroll (1 = adelante/derecha, -1 = atrás/izquierda)
  const prevActiveRef = useRef(activeIndex);
  const scrollDirRef = useRef(1);
  if (activeIndex !== prevActiveRef.current) {
    scrollDirRef.current = activeIndex > prevActiveRef.current ? 1 : -1;
    prevActiveRef.current = activeIndex;
  }
  const scrollDir = scrollDirRef.current;

  // NUEVO: el disco que se arrastra tiene el tamaño real del tocadiscos en pantalla
  const turntableW = turntableRef.current?.getBoundingClientRect().width;
  const dragDiscSize = (turntableW || Math.max(450, Math.min(1200, Math.min(view.vh * 0.75, view.vw * 0.40)))) * (CD_DISC / 100);

  return (
    <>
      <div
        className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-visible"
        onWheel={(e) => { if (expandedIndex === null) e.deltaY > 0 ? setActiveIndex(p => Math.min(albums.length - 1, p + 1)) : setActiveIndex(p => Math.max(0, p - 1)) }}
        ref={containerRef}
        style={{ perspective: '1500px' }}
      >
        {/* Superficie de cristal donde "flotan" las portadas */}
        <div
          className={`absolute left-0 right-0 pointer-events-none transition-opacity duration-500 ${expandedIndex === null ? 'opacity-100' : 'opacity-0'}`}
          style={{ top: 'calc(50% + clamp(410px, min(76vh, 47vw), 1170px) * 0.395 + 4px)' }}
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

        <div className={`relative w-full h-full flex items-center justify-center `} style={{ transformStyle: 'preserve-3d', visibility: isScrubbing ? 'hidden' : 'visible' }}>
          {albums.map((album: any, index: number) => {
            // Solo se dibujan las cajas que caben en pantalla
            if (Math.abs(activeIndex - index) > visibleRange) return null;

            const isActive = index === activeIndex;
            const isExpanded = index === expandedIndex;

            // El reproductor y sus pestañas aparecen solo cuando terminó el giro
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
            const absOffset = Math.abs(offset);

            // NUEVO: posición de cada caja.
            // Todas giran el mismo ángulo (SHELF_ANGLE), alineadas en la misma línea, con el lomo a la vista.
            // - Hover: la caja sale hacia el frente (eje Z), en su mismo hueco, sin moverse en X.
            // - Abrir/cerrar: la elegida sobresale en su hueco, las demás se apartan a los lados (xPx) y no se encima nada.
            let xPct = shelfX(offset);
            let xPx = 0;
            let translateZ = isActive ? ACTIVE_POP : shelfZ(offset, scrollDir);
            let rotateY = isActive ? ACTIVE_ANGLE : SHELF_ANGLE;
            let scale = 1;
            let zIndex = isActive ? 300 : (100 - index);
            let translateY = '-50%'; // Todos apoyados en la misma línea de suelo/estante

            if (expandedIndex !== null) {
              if (isExpanded) {
                zIndex = 400;
                if (expandStage === 2) {
                  // Abierto: de frente a la pantalla, a la izquierda
                  xPct = -55 * EXPANDED_SCALE; translateY = '-46.5%'; translateZ = 200; rotateY = 0; scale = EXPANDED_SCALE;
                } else {
                  // Etapas 0, 1, 3 y 4: sobresale hacia ti pero en su propio hueco
                  xPct = 0; translateZ = PULL_Z; rotateY = ACTIVE_ANGLE;
                }
              } else {
                // Las demás se hacen a un lado (izquierda/derecha) y regresan en la etapa 4
                const rel = index - expandedIndex;
                xPct = shelfX(rel);
                xPx = expandStage === 4 ? 0 : (rel < 0 ? -1 : 1) * view.vw;
                translateZ = shelfZ(rel, scrollDir);
              }
            } else if (hoveredIndex === index) {
              // Hover: sale hacia el frente, sin moverse en X ni encimarse
              translateZ += HOVER_Z;
              zIndex = 350;
            }

            return (
              <motion.div
                key={album.name}
                className="absolute top-1/2 left-1/2 cursor-pointer group"
                initial={false}
                onHoverStart={() => { if (expandedIndex === null) setHoveredIndex(index); }}
                onHoverEnd={() => setHoveredIndex(p => (p === index ? null : p))}
                // Siempre la misma estructura calc(-50% + X% + Ypx) para que Framer Motion interpole sin saltos
                animate={{ x: `calc(-50% + ${xPct}% + ${xPx}px)`, y: translateY, z: translateZ, scale: scale, rotateY: rotateY }}
                transition={
                  isScrubbing ? { duration: 0 } :
                    isExpanded
                      ? {
                        type: 'spring', stiffness: 170, damping: 26, mass: 1.2,
                        rotateY: { type: 'tween', duration: 0.9, ease: [0.45, 0, 0.15, 1] }
                      }
                      : { type: 'spring', stiffness: 200, damping: 30, mass: 1.1 }
                }
                style={{ zIndex, width: `${shelfItemSize}px`, height: `${shelfItemSize}px`, transformStyle: 'preserve-3d', pointerEvents: (expandedIndex !== null && !isExpanded) ? 'none' : 'auto' }}
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
                >
                  <AnimatePresence>
                    {showPlayer && (
                      <CdPlayer
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
                        data-triptych-tab
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 0.5 } }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={(e) => { e.stopPropagation(); setIsTriptychOpen(true); }}
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

                  {/* Un solo disco de vinilo, continuo: asoma en el carrusel, se queda entre las dos caras de la funda mientras gira
                      (la cara trasera lo tapa) y se desliza un poco más cuando entra el reproductor */}
                  <AnimatePresence>
                    {isActive && (expandedIndex === null || (isExpanded && !isDiscOnPlatter && !isDraggingDisc)) && (
                      <motion.div
                        className={`absolute top-1/2 right-0 w-[78%] aspect-square z-[10] ${showPlayer ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        style={{ y: '-50%', pointerEvents: showPlayer ? 'auto' : 'none' }}
                        initial={{ x: '0%', opacity: 0 }}
                        animate={{ x: showPlayer ? '42%' : '30%', opacity: 1 }}
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
                        <div className="relative w-full h-full" style={{ filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.6))', WebkitMaskImage: CD_HOLE_MASK, maskImage: CD_HOLE_MASK }}>
                          <div className="absolute inset-0 rounded-full overflow-hidden">
                            <PeekDiscVisuals album={album} />
                          </div>
                          <CdSheen />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Solo la portada hace zoom frontal al abrir la hoja (el reproductor no cambia de tamaño) */}
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
                    {/* CARA TRASERA (BACK COVER) - ROTADA 180° CON LA MITAD DEL GROSOR DE PROFUNDIDAD.
                        NUEVO: ahora es la misma portada, difuminada y espejada (como la cara inversa de una funda), en vez de verse oscura.
                        La imagen solo se carga en el álbum abierto y en las cajas cuya parte trasera queda a la vista (offset >= -1). */}
                    <div
                      className="absolute inset-0 rounded-lg z-20 overflow-hidden pointer-events-none bg-[#2a2a30]"
                      style={{ transform: `rotateY(180deg) translateZ(${BOX_HALF}px)`, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      {(isExpanded || offset >= -1) && (
                        <div className="absolute inset-0" style={{ transform: 'scaleX(-1)', filter: 'blur(10px) saturate(1.15) brightness(1.05)' }}>
                          <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={false} className="w-full h-full object-cover scale-110" />
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-lg bg-white/5 border border-white/20" />
                    </div>

                    {/* CARA FRONTAL (PORTADA) - CON LA MITAD DEL GROSOR DE PROFUNDIDAD */}
                    <div
                      data-expanded-cover={isExpanded ? 'true' : undefined}
                      className="absolute inset-0 overflow-hidden rounded-lg z-20 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.9)]"
                      style={{ transform: `translateZ(${BOX_HALF}px)`, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      <CoverImage coverUrl={album.cover} audioPath={album.songs[0]?.path} hq={isActive} className="w-full h-full object-cover" />

                      {/* Pliegue interno realista en el borde del lomo */}
                      <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-gradient-to-r from-black/60 via-black/25 to-transparent pointer-events-none z-30" />

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

                    {/* LOMO IZQUIERDO 3D (SPINE) CON COLOR DEL ÁLBUM Y TÍTULO VERTICAL - EXACTO A LA FOTO DE REFERENCIA */}
                    <div
                      className="absolute top-0 bottom-0 left-0 border-r border-white/25 flex flex-col items-center justify-between py-6 px-0.5 overflow-hidden pointer-events-none z-20"
                      style={{
                        width: `${BOX_DEPTH}px`,
                        transform: 'translateX(-50%) rotateY(-90deg)',
                        transformOrigin: 'center center',
                        backfaceVisibility: 'hidden',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
                      }}
                    >
                      {/* Fondo de color extraído del álbum con desenfoque para efecto idéntico a la foto de referencia */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <CoverImage
                          coverUrl={album.cover}
                          audioPath={album.songs[0]?.path}
                          hq={false}
                          className="w-full h-full object-cover scale-[5] blur-md saturate-200 brightness-95"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/40 pointer-events-none" />
                        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                      </div>

                      {/* Título en tipografía vertical con sombra para máxima legibilidad */}
                      <div
                        className="relative z-10 text-[11px] font-black text-white uppercase tracking-[0.22em] whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none px-1"
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)'
                        }}
                      >
                        {album.name}
                      </div>

                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <div
                          className="text-[9px] font-extrabold text-white/90 uppercase tracking-widest whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none px-1"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)'
                          }}
                        >
                          {album.artist}
                        </div>
                        <Disc3 size={12} className="text-white/80 my-1 drop-shadow" />
                      </div>
                    </div>

                    {/* BORDE DERECHO (APERTURA DE LA FUNDA DE VINILO) */}
                    <div
                      className="absolute top-0 bottom-0 right-0 bg-[#090a0c] border-l border-white/10 flex items-center justify-center overflow-hidden pointer-events-none z-20"
                      style={{
                        width: `${BOX_DEPTH}px`,
                        transform: 'translateX(50%) rotateY(90deg)',
                        transformOrigin: 'center center',
                        backfaceVisibility: 'hidden'
                      }}
                    >
                      <div className="w-[3px] h-[80%] bg-black/90 rounded-full shadow-inner" />
                    </div>

                    {/* BORDE SUPERIOR */}
                    <div
                      className="absolute top-0 left-0 right-0 bg-[#141518] border-b border-black/40 pointer-events-none z-20"
                      style={{
                        height: `${BOX_DEPTH}px`,
                        transform: 'translateY(-50%) rotateX(90deg)',
                        transformOrigin: 'center center',
                        backfaceVisibility: 'hidden'
                      }}
                    />

                    {/* BORDE INFERIOR */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-[#0b0c0e] border-t border-black/60 pointer-events-none z-20"
                      style={{
                        height: `${BOX_DEPTH}px`,
                        transform: 'translateY(50%) rotateX(-90deg)',
                        transformOrigin: 'center center',
                        backfaceVisibility: 'hidden'
                      }}
                    />

                    {/* REFLEJO DE CRISTAL (FLOOR GLASS REFLECTION) - solo en las cajas cercanas a la activa */}
                    {expandedIndex === null && absOffset <= 6 && (
                      <div
                        className="absolute left-0 right-0 pointer-events-none rounded-lg overflow-hidden"
                        style={{
                          top: `calc(100% + ${BOX_HALF}px)`, height: '100%',
                          transform: `translateZ(${BOX_HALF}px) scaleY(-1)`,
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
                          scrubTimeoutRef.current = setTimeout(() => setIsScrubbing(false), SCRUB_REVEAL_MS);
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
                            scrubTimeoutRef.current = setTimeout(() => setIsScrubbing(false), SCRUB_REVEAL_MS);
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
              left: discDragPos.x - dragDiscSize / 2,
              top: discDragPos.y - dragDiscSize / 2,
              width: dragDiscSize,
              height: dragDiscSize,
            }}
            initial={false}
            animate={{
              scale: 1
            }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0 }}
          >
            <div className="relative w-full h-full opacity-90" style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.7))', WebkitMaskImage: CD_HOLE_MASK, maskImage: CD_HOLE_MASK }}>
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <PeekDiscVisuals album={albums[expandedIndex]} isDragging={true} />
              </div>
              <CdSheen />
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
              <p className="text-base text-white font-black truncate leading-tight mb-0.5">
                {currentSong?.title || currentSong?.filename?.replace(/\.[^/.]+$/, '')}
              </p>
              <div className="text-xs text-white/70 font-medium truncate">
                {currentSong?.artist || playingAlbum.artist}
              </div>
            </div>
            {/* BOTÓN PARA PAUSAR DESDE EL MINI REPRODUCTOR */}
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

      {/* Tríptico Desplegable (Canciones, Álbum, Artista) con Scroll Horizontal */}
      {expandedIndex !== null && albums[expandedIndex] && (
        <AlbumTriptych
          isOpen={isTriptychOpen}
          onClose={() => setIsTriptychOpen(false)}
          song={
            albums[expandedIndex].songs?.[0] ||
            currentSong || {
              id: 'temp',
              title: albums[expandedIndex].name,
              artist: albums[expandedIndex].artist,
              path: '',
              filename: '',
              folder: '',
              duration: 0
            }
          }
          album={albums[expandedIndex]}
          artist={albums[expandedIndex]?.artist ? artists[albums[expandedIndex].artist] : undefined}
          onPlaySong={(track) => {
            if (!isDiscOnPlatter) setIsDiscOnPlatter(true);
            playSound(track, `album_${albums[expandedIndex].name}`, albums[expandedIndex].songs);
          }}
          currentSongId={currentSong?.id}
          isPlaying={globalIsPlaying}
        />
      )}
    </>
  );
}