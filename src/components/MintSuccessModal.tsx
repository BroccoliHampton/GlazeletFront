import React from 'react';
import { Territory } from '../types';
import { useGlazelets } from '../hooks/useGlazelets';

const IPFS_BASE = 'https://ipfs.io/ipfs/bafybeihq3g6pg2nh4rvifpkvbjnvsvvdgyvaequhrmbnvyc42zxucdlqw4';

interface MintSuccessModalProps {
    region: Territory;
    txHash?: `0x${string}` | null;
    onClose: () => void;
    onShare?: () => void;
}

export const MintSuccessModal: React.FC<MintSuccessModalProps> = ({ region, txHash, onClose, onShare }) => {
    const { totalSupply } = useGlazelets();
    
    // Token ID is totalSupply - 1 since IDs are 0-indexed and supply already incremented
    const tokenId = totalSupply - 1;
    const imageUrl = `${IPFS_BASE}/${tokenId}.png`;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-[300px] bg-[#0a0a0a] border border-[#ec4899] rounded-xl shadow-[0_0_50px_rgba(236,72,153,0.3)] relative overflow-hidden">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/80 text-white hover:bg-[#ec4899] transition-colors border border-[#333]"
                >
                    <i className="fa-solid fa-xmark text-sm"></i>
                </button>

                {/* Content */}
                <div className="flex flex-col items-center text-center p-5 relative z-10">
                    
                    {/* Success Header */}
                    <div className="mb-4">
                        <div className="text-[#ec4899] text-shadow-neon font-brand text-xl tracking-widest font-bold">
                            MINT SUCCESS
                        </div>
                    </div>

                    {/* NFT Image */}
                    <div className="relative w-40 h-40 mb-4 rounded-lg overflow-hidden border-2 border-[#ec4899] shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                        <img 
                            src={imageUrl} 
                            alt={`Glazelet #${tokenId}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                            #{tokenId}
                        </div>
                    </div>

                    {/* Region Info */}
                    <div className="bg-[#111] border border-[#333] rounded-lg p-3 w-full mb-3">
                        <div className="text-[9px] text-gray-500 uppercase font-tech mb-0.5">Origin</div>
                        <div className="text-white font-bold font-brand text-sm flex items-center justify-center gap-1">
                            <i className="fa-solid fa-location-dot text-[#ec4899] text-xs"></i>
                            {region.name}
                        </div>
                    </div>

                    {/* Transaction Link */}
                    {txHash && (
                        <a 
                            href={`https://basescan.org/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-gray-500 hover:text-[#ec4899] transition-colors mb-3 flex items-center gap-1"
                        >
                            <i className="fa-solid fa-external-link"></i>
                            View on BaseScan
                        </a>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 w-full">
                        {onShare && (
                            <button 
                                onClick={onShare}
                                className="flex-1 py-2.5 bg-[#111] hover:bg-[#222] text-white font-bold rounded-lg font-tech text-xs tracking-wider uppercase transition-all border border-[#333] hover:border-[#ec4899]"
                            >
                                <i className="fa-solid fa-share-nodes mr-1"></i>
                                SHARE
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className={`${onShare ? 'flex-1' : 'w-full'} py-2.5 bg-[#ec4899] hover:bg-[#d63384] text-white font-bold rounded-lg font-brand text-xs tracking-wider uppercase transition-all`}
                        >
                            CONTINUE
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
