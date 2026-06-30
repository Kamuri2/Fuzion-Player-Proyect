import { useState, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';

function MascotItem({ mascot }: { mascot: { id: string, url: string } }) {
  const { isPlayerOpen } = useAudio();
  const dragControls = useDragControls();

  const [position, setPosition] = useState({ 
    x: window.innerWidth - 150 - Math.random() * 100, 
    y: window.innerHeight - 150 - Math.random() * 100 
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedPos = localStorage.getItem(`@mascot_pos_${mascot.id}`);
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        setPosition(parsed);
      } catch (e) { }
    }
    setIsLoaded(true);
  }, [mascot.id]);

  const handleDragEnd = (_event: any, info: any) => {
    const newPos = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y
    };
    setPosition(newPos);
    localStorage.setItem(`@mascot_pos_${mascot.id}`, JSON.stringify(newPos));
  };

  if (!isLoaded || isPlayerOpen) return null;

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={position}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        cursor: 'grab',
      }}
      whileDrag={{ cursor: 'grabbing', scale: 1.1 }}
      whileHover={{ scale: 1.05 }}
    >
      <img 
        src={mascot.url} 
        alt={`Mascota ${mascot.id}`} 
        className="w-32 h-32 object-contain pointer-events-none drop-shadow-2xl"
      />
    </motion.div>
  );
}

export default function Mascot() {
  const { mascots } = useTheme();

  if (!mascots || mascots.length === 0) return null;

  return (
    <>
      {mascots.map(m => (
        <MascotItem key={m.id} mascot={m} />
      ))}
    </>
  );
}
