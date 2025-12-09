
import React, { useState, useEffect, useCallback } from 'react';
import { Globe } from './components/Globe';
import { InfoPopup } from './components/InfoPopup';
import { MintSuccessModal } from './components/MintSuccessModal';
import { RISK_REGIONS } from './constants';
import { Territory, ViewMode, GameEffect } from './types';
import { AudioService } from './services/audioService';

const App = () => {
  // --- Game State ---
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  
  // Wallet & Minting State
  const [walletStatus, setWalletStatus] = useState<'checking' | 'eligible' | 'denied'>('checking');
  const [donutBalance, setDonutBalance] = useState(0);
  
  const [mintCount, setMintCount] = useState(342);
  const [usdcBalance, setUsdcBalance] = useState(1250.00);
  const [mintedRegion, setMintedRegion] = useState<Territory | null>(null);
  
  const MINT_TOTAL = 808;
  const MINT_PRICE = 5.00;

  // Initialize Territories
  const [territories, setTerritories] = useState<Record<string, Territory>>(() => {
    const initial: Record<string, Territory> = {};
    const currentTime = Date.now();
    RISK_REGIONS.forEach((r) => {
        // Generate random initial state
        const lightness = Math.floor(Math.random() * 40) + 20;
        initial[r.id] = {
            ...r,
            baseColor: `hsl(0, 0%, ${lightness}%)`,
            owner: null,
            price: 500,
            multiplier: (Math.random() * 5 + 1).toFixed(1),
            extracted: parseFloat((Math.random() * 800 + 50).toFixed(2)),
            pnl: (Math.random() > 0.4 ? "+" : "-") + (Math.random() * 25).toFixed(1) + "%",
            cooldownEnd: currentTime + Math.floor(Math.random() * 24 * 60 * 60 * 1000),
            mints: Math.floor(Math.random() * 300)
        };
    });
    return initial;
  });

  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('territories');
  const [zoom, setZoom] = useState(1.8);
  const [effects, setEffects] = useState<GameEffect[]>([]);
  
  // Audio State
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isSfxEnabled, setIsSfxEnabled] = useState(true);

  // --- Wallet Check Simulation ---
  useEffect(() => {
      const timer = setTimeout(() => {
          const mockBalance = 2500;
          setDonutBalance(mockBalance);
          setWalletStatus(mockBalance >= 1000 ? 'eligible' : 'denied');
      }, 2000);
      return () => clearTimeout(timer);
  }, []);

  // --- Game Loop (Time & Effects) ---
  useEffect(() => {
    const interval = setInterval(() => {
        const currentTime = Date.now();
        
        // Cleanup old visual effects
        setEffects(prev => {
            if (prev.length === 0) return prev;
            return prev.filter(e => currentTime - e.startTime < e.duration + 500);
        });

        // Reset cooldowns (simulation logic)
        setTerritories(prev => {
            let changed = false;
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                if (next[key].cooldownEnd < currentTime) {
                    next[key] = {
                        ...next[key],
                        cooldownEnd: currentTime + 24 * 60 * 60 * 1000
                    };
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

    }, 500);
    return () => clearInterval(interval);
  }, []);

  // --- Audio Handlers ---
  const toggleMusic = async () => {
    const audio = AudioService.getInstance();
    if (!audio.isInitialized) {
        await audio.init();
        setIsPlayingMusic(true);
        if (audio.isMusicMuted) audio.toggleMusicMute();
    } else {
        const muted = audio.toggleMusicMute();
        setIsPlayingMusic(!muted);
    }
  };

  const toggleSfx = () => {
      const audio = AudioService.getInstance();
      const muted = audio.toggleSfxMute();
      setIsSfxEnabled(!muted);
  };

  // --- Gameplay Actions ---
  const handleMapHover = useCallback((id: string | null) => {
    setHoveredRegionId(id);
  }, []);

  const handleMapSelect = useCallback((id: string | null) => {
    setSelectedRegionId(prev => (prev !== id ? id : prev));
  }, []);

  const handleInfect = () => {
      if (walletStatus !== 'eligible') return;
      
      if (selectedRegionId) {
          if (usdcBalance < MINT_PRICE) {
              alert("Insufficient USDC Balance!");
              return;
          }

          setUsdcBalance(prev => prev - MINT_PRICE);

          // Trigger Laser Effect
          const newEffect: GameEffect = {
              targetId: selectedRegionId,
              startTime: Date.now(),
              duration: 2000,
              type: 'laser',
              impacted: false
          };
          setEffects(prev => [...prev, newEffect]);

          // Play Sound
          setTimeout(() => {
              try {
                AudioService.getInstance().playLaserSound();
              } catch (e) {
                  console.warn("Audio playback failed:", e);
              }
          }, 0);
      }
  };

  const onInfectComplete = useCallback((id: string) => {
      setTerritories(prev => {
          const updatedTerritory: Territory = {
              ...prev[id], 
              owner: 'player',
              mints: prev[id].mints + 1,
              lastMintTime: Date.now()
          };
          
          setTimeout(() => {
             setMintedRegion(updatedTerritory);
          }, 1500);

          return { ...prev, [id]: updatedTerritory };
      });
      setMintCount(prev => Math.min(prev + 1, MINT_TOTAL));
  }, [MINT_TOTAL]);

  // --- Render Helpers ---
  const activeRegion = selectedRegionId ? territories[selectedRegionId] : (hoveredRegionId ? territories[hoveredRegionId] : null);
  const mintPercent = ((mintCount / MINT_TOTAL) * 100).toFixed(1);

  return (
    <div className="flex justify-center items-center h-screen bg-black text-gray-200 font-tech overflow-hidden select-none">
        {/* Main App Container - constrained width for mobile feel, but works on desktop */}
        <div className="w-full max-w-[420px] h-full max-h-[900px] bg-[#0a0a0a] flex flex-col relative shadow-[0_0_50px_rgba(255,255,255,0.1)] overflow-hidden border border-[#333]">
            
            {/* Header */}
            <header className="px-5 py-4 flex justify-between items-center border-b border-[#333] bg-black z-50 relative shrink-0">
                <div className="flex flex-col leading-none">
                    <div className="text-2xl font-brand tracking-widest text-white text-shadow-white">
                        GLAZELETS
                    </div>
                    <div className="text-[10px] font-tech text-[#ec4899] tracking-[0.2em] uppercase mt-1">
                        by Glaze Corp.
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowInfoPopup(!showInfoPopup)}
                        className={`transition-colors text-xl ${showInfoPopup ? 'text-[#ec4899]' : 'text-gray-600 hover:text-[#ec4899]'}`}
                        title="Info & Wallet"
                    >
                        <i className="fa-solid fa-circle-info"></i>
                    </button>

                    <button 
                        onClick={toggleMusic}
                        className={`transition-colors text-xl ${isPlayingMusic ? 'text-[#ec4899]' : 'text-gray-600 hover:text-[#ec4899]'}`}
                        title="Toggle Music"
                    >
                        <i className="fa-solid fa-music"></i>
                    </button>
                    
                    <button 
                        onClick={toggleSfx}
                        className={`transition-colors text-xl ${isSfxEnabled ? 'text-[#ec4899]' : 'text-gray-600 hover:text-[#ec4899]'}`}
                        title="Toggle SFX"
                    >
                        <i className="fa-solid fa-volume-high"></i>
                    </button>

                    <div className="flex items-center gap-2 pl-3 border-l border-[#333]">
                        <div className="w-8 h-8 rounded bg-black overflow-hidden border border-[#ec4899] transition-all hover:scale-105 grayscale hover:grayscale-0">
                            <img src="https://api.dicebear.com/9.x/bottts/svg?seed=DonutChef" alt="avatar" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Wallet Status */}
            <div className={`shrink-0 border-b transition-colors duration-500 flex items-center justify-between px-4 py-3 font-tech text-xs tracking-wider
                ${walletStatus === 'checking' ? 'bg-[#111] border-[#333] text-gray-500' : 
                  walletStatus === 'eligible' ? 'bg-[#ec4899]/10 border-[#ec4899]/50 text-white' : 
                  'bg-red-900/20 border-red-500/50 text-red-400'}`}>
                
                <div className="flex items-center gap-2">
                    <i className={`fa-solid ${
                        walletStatus === 'checking' ? 'fa-circle-notch fa-spin' : 
                        walletStatus === 'eligible' ? 'fa-wallet text-[#ec4899]' : 'fa-ban'
                    }`}></i>
                    <span>
                        {walletStatus === 'checking' && "VERIFYING HOLDINGS..."}
                        {walletStatus === 'eligible' && "ACCESS GRANTED"}
                        {walletStatus === 'denied' && "ACCESS DENIED"}
                    </span>
                </div>
                <div className="font-bold">
                    {walletStatus === 'checking' ? "..." : donutBalance.toLocaleString() + " DONUT"}
                </div>
            </div>
            
            {/* Instruction Banner */}
            <div className="px-4 relative z-40 shrink-0">
                <div className="bg-[#111] border border-[#333] rounded p-3 mt-3 shadow-inner shadow-black flex items-center justify-center h-20 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[#ec4899]/5 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <i className="fa-solid fa-circle-info text-[#ec4899] text-lg mr-3 animate-pulse"></i>
                    <div className="font-brand text-white text-xs sm:text-sm tracking-widest uppercase leading-relaxed">
                        Choose a region to extract <br/> your <span className="text-[#ec4899] text-shadow-neon font-bold">Glazelet</span> from below...
                    </div>
                </div>
            </div>

            {/* 3D Map View */}
            <div className="relative flex-1 flex flex-col overflow-hidden w-full">
                <Globe 
                    territories={territories}
                    zoom={zoom}
                    viewMode={viewMode}
                    effects={effects}
                    setEffects={setEffects}
                    onHover={handleMapHover}
                    onSelect={handleMapSelect}
                    onInfectComplete={onInfectComplete}
                    selectedRegionId={selectedRegionId}
                />

                {/* Overlays */}
                {showInfoPopup && <InfoPopup onClose={() => setShowInfoPopup(false)} />}
                {mintedRegion && <MintSuccessModal region={mintedRegion} onClose={() => setMintedRegion(null)} />}

                {/* Zoom Slider */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 border border-[#333] rounded p-2 py-3 flex flex-col items-center gap-2 z-20 h-32 backdrop-blur-sm">
                    <div className="text-[10px] text-white"><i className="fa-solid fa-plus"></i></div>
                    <input 
                        type="range" 
                        {...({ orient: "vertical" } as any)}
                        min="1" max="3.5" step="0.1" 
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 w-2 accent-[#ec4899]"
                        style={{ WebkitAppearance: 'slider-vertical' } as any}
                    />
                    <div className="text-[10px] text-white"><i className="fa-solid fa-minus"></i></div>
                </div>

                {/* Region HUD */}
                {activeRegion && (
                    <div className="absolute top-4 left-4 z-30 bg-black/90 border border-[#ec4899] p-2 rounded backdrop-blur-md text-xs font-tech pointer-events-none shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                        <div className="text-white font-bold uppercase tracking-widest mb-1">{activeRegion.name}</div>
                        <div className="text-white font-tech text-[10px] mb-1">
                            MINTS: <span className="text-[#ec4899] font-bold">{activeRegion.mints}</span>
                        </div>
                        <div className={`text-[#ec4899] ${selectedRegionId === activeRegion.id ? 'animate-pulse font-bold' : ''}`}>
                            {selectedRegionId === activeRegion.id ? 'READY TO EXTRACT' : 'SCANNING...'}
                        </div>
                    </div>
                )}

                {/* Legend (Visible when viewing Mint Volume) */}
                {viewMode === 'minted' && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none w-64">
                        <div className="text-[10px] text-white font-bold font-tech mb-1 uppercase tracking-widest shadow-black drop-shadow-md">Mint Volume</div>
                        <div className="w-48 h-3 rounded border border-white/30 shadow-lg"
                             style={{ background: 'linear-gradient(90deg, hsl(260, 50%, 30%) 0%, hsl(300, 60%, 50%) 50%, hsl(0, 0%, 100%) 100%)' }} />
                        <div className="w-52 flex justify-between text-[9px] text-white font-bold font-tech mt-1 px-1 drop-shadow-md">
                            <span>LOW</span><span>HIGH</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Stats Grid */}
            <div className="grid grid-cols-2 gap-2 px-4 mb-2 z-40 relative shrink-0">
                {/* Mint Progress */}
                <div className="bg-[#111] border border-[#333] rounded p-3 h-20 flex flex-col justify-center relative overflow-hidden">
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1 relative z-10">% Minted</div>
                    <div className="flex items-baseline gap-1 relative z-10">
                        <i className="fa-solid fa-chart-pie text-[#ec4899] text-xs"></i>
                        <span className="text-xl font-bold font-tech text-white">{mintPercent}%</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 relative z-10 font-mono">
                        {mintCount} / {MINT_TOTAL}
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-[#ec4899] transition-all duration-1000" style={{ width: `${mintPercent}%` }}></div>
                </div>
                
                {/* Cost/Balance */}
                <div className="bg-[#111] border border-[#333] rounded p-3 h-20 flex flex-col justify-center">
                    <div className="flex justify-between items-center h-full">
                        <div className="flex flex-col justify-center">
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Mint Cost</div>
                            <div className="text-lg font-bold font-tech text-white leading-none">5 USDC</div>
                        </div>
                        <div className="text-right flex flex-col justify-center pl-3 border-l border-[#333]">
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Balance</div>
                            <div className="text-sm font-bold font-tech text-white leading-none">
                                {usdcBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </div>
                            <div className="text-[9px] text-[#ec4899] mt-0.5 font-bold">USDC</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 flex gap-3 items-center z-40 relative bg-black border-t border-[#333] shrink-0">
                <button 
                    onClick={() => setViewMode(viewMode === 'territories' ? 'minted' : 'territories')}
                    className="flex-1 bg-[#111] text-white border border-[#333] rounded h-12 font-tech text-base uppercase hover:bg-[#222] hover:border-white transition-all tracking-widest"
                >
                    VIEW: {viewMode === 'territories' ? 'REGIONS' : 'MINTS'}
                </button>
                
                <button 
                    disabled={!selectedRegionId || walletStatus !== 'eligible'}
                    onClick={(e) => { e.stopPropagation(); handleInfect(); }}
                    className={`flex-1 rounded h-12 font-brand text-lg font-bold uppercase transition-all tracking-widest 
                        ${(!selectedRegionId || walletStatus !== 'eligible')
                            ? 'bg-[#111] text-[#333] border border-[#222] cursor-not-allowed' 
                            : 'bg-[#ec4899] text-white border-none hover:brightness-110 active:translate-y-px active:shadow-[0_0_20px_#ec4899]'
                        }`}
                >
                    {walletStatus === 'checking' ? 'WAIT...' : 'EXTRACT'}
                </button>
            </div>
        </div>
    </div>
  );
}

export default App;
