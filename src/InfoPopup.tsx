
import React from 'react';

interface InfoPopupProps {
    onClose: () => void;
}

const MOCK_HOLDINGS = [
    { id: 808, name: 'Glazelet #808', image: 'https://i.imgur.com/3FvzKre.png', rarity: 'Legendary', level: 99 },
    { id: 342, name: 'Glazelet #342', image: 'https://i.imgur.com/3FvzKre.png', rarity: 'Rare', level: 42 },
    { id: 101, name: 'Glazelet #101', image: 'https://i.imgur.com/3FvzKre.png', rarity: 'Common', level: 12 },
    { id: 7,   name: 'Glazelet #007', image: 'https://i.imgur.com/3FvzKre.png', rarity: 'Epic', level: 75 },
    { id: 888, name: 'Glazelet #888', image: 'https://i.imgur.com/3FvzKre.png', rarity: 'Rare', level: 23 },
];

export const InfoPopup: React.FC<InfoPopupProps> = ({ onClose }) => {
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
                
                {/* About Section */}
                <div className="border border-[#333] bg-[#111] rounded-xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#ec4899]/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                        <i className="fa-solid fa-circle-info text-[#ec4899] animate-pulse"></i>
                        <h3 className="font-brand text-sm text-white uppercase tracking-widest">Mint Details</h3>
                    </div>
                    
                    <div className="text-gray-400 font-tech text-xs leading-relaxed relative z-10">
                        <p className="mb-3">
                            <span className="text-white font-bold">STATUS:</span> ACTIVE PHASE 1
                        </p>
                        <div className="p-3 bg-black/50 rounded border border-[#333] mb-3">
                             <p className="italic text-gray-500 text-center">
                                "Mint specs: Contract logic, extraction rates, and supply dynamics pending uplink..."
                            </p>
                        </div>
                        <p>
                            Select a region on the globe to extract a Glazelet. Higher rarity traits are found in high-traffic zones.
                        </p>
                    </div>
                </div>

                {/* Wallet Carousel */}
                <div>
                    <div className="flex justify-between items-end mb-3 px-1">
                        <h3 className="font-brand text-sm text-white uppercase tracking-widest">
                            Your Wallet <span className="text-[#ec4899] text-xs">({MOCK_HOLDINGS.length})</span>
                        </h3>
                        <div className="text-[10px] font-tech text-gray-500 animate-pulse">
                            SWIPE <i className="fa-solid fa-arrow-right ml-1"></i>
                        </div>
                    </div>
                    
                    <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory -mx-4 px-4 custom-scrollbar">
                        {MOCK_HOLDINGS.map((item) => (
                            <div key={item.id} className="snap-center shrink-0 w-40 bg-[#111] border border-[#333] rounded-xl overflow-hidden group hover:border-[#ec4899] transition-all relative">
                                <div className="aspect-square bg-black relative p-2 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-[#ec4899]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain relative z-10 drop-shadow-lg group-hover:scale-105 transition-transform" />
                                    
                                    <div className="absolute top-1 right-1 text-[8px] bg-black/90 text-white px-1.5 py-0.5 rounded border border-white/10 font-tech">
                                        LVL {item.level}
                                    </div>
                                </div>
                                <div className="p-3 border-t border-[#333] bg-[#151515]">
                                    <div className="font-brand text-[10px] text-white truncate mb-1">{item.name}</div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                        item.rarity === 'Legendary' ? 'text-yellow-400' : 
                                        item.rarity === 'Epic' ? 'text-purple-400' :
                                        item.rarity === 'Rare' ? 'text-[#ec4899]' : 'text-gray-400'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                             item.rarity === 'Legendary' ? 'bg-yellow-400' : 
                                             item.rarity === 'Epic' ? 'bg-purple-400' :
                                             item.rarity === 'Rare' ? 'bg-[#ec4899]' : 'bg-gray-400'
                                        }`}></div>
                                        {item.rarity}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <div className="snap-center shrink-0 w-40 bg-[#111] border border-[#333] border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#ec4899] hover:border-[#ec4899] transition-colors cursor-pointer" onClick={onClose}>
                            <i className="fa-solid fa-plus text-2xl"></i>
                            <div className="font-brand text-[10px] uppercase tracking-widest">Mint More</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
