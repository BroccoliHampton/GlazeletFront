import React from 'react';
import { Territory } from '../types';

interface MintSuccessModalProps {
    region: Territory;
    txHash?: `0x${string}` | null;
    onClose: () => void;
    onShare?: () => void;
}

export const MintSuccessModal: React.FC<MintSuccessModalProps> = ({ region, txHash, onClose, onShare }) => {
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
                            Glazelet Extracted
                        </div>
                    </div>

                    {/* Success Animation */}
                    <div className="relative w-32 h-32 mb-6">
                        <div className="absolute inset-0 bg-[#ec4899]/20 rounded-full animate-ping"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-[#ec4899] to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.5)]">
                                <i className="fa-solid fa-check text-white text-4xl"></i>
                            </div>
                        </div>
                    </div>

                    {/* Region Info */}
                    <div className="bg-[#111] border border-[#333] rounded-lg p-4 w-full mb-4">
                        <div className="text-[10px] text-gray-500 uppercase font-tech mb-1">Origin Region</div>
                        <div className="text-white font-bold font-brand text-lg flex items-center justify-center gap-2">
                            <i className="fa-solid fa-location-dot text-[#ec4899]"></i>
                            {region.name}
                        </div>
                    </div>

                    {/* Transaction Link */}
                    {txHash && (
                        <a 
                            href={`https://basescan.org/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-gray-500 hover:text-[#ec4899] transition-colors mb-4 flex items-center gap-1"
                        >
                            <i className="fa-solid fa-external-link"></i>
                            View on BaseScan
                        </a>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 w-full">
                        {onShare && (
                            <button 
                                onClick={onShare}
                                className="flex-1 py-3.5 bg-[#111] hover:bg-[#222] text-white font-bold rounded-lg font-tech tracking-widest uppercase transition-all border border-[#333] hover:border-[#ec4899]"
                            >
                                <i className="fa-solid fa-share-nodes mr-2"></i>
                                SHARE
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className={`${onShare ? 'flex-1' : 'w-full'} py-3.5 bg-[#ec4899] hover:bg-[#d63384] text-white font-bold rounded-lg font-brand tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] active:scale-[0.98]`}
                        >
                            CONTINUE
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
