export type ListeningPresence = {
  user_id: string;
  is_online: boolean;
  track_id: string | null;
  track_title: string | null;
  artist_name: string | null;
  artwork_url: string | null;
  is_playing: boolean;
  position_seconds: number;
  updated_at: string;
};