export interface Region {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Territory extends Region {
  baseColor: string;
  owner: 'player' | null;
  lastMintTime?: number; // For flash animation after successful mint
}

export interface GlobeDot {
  x: number;
  y: number;
  z: number;
  regionId: string;
  baseColor: string;
  sprinkleColor: string;
}

// Removed 'minted' view mode - will add back when hooked up to real data
export type ViewMode = 'territories';

export interface GameEffect {
  targetId: string;
  startTime: number;
  duration: number;
  type: 'laser';
  impacted: boolean;
}
