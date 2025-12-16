// Add 'heatmap' to your existing ViewMode type
export type ViewMode = 'territories' | 'heatmap';

// These should already exist in your types.ts - showing for reference:
export interface Region {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Territory extends Region {
  baseColor: string;
  owner: string | null;
  lastMintTime?: number;
}

export interface GlobeDot {
  x: number;
  y: number;
  z: number;
  regionId: string;
  baseColor: string;
  sprinkleColor: string;
}

export interface GameEffect {
  targetId: string;
  startTime: number;
  duration: number;
  type: string;
  impacted: boolean;
}
