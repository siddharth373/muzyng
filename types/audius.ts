export type AudiusTrack = {
  id: string;
  title?: string;
  user?: { name?: string };
  artwork?: { "150x150"?: string; "480x480"?: string; "1000x1000"?: string } | null;
  duration?: number;
  is_available?: boolean;
  streamable?: boolean;
};

export type PlayerTrack = {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  duration: number;
  streamUrl: string;
};