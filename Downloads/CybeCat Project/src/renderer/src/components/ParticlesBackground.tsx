/* eslint-disable */
// @ts-ignore
import React, { useEffect, useRef, JSX } from 'react';
import type { ParticleType } from '../context/ThemeContext';

export default function ParticlesBackground({ type }: { type: ParticleType }): JSX.Element { // eslint-disable-line no-undef
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; radius: number; vx: number; vy: number; alpha: number }[] = [];

    const resize = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const initParticles = (): void => {
      particles = [];
      const count = type === 'snow' ? 120 : type === 'stars' ? 180 : 40;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: type === 'stars' ? Math.random() * 1.5 : type === 'bubbles' ? Math.random() * 4 + 2 : Math.random() * 2 + 1,
          vx: type === 'snow' ? (Math.random() - 0.5) * 1.5 : type === 'bubbles' ? (Math.random() - 0.5) * 0.5 : 0,
          vy: type === 'snow' ? Math.random() * 1.5 + 0.5 : type === 'bubbles' ? -Math.random() * 1 - 0.5 : 0,
          alpha: Math.random() * 0.5 + 0.1
        });
      }
    };
    initParticles();

    const render = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        ctx.fillStyle = `rgba(255, 255, 255, ${type === 'stars' ? Math.abs(Math.sin(Date.now() * 0.001 * p.radius + p.x)) : p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (type === 'bubbles') {
          ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.stroke();
        } else {
          ctx.fill();
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.y > canvas.height + 10) p.y = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.x < -10) p.x = canvas.width + 10;
      });

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [type]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
