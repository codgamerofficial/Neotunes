'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlaybackStore } from '@/store/playback-store';
import { useQueryClient } from '@tanstack/react-query';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | undefined;
    YT: any;
  }
}

export default function YouTubePlayer() {
  const queryClient = useQueryClient();
  const {
    isPlaying,
    currentTrack,
    volume,
    isMuted,
    playbackRate,
    setPlaying,
    setProgress,
    setDuration,
    nextTrack,
    setCurrentTrack,
  } = usePlaybackStore();

  const playerRef = useRef<any>(null);
  const iframeContainerId = 'yt-player-iframe-root';
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  
  const lastLoggedTrackIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Load YouTube IFrame API Script
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, []);

  // 2. Initialize YT Player once API is ready
  useEffect(() => {
    if (!apiReady || playerRef.current) return;

    const container = document.getElementById(iframeContainerId);
    if (!container) return;

    playerRef.current = new window.YT.Player(iframeContainerId, {
      height: '0',
      width: '0',
      videoId: '',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(isMuted ? 0 : volume * 100);
          event.target.setPlaybackRate(playbackRate);
        },
        onStateChange: (event: any) => {
          const state = event.data;

          if (state === window.YT.PlayerState.PLAYING) {
            setPlaying(true);
            setDuration(event.target.getDuration());
            startProgressLoop();
          } else if (state === window.YT.PlayerState.PAUSED) {
            setPlaying(false);
            stopProgressLoop();
          } else if (state === window.YT.PlayerState.ENDED) {
            stopProgressLoop();
            lastLoggedTrackIdRef.current = null; // Reset logged ref on complete
            nextTrack();
          }
        },
        onError: (event: any) => {
          console.error('YouTube Player Error:', event.data);
          stopProgressLoop();
          nextTrack();
        },
      },
    });

    return () => {
      stopProgressLoop();
    };
  }, [apiReady]);

  // 3. Track state changes (Play/Pause, Volume, PlaybackRate)
  useEffect(() => {
    const player = playerRef.current;
    if (!player || typeof player.playVideo !== 'function') return;

    if (isPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  }, [isPlaying]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || typeof player.setVolume !== 'function') return;
    player.setVolume(isMuted ? 0 : volume * 100);
  }, [volume, isMuted]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || typeof player.setPlaybackRate !== 'function') return;
    player.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  // 4. Resolve and Load Tracks
  useEffect(() => {
    if (!currentTrack) {
      const player = playerRef.current;
      if (player && typeof player.stopVideo === 'function') {
        player.stopVideo();
      }
      stopProgressLoop();
      setProgress(0);
      setDuration(0);
      return;
    }

    const resolveAndPlay = async () => {
      const player = playerRef.current;
      if (!player || typeof player.loadVideoById !== 'function') return;

      let videoId = currentTrack.sourceId;

      if (!videoId) {
        if (resolvingId === currentTrack.id) return;
        setResolvingId(currentTrack.id);

        try {
          const res = await fetch(
            `/api/youtube/search?trackId=${currentTrack.id}&title=${encodeURIComponent(
              currentTrack.title
            )}&artist=${encodeURIComponent(currentTrack.artist.name)}`
          );
          if (!res.ok) throw new Error('Failed to resolve stream');
          const data = await res.json();
          videoId = data.videoId;

          setCurrentTrack({
            ...currentTrack,
            sourceId: videoId,
          });
        } catch (err) {
          console.error('Error resolving track stream ID:', err);
          nextTrack();
          return;
        } finally {
          setResolvingId(null);
        }
      }

      if (videoId) {
        player.loadVideoById({
          videoId: videoId,
          startSeconds: 0,
        });
        if (isPlaying) {
          player.playVideo();
        }
      }
    };

    resolveAndPlay();
  }, [currentTrack?.id]);

  // Handle Cloud Audio Player Actions (Play/Pause, Volume, Seek, Speed)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || currentTrack.sourceType !== 'cloud') return;

    if (isPlaying) {
      audio.play().catch((err) => console.warn('Audio playback interrupted:', err));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle seek event from other components (like MiniPlayer)
  useEffect(() => {
    const handleSeek = (e: Event) => {
      const customEvent = e as CustomEvent<{ time: number }>;
      const seekTime = customEvent.detail.time;
      const player = playerRef.current;
      const audio = audioRef.current;

      if (currentTrack?.sourceType === 'cloud' && audio) {
        audio.currentTime = seekTime;
        setProgress(seekTime);
      } else if (player && typeof player.seekTo === 'function') {
        player.seekTo(seekTime, true);
        setProgress(seekTime);
      }
    };

    window.addEventListener('seek-track', handleSeek);
    return () => {
      window.removeEventListener('seek-track', handleSeek);
    };
  }, [currentTrack, setProgress]);

  // Sync / Log history when a track starts playing
  useEffect(() => {
    if (!currentTrack || !isPlaying) return;
    if (lastLoggedTrackIdRef.current === currentTrack.id) return;

    lastLoggedTrackIdRef.current = currentTrack.id;

    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: currentTrack.id, track: currentTrack }),
    })
      .then((res) => {
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ['history'] });
        }
      })
      .catch((err) => console.warn('Failed to log history:', err));
  }, [currentTrack?.id, isPlaying, queryClient]);

  // Hook for handling Media Session API events
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const player = playerRef.current;
    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => usePlaybackStore.getState().prevTrack());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        if (currentTrack?.sourceType === 'cloud' && audio) {
          audio.currentTime = details.seekTime;
          setProgress(details.seekTime);
        } else if (player && typeof player.seekTo === 'function') {
          player.seekTo(details.seekTime, true);
          setProgress(details.seekTime);
        }
      }
    });

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [nextTrack, setPlaying, setProgress, currentTrack?.id]);

  const startProgressLoop = () => {
    stopProgressLoop();
    progressIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      const audio = audioRef.current;

      if (currentTrack?.sourceType === 'cloud' && audio) {
        const currentTime = audio.currentTime;
        setProgress(currentTime);
        updateMediaSessionPosition(currentTime, audio.duration || 1);
      } else if (player && typeof player.getCurrentTime === 'function') {
        const currentTime = player.getCurrentTime();
        setProgress(currentTime);
        updateMediaSessionPosition(currentTime, player.getDuration() || 1);
      }
    }, 250);
  };

  const updateMediaSessionPosition = (currentTime: number, dur: number) => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: playbackRate,
          position: currentTime,
        });
      } catch {
        // ignore
      }
    }
  };

  const stopProgressLoop = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Keyboard controls listener (Space to play/pause, Left/Right to skip, Up/Down for volume)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const player = playerRef.current;
      const audio = audioRef.current;

      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(!isPlaying);
      } else if (e.code === 'ArrowRight') {
        if (e.ctrlKey) {
          nextTrack();
        } else if (currentTrack?.sourceType === 'cloud' && audio) {
          const newTime = Math.min(audio.currentTime + 10, audio.duration);
          audio.currentTime = newTime;
          setProgress(newTime);
        } else if (player && typeof player.getCurrentTime === 'function') {
          const newTime = Math.min(player.getCurrentTime() + 10, player.getDuration());
          player.seekTo(newTime, true);
          setProgress(newTime);
        }
      } else if (e.code === 'ArrowLeft') {
        if (e.ctrlKey) {
          usePlaybackStore.getState().prevTrack();
        } else if (currentTrack?.sourceType === 'cloud' && audio) {
          const newTime = Math.max(audio.currentTime - 10, 0);
          audio.currentTime = newTime;
          setProgress(newTime);
        } else if (player && typeof player.getCurrentTime === 'function') {
          const newTime = Math.max(player.getCurrentTime() - 10, 0);
          player.seekTo(newTime, true);
          setProgress(newTime);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, nextTrack, setPlaying, setProgress, currentTrack?.id]);

  // Handle Cloud signed URL resolution & play trigger
  useEffect(() => {
    if (!currentTrack || currentTrack.sourceType !== 'cloud') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      return;
    }

    const resolveAndPlayCloud = async () => {
      const audio = audioRef.current;
      if (!audio) return;

      const player = playerRef.current;
      if (player && typeof player.pauseVideo === 'function') {
        player.pauseVideo();
      }

      try {
        const res = await fetch(`/api/cloud/resolve?filePath=${encodeURIComponent(currentTrack.sourceId || '')}`);
        if (!res.ok) throw new Error('Cloud resolve failed');
        const data = await res.json();
        
        audio.src = data.url;
        audio.load();
        if (isPlaying) {
          audio.play().catch((err) => console.warn('Audio play error:', err));
        }
      } catch (err) {
        console.error('Error loading cloud track:', err);
        nextTrack();
      }
    };

    resolveAndPlayCloud();
  }, [currentTrack?.id]);

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 overflow-hidden opacity-0">
      <div id={iframeContainerId} />
      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => {
          setPlaying(true);
          startProgressLoop();
        }}
        onPause={() => {
          setPlaying(false);
          stopProgressLoop();
        }}
        onEnded={() => {
          stopProgressLoop();
          lastLoggedTrackIdRef.current = null; // Reset logged ref on complete
          nextTrack();
        }}
      />
    </div>
  );
}
