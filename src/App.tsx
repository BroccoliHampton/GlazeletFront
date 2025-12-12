import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { Globe } from './components/Globe';
import { InfoPopup } from './components/InfoPopup';
import { MintSuccessModal } from './components/MintSuccessModal';
import { PsychedelicFace } from './components/PsychedelicFace';
import { RISK_REGIONS } from './constants';
import { Territory, ViewMode, GameEffect } from './types';
import { AudioService } from './services/audioService';
import { useFarcaster } from './hooks/useFarcaster';
import { useGlazelets } from './hooks/useGlazelets';

const App = () => {
  // --- Welcome Screen State ---
  const [showWelcome, setShowWelcome] = useState(true);

  // --- Farcaster SDK ---
  const { 
    isSDKLoaded, 
    isInMiniApp, 
    ready: farcasterReady,
    user: farcasterUser,
    composeCast,
  } = useFarcaster();

  // --- Wallet & Contract State ---
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const {
    donutBalance,
    hasEnoughDonut,
    totalSupply,
    isSoldOut,
    canMint,
    mint,
    mintStatus,
    error: mintError,
    mintPrice,
    maxSupply,
    lastTxHash,
    reset: resetMintStatus,
  } = useGlazelets();

  // --- Game State ---
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [mintedRegion, setMintedRegion] = useState<Territory | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Derive wallet status from connection state
  const walletStatus: 'checking' | 'eligible' | 'denied' = 
    !isSDKLoaded ? 'checking' :
    !isConnected ? 'checking' :
    hasEnoughDonut ? 'eligible' : 'denied';

  // Initialize Territories
  const [territories, setTerritories] = useState<Record<string, Territory>>(() => {
    const initial: Record<string, Territory> = {};
    RISK_REGIONS.forEach((r) => {
      const lightness = Math.floor(Math.random() * 40) + 20;
      initial[r.id] = {
        ...r,
        baseColor: `hsl(0, 0%, ${lightness}%)`,
        owner: null,
      };
    });
    return initial;
  });

  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const viewMode: ViewMode = 'territories';
  const [zoom, setZoom] = useState(1);
  const [effects, setEffects] = useState<GameEffect[]>([]);
  
  // Audio State - single toggle for both music and SFX
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  // --- Initialize Farcaster SDK ---
  useEffect(() => {
    if (isSDKLoaded) {
      // Only call ready() when we're actually in a miniapp
      if (isInMiniApp) {
        // Disable native gestures to prevent swipe-down-to-close interfering with globe
        farcasterReady({ disableNativeGestures: true });
      }
      
      if (isInMiniApp && !isConnected && connectors.length > 0) {
        connect({ connector: connectors[0] });
      }
    }
  }, [isSDKLoaded, isInMiniApp, isConnected, connectors, connect, farcasterReady]);

  // --- Show success modal when mint succeeds ---
  useEffect(() => {
    if (mintStatus === 'success' && mintedRegion) {
      setShowSuccessModal(true);
    }
  }, [mintStatus, mintedRegion]);

  // --- Game Loop (Effects Cleanup) ---
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      
      setEffects(prev => {
        if (prev.length === 0) return prev;
        return prev.filter(e => currentTime - e.startTime < e.duration + 500);
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // --- Enter app and start music ---
  const handleEnter = async () => {
    const audio = AudioService.getInstance();
    if (!audio.isInitialized) {
      await audio.init();
    }
    if (audio.isMusicMuted) audio.toggleMusicMute();
    if (audio.isSfxMuted) audio.toggleSfxMute();
    setIsSoundEnabled(true);
    setShowWelcome(false);
  };

  // --- Audio Handler - toggles both music and SFX ---
  const toggleSound = async () => {
    const audio = AudioService.getInstance();
    if (!audio.isInitialized) {
      await audio.init();
      setIsSoundEnabled(true);
      if (audio.isMusicMuted) audio.toggleMusicMute();
      if (audio.isSfxMuted) audio.toggleSfxMute();
    } else {
      const musicMuted = audio.toggleMusicMute();
      if (audio.isSfxMuted !== musicMuted) {
        audio.toggleSfxMute();
      }
      setIsSoundEnabled(!musicMuted);
    }
  };

  // --- Gameplay Actions ---
  const handleMapHover = useCallback((id: string | null) => {
    setHoveredRegionId(id);
  }, []);

  const handleMapSelect = useCallback((id: string | null) => {
    setSelectedRegionId(prev => (prev !== id ? id : prev));
  }, []);

  const handleExtract = async () => {
    if (walletStatus !== 'eligible' || !selectedRegionId) return;
    
    const region = territories[selectedRegionId];
    if (!region) return;

    setMintedRegion(region);

    const newEffect: GameEffect = {
      targetId: selectedRegionId,
      startTime: Date.now(),
      duration: 2000,
      type: 'laser',
      impacted: false
    };
    setEffects(prev => [...prev, newEffect]);

    try {
      AudioService.getInstance().playLaserSound();
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
    await mint(region.name);
  };

  const onInfectComplete = useCallback((id: string) => {
    if (mintStatus === 'success') {
      setTerritories(prev => ({
        ...prev,
        [id]: {
          ...prev[id], 
          owner: 'player',
          lastMintTime: Date.now()
        }
      }));
    }
  }, [mintStatus]);

  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setMintedRegion(null);
    resetMintStatus();
  }, [resetMintStatus]);

  const handleShare = useCallback(() => {
    if (mintedRegion) {
      const txLink = lastTxHash ? `\n\nhttps://basescan.org/tx/${lastTxHash}` : '';
      composeCast(
        `🍩 Just extracted a Glazelet from ${mintedRegion.name}!${txLink}\n\nMint yours:`,
        'https://glazelet-front.vercel.app'
      );
    }
  }, [mintedRegion, lastTxHash, composeCast]);

  // --- Render Helpers ---
  const activeRegion = selectedRegionId ? territories[selectedRegionId] : (hoveredRegionId ? territories[hoveredRegionId] : null);
  const mintPercent = ((totalSupply / maxSupply) * 100).toFixed(1);

  const isExtracting = mintStatus === 'approving' || mintStatus === 'minting';
  const buttonDisabled = !selectedRegionId || walletStatus !== 'eligible' || isExtracting || !canMint || isSoldOut;
  
  const getButtonText = () => {
    if (!isConnected) return 'CONNECT';
    if (mintStatus === 'approving') return 'APPROVING...';
    if (mintStatus === 'minting') return 'MINTING...';
    if (isSoldOut) return 'SOLD OUT';
    if (!canMint) return 'LIMIT REACHED';
    if (!hasEnoughDonut) return 'NEED DONUT';
    return 'EXTRACT';
  };

  // --- Welcome Screen ---
  if (showWelcome) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-gray-200 font-tech overflow-hidden select-none">
        <div className="w-full max-w-[420px] h-full max-h-[900px] bg-[#0a0a0a] flex flex-col items-center justify-center relative shadow-[0_0_50px_rgba(255,255,255,0.1)] overflow-hidden border border-[#333]">
          
          {/* Logo */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-5xl font-brand tracking-widest text-white text-shadow-white mb-2">
              GLAZELETS
            </div>
            <div className="text-sm font-tech text-[#ec4899] tracking-[0.3em] uppercase mb-8">
              by Glaze Corp.
            </div>
            
            {/* Psychedelic Face */}
            <div className="mb-8">
              <PsychedelicFace />
            </div>

            {/* Tagline */}
            <p className="text-gray-400 text-center text-sm mb-8 px-8 leading-relaxed">
              Extract unique Glazelets from regions around the world. Burn DONUT to mint your NFT.
            </p>
            
            {/* Enter Button */}
            <button 
              onClick={handleEnter}
              className="px-12 py-4 bg-[#ec4899] text-white font-brand text-xl uppercase tracking-widest rounded hover:brightness-110 transition-all active:translate-y-px shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:shadow-[0_0_50px_rgba(236,72,153,0.7)]"
            >
              Enter
            </button>
            
            <p className="text-gray-600 text-xs mt-4">
              <i className="fa-solid fa-volume-high mr-2"></i>
              Sound will be enabled
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-black text-gray-200 font-tech overflow-hidden select-none">
      {/* Main App Container */}
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
              onClick={toggleSound}
              className={`transition-colors text-xl ${isSoundEnabled ? 'text-[#ec4899]' : 'text-gray-600 hover:text-[#ec4899]'}`}
              title="Toggle Sound"
            >
              <i className={`fa-solid ${isSoundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-[#333]">
              <div className="w-8 h-8 rounded bg-black overflow-hidden border border-[#ec4899] transition-all hover:scale-105 grayscale hover:grayscale-0">
                <img 
                  src={farcasterUser?.pfpUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${address || 'guest'}`} 
                  alt="avatar" 
                />
              </div>
            </div>
          </div>
        </header>

        {/* Wallet Status - hide when success modal is showing */}
        {!showSuccessModal && (
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
                {walletStatus === 'checking' && (isConnected ? "CHECKING BALANCE..." : "CONNECTING...")}
                {walletStatus === 'eligible' && "ACCESS GRANTED"}
                {walletStatus === 'denied' && "INSUFFICIENT DONUT"}
              </span>
            </div>
            <div className="font-bold">
              {!isConnected ? "..." : donutBalance.toLocaleString() + " DONUT"}
            </div>
          </div>
        )}
        
        {/* Instruction Banner - hide when info popup or success modal is showing */}
        {!showInfoPopup && !showSuccessModal && (
          <div className="px-4 relative z-40 shrink-0">
            <div className="bg-[#111] border border-[#333] rounded p-3 mt-3 shadow-inner shadow-black flex items-center justify-center h-20 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[#ec4899]/5 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <i className="fa-solid fa-circle-info text-[#ec4899] text-lg mr-3 animate-pulse"></i>
              <div className="font-brand text-white text-xs sm:text-sm tracking-widest uppercase leading-relaxed">
                Choose a region to extract <br/> your <span className="text-[#ec4899] text-shadow-neon font-bold">Glazelet</span> from below...
              </div>
            </div>
          </div>
        )}

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
          {showSuccessModal && mintedRegion && (
            <MintSuccessModal 
              region={mintedRegion}
              txHash={lastTxHash}
              onClose={handleCloseSuccessModal}
              onShare={handleShare}
            />
          )}

          {/* Zoom Slider - hide when success modal is showing */}
          {!showSuccessModal && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 border border-[#333] rounded p-3 flex flex-col items-center justify-between z-20 h-40 backdrop-blur-sm">
              <div className="text-[10px] text-white"><i className="fa-solid fa-plus"></i></div>
              <input 
                type="range" 
                {...({ orient: "vertical" } as any)}
                min="1" max="3.5" step="0.1" 
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="h-20 w-2 accent-[#ec4899]"
                style={{ WebkitAppearance: 'slider-vertical' } as any}
              />
              <div className="text-[10px] text-white"><i className="fa-solid fa-minus"></i></div>
            </div>
          )}

          {/* Region HUD - hide when success modal is showing */}
          {activeRegion && !showSuccessModal && (
            <div className="absolute top-4 left-4 z-30 bg-black/90 border border-[#ec4899] p-2 rounded backdrop-blur-md text-xs font-tech pointer-events-none shadow-[0_0_15px_rgba(236,72,153,0.3)]">
              <div className="text-white font-bold uppercase tracking-widest mb-1">{activeRegion.name}</div>
              <div className={`text-[#ec4899] ${selectedRegionId === activeRegion.id ? 'animate-pulse font-bold' : ''}`}>
                {selectedRegionId === activeRegion.id ? 'READY TO EXTRACT' : 'SCANNING...'}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Stats Grid - hide when success modal is showing */}
        {!showSuccessModal && (
          <div className="grid grid-cols-2 gap-2 px-4 mb-2 z-40 relative shrink-0">
            {/* Mint Progress */}
            <div className="bg-[#111] border border-[#333] rounded p-3 h-20 flex flex-col justify-center relative overflow-hidden">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1 relative z-10">% Minted</div>
              <div className="flex items-baseline gap-1 relative z-10">
                <i className="fa-solid fa-chart-pie text-[#ec4899] text-xs"></i>
                <span className="text-xl font-bold font-tech text-white">{mintPercent}%</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1 relative z-10 font-mono">
                {totalSupply} / {maxSupply}
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-[#ec4899] transition-all duration-1000" style={{ width: `${mintPercent}%` }}></div>
            </div>
            
            {/* Cost/Balance */}
            <div className="bg-[#111] border border-[#333] rounded p-3 h-20 flex flex-col justify-center">
              <div className="flex justify-between items-center h-full">
                <div className="flex flex-col justify-center">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Mint Cost</div>
                  <div className="text-lg font-bold font-tech text-white leading-none">{mintPrice} DONUT</div>
                </div>
                <div className="text-right flex flex-col justify-center pl-3 border-l border-[#333]">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Balance</div>
                  <div className="text-sm font-bold font-tech text-white leading-none">
                    {donutBalance.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-[#ec4899] mt-0.5 font-bold">DONUT</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Action Button - hide when success modal is showing */}
        {!showSuccessModal && (
          <div className="p-4 flex gap-3 items-center z-40 relative bg-black border-t border-[#333] shrink-0">
            <button 
              disabled={buttonDisabled}
              onClick={(e) => { e.stopPropagation(); handleExtract(); }}
              className={`w-full rounded h-12 font-brand text-lg font-bold uppercase transition-all tracking-widest 
                ${buttonDisabled
                  ? 'bg-[#111] text-[#333] border border-[#222] cursor-not-allowed' 
                  : 'bg-[#ec4899] text-white border-none hover:brightness-110 active:translate-y-px active:shadow-[0_0_20px_#ec4899]'
                }`}
            >
              {getButtonText()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
