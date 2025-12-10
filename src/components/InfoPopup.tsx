import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS, GLAZELETS_ABI } from '../config/wagmi';

interface InfoPopupProps {
    onClose: () => void;
}

interface NFTData {
    tokenId: number;
    origin: string;
    image: string | null;
    name: string;
}

export const InfoPopup: React.FC<InfoPopupProps> = ({ onClose }) => {
    const { address, isConnected } = useAccount();
    const [nfts, setNfts] = useState<NFTData[]>([]);
    const [loading, setLoading] = useState(true);

    // Get user's NFT balance
    const { data: balance } = useReadContract({
        address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
        abi: GLAZELETS_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const nftCount = balance ? Number(balance) : 0;

    // Fetch token IDs and metadata
    useEffect(() => {
        const fetchNFTs = async () => {
            if (!address || nftCount === 0) {
                setNfts([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            const nftData: NFTData[] = [];

            try {
                for (let i = 0; i < nftCount; i++) {
                    // Get token ID at index
                    const tokenIdResponse = await fetch(
                        `https://base.blockscout.com/api/v2/smart-contracts/${CONTRACTS.GLAZELETS_NFT}/query-read-method`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                args: [address, i.toString()],
                                method_id: 'tokenOfOwnerByIndex',
                            }),
                        }
                    ).catch(() => null);

                    // Fallback: just use index as tokenId estimate (not ideal but works for display)
                    let tokenId = i + 1;
                    
                    if (tokenIdResponse?.ok) {
                        const data = await tokenIdResponse.json();
                        if (data.result?.output?.[0]?.value) {
                            tokenId = parseInt(data.result.output[0].value);
                        }
                    }

                    // Try to get tokenURI
                    let image: string | null = null;
                    let origin = 'Unknown Region';

                    try {
                        const uriResponse = await fetch(
                            `https://base.blockscout.com/api/v2/smart-contracts/${CONTRACTS.GLAZELETS_NFT}/query-read-method`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    args: [tokenId.toString()],
                                    method_id: 'tokenURI',
                                }),
                            }
                        );

                        if (uriResponse.ok) {
                            const uriData = await uriResponse.json();
                            const uri = uriData.result?.output?.[0]?.value;
                            
                            if (uri) {
                                // Convert IPFS URI to gateway URL
                                const metadataUrl = uri.startsWith('ipfs://')
                                    ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                                    : uri;

                                // Fetch metadata
                                const metaResponse = await fetch(metadataUrl);
                                if (metaResponse.ok) {
                                    const metadata = await metaResponse.json();
                                    
                                    // Convert image IPFS to gateway
                                    if (metadata.image) {
                                        image = metadata.image.startsWith('ipfs://')
                                            ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                                            : metadata.image;
                                    }
                                    
                                    // Try to get origin from metadata or attributes
                                    if (metadata.origin) {
                                        origin = metadata.origin;
                                    } else if (metadata.attributes) {
                                        const originAttr = metadata.attributes.find(
                                            (a: any) => a.trait_type?.toLowerCase() === 'origin'
                                        );
                                        if (originAttr) origin = originAttr.value;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to fetch metadata for token', tokenId, e);
                    }

                    nftData.push({
                        tokenId,
                        origin,
                        image,
                        name: `Glazelet #${tokenId}`,
                    });
                }
            } catch (e) {
                console.error('Error fetching NFTs:', e);
            }

            setNfts(nftData);
            setLoading(false);
        };

        fetchNFTs();
    }, [address, nftCount]);

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
                        {nfts.map((nft) => (
                            <div 
                                key={nft.tokenId} 
                                className="bg-[#111] border border-[#333] rounded-xl overflow-hidden hover:border-[#ec4899] transition-all"
                            >
                                {/* Image */}
                                <div className="aspect-square bg-black relative">
                                    {nft.image ? (
                                        <img 
                                            src={nft.image} 
                                            alt={nft.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '';
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <i className="fa-solid fa-image text-[#333] text-4xl"></i>
                                        </div>
                                    )}
                                    {/* Token ID badge */}
                                    <div className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded font-mono">
                                        #{nft.tokenId}
                                    </div>
                                </div>
                                
                                {/* Info */}
                                <div className="p-3 border-t border-[#333]">
                                    <div className="font-brand text-xs text-white truncate mb-1">
                                        {nft.name}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                        <i className="fa-solid fa-location-dot text-[#ec4899]"></i>
                                        <span className="truncate">{nft.origin}</span>
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
