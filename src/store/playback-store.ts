import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../types';

interface PlaybackState {
  isPlaying: boolean;
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  volume: number;
  isMuted: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  playbackRate: number;
  
  // Actions
  setPlaying: (playing: boolean) => void;
  setCurrentTrack: (track: Track | null) => void;
  setQueue: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void;
  setPlaybackRate: (rate: number) => void;
  playTrack: (track: Track, newQueue?: Track[]) => void;
}

export const usePlaybackStore = create<PlaybackState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      currentTrack: null,
      queue: [],
      history: [],
      volume: 1,
      isMuted: false,
      progress: 0,
      duration: 0,
      shuffle: false,
      repeatMode: 'off',
      playbackRate: 1,

      setPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTrack: (track) => {
        set({ currentTrack: track, progress: 0 });
        if (track) {
          // Add to history, avoid duplicates at the very start
          const currentHistory = get().history.filter((t) => t.id !== track.id);
          set({ history: [track, ...currentHistory].slice(0, 50) });
          
          // Update Media Session
          if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: track.title,
              artist: track.artist.name,
              album: track.album?.name || 'NeoTunes Single',
              artwork: track.coverUrl
                ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
                : [],
            });
          }
        }
      },
      setQueue: (tracks) => set({ queue: tracks }),
      addToQueue: (track) => {
        const queue = get().queue;
        if (!queue.some((t) => t.id === track.id)) {
          set({ queue: [...queue, track] });
        }
      },
      removeFromQueue: (trackId) =>
        set({ queue: get().queue.filter((t) => t.id !== trackId) }),
      clearQueue: () => set({ queue: [], currentTrack: null, isPlaying: false }),
      nextTrack: () => {
        const { queue, currentTrack, repeatMode, shuffle } = get();
        if (queue.length === 0) return;

        if (repeatMode === 'one' && currentTrack) {
          set({ progress: 0 });
          return;
        }

        const currentIndex = currentTrack
          ? queue.findIndex((t) => t.id === currentTrack.id)
          : -1;

        let nextIndex = currentIndex + 1;

        if (shuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else if (nextIndex >= queue.length) {
          if (repeatMode === 'all') {
            nextIndex = 0;
          } else {
            set({ isPlaying: false });
            return;
          }
        }

        get().setCurrentTrack(queue[nextIndex]);
        set({ isPlaying: true });
      },
      prevTrack: () => {
        const { queue, currentTrack, repeatMode } = get();
        if (queue.length === 0) return;

        const currentIndex = currentTrack
          ? queue.findIndex((t) => t.id === currentTrack.id)
          : -1;

        let prevIndex = currentIndex - 1;

        if (prevIndex < 0) {
          if (repeatMode === 'all') {
            prevIndex = queue.length - 1;
          } else {
            set({ progress: 0 });
            return;
          }
        }

        get().setCurrentTrack(queue[prevIndex]);
        set({ isPlaying: true });
      },
      setVolume: (volume) => set({ volume }),
      toggleMute: () => set({ isMuted: !get().isMuted }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setShuffle: (shuffle) => set({ shuffle }),
      setRepeatMode: (repeatMode) => set({ repeatMode }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      playTrack: (track, newQueue) => {
        if (newQueue) {
          set({ queue: newQueue });
        } else {
          get().addToQueue(track);
        }
        get().setCurrentTrack(track);
        set({ isPlaying: true });
      },
    }),
    {
      name: 'neotunes-playback-storage',
      partialize: (state) => ({
        queue: state.queue,
        history: state.history,
        volume: state.volume,
        repeatMode: state.repeatMode,
        shuffle: state.shuffle,
      }),
    }
  )
);
