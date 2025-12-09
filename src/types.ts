
export interface Region {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Territory extends Region {
  baseColor: string;
  owner: 'player' | null;
  price: number;
  multiplier: string;
  extracted: number;
  pnl: string;
  cooldownEnd: number;
  mints: number; 
  lastMintTime?: number; // Optional for tracking flash animation
}

export interface GlobeDot {
  x: number;
  y: number;
  z: number;
  regionId: string;
  baseColor: string;
  sprinkleColor: string;
}

export type ViewMode = 'territories' | 'minted';

export interface GameEffect {
  targetId: string;
  startTime: number;
  duration: number;
  type: 'laser';
  impacted: boolean;
}
