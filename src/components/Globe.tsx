import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
// @ts-ignore
import * as topojson from 'topojson-client';
import { Territory, GlobeDot, GameEffect, ViewMode } from '../types';
import { RISK_REGIONS, COLORS } from '../constants';

interface GlobeProps {
    territories: Record<string, Territory>;
    zoom: number;
    viewMode: ViewMode;
    effects: GameEffect[];
    setEffects: React.Dispatch<React.SetStateAction<GameEffect[]>>;
    onSelect: (regionId: string | null) => void;
    onHover: (regionId: string | null) => void;
    onInfectComplete: (regionId: string) => void;
    selectedRegionId: string | null;
    transparentBackground?: boolean;
}

export const Globe: React.FC<GlobeProps> = (props) => {
    const propsRef = useRef(props);
    propsRef.current = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const processedEffectIds = useRef<Set<string>>(new Set());
    
    const stateRef = useRef({
        rotateLambda: -Math.PI / 2, 
        rotatePhi: 0,
        targetLambda: null as number | null,
        targetPhi: null as number | null,
        panX: 0,
        panY: 0,
        shakeX: 0,
        shakeY: 0,
        isDragging: false,
        isInteracting: false,
        lastMouseX: 0,
        lastMouseY: 0,
        dragStartX: 0,
        dragStartY: 0,
        wasDrag: false,
        dots: [] as GlobeDot[],
        visibleDots: [] as { sx: number, sy: number, regionId: string }[],
        radius: 120, 
        width: 0,
        height: 0,
        mapLoaded: false,
        error: false,
        autoRotate: true
    });

    const calculateDots = (worldData: any) => {
        try {
            const w = 360; 
            const h = 180;
            const buffer = document.createElement('canvas');
            buffer.width = w;
            buffer.height = h;
            const bctx = buffer.getContext('2d');
            if (!bctx) return [];

            const projection = d3.geoEquirectangular().fitSize([w, h], worldData);
            const pathGenerator = d3.geoPath(projection, bctx);

            bctx.fillStyle = '#000'; 
            bctx.fillRect(0, 0, w, h);
            bctx.fillStyle = 'white'; 
            bctx.beginPath(); 
            pathGenerator(worldData); 
            bctx.fill();

            const imgData = bctx.getImageData(0, 0, w, h).data;
            const newDots: GlobeDot[] = [];
            const dotSpacing = 1.5; 

            const centers = RISK_REGIONS.map(r => ({ ...r })); 

            for(let y=0; y<h; y+=dotSpacing) {
                for(let x=0; x<w; x+=dotSpacing) {
                    const i = (Math.floor(y)*w + Math.floor(x))*4;
                    if(imgData[i] > 100) {
                        const lambda = (x / w) * 360 - 180;
                        const phi = 90 - (y / h) * 180;

                        let closest: any = null;
                        let minDist = Infinity;
                        
                        centers.forEach(c => {
                            const d = (lambda - c.lon)**2 + (phi - c.lat)**2;
                            if(d < minDist) { minDist = d; closest = c; }
                        });

                        if(closest && props.territories[closest.id]) {
                            const regionData = props.territories[closest.id];
                            const rLam = lambda * (Math.PI/180);
                            const rPhi = phi * (Math.PI/180);

                            const cx = Math.cos(rPhi) * Math.sin(rLam);
                            const cy = -Math.sin(rPhi);
                            const cz = Math.cos(rPhi) * Math.cos(rLam);

                            const sprinkleColor = COLORS.SPRINKLE_PALETTE[Math.floor(Math.random() * COLORS.SPRINKLE_PALETTE.length)];

                            newDots.push({
                                x: cx, y: cy, z: cz,
                                regionId: closest.id,
                                baseColor: regionData.baseColor,
                                sprinkleColor: sprinkleColor
                            });
                        }
                    }
                }
            }
            return newDots;
        } catch (e) {
            console.error("Error calculating dots:", e);
            return [];
        }
    };

    useEffect(() => {
        const loadMap = async () => {
            try {
                const response = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
                if (!response.ok) throw new Error("Network response was not ok");
                
                const worldData = await response.json();
                const featureCollection = topojson.feature(worldData, worldData.objects.countries);
                // @ts-ignore
                featureCollection.features = featureCollection.features.filter(f => f.id !== "010");
                
                stateRef.current.dots = calculateDots(featureCollection);
                stateRef.current.mapLoaded = true;
            } catch (err) {
                console.error("Map Load Error", err);
                stateRef.current.error = true;
            }
        };
        loadMap();
    }, []); 

    useEffect(() => {
        stateRef.current.targetLambda = null;
        stateRef.current.targetPhi = null;
        if (!stateRef.current.isDragging) {
            stateRef.current.autoRotate = true;
        }
    }, [props.selectedRegionId]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width !== stateRef.current.width || height !== stateRef.current.height) {
                    canvas.width = width;
                    canvas.height = height;
                    stateRef.current.width = width;
                    stateRef.current.height = height;
                }
            }
        });
        resizeObserver.observe(container);

        const ctx = canvas.getContext('2d', { alpha: true }); 
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const now = Date.now();
            const { territories, zoom, viewMode, effects, onInfectComplete, selectedRegionId, transparentBackground } = propsRef.current;
            const state = stateRef.current;

            const w = state.width;
            const h = state.height;
            
            const cx = (w / 2) + state.panX + state.shakeX;
            const cy = (h / 2) + state.panY + state.shakeY;
            
            state.shakeX *= 0.8;
            state.shakeY *= 0.8;
            if (Math.abs(state.shakeX) < 0.5) state.shakeX = 0;
            if (Math.abs(state.shakeY) < 0.5) state.shakeY = 0;

            const currentRadius = state.radius * zoom;

            if (state.isDragging) {
                 state.targetLambda = null;
                 state.targetPhi = null;
                 state.autoRotate = false; 
            } else {
                if (state.targetLambda !== null && state.targetPhi !== null) {
                    let diffL = state.targetLambda - state.rotateLambda;
                    while (diffL < -Math.PI) diffL += Math.PI * 2;
                    while (diffL > Math.PI) diffL -= Math.PI * 2;
                    state.rotateLambda += diffL * 0.08;

                    let diffP = state.targetPhi - state.rotatePhi;
                    state.rotatePhi += diffP * 0.08;
                } else if (state.autoRotate) {
                    state.rotateLambda += 0.001;
                }
            }

            if (transparentBackground) {
                ctx.clearRect(0, 0, w, h);
            } else {
                ctx.fillStyle = COLORS.BG_DARK;
                ctx.fillRect(0, 0, w, h);
            }
            
            ctx.beginPath();
            ctx.arc(cx, cy, currentRadius, 0, Math.PI*2);
            ctx.strokeStyle = transparentBackground ? 'rgba(255,255,255,0.1)' : '#222'; 
            ctx.lineWidth = transparentBackground ? 1 : 1;
            ctx.stroke();

            const cosL = Math.cos(state.rotateLambda);
            const sinL = Math.sin(state.rotateLambda);
            const cosP = Math.cos(state.rotatePhi);
            const sinP = Math.sin(state.rotatePhi);

            const currentVisibleDots: { sx: number, sy: number, regionId: string }[] = [];

            if (state.mapLoaded && state.dots.length > 0) {
                state.dots.forEach(dot => {
                    const x1 = dot.x * cosL - dot.z * sinL;
                    const y1 = dot.y;
                    const z1 = dot.z * cosL + dot.x * sinL;

                    const x2 = x1;
                    const y2 = y1 * cosP - z1 * sinP;
                    const z2 = z1 * cosP + y1 * sinP;

                    if (z2 > 0.05) {
                        const rData = territories[dot.regionId];
                        if (!rData) return;

                        const sx = cx + x2 * currentRadius;
                        const sy = cy + y2 * currentRadius;

                        const isOwned = rData.owner === 'player';
                        const isSelected = selectedRegionId === dot.regionId;
                        
                        let color = dot.baseColor; 
                        let size = 1.3 * zoom;

                        // View Mode Logic - simplified (minted view removed until real data)
                        // Default territories view just uses baseColor

                        // REMOVE PERMANENT PINK to allow fade effect
                        /*
                        if (isOwned && viewMode === 'territories') {
                             color = COLORS.NEON_PINK;
                             size *= 1.1;
                        }
                        */
                        
                        ctx.shadowBlur = 0;
                        if (isOwned && viewMode === 'territories') {
                            ctx.shadowBlur = 3;
                            ctx.shadowColor = '#444';
                        }

                        if (isSelected) {
                            size *= 1.8;
                            color = COLORS.WHITE; 
                            ctx.shadowBlur = 10;
                            ctx.shadowColor = COLORS.WHITE;
                        }

                        // --- MINT FLASH EFFECT ---
                        // Forces the region to solid PINK if recently minted, then fades back to base
                        if (rData.lastMintTime) {
                            const flashDuration = 3000;
                            const timeSince = now - rData.lastMintTime;
                            
                            if (timeSince < flashDuration) {
                                const progress = timeSince / flashDuration; // 0.0 to 1.0
                                const intensity = 1 - progress; // 1.0 to 0.0
                                
                                // Deterministic fade:
                                if (Math.random() < intensity) {
                                    color = COLORS.NEON_PINK;
                                    ctx.shadowColor = COLORS.NEON_PINK;
                                    ctx.shadowBlur = 20 * intensity;
                                }
                                
                                // Pulse size
                                size = size + (3 * intensity);
                            }
                        }

                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(sx, sy, size, 0, Math.PI*2);
                        ctx.fill();

                        currentVisibleDots.push({ sx, sy, regionId: dot.regionId });
                    }
                });
            } else {
                ctx.save();
                ctx.fillStyle = state.error ? '#ff3333' : COLORS.WHITE;
                ctx.font = '12px "Share Tech Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(state.error ? 'SYSTEM ERROR: OVEN FAILED' : 'PREHEATING OVEN...', cx, cy);
                ctx.restore();
            }

            state.visibleDots = currentVisibleDots;

            // Target Marker (unchanged)
            if (selectedRegionId && territories[selectedRegionId]) {
                const target = territories[selectedRegionId];
                const radLam = (target.lon) * (Math.PI/180);
                const radPhi = (target.lat) * (Math.PI/180);
                let tx = Math.cos(radPhi) * Math.sin(radLam);
                let ty = -Math.sin(radPhi);
                let tz = Math.cos(radPhi) * Math.cos(radLam);
                const x1 = tx * cosL - tz * sinL;
                const y1 = ty;
                const z1 = tz * cosL + tx * sinL;
                const x2 = x1;
                const y2 = y1 * cosP - z1 * sinP;
                const z2 = z1 * cosP + y1 * sinP;
                const sx = cx + x2 * currentRadius;
                const sy = cy + y2 * currentRadius;

                if (z2 > -0.2) {
                    ctx.save();
                    ctx.strokeStyle = COLORS.WHITE;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    const size = 18;
                    const gap = 5;
                    ctx.moveTo(sx - size, sy - size + gap); ctx.lineTo(sx - size, sy - size); ctx.lineTo(sx - size + gap, sy - size);
                    ctx.moveTo(sx + size - gap, sy - size); ctx.lineTo(sx + size, sy - size); ctx.lineTo(sx + size, sy - size + gap);
                    ctx.moveTo(sx - size, sy + size - gap); ctx.lineTo(sx - size, sy + size); ctx.lineTo(sx - size + gap, sy + size);
                    ctx.moveTo(sx + size - gap, sy + size); ctx.lineTo(sx + size, sy + size); ctx.lineTo(sx + size, sy + size - gap);
                    ctx.stroke();
                    ctx.font = '10px monospace';
                    ctx.fillStyle = COLORS.WHITE;
                    ctx.shadowColor = COLORS.WHITE;
                    ctx.shadowBlur = 5;
                    ctx.fillText(target.name.toUpperCase(), sx + size + 8, sy);
                    ctx.restore();
                }
            }

            const activeEffects = effects.filter(fx => now - fx.startTime < fx.duration);
            activeEffects.forEach(fx => {
                const elapsed = now - fx.startTime;
                const effectKey = `${fx.targetId}-${fx.startTime}`;
                if (elapsed >= 1500 && !processedEffectIds.current.has(effectKey)) {
                     processedEffectIds.current.add(effectKey);
                     if (onInfectComplete) onInfectComplete(fx.targetId);
                }
                const target = territories[fx.targetId];
                if (!target) return;
                const radLam = (target.lon) * (Math.PI/180);
                const radPhi = (target.lat) * (Math.PI/180);
                let tx = Math.cos(radPhi) * Math.sin(radLam);
                let ty = -Math.sin(radPhi);
                let tz = Math.cos(radPhi) * Math.cos(radLam);
                const x1 = tx * cosL - tz * sinL;
                const y1 = ty;
                const z1 = tz * cosL + tx * sinL;
                const x2 = x1;
                const y2 = y1 * cosP - z1 * sinP;
                const sx = cx + x2 * currentRadius;
                const sy = cy + y2 * currentRadius;

                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                if (elapsed < 100) {
                     ctx.fillStyle = `rgba(236, 72, 153, ${0.2 * (1 - elapsed/100)})`;
                     ctx.fillRect(0, 0, w, h);
                }
                if (elapsed < 500) {
                    const t = elapsed / 500;
                    const size = 60 * (1 - t) + 15;
                    const rotation = elapsed * 0.02;
                    ctx.translate(sx, sy);
                    ctx.rotate(rotation);
                    ctx.strokeStyle = COLORS.NEON_PINK; 
                    ctx.lineWidth = 3;
                    ctx.shadowColor = COLORS.NEON_PINK;
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(0, 0, size, 0, Math.PI*2);
                    for(let i=0; i<4; i++) {
                        ctx.rotate(Math.PI/2);
                        ctx.moveTo(size, 0); ctx.lineTo(size+10, 0);
                    }
                    ctx.stroke();
                    ctx.rotate(-rotation - (Math.PI/2 * Math.floor(rotation / (Math.PI/2)))); 
                    ctx.font = '12px "Share Tech Mono"';
                    ctx.fillStyle = COLORS.WHITE;
                    ctx.textAlign = 'center';
                    ctx.shadowBlur = 0;
                    ctx.fillText("TARGET LOCKED", 0, size + 20);
                } 
                else if (elapsed < 1500) {
                    const t = (elapsed - 500) / 1000;
                    if (t < 0.8) {
                        state.shakeX = (Math.random() - 0.5) * 5;
                        state.shakeY = (Math.random() - 0.5) * 5;
                    }
                    ctx.beginPath();
                    ctx.moveTo(w/2, -50); 
                    ctx.lineTo(sx, sy);
                    ctx.lineCap = 'round';
                    ctx.lineWidth = 20 * (1-t) + 4;
                    ctx.strokeStyle = `rgba(236, 72, 153, 0.6)`;
                    ctx.shadowBlur = 30;
                    ctx.shadowColor = COLORS.NEON_PINK;
                    ctx.stroke();
                    ctx.lineWidth = 8 * (1-t) + 2;
                    ctx.strokeStyle = COLORS.WHITE;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = COLORS.WHITE;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(sx, sy, 15 + Math.random()*15, 0, Math.PI*2);
                    ctx.fillStyle = COLORS.WHITE;
                    ctx.fill();
                    for(let i=0; i<5; i++) {
                        const ang = Math.random() * Math.PI * 2;
                        const dst = Math.random() * 40;
                        const px = sx + Math.cos(ang) * dst;
                        const py = sy + Math.sin(ang) * dst;
                        ctx.fillStyle = COLORS.NEON_PINK;
                        ctx.fillRect(px, py, 2, 2);
                    }
                }
                else {
                    const t = (elapsed - 1500) / 500;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 50 * t, 0, Math.PI*2);
                    ctx.strokeStyle = `rgba(236, 72, 153, ${1-t})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };
        render();

        const handleMouseDown = (e: MouseEvent | TouchEvent) => {
            stateRef.current.isDragging = true;
            stateRef.current.isInteracting = true;
            stateRef.current.wasDrag = false;
            
            if ('touches' in e) {
                stateRef.current.lastMouseX = e.touches[0].clientX;
                stateRef.current.lastMouseY = e.touches[0].clientY;
            } else {
                stateRef.current.lastMouseX = (e as MouseEvent).clientX;
                stateRef.current.lastMouseY = (e as MouseEvent).clientY;
            }
            stateRef.current.dragStartX = stateRef.current.lastMouseX;
            stateRef.current.dragStartY = stateRef.current.lastMouseY;
        };

        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            let clientX, clientY;
            if ('touches' in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = (e as MouseEvent).clientX;
                clientY = (e as MouseEvent).clientY;
            }

            if (!stateRef.current.isDragging) {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) {
                    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
                    return;
                }
                const mx = clientX - rect.left;
                const my = clientY - rect.top;
                
                let hoveredId: string | null = null;
                // Use larger hit radius for hover
                let minD = 60; 
                
                stateRef.current.visibleDots.forEach(d => {
                    const dist = Math.sqrt((d.sx - mx)**2 + (d.sy - my)**2);
                    if (dist < minD) {
                        minD = dist;
                        hoveredId = d.regionId;
                    }
                });
                
                if (canvasRef.current) {
                    canvasRef.current.style.cursor = hoveredId ? 'pointer' : 'grab';
                }
                
                propsRef.current.onHover(hoveredId);
                return;
            }

            // Drag logic
            const totalDx = Math.abs(clientX - stateRef.current.dragStartX);
            const totalDy = Math.abs(clientY - stateRef.current.dragStartY);
            
            // Increased threshold to 10px to be more forgiving
            if (totalDx > 10 || totalDy > 10) {
                stateRef.current.wasDrag = true;
                if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
            }

            const dx = clientX - stateRef.current.lastMouseX;
            const dy = clientY - stateRef.current.lastMouseY;

            stateRef.current.rotateLambda -= dx * 0.005; 
            stateRef.current.rotatePhi -= dy * 0.005;
            stateRef.current.rotatePhi = Math.max(-Math.PI/2, Math.min(Math.PI/2, stateRef.current.rotatePhi));

            stateRef.current.lastMouseX = clientX;
            stateRef.current.lastMouseY = clientY;
        };

        const handleMouseUp = (e: MouseEvent | TouchEvent) => {
            stateRef.current.isDragging = false;
            stateRef.current.autoRotate = true;
            if (canvasRef.current) canvasRef.current.style.cursor = 'grab';

            if (stateRef.current.isInteracting && !stateRef.current.wasDrag) {
                let clientX, clientY;
                if (e instanceof MouseEvent) {
                    clientX = e.clientX;
                    clientY = e.clientY;
                } 

                if (clientX !== undefined && clientY !== undefined) {
                    const rect = canvas.getBoundingClientRect();
                    const mx = clientX - rect.left;
                    const my = clientY - rect.top;

                    let clickedId: string | null = null;
                    let minD = 60; // 60px hit radius

                    stateRef.current.visibleDots.forEach(d => {
                        const dist = Math.sqrt((d.sx - mx)**2 + (d.sy - my)**2);
                        if (dist < minD) {
                            minD = dist;
                            clickedId = d.regionId;
                        }
                    });
                    
                    propsRef.current.onSelect(clickedId);
                }
            }
            stateRef.current.isInteracting = false;
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        canvas.addEventListener('touchstart', handleMouseDown, {passive: false});
        window.addEventListener('touchmove', handleMouseMove, {passive: false});
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('touchstart', handleMouseDown);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, []);

    return (
        <div ref={containerRef} className={`w-full h-full relative z-10 border-[1px] border-[#333] shadow-[0_0_50px_rgba(0,0,0,1)] box-border transition-colors duration-500 ${props.transparentBackground ? 'bg-transparent' : 'bg-black'}`}>
            <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
    );
};
