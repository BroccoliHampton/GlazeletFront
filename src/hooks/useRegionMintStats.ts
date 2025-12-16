import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACTS } from '../config/wagmi';
import { RISK_REGIONS } from '../constants';

interface RegionMintStats {
  [regionId: string]: number;
}

interface UseRegionMintStatsReturn {
  stats: RegionMintStats;
  maxMints: number;
  totalMints: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Map region names to IDs (contract stores names like "Alaska", we need IDs like "NA1")
const nameToIdMap: Record<string, string> = {};
RISK_REGIONS.forEach(region => {
  nameToIdMap[region.name.toLowerCase()] = region.id;
});

export function useRegionMintStats(): UseRegionMintStatsReturn {
  const [stats, setStats] = useState<RegionMintStats>({});
  const [maxMints, setMaxMints] = useState(0);
  const [totalMints, setTotalMints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const publicClient = usePublicClient();

  useEffect(() => {
    const fetchMintEvents = async () => {
      if (!publicClient) {
        setError('No public client available');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Query all Glazelets__Minted events
        const logs = await publicClient.getLogs({
          address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
          event: parseAbiItem('event Glazelets__Minted(uint256 indexed tokenId, address indexed to, string origin)'),
          fromBlock: 'earliest',
          toBlock: 'latest',
        });

        // Count mints per region
        const counts: RegionMintStats = {};
        
        // Initialize all regions with 0
        RISK_REGIONS.forEach(region => {
          counts[region.id] = 0;
        });

        // Process events
        logs.forEach(log => {
          const origin = (log.args as any)?.origin as string;
          if (origin) {
            // Try to match the origin name to a region ID
            const regionId = nameToIdMap[origin.toLowerCase()];
            if (regionId) {
              counts[regionId] = (counts[regionId] || 0) + 1;
            } else {
              // Try exact match with original casing
              const exactMatch = RISK_REGIONS.find(r => r.name === origin);
              if (exactMatch) {
                counts[exactMatch.id] = (counts[exactMatch.id] || 0) + 1;
              } else {
                console.warn(`[MintStats] Unknown region origin: "${origin}"`);
              }
            }
          }
        });

        // Calculate max and total
        let max = 0;
        let total = 0;
        Object.values(counts).forEach(count => {
          if (count > max) max = count;
          total += count;
        });

        setStats(counts);
        setMaxMints(max);
        setTotalMints(total);
        console.log('[MintStats] Loaded', total, 'mints across regions. Max:', max);
      } catch (err) {
        console.error('[MintStats] Failed to fetch mint events:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch mint data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMintEvents();
  }, [publicClient, refetchTrigger]);

  const refetch = () => setRefetchTrigger(prev => prev + 1);

  return {
    stats,
    maxMints,
    totalMints,
    isLoading,
    error,
    refetch,
  };
}
