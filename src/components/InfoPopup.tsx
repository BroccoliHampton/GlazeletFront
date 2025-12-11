import React from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS, GLAZELETS_ABI } from '../config/wagmi';

interface InfoPopupProps {
    onClose: () => void;
}

const IPFS_BASE = 'https://ipfs.io/ipfs/bafybeihq3g6pg2nh4rvifpkvbjnvsvvdgyvaequhrmbnvyc42zxucdlqw4';

// Add ownerOf to check token ownership
const EXTENDED_ABI = [
    ...GLAZELETS_ABI,
    {
        name: 'ownerOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
    },
] as const;

export const InfoPopup: React.FC<InfoPopupProps> = ({ onClose }) => {
    const { address, isConnected } = useAccount();

    // Get total supply to know how many tokens exist
    const { data: totalSupply } = useReadContract({
        address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
        abi: GLAZELETS_ABI,
        functionName: 'totalSupply',
    });

    // Get user's NFT balance
    const { data: balance } = useReadContract({
        address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
        abi: EXTENDED_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const nftCount = balance ? Number(balance) : 0;
    const supply = totalSupply ? Number(totalSupply) : 0;

    // Build ownerOf calls for all existing tokens (1 to totalSupply)
    const ownerOfCalls = Array.from({ length: supply }, (_, i) => ({
        address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
        abi: EXTENDED_ABI,
        functionName: 'ownerOf' as const,
        args: [BigInt(i + 1)],
    }));

    // Fetch all owners
    const { data: ownersData, isLoading } = useReadContracts({
        contracts: ownerOfCalls,
        query: { enabled: supply > 0 },
    });

    // Find token IDs owned by current user
    const userTokenIds = ownersData
        ?.map((result, index) => {
            if (result.status === 'success' && 
                (result.result as string).toLowerCase() === address?.toLowerCase()) {
                return index + 1;
            }
            return null;
        })
        .filter((id): id is number => id !== null) || [];

    // Simple function to get image URL from token ID
    const getImageUrl = (tokenId: number) => `${IPFS_BASE}/${tokenId - 1}.png`;

    const loading = isLoading || (supply > 0 && !ownersData);

    return (
        <div className="absolute inset-0 bg-[#0a0a0a] z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#111] shrink-0">
                <div className="font-brand text-xl text-white tracking-widest">
                    YOUR <span className="text-[#ec4899]">GLAZELETS</span>
                    <span className="text-[#ec4899] text-sm ml-2">({nftCount})</span>
                </div>
                <button 
                    onClick={onClose} 
                    className="text-gray-400 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-full bg-[#222] hover:bg-[#333]"
                >
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <i className="fa-solid fa-wallet text-[#333] text-5xl mb-4"></i>
                        <p className="text-gray-500 font-tech">Wallet not connected</p>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <i className="fa-solid fa-circle-notch fa-spin text-[#ec4899] text-4xl mb-4"></i>
                        <p className="text-gray-400 font-tech text-sm">Loading your Glazelets...</p>
                    </div>
                ) : nftCount === 0 ? (
                    <div 
                        className="flex flex-col items-center justify-center h-full text-center p-8 cursor-pointer"
                        onClick={onClose}
                    >
                        <div className="w-24 h-24 rounded-full bg-[#111] border-2 border-dashed border-[#333] flex items-center justify-center mb-4 hover:border-[#ec4899] transition-colors">
                            <i className="fa-solid fa-plus text-[#333] text-3xl"></i>
                        </div>
                        <p className="text-gray-400 font-tech text-sm mb-2">No Glazelets yet</p>
                        <p className="text-[#ec4899] font-brand text-xs uppercase tracking-widest">
                            Tap to mint your first!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {userTokenIds.map((tokenId) => (
                            <div 
                                key={tokenId} 
                                className="bg-[#111] border border-[#333] rounded-xl overflow-hidden hover:border-[#ec4899] transition-all"
                            >
                                {/* Image */}
                                <div className="aspect-square bg-black relative">
                                    <img 
                                        src={getImageUrl(tokenId)} 
                                        alt={`Glazelet #${tokenId}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                    {/* Token ID badge */}
                                    <div className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded font-mono">
                                        #{tokenId}
                                    </div>
                                </div>
                                
                                {/* Info */}
                                <div className="p-3 border-t border-[#333]">
                                    <div className="font-brand text-xs text-white truncate">
                                        Glazelet #{tokenId}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Mint More Card */}
                        {nftCount < 4 && (
                            <div 
                                className="bg-[#111] border border-dashed border-[#333] rounded-xl overflow-hidden hover:border-[#ec4899] transition-all cursor-pointer flex flex-col items-center justify-center aspect-[3/4]"
                                onClick={onClose}
                            >
                                <i className="fa-solid fa-plus text-[#333] text-2xl mb-2"></i>
                                <span className="text-[#333] font-brand text-[10px] uppercase">Mint More</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer with links */}
            {isConnected && nftCount > 0 && (
                <div className="p-4 border-t border-[#333] bg-[#111] shrink-0">
                    <div className="flex justify-center gap-4 text-[10px] font-tech">
                        <a 
                            href={`https://opensea.io/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-[#ec4899] transition-colors flex items-center gap-1"
                        >
                            <i className="fa-solid fa-external-link"></i>
                            OpenSea
                        </a>
                        <a 
                            href={`https://basescan.org/address/${address}#nfttransfers`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-[#ec4899] transition-colors flex items-center gap-1"
                        >
                            <i className="fa-solid fa-external-link"></i>
                            BaseScan
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
