
import React from 'react';
import { Territory } from '../types';

interface MintSuccessModalProps {
    region: Territory;
    onClose: () => void;
}

export const MintSuccessModal: React.FC<MintSuccessModalProps> = ({ region, onClose }) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-[#ec4899] rounded-xl p-1 shadow-[0_0_50px_rgba(236,72,153,0.3)] relative overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-[#ec4899]/20 to-transparent blur-xl pointer-events-none"></div>

                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-[#ec4899] transition-colors border border-[#333]"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>

                {/* Content */}
                <div className="flex flex-col items-center text-center p-6 pt-8 relative z-10">
                    
                    {/* Success Icon/Header */}
                    <div className="mb-6">
                        <div className="text-[#ec4899] text-shadow-neon font-brand text-2xl tracking-widest mb-1 font-bold">
                            MINT SUCCESS
                        </div>
                        <div className="text-[10px] font-tech text-gray-400 uppercase tracking-[0.2em]">
                            New Glazelet Discovered
                        </div>
                    </div>

                    {/* Image Card */}
                    <div className="relative w-56 h-56 mb-8 group">
                        {/* Spinning border effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#ec4899] via-purple-600 to-[#ec4899] rounded-xl opacity-75 blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                        
                        <div className="relative w-full h-full bg-black rounded-lg border border-[#333] overflow-hidden flex items-center justify-center p-4">
                            {/* Starburst BG */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#ec4899]/20 via-transparent to-transparent"></div>
                            
                            <img 
                                src="https://i.imgur.com/3FvzKre.png" 
                                alt="Glazelet" 
                                className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] animate-[bounce_3s_infinite]"
                            />
                        </div>
                        
                        {/* Region Badge */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#ec4899] text-white text-[10px] font-bold px-4 py-1.5 rounded-full font-tech uppercase whitespace-nowrap shadow-[0_0_10px_#ec4899] border border-white/20">
                            <i className="fa-solid fa-location-dot mr-1.5"></i>
                            {region.name}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 w-full mb-6">
                        <div className="bg-[#111] rounded-lg p-2 border border-[#333] flex flex-col items-center">
                            <div className="text-[9px] text-gray-500 uppercase font-tech mb-1">Rarity</div>
                            <div className="text-white font-bold font-brand text-xs">COMMON</div>
                        </div>
                        <div className="bg-[#111] rounded-lg p-2 border border-[#333] flex flex-col items-center">
                            <div className="text-[9px] text-gray-500 uppercase font-tech mb-1">Serial</div>
                            <div className="text-[#ec4899] font-bold font-brand text-xs">#{Math.floor(Math.random() * 800) + 1}</div>
                        </div>
                    </div>

                    {/* Action */}
                    <button 
                        onClick={onClose}
                        className="w-full py-3.5 bg-[#ec4899] hover:bg-[#d63384] text-white font-bold rounded-lg font-brand tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] active:scale-[0.98]"
                    >
                        CONTINUE
                    </button>

                </div>
            </div>
        </div>
    );
};
