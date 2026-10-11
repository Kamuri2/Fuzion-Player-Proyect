import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArtistParser } from '../utils/ArtistParser';

interface SongTitleLinksProps {
  title?: string | null;
  fallbackFilename?: string | null;
  className?: string;
  artistLinkClassName?: string;
  onArtistClick?: (artistName: string) => void;
  titleAttr?: string;
}

export const SongTitleLinks: React.FC<SongTitleLinksProps> = ({
  title,
  fallbackFilename,
  className = '',
  artistLinkClassName = 'hover:underline cursor-pointer transition-colors text-inherit',
  onArtistClick,
  titleAttr
}) => {
  const navigate = useNavigate();

  const displayTitle = useMemo(() => {
    return title || (fallbackFilename ? fallbackFilename.replace(/\.[^/.]+$/, '') : '');
  }, [title, fallbackFilename]);

  const segments = useMemo(() => {
    if (!displayTitle) return [];
    return ArtistParser.parseTitleSegments(displayTitle);
  }, [displayTitle]);

  if (!displayTitle) {
    return null;
  }

  // Si no hay artistas para enlazar, devolvemos el texto plano directamente
  const hasArtistLinks = segments.some(s => s.type === 'artist');
  if (!hasArtistLinks) {
    return <span className={className} title={titleAttr}>{displayTitle}</span>;
  }

  const handleClick = (e: React.MouseEvent, artistName: string) => {
    e.stopPropagation();
    if (onArtistClick) {
      onArtistClick(artistName);
    } else {
      navigate(`/detail/artist/${encodeURIComponent(artistName)}`);
    }
  };

  return (
    <span className={className} title={titleAttr}>
      {segments.map((seg, idx) => {
        if (seg.type === 'artist' && seg.artistName) {
          return (
            <span
              key={idx}
              onClick={(e) => handleClick(e, seg.artistName!)}
              className={artistLinkClassName}
            >
              {seg.text}
            </span>
          );
        }
        return <span key={idx}>{seg.text}</span>;
      })}
    </span>
  );
};

export default SongTitleLinks;
