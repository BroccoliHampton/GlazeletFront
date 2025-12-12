import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types ---

type AnimationMode = 'plasma' | 'tunnel' | 'fractal' | 'grid';

// --- Constants ---

const PINK = '#ff1493'; // Deep Pink

// --- Animation Renderers ---

const renderPlasma = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
  const t = time * 0.002;
  
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  
  const h1 = (Math.sin(t) * 360 + 360) % 360;
  const h2 = (Math.cos(t * 0.7) * 360 + 360) % 360;
  
  gradient.addColorStop(0, `hsl(${h1}, 80%, 50%)`);
  gradient.addColorStop(1, `hsl(${h2}, 80%, 50%)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 5; i++) {
    const x = width / 2 + Math.sin(t * (i + 1) * 0.5) * (width / 3);
    const y = height / 2 + Math.cos(t * (i + 1) * 0.3) * (height / 3);
    const r = (Math.sin(t + i) + 2) * 50;
    
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${(h1 + i * 60) % 360}, 100%, 60%)`;
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
};

const renderTunnel = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  
  const cx = width / 2;
  const cy = height / 2;
  const t = time * 0.002;
  const layers = 15;
  
  ctx.lineWidth = 3;
  
  for (let i = 0; i < layers; i++) {
    const depth = (i + (t * 2)) % layers;
    const size = Math.pow(depth / layers, 3) * width * 1.5;
    
    if (size < 1) continue;
    
    const hue = (t * 50 + i * 30) % 360;
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.beginPath();
    
    const angle = t + i * 0.2;
    for (let j = 0; j < 4; j++) {
        const theta = angle + (j * Math.PI * 2) / 4;
        const px = cx + Math.cos(theta) * size;
        const py = cy + Math.sin(theta) * size;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
};

const renderFractal = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.fillStyle = '#1a051a';
    ctx.fillRect(0, 0, width, height);
    
    const cx = width / 2;
    const cy = height / 2 + height * 0.1;
    const t = time * 0.001;
    
    const drawTriangle = (x: number, y: number, s: number, depth: number) => {
        if (depth === 0) return;
        
        const h = s * (Math.sqrt(3)/2);
        
        ctx.strokeStyle = `hsl(${(t * 100 + depth * 40) % 360}, 100%, 60%)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        const p1y = y - h * 2/3;
        const p2x = x - s/2;
        const p2y = y + h/3;
        const p3x = x + s/2;
        const p3y = y + h/3;
        
        ctx.moveTo(x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();
        ctx.stroke();
        
        const nextS = s / 2;
        drawTriangle(x, y - h/3, nextS, depth - 1);
        drawTriangle(x - s/4, y + h/6, nextS, depth - 1);
        drawTriangle(x + s/4, y + h/6, nextS, depth - 1);
    };
    
    drawTriangle(cx, cy, width * 0.8, 5);
};

const renderGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const t = time * 0.003;
    const cols = 20;
    const rows = 10;
    const cellW = width / cols;
    const cellH = height / rows;
    
    for(let y = 0; y <= rows; y++) {
        for(let x = 0; x <= cols; x++) {
            const xOff = Math.sin(t + y * 0.5) * 20;
            const yOff = Math.cos(t + x * 0.5) * 20;
            
            const px = x * cellW + xOff;
            const py = y * cellH + yOff;
            
            ctx.fillStyle = `hsl(${(x*10 + y*20 + t*100)%360}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI*2);
            ctx.fill();
            
            if (x < cols) {
               ctx.strokeStyle = `hsl(${(x*10 + y*20 + t*100)%360}, 50%, 30%)`;
               ctx.beginPath();
               ctx.moveTo(px, py);
               const nextXOff = Math.sin(t + y * 0.5) * 20;
               const nextYOff = Math.cos(t + (x+1) * 0.5) * 20;
               ctx.lineTo((x+1)*cellW + nextXOff, y * cellH + nextYOff);
               ctx.stroke();
            }
        }
    }
};

// --- Component ---

export const PsychedelicFace: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentMode, setCurrentMode] = useState<AnimationMode>('fractal');
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const modes: AnimationMode[] = ['plasma', 'tunnel', 'fractal', 'grid'];
    let index = 0;
    const interval = setInterval(() => {
        index = (index + 1) % modes.length;
        setCurrentMode(modes[index]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    timeRef.current += 16.6;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    switch (currentMode) {
        case 'plasma': renderPlasma(ctx, w, h, timeRef.current); break;
        case 'tunnel': renderTunnel(ctx, w, h, timeRef.current); break;
        case 'fractal': renderFractal(ctx, w, h, timeRef.current); break;
        case 'grid': renderGrid(ctx, w, h, timeRef.current); break;
    }

    frameRef.current = requestAnimationFrame(animate);
  }, [currentMode]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    const blinkLoop = () => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        setTimeout(blinkLoop, Math.random() * 3000 + 2000);
    };
    const t = setTimeout(blinkLoop, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-[200px] h-[200px]">
        {/* Layer 1: The Psychedelic Background (Mouth internals) */}
        <div className="absolute top-[88px] left-[30px] w-[140px] h-[72px] overflow-hidden rounded-b-full opacity-90">
             <canvas 
                ref={canvasRef} 
                width={140} 
                height={72}
                className="w-full h-full"
             />
        </div>

        {/* Layer 2: The Neon Face SVG Overlay */}
        <svg 
            viewBox="0 0 500 500" 
            className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
        >
            <defs>
                {/* Glow Filter */}
                <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur3" />
                    <feMerge>
                        <feMergeNode in="blur3" />
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Face Masking */}
            <path 
                d="M0,0 H500 V500 H0 Z 
                   M 75,220 
                   Q 250,220 425,220 
                   Q 425,400 250,400 
                   Q 75,400 75,220 Z" 
                fill="black" 
                fillRule="evenodd"
            />

            {/* Eyes Group */}
            <g filter="url(#neon-glow)" stroke={PINK} strokeWidth="6" fill="none" strokeLinecap="round">
                {/* Left Eye */}
                <circle cx="150" cy="150" r="40" />
                {/* Right Eye */}
                <circle cx="350" cy="150" r="40" />

                {/* Eyebrows */}
                <path d="M 100,100 Q 150,60 200,100" />
                <path d="M 300,100 Q 350,60 400,100" />
                
                {/* Eye "Sound waves" details */}
                <path d="M 80,120 Q 70,150 80,180" strokeWidth="4" className="opacity-80" />
                <path d="M 420,120 Q 430,150 420,180" strokeWidth="4" className="opacity-80" />

                {/* Pupils (Filled) */}
                <circle cx="160" cy="140" r="10" fill={PINK} className={isBlinking ? 'opacity-0' : 'opacity-100'} />
                <circle cx="340" cy="140" r="10" fill={PINK} className={isBlinking ? 'opacity-0' : 'opacity-100'} />
            </g>

            {/* Mouth Outline */}
            <path 
                d="M 75,220 
                   Q 250,220 425,220 
                   Q 425,400 250,400 
                   Q 75,400 75,220 Z" 
                fill="none" 
                stroke={PINK} 
                strokeWidth="8"
                filter="url(#neon-glow)"
            />

            {/* Zig Zag Teeth */}
            <path
                d="M 80,250 
                   L 110,320 L 140,250 L 170,320 L 200,250 
                   L 230,350 L 260,250 
                   L 290,320 L 320,250 L 350,320 L 380,250 L 410,320"
                fill="none"
                stroke={PINK}
                strokeWidth="6"
                strokeLinejoin="round"
                filter="url(#neon-glow)"
                className="animate-pulse"
            >
                <animate 
                    attributeName="d" 
                    values="
                        M 80,250 L 110,320 L 140,250 L 170,320 L 200,250 L 230,350 L 260,250 L 290,320 L 320,250 L 350,320 L 380,250 L 410,320;
                        M 80,260 L 110,330 L 140,260 L 170,330 L 200,260 L 230,360 L 260,260 L 290,330 L 320,260 L 350,330 L 380,260 L 410,330;
                        M 80,250 L 110,320 L 140,250 L 170,320 L 200,250 L 230,350 L 260,250 L 290,320 L 320,250 L 350,320 L 380,250 L 410,320" 
                    dur="0.2s" 
                    repeatCount="indefinite"
                />
            </path>
            
            {/* Chin details */}
            <path 
                d="M 230,420 Q 250,440 270,420" 
                fill="none" 
                stroke={PINK} 
                strokeWidth="6" 
                strokeLinecap="round"
                filter="url(#neon-glow)"
            />

            {/* Eyelids for blinking animation */}
            <rect 
                x="100" y="100" width="100" height="100" fill="black" 
                className={`transition-all duration-75 ${isBlinking ? 'h-[100px]' : 'h-0'}`} 
            />
             <rect 
                x="300" y="100" width="100" height="100" fill="black" 
                className={`transition-all duration-75 ${isBlinking ? 'h-[100px]' : 'h-0'}`} 
            />
        </svg>
    </div>
  );
};
