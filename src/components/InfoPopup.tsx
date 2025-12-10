import React from 'react';
import { useAccount } from 'wagmi';
import { useGlazelets } from '../hooks/useGlazelets';

interface InfoPopupProps {
    onClose: () => void;
}

export const InfoPopup: React.FC<InfoPopupProps> = ({ onClose }) => {
    const { address, isConnected } = useAccount();
    const { 
        donutBalance, 
        userMintCount, 
        totalSupply, 
        maxSupply, 
        mintPrice,
        maxPerWallet 
    } = useGlazelets();

    const truncatedAddress = address 
        ? `${address.slice(0, 6)}...${address.slice(-4)}` 
        : 'Not Connected';

    return (
        <div className="absolute inset-0 bg-[#0a0a0a] z-50 flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#111]">
                <div className="font-brand text-xl text-white tracking-widest text-shadow-white">
                    PLAYER <span className="text-[#ec4899]">INFO</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-[#222]">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0a] p-4 flex flex-col gap-6">
                
                {/* Wallet Info Section */}
                <div className="border border-[#333] bg-[#111] rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#ec4899]/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <i className="fa-solid fa-wallet text-[#ec4899]"></i>
                        <h3 className="font-brand text-sm text-white uppercase tracking-widest">Wallet</h3>
                    </div>
                    
                    <div className="space-y-3 relative z-10">
                        <div className="flex justify-between items-center p-3 bg-black/50 rounded border border-[#333]">
                            <span className="text-gray-400 font-tech text-xs">Address</span>
                            <span className="text-white font-mono text-xs">{truncatedAddress}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-black/50 rounded border border-[#333]">
                            <span className="text-gray-400 font-tech text-xs">DONUT Balance</span>
                            <span className="text-[#ec4899] font-bold font-tech text-sm">{donutBalance.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Mint Stats Section */}
                <div className="border border-[#333] bg-[#111] rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#ec4899]/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <i className="fa-solid fa-chart-simple text-[#ec4899]"></i>
                        <h3 className="font-brand text-sm text-white uppercase tracking-widest">Mint Stats</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <div className="p-3 bg-black/50 rounded border border-[#333] text-center">
                            <div className="text-[10px] text-gray-500 uppercase font-tech mb-1">Your Mints</div>
                            <div className="text-2xl font-bold text-white font-tech">{userMintCount}</div>
                            <div className="text-[9px] text-gray-500">/ {maxPerWallet} max</div>
                        </div>
                        <div className="p-3 bg-black/50 rounded border border-[#333] text-center">
                            <div className="text-[10px] text-gray-500 uppercase font-tech mb-1">Total Minted</div>
                            <div className="text-2xl font-bold text-[#ec4899] font-tech">{totalSupply}</div>
                            <div className="text-[9px] text-gray-500">/ {maxSupply} supply</div>
                        </div>
                        <div className="p-3 bg-black/50 rounded border border-[#333] text-center">
                            <div className="text-[10px] text-gray-500 uppercase font-tech mb-1">Mint Price</div>
                            <div className="text-lg font-bold text-white font-tech">{mintPrice}</div>
                            <div className="text-[9px] text-[#ec4899]">DONUT</div>
                        </div>
                        <div className="p-3 bg-black/50 rounded border border-[#333] text-center">
                            <div className="text-[10px] text-gray-500 uppercase font-tech mb-1">Remaining</div>
                            <div className="text-lg font-bold text-white font-tech">{maxSupply - totalSupply}</div>
                            <div className="text-[9px] text-gray-500">available</div>
                        </div>
                    </div>
                </div>

                {/* Your Glazelets Section */}
                <div className="border border-[#333] bg-[#111] rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#ec4899]/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <i className="fa-solid fa-images text-[#ec4899]"></i>
                        <h3 className="font-brand text-sm text-white uppercase tracking-widest">
                            Your Glazelets <span className="text-[#ec4899]">({userMintCount})</span>
                        </h3>
                    </div>
                    
                    {userMintCount > 0 ? (
                        <div className="p-4 bg-black/50 rounded border border-[#333] text-center relative z-10">
                            <i className="fa-solid fa-hourglass-half text-[#ec4899] text-2xl mb-2 animate-pulse"></i>
                            <p className="text-gray-400 font-tech text-xs">
                                NFT gallery coming soon!
                            </p>
                            <p className="text-gray-500 font-tech text-[10px] mt-1">
                                View your Glazelets on{' '}
                                <a 
                                    href={`https://opensea.io/${address}?search[collections][0]=glazelets`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#ec4899] hover:underline"
                                >
                                    OpenSea
                                </a>
                                {' '}or{' '}
                                <a 
                                    href={`https://basescan.org/address/${address}#tokentxnsErc721`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#ec4899] hover:underline"
                                >
                                    BaseScan
                                </a>
                            </p>
                        </div>
                    ) : (
                        <div 
                            className="p-4 bg-black/50 rounded border border-[#333] border-dashed text-center cursor-pointer hover:border-[#ec4899] transition-colors relative z-10"
                            onClick={onClose}
                        >
                            <i className="fa-solid fa-plus text-gray-500 text-2xl mb-2"></i>
                            <p className="text-gray-400 font-tech text-xs">
                                No Glazelets yet
                            </p>
                            <p className="text-[#ec4899] font-tech text-[10px] mt-1">
                                Tap to mint your first!
                            </p>
                        </div>
                    )}
                </div>

                {/* About Section */}
                <div className="border border-[#333] bg-[#111] rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#ec4899]/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                        <i className="fa-solid fa-circle-info text-[#ec4899]"></i>
                        <h3 className="font-brand text-sm text-white uppercase tracking-widest">About</h3>
                    </div>
                    
                    <div className="text-gray-400 font-tech text-xs leading-relaxed relative z-10">
                        <p className="mb-3">
                            Glazelets are unique NFTs minted by burning <span className="text-[#ec4899] font-bold">DONUT</span> tokens. 
                            Each Glazelet is tied to a region on the globe.
                        </p>
                        <p>
                            Select a region and extract your Glazelet. Max {maxPerWallet} per wallet.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
