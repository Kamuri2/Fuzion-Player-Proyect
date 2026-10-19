import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Settings, ImagePlus, Trash2, RotateCcw, ExternalLink } from 'lucide-react';
import CoverImage from './CoverImage';
import type { Song, Album, Artist } from '../types';

// ---------------------------------------------------------------------------
// Tríptico de papel cuadrado: hoja 1 = info del álbum, hoja 2 = tracks, hoja 3 = info del artista.
// Secuencia: sale de detrás de la portada (borde derecho) -> viaja al centro de la pantalla -> se despliega.
// Se puede personalizar (papel, fondos, stickers PNG) y se guarda por álbum en localStorage.
// ---------------------------------------------------------------------------

type Rect = { left: number; right: number; top: number; bottom: number; width: number; height: number };
interface Sticker { id: string; src: string; x: number; y: number; w: number; rot: number }
interface PanelCfg { bg: string | null; bgOpacity: number; bgFit: 'cover' | 'contain' }
interface Custom { paper: string; ink: 'dark' | 'light'; accent: string; panels: PanelCfg[]; stickers: Sticker[][] }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  album?: Album;
  artist?: Artist;
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
  isPlaying?: boolean;
  setIsPlayerOpen?: (isOpen: boolean) => void;
  // Opcional: rectángulo de la portada. Si no se pasa, se busca el elemento [data-expanded-cover]
  originRect?: Rect | null;
}

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const PAPERS = [
  { id: 'cream', name: 'Crema', color: '#f7f2e6', ink: 'dark' as const },
  { id: 'white', name: 'Blanco', color: '#fbfbf9', ink: 'dark' as const },
  { id: 'kraft', name: 'Kraft', color: '#cfb78d', ink: 'dark' as const },
  { id: 'midnight', name: 'Noche', color: '#1d2335', ink: 'light' as const },
  { id: 'black', name: 'Negro', color: '#16161a', ink: 'light' as const }
];

const defaultCustom = (): Custom => ({
  paper: '#f7f2e6',
  ink: 'dark',
  accent: '#b4402a',
  panels: [0, 1, 2].map(() => ({ bg: null, bgOpacity: 100, bgFit: 'cover' as const })),
  stickers: [[], [], []]
});

const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

const fileToDataUrl = (file: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = rej;
  r.readAsDataURL(file);
});
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = rej;
  i.src = src;
});
// Reduce la imagen para que quepa en localStorage. Con alpha=true conserva la transparencia (PNG).
async function prepareImage(file: File, max: number, alpha: boolean): Promise<string> {
  const src = await fileToDataUrl(file);
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return src;
  const img = await loadImg(src);
  const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * r));
  c.height = Math.max(1, Math.round(img.height * r));
  c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
  return alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.82);
}

export function AlbumTriptych({ isOpen, onClose, song, album: albumProp, artist, onPlaySong, currentSongId, isPlaying = false, setIsPlayerOpen, originRect }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  // Si no llega el álbum, se arma uno con los datos de la canción
  const album: any = albumProp || { name: song.album || song.title, artist: song.artist, cover: song.cover, year: song.year, songs: [song] };

  // 0 = desmontado | 1 = detrás de la portada | 2 = asomado a la derecha | 3 = centrado y plegado | 4 = desplegado
  const [stage, setStage] = useState(0);
  const stageRef = useRef(0);
  stageRef.current = stage;
  const [clipOn, setClipOn] = useState(true);
  const [origin, setOrigin] = useState<Rect | null>(null);
  const timers = useRef<number[]>([]);
  const liftRef = useRef<Animation | null>(null);

  // La pestaña "INFO & TRACKS" se levanta al abrir y baja al cerrar (usa data-triptych-tab; sin ese atributo simplemente no se anima)
  const liftTab = (up: boolean) => {
    if (up) {
      const tab = document.querySelector('[data-triptych-tab]') as HTMLElement | null;
      if (!tab || !tab.animate) return;
      liftRef.current?.cancel();
      liftRef.current = tab.animate(
        [
          { rotate: '0deg', transformOrigin: '0% 100%' },
          { rotate: '-12deg', transformOrigin: '0% 100%' }
        ],
        { duration: 340, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
      );
    } else {
      const a = liftRef.current;
      if (!a) return;
      a.onfinish = () => { a.cancel(); };
      a.reverse();
    }
  };

  const [view, setView] = useState({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1600,
    vh: typeof window !== 'undefined' ? window.innerHeight : 900
  });
  useEffect(() => {
    const update = () => setView({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // --- Secuencia de apertura / cierre ---
  useEffect(() => {
    const clear = () => { timers.current.forEach((id) => clearTimeout(id)); timers.current = []; };
    clear();
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    const CLIMB: Record<number, number> = { 1: 60, 2: 700, 3: 600 };
    const CLOSE: Record<number, number> = { 4: 1350, 3: 700, 2: 650 };

    if (isOpen) {
      const climb = () => {
        const s = stageRef.current;
        if (s >= 4) return;
        const next = s === 0 ? 1 : s + 1;
        setClipOn(next <= 2);
        setStage(next);
        stageRef.current = next;
        if (next < 4) at(CLIMB[next], climb);
      };
      // Origen = portada actual en pantalla; primero se levanta la pestaña y luego sale el tríptico
      const el = document.querySelector('[data-expanded-cover]') as HTMLElement | null;
      if (originRect) {
        setOrigin(originRect);
      } else if (el) {
        const r = el.getBoundingClientRect();
        setOrigin({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
      } else {
        setOrigin(null);
      }
      liftTab(true);
      at(stageRef.current === 0 ? 380 : 0, climb);
    } else {
      if (stageRef.current === 0) liftTab(false);
      const down = () => {
        const s = stageRef.current;
        if (s <= 0) return;
        if (s === 2) setClipOn(true);
        const next = s - 1;
        setStage(next);
        stageRef.current = next;
        if (next === 0) liftTab(false);
        if (next > 0) at(CLOSE[s], down);
      };
      down();
    }
    return clear;
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && stageRef.current === 4) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // --- Biografía del artista (misma caché que usa la hoja de liner notes) ---
  const artistName: string = (album?.artist || '').trim();
  const [bio, setBio] = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  const warm = stage >= 3;
  useEffect(() => {
    if (!warm || !artistName) return;
    const cacheKey = `artist_bio_cache_${artistName.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached && cached !== 'null') { setBio(cached); return; }
    let cancelled = false;
    (async () => {
      setBioLoading(true);
      try {
        const adbRes = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(artistName)}`);
        const adb = await adbRes.json();
        if (adb.artists && adb.artists.length > 0) {
          const exact = adb.artists.find((a: any) => a.strArtist?.toLowerCase() === artistName.toLowerCase());
          const o = exact || adb.artists[0];
          const b = o.strBiographyES || o.strBiography;
          if (b) {
            if (!cancelled) { setBio(b); localStorage.setItem(cacheKey, b); }
            return;
          }
        }
        const hosts = Array.from(new Set([(i18n.language || 'en').slice(0, 2), 'en']));
        const names = [artistName, `${artistName} (band)`, `${artistName} (singer)`, `${artistName} (musician)`, `${artistName} (rapper)`, `${artistName} (cantante)`, `${artistName} (banda)`];
        for (const host of hosts) {
          for (const name of names) {
            const r = await fetch(`https://${host}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`);
            if (!r.ok) continue;
            const d = await r.json();
            const text = `${d.description || ''} ${(d.extract || '').slice(0, 240)}`;
            if (d.type !== 'standard' || !d.extract || !/band|banda|singer|cantante|musician|músic|rapper|rapero|composer|compositor|producer|productor|group|grupo|duo|dúo|songwriter|\bDJ\b|artist|artista/i.test(text)) continue;
            if (!cancelled) { setBio(d.extract); localStorage.setItem(cacheKey, d.extract); }
            return;
          }
        }
      } catch (e) {
        // sin conexión: se muestra el mensaje de "sin información"
      } finally {
        if (!cancelled) setBioLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [warm, artistName, i18n.language]);

  // --- Personalización (por álbum, en localStorage) ---
  const storeKey = `triptych_custom_${album?.name}`;
  const [custom, setCustom] = useState<Custom>(defaultCustom);
  const [saveErr, setSaveErr] = useState(false);
  const loadedKey = useRef<string | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [selPanel, setSelPanel] = useState(0);
  const [selSticker, setSelSticker] = useState<string | null>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const dragRef = useRef<{ panel: number; id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const base = defaultCustom();
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const p = JSON.parse(raw);
        setCustom({
          ...base, ...p,
          panels: Array.isArray(p.panels) && p.panels.length === 3 ? p.panels : base.panels,
          stickers: Array.isArray(p.stickers) && p.stickers.length === 3 ? p.stickers : base.stickers
        });
      } else {
        setCustom(base);
      }
    } catch (e) {
      setCustom(base);
    }
    setSelSticker(null);
    loadedKey.current = storeKey;
  }, [storeKey]);

  useEffect(() => {
    if (loadedKey.current !== storeKey) return;
    const id = setTimeout(() => {
      try { localStorage.setItem(storeKey, JSON.stringify(custom)); setSaveErr(false); }
      catch (e) { setSaveErr(true); }
    }, 300);
    return () => clearTimeout(id);
  }, [custom, storeKey]);

  const patchPanel = (i: number, patch: Partial<PanelCfg>) =>
    setCustom((c) => ({ ...c, panels: c.panels.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
  const patchSticker = (i: number, id: string, patch: Partial<Sticker>) =>
    setCustom((c) => ({ ...c, stickers: c.stickers.map((list, idx) => (idx === i ? list.map((s) => (s.id === id ? { ...s, ...patch } : s)) : list)) }));
  const removeSticker = (i: number, id: string) => {
    setCustom((c) => ({ ...c, stickers: c.stickers.map((list, idx) => (idx === i ? list.filter((s) => s.id !== id) : list)) }));
    setSelSticker(null);
  };

  const onBgFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { patchPanel(selPanel, { bg: await prepareImage(f, 1000, f.type !== 'image/jpeg') }); } catch (err) { /* imagen inválida */ }
  };
  const onStickerFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const src = await prepareImage(f, 520, true);
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setCustom((c) => ({ ...c, stickers: c.stickers.map((list, idx) => (idx === selPanel ? [...list, { id, src, x: 50, y: 50, w: 34, rot: 0 }] : list)) }));
      setSelSticker(id);
    } catch (err) { /* imagen inválida */ }
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const el = panelRefs.current[d.panel];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nx = Math.max(0, Math.min(100, d.ox + ((e.clientX - d.sx) / r.width) * 100));
      const ny = Math.max(0, Math.min(100, d.oy + ((e.clientY - d.sy) / r.height) * 100));
      patchSticker(d.panel, d.id, { x: nx, y: ny });
    };
    const up = () => { dragRef.current = null; setDragging(false); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging]);

  // Al cerrar el tríptico se sale del modo personalización
  useEffect(() => { if (!isOpen) setShowCustomize(false); }, [isOpen]);

  if (stage === 0) return null;

  // --- Medidas ---
  const S = Math.round(Math.max(260, Math.min(view.vh * 0.62, view.vw * 0.295, 560)));
  const k = S / 460;
  const fs = (n: number) => `${(n * k).toFixed(1)}px`;
  const open = stage >= 4;
  const edit = showCustomize && open;

  const cover: Rect = origin || {
    left: view.vw * 0.05, right: view.vw * 0.48, top: view.vh * 0.15, bottom: view.vh * 0.8,
    width: view.vw * 0.43, height: view.vh * 0.65
  };
  const coverCx = (cover.left + cover.right) / 2;
  const coverCy = (cover.top + cover.bottom) / 2;
  const shiftY = edit ? -Math.round(view.vh * 0.11) : 0;
  const pos =
    stage === 1 ? { x: coverCx - view.vw / 2, y: coverCy - view.vh / 2 }
      : stage === 2 ? { x: cover.right + S / 2 - view.vw / 2, y: coverCy - view.vh / 2 }
        : { x: 0, y: shiftY };

  const inkColor = custom.ink === 'dark' ? '#1a160e' : '#f1ede4';
  const textureColor = custom.ink === 'dark' ? 'rgba(110,90,60,0.10)' : 'rgba(255,255,255,0.05)';
  const photo = artist?.cover || album.artistImage || null;
  const initials = artistName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const songs: any[] = album.songs || [];
  const totalSecs = songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);

  const faceShadow = '0 18px 40px rgba(0,0,0,0.45)';
  const paperTexture = (
    <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${textureColor} 1px, transparent 1.2px)`, backgroundSize: '4px 4px' }} />
  );

  const header = (left: string, right: string) => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs(9.5), fontWeight: 800, letterSpacing: '0.26em', textTransform: 'uppercase', color: custom.accent, fontFamily: SANS }}>
        <span>{left}</span><span style={{ opacity: 0.8 }}>{right}</span>
      </div>
      <div style={{ height: 2, background: inkColor, marginTop: 8 * k }} />
      <div style={{ height: 3, borderTop: `1px solid ${inkColor}99`, borderBottom: `1px solid ${inkColor}99`, marginTop: 3 }} />
    </>
  );

  const renderStickers = (idx: number) => (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {custom.stickers[idx].map((st) => (
        <img
          key={st.id}
          src={st.src}
          draggable={false}
          onPointerDown={(e) => {
            if (!edit) return;
            e.stopPropagation();
            e.preventDefault();
            setSelSticker(st.id);
            setSelPanel(idx);
            dragRef.current = { panel: idx, id: st.id, sx: e.clientX, sy: e.clientY, ox: st.x, oy: st.y };
            setDragging(true);
          }}
          style={{
            position: 'absolute', left: `${st.x}%`, top: `${st.y}%`, width: `${st.w}%`,
            transform: `translate(-50%, -50%) rotate(${st.rot}deg)`,
            pointerEvents: edit ? 'auto' : 'none', cursor: edit ? 'grab' : 'default',
            userSelect: 'none', touchAction: 'none',
            outline: edit && selSticker === st.id ? `2px dashed ${custom.accent}` : 'none', outlineOffset: 2
          }}
        />
      ))}
    </div>
  );

  // Cara de una hoja (no es un componente para no remontar el contenido en cada render)
  const renderFace = (idx: number, hinge: 'left' | 'right' | 'both', content: ReactNode) => {
    const pc = custom.panels[idx];
    const crease = (side: 'left' | 'right') => (
      <div style={{
        position: 'absolute', top: 0, bottom: 0, [side]: 0, width: '9%', pointerEvents: 'none',
        background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, rgba(0,0,0,0.26), rgba(0,0,0,0.07) 45%, transparent)`
      }} />
    );
    return (
      <div
        ref={(el) => { panelRefs.current[idx] = el; }}
        style={{
          position: 'absolute', inset: 0, overflow: 'hidden', background: custom.paper, color: inkColor,
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 3 * k, boxShadow: faceShadow,
          pointerEvents: stage >= 3 ? 'auto' : 'none', fontFamily: SERIF
        }}
      >
        {paperTexture}
        {pc.bg && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${pc.bg})`, backgroundSize: pc.bgFit, backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: pc.bgOpacity / 100 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, padding: 26 * k, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{content}</div>
        {(hinge === 'left' || hinge === 'both') && crease('left')}
        {(hinge === 'right' || hinge === 'both') && crease('right')}
        {renderStickers(idx)}
      </div>
    );
  };

  // ---------- Hoja 1: info del álbum ----------
  const infoRows: [string, string][] = [
    [t('detail.release', 'Lanzamiento'), String(song.year || album.year || '—')],
    [t('player.genre', 'Género'), String(song.genre || '—')],
    [t('detail.songs', 'Canciones'), String(songs.length)],
    [t('detail.totalDuration', 'Duración total'), totalSecs ? fmtTime(totalSecs) : '—']
  ];
  const panel1 = (
    <>
      {header(t('detail.album', 'Álbum'), 'Liner notes')}
      <div style={{ display: 'flex', gap: 14 * k, marginTop: 14 * k }}>
        <div style={{ width: 132 * k, height: 132 * k, flexShrink: 0, overflow: 'hidden', background: '#222', boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }}>
          <CoverImage coverUrl={album.cover} audioPath={songs[0]?.path} hq={false} className="w-full h-full object-cover" />
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: fs(25), fontWeight: 900, lineHeight: 1.05, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{album.name}</div>
          <div style={{ fontSize: fs(15), fontStyle: 'italic', fontWeight: 600, marginTop: 4 * k, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.artist}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 * k, marginTop: 20 * k }}>
        {infoRows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 * k }}>
            <span style={{ fontFamily: SANS, fontSize: fs(10), fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.75 }}>{label}</span>
            <span style={{ flex: 1, borderBottom: `1px dotted ${inkColor}99`, transform: `translateY(${-3 * k}px)` }} />
            <span style={{ fontSize: fs(15), fontWeight: 800 }}>{value}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: fs(9), fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.7 }}>
        <span>{album.artist}</span>
        <span>℗ {album.year || ''}</span>
      </div>
    </>
  );

  // ---------- Hoja 2: tracks ----------
  const panel2 = (
    <>
      {header(t('detail.tracklist', 'Tracklist'), `${songs.length} ${t('detail.tracks', 'tracks')}`)}
      <div className="customized-scrollbar-light" style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 10 * k, paddingRight: 6 * k }}>
        {songs.map((s: any, i: number) => {
          const cur = !!currentSongId && s.id === currentSongId;
          return (
            <div
              key={s.path || s.id || i}
              onClick={(e) => { e.stopPropagation(); onPlaySong(s); }}
              style={{ display: 'flex', alignItems: 'baseline', gap: 8 * k, padding: `${6 * k}px ${6 * k}px`, cursor: 'pointer', borderRadius: 2, background: cur ? `${inkColor}1f` : 'transparent' }}
            >
              <span style={{ width: 22 * k, textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: fs(10.5), fontWeight: 700, opacity: 0.7 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ minWidth: 0, flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: fs(14), fontWeight: cur ? 900 : 600 }}>{s.title || s.filename}</span>
              <span style={{ flex: 1, minWidth: 8, borderBottom: `1px dotted ${inkColor}66`, transform: `translateY(${-3 * k}px)` }} />
              {cur && isPlaying && (
                <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 11 * k, alignSelf: 'center' }}>
                  <i className="animate-pulse" style={{ width: 3, height: '100%', background: inkColor }} />
                  <i className="animate-pulse" style={{ width: 3, height: '66%', background: inkColor, animationDelay: '0.2s' }} />
                  <i className="animate-pulse" style={{ width: 3, height: '45%', background: inkColor, animationDelay: '0.4s' }} />
                </span>
              )}
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: fs(10.5), fontWeight: 700, opacity: 0.8 }}>{s.duration > 0 ? fmtTime(s.duration) : '--:--'}</span>
            </div>
          );
        })}
      </div>
    </>
  );

  const handleArtistClick = () => {
    const name = song.artist || album.artist;
    if (!name) return;
    if (setIsPlayerOpen) setIsPlayerOpen(false);
    onClose();
    navigate(`/detail/artist/${encodeURIComponent(name)}`);
  };

  // ---------- Hoja 3: artista ----------
  const panel3 = (
    <>
      {header(t('artist.about', 'Sobre el artista'), 'Artist')}
      <div style={{ display: 'flex', gap: 14 * k, marginTop: 14 * k, alignItems: 'flex-end' }}>
        <div style={{ width: 104 * k, height: 104 * k, flexShrink: 0, overflow: 'hidden', background: '#d4d4d8', display: 'grid', placeItems: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }}>
          {photo
            ? <CoverImage coverUrl={photo} hq={false} className="w-full h-full object-cover" />
            : <span style={{ fontSize: fs(34), fontWeight: 900, color: '#71717a', fontFamily: SANS }}>{initials || '?'}</span>}
        </div>
        <div style={{ minWidth: 0, fontSize: fs(23), fontWeight: 900, lineHeight: 1.05, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{artistName}</div>
      </div>
      <div className="customized-scrollbar-light" style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 14 * k, paddingRight: 6 * k, fontSize: fs(12.5), lineHeight: 1.55 }}>
        {bio
          ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{bio}</p>
          : <p style={{ fontStyle: 'italic', opacity: 0.75, margin: 0 }}>{bioLoading ? t('artist.loading', 'Buscando información…') : t('artist.noInfo', 'No se encontró información para este artista.')}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 * k, marginTop: 12 * k }}>
        <span style={{ fontFamily: SANS, fontSize: fs(9), fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75 }}>
          {artist?.songs?.length || 1} {t('player.artistSongsCount', 'canciones en tu biblioteca')}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleArtistClick(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 5 * k, padding: `${6 * k}px ${12 * k}px`, borderRadius: 999, background: custom.accent, color: '#fff', fontFamily: SANS, fontSize: fs(10), fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}
        >
          <ExternalLink size={12 * k} />
          {t('player.viewArtistProfile', 'Ver perfil')}
        </button>
      </div>
    </>
  );

  // ---------- Portada exterior del tríptico (reverso de la hoja 1, visible mientras está plegado) ----------
  const outerCover = (
    <div
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden', background: custom.paper, color: inkColor, borderRadius: 3 * k,
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: faceShadow,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 * k, padding: 30 * k, fontFamily: SERIF
      }}
    >
      {paperTexture}
      <div style={{ position: 'relative', width: '62%', aspectRatio: '1', overflow: 'hidden', background: '#222', boxShadow: '0 10px 26px rgba(0,0,0,0.4)' }}>
        <CoverImage coverUrl={album.cover} audioPath={songs[0]?.path} hq={false} className="w-full h-full object-cover" />
      </div>
      <div style={{ position: 'relative', fontSize: fs(22), fontWeight: 900, lineHeight: 1.05, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{album.name}</div>
      <div style={{ position: 'relative', fontSize: fs(13), fontStyle: 'italic', opacity: 0.85 }}>{album.artist}</div>
      <div style={{ position: 'relative', fontFamily: SANS, fontSize: fs(8.5), fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: custom.accent }}>Info · Tracks · Artista</div>
    </div>
  );

  const paperBack = (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: custom.paper, borderRadius: 3 * k, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: faceShadow }}>
      {paperTexture}
    </div>
  );

  // Hoja 3 se abre después de la 1; al cerrar se pliega primero la 3
  const t1 = { duration: 0.8, ease: EASE, delay: open ? 0 : 0.5 };
  const t3 = { duration: 0.8, ease: EASE, delay: open ? 0.5 : 0 };
  const moveDuration = stage === 1 ? 0.65 : stage === 2 ? 0.7 : 0.6;

  const lbl = 'text-xs font-semibold text-zinc-600 mb-1';
  const btnBase = 'px-2.5 py-1 rounded text-xs font-semibold border transition-colors';
  const pc = custom.panels[selPanel];
  const selSt = custom.stickers[selPanel].find((s) => s.id === selSticker) || null;
  const panelNames = ['1 · Álbum', '2 · Tracks', '3 · Artista'];

  return (
    <>
      {/* Telón oscuro: aparece cuando el tríptico llega al centro; clic fuera para cerrar */}
      <motion.div
        className="fixed inset-0 z-[110] bg-black/70"
        initial={false}
        animate={{ opacity: stage >= 3 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{ pointerEvents: stage >= 3 ? 'auto' : 'none' }}
        onClick={(e) => { e.stopPropagation(); if (open) onClose(); }}
      />

      {/* Escenario. Mientras sale de detrás de la portada se recorta todo lo que quede a la izquierda del borde derecho de la portada */}
      <div
        className="fixed inset-0 z-[120] pointer-events-none"
        style={{ clipPath: clipOn ? `inset(0px 0px 0px ${Math.round(cover.right)}px)` : 'none' }}
      >
        <motion.div
          className="absolute left-1/2 top-1/2"
          style={{ width: S, height: S, marginLeft: -S / 2, marginTop: -S / 2, perspective: 2600 }}
          initial={false}
          animate={{ x: pos.x, y: pos.y }}
          transition={{ duration: moveDuration, ease: [0.3, 0.7, 0.2, 1] }}
        >
          {/* Hoja central (2): fija. Las otras dos giran sobre sus pliegues */}
          <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
            {renderFace(1, 'both', panel2)}

            {/* Hoja 3 (derecha) */}
            <motion.div
              style={{ position: 'absolute', top: 0, left: '100%', width: S, height: S, transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
              initial={false}
              animate={{ rotateY: open ? 0 : -180, z: open ? 0 : 3 }}
              transition={t3}
            >
              {renderFace(2, 'left', panel3)}
              {paperBack}
            </motion.div>

            {/* Hoja 1 (izquierda): al plegarse queda por delante y muestra la portada exterior */}
            <motion.div
              style={{ position: 'absolute', top: 0, right: '100%', width: S, height: S, transformOrigin: 'right center', transformStyle: 'preserve-3d' }}
              initial={false}
              animate={{ rotateY: open ? 0 : 180, z: open ? 0 : 6 }}
              transition={t1}
            >
              {renderFace(0, 'right', panel1)}
              {outerCover}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Botones (solo con el tríptico desplegado) */}
      {open && (
        <div className="fixed top-5 right-5 z-[140] flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowCustomize((v) => !v); }}
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors ${showCustomize ? 'bg-white text-zinc-900 border-white' : 'bg-black/60 text-white border-white/20 hover:bg-black/80'}`}
            title="Personalizar tríptico"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-colors"
            title="Cerrar tríptico"
          >
            <X size={22} />
          </button>
        </div>
      )}

      {/* Panel de personalización */}
      {edit && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] w-[min(820px,94vw)] max-h-[34vh] overflow-y-auto bg-[#fcfcfc] text-zinc-800 rounded-2xl border-[3px] border-white shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-4 customized-scrollbar-light"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Personalizar tríptico</h3>
            <div className="flex items-center gap-2">
              {saveErr && <span className="text-[11px] text-red-600 font-medium">Almacenamiento lleno: usa imágenes más pequeñas</span>}
              <button
                onClick={() => { setCustom(defaultCustom()); setSelSticker(null); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
              >
                <RotateCcw size={12} /> Restablecer
              </button>
              <button onClick={() => setShowCustomize(false)} className="p-1 rounded-full text-zinc-500 hover:text-black hover:bg-zinc-100"><X size={16} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Papel */}
            <div className="flex flex-col gap-3">
              <div>
                <p className={lbl}>PAPEL</p>
                <div className="flex flex-wrap items-center gap-2">
                  {PAPERS.map((p) => (
                    <button
                      key={p.id}
                      title={p.name}
                      onClick={() => setCustom((c) => ({ ...c, paper: p.color, ink: p.ink }))}
                      className="w-7 h-7 rounded-full border-2"
                      style={{ background: p.color, borderColor: custom.paper === p.color ? '#2563eb' : '#d4d4d8' }}
                    />
                  ))}
                  <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 cursor-pointer">
                    Otro
                    <input type="color" value={custom.paper} onChange={(e) => setCustom((c) => ({ ...c, paper: e.target.value }))} className="w-7 h-7 p-0 border-0 bg-transparent cursor-pointer" />
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className={lbl}>TINTA</p>
                  <div className="flex gap-1">
                    {(['dark', 'light'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setCustom((c) => ({ ...c, ink: v }))}
                        className={`${btnBase} ${custom.ink === v ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-100'}`}
                      >
                        {v === 'dark' ? 'Oscura' : 'Clara'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex flex-col">
                  <span className={lbl}>ACENTO</span>
                  <input type="color" value={custom.accent} onChange={(e) => setCustom((c) => ({ ...c, accent: e.target.value }))} className="w-9 h-7 p-0 border-0 bg-transparent cursor-pointer" />
                </label>
              </div>
            </div>

            {/* Hoja seleccionada */}
            <div className="flex flex-col gap-3">
              <div>
                <p className={lbl}>HOJA</p>
                <div className="flex gap-1">
                  {panelNames.map((n, i) => (
                    <button
                      key={n}
                      onClick={() => { setSelPanel(i); setSelSticker(null); }}
                      className={`${btnBase} flex-1 ${selPanel === i ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-100'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={lbl}>IMAGEN DE FONDO</p>
                <div className="flex items-center gap-2">
                  <label className={`${btnBase} flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700 cursor-pointer`}>
                    <ImagePlus size={13} /> Subir imagen
                    <input type="file" accept="image/*" className="hidden" onChange={onBgFile} />
                  </label>
                  {pc.bg && (
                    <>
                      <button onClick={() => patchPanel(selPanel, { bgFit: pc.bgFit === 'cover' ? 'contain' : 'cover' })} className={`${btnBase} bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-100`}>
                        {pc.bgFit === 'cover' ? 'Llenar' : 'Ajustar'}
                      </button>
                      <button onClick={() => patchPanel(selPanel, { bg: null })} className={`${btnBase} bg-white border-zinc-300 text-red-600 hover:bg-red-50`}>Quitar</button>
                    </>
                  )}
                </div>
                {pc.bg && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-zinc-500"><span>Opacidad</span><span className="font-mono">{pc.bgOpacity}%</span></div>
                    <input type="range" min={5} max={100} value={pc.bgOpacity} onChange={(e) => patchPanel(selPanel, { bgOpacity: Number(e.target.value) })} className="w-full accent-zinc-800" />
                  </div>
                )}
              </div>

              <div>
                <p className={lbl}>STICKERS (PNG, WEBP, GIF…)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`${btnBase} flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700 cursor-pointer`}>
                    <ImagePlus size={13} /> Añadir
                    <input type="file" accept="image/*" className="hidden" onChange={onStickerFile} />
                  </label>
                  {custom.stickers[selPanel].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelSticker(s.id)}
                      className="w-9 h-9 rounded border-2 bg-zinc-200 overflow-hidden flex items-center justify-center"
                      style={{ borderColor: selSticker === s.id ? '#2563eb' : '#d4d4d8' }}
                    >
                      <img src={s.src} className="max-w-full max-h-full object-contain" draggable={false} />
                    </button>
                  ))}
                </div>
                {custom.stickers[selPanel].length > 0 && !selSt && (
                  <p className="text-[11px] text-zinc-500 mt-1.5">Arrastra los stickers sobre la hoja o selecciónalos para ajustarlos.</p>
                )}
                {selSt && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500"><span>Tamaño</span><span className="font-mono">{Math.round(selSt.w)}%</span></div>
                      <input type="range" min={6} max={100} value={selSt.w} onChange={(e) => patchSticker(selPanel, selSt.id, { w: Number(e.target.value) })} className="w-full accent-zinc-800" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500"><span>Giro</span><span className="font-mono">{Math.round(selSt.rot)}°</span></div>
                      <input type="range" min={-180} max={180} value={selSt.rot} onChange={(e) => patchSticker(selPanel, selSt.id, { rot: Number(e.target.value) })} className="w-full accent-zinc-800" />
                    </div>
                    <button onClick={() => removeSticker(selPanel, selSt.id)} className={`${btnBase} self-start flex items-center gap-1.5 bg-white border-zinc-300 text-red-600 hover:bg-red-50`}>
                      <Trash2 size={12} /> Eliminar sticker
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AlbumTriptych;