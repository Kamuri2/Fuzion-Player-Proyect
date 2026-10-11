import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArtistParser } from '../utils/ArtistParser';

interface ArtistLinksProps {
  artist?: string | null;
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
  onArtistClick?: (artistName: string) => void;
  title?: string;
}

export const ArtistLinks: React.FC<ArtistLinksProps> = ({
  artist,
  className = '',
  linkClassName = 'hover:underline hover:text-white cursor-pointer transition-colors',
  separatorClassName = '',
  onArtistClick,
  title
}) => {
  const navigate = useNavigate();

  const segments = useMemo(() => {
    return ArtistParser.parseWithSeparators(artist);
  }, [artist]);

  if (!artist || segments.length === 0) {
    return <span className={className}>{artist || 'Desconocido'}</span>;
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
    <span className={className} title={title}>
      {segments.map((seg, index) => {
        if (seg.type === 'artist' && seg.name) {
          return (
            <span
              key={index}
              onClick={(e) => handleClick(e, seg.name!)}
              className={linkClassName}
            >
              {seg.raw}
            </span>
          );
        }
        return (
          <span key={index} className={separatorClassName}>
            {seg.raw}
          </span>
        );
      })}
    </span>
  );
};

export default ArtistLinks;
