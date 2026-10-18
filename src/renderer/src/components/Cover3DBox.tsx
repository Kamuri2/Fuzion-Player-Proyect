import React from 'react';
import { motion } from 'framer-motion';
import { Disc3, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CoverImage from './CoverImage';
import { Song } from '../types';

interface Cover3DBoxProps {
  song: Song;
  isCenter: boolean;
  offset: number;
  reduceAnimations: boolean;
  isIdle: boolean;
  isLargeScreen: boolean;
  onClick: () => void;
  onOpenTriptych?: () => void;
  thickness?: number;
}

export const Cover3DBox: React.FC<Cover3DBoxProps> = ({
  song,
  isCenter,
  offset,
  reduceAnimations,
  isIdle,
  isLargeScreen,
  onClick,
  onOpenTriptych,
  thickness = 22
}) => {
  const { t } = useTranslation();
  const halfThickness = thickness / 2;
  const absOffset = Math.abs(offset);
  const zIndex = 20 - absOffset;

  // Parámetros de posición espacial
  const scale = isCenter ? (isIdle && !isLargeScreen ? 1.15 : 1.05) : Math.max(0.7, 1 - absOffset * 0.14);
  const translateX = offset * 42; // Separación horizontal
  const translateZ = isCenter ? 40 : -absOffset * 60; // Profundidad de repisa
  const rotateY = isCenter ? 0 : offset < 0 ? 52 : -52; // Inclinación de estante
  const opacity = isCenter ? 1 : Math.max(0.35, 1 - absOffset * 0.28);

  const title = song.title || song.filename.replace(/\.[^/.]+$/, '');
  const albumOrArtist = song.album || song.artist || '';

  return (
    <motion.div
      key={song.id}
      className={`absolute max-h-full h-[80%] md:h-[92%] ${
        isLargeScreen ? 'max-h-[1200px]' : 'max-h-[900px]'
      } aspect-square cursor-pointer select-none group`}
      style={{
        zIndex,
        transformStyle: 'preserve-3d'
      }}
      initial={{
        opacity: reduceAnimations ? opacity : 0,
        x: `${translateX + (offset > 0 ? 15 : offset < 0 ? -15 : 0)}%`,
        scale: reduceAnimations ? scale : scale * 0.88,
        rotateY: reduceAnimations ? rotateY : rotateY * 1.3
      }}
      animate={{
        opacity,
        x: `${translateX}%`,
        z: translateZ,
        scale,
        rotateY,
        zIndex
      }}
      exit={{
        opacity: 0,
        scale: scale * 0.85,
        transition: { duration: 0.3 }
      }}
      transition={{
        duration: reduceAnimations ? 0 : 0.65,
        ease: [0.32, 0.72, 0, 1]
      }}
      onClick={onClick}
    >
      {/* =========================================
          CONTENEDOR DEL ESTUCHE 3D (PRESERVE-3D)
         ========================================= */}
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d'
        }}
      >
        {/* 1. CARA FRONTAL (PORTADA) */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden bg-[#16161a] border border-white/15 shadow-2xl"
          style={{
            transform: `translateZ(${halfThickness}px)`,
            backfaceVisibility: 'hidden'
          }}
        >
          <CoverImage
            coverUrl={song.cover}
            audioPath={song.path}
            hq={true}
            className="w-full h-full object-cover"
            iconSize={isCenter ? 64 : 32}
          />

          {/* Acabado vinilo / reflejo brillante superior (Gloss sheen) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 35%, transparent 60%, rgba(0,0,0,0.35) 100%)'
            }}
          />

          {/* Pliegue interno del lomo (Crease effect en borde izquierdo) */}
          <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none" />

          {/* Overlay sombreado para los covers no centrales */}
          {!isCenter && (
            <div className="absolute inset-0 bg-black/45 group-hover:bg-black/25 transition-colors duration-300" />
          )}

          {/* Botón flotante interactivo para abrir Tríptico en el cover central */}
          {isCenter && onOpenTriptych && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTriptych();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/75 hover:bg-black/90 text-white text-xs font-bold tracking-wide backdrop-blur-md border border-white/20 shadow-xl transform hover:scale-105 active:scale-95 transition-all"
                title={t('player.openTriptych', 'Desplegar Tríptico')}
              >
                <Layers size={14} className="text-white/80" />
                <span>{t('player.openTriptych', 'Desplegar Tríptico')}</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. LOMO IZQUIERDO (SPINE) - IDÉNTICO A LA FOTO DE REFERENCIA */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-[#0e0e11] border-r border-white/20 flex flex-col items-center justify-between py-6 px-0.5 overflow-hidden shadow-inner"
          style={{
            width: `${thickness}px`,
            transform: `translateX(-50%) rotateY(-90deg)`,
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden',
            backgroundColor: '#111215',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.9)'
          }}
        >
          {/* Título en tipografía vertical */}
          <div
            className="text-[11px] font-black text-white/90 uppercase tracking-widest whitespace-nowrap drop-shadow-sm select-none"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)'
            }}
          >
            {title}
          </div>

          {/* Subtítulo / Artista / Logo en el lomo */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="text-[9px] font-bold text-white/45 uppercase tracking-wider whitespace-nowrap select-none"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)'
              }}
            >
              {albumOrArtist}
            </div>
            <Disc3 size={11} className="text-white/30 my-1" />
          </div>
        </div>

        {/* 3. BORDE DERECHO (APERTURA DEL DISCO / VINYL SLEEVE EDGE) */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-[#090a0c] border-l border-white/10 flex items-center justify-center overflow-hidden"
          style={{
            width: `${thickness}px`,
            transform: `translateX(50%) rotateY(90deg)`,
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden'
          }}
        >
          {/* Hendidura del vinilo dentro de la funda */}
          <div className="w-[3px] h-[80%] bg-black/90 rounded-full shadow-inner" />
        </div>

        {/* 4. BORDE SUPERIOR (TOP RIM) */}
        <div
          className="absolute top-0 left-0 right-0 bg-[#141518] border-b border-black/40"
          style={{
            height: `${thickness}px`,
            transform: `translateY(-50%) rotateX(90deg)`,
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden'
          }}
        />

        {/* 5. BORDE INFERIOR (BOTTOM RIM) */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-[#0b0c0e] border-t border-black/60"
          style={{
            height: `${thickness}px`,
            transform: `translateY(50%) rotateX(-90deg)`,
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden'
          }}
        />

        {/* 6. CARA TRASERA (BACK COVER) */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden bg-[#121316] border border-white/10 flex flex-col items-center justify-center p-6 text-center select-none"
          style={{
            transform: `rotateY(180deg) translateZ(${halfThickness}px)`,
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-3 border border-white/10">
            <Disc3 size={32} className="text-white/40 animate-spin-slow" />
          </div>
          <span className="text-xs font-bold text-white/80 truncate max-w-full px-2 mb-1">{title}</span>
          <span className="text-[10px] text-white/40 truncate max-w-full px-2">{albumOrArtist}</span>
        </div>
      </div>

      {/* =========================================
          SOMBRA DE CONTACTO CON EL PISO / REPISA
         ========================================= */}
      <div
        className="absolute -bottom-7 left-4 right-4 h-7 bg-black/65 blur-lg rounded-full pointer-events-none transition-all duration-500"
        style={{
          transform: `scale(${isCenter ? 1.1 : 0.85})`,
          opacity: isCenter ? 0.7 : 0.4
        }}
      />
    </motion.div>
  );
};

export default Cover3DBox;
