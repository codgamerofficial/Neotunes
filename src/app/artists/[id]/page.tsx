'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { 
  Play, 
  Pause, 
  Heart, 
  ArrowLeft,
  Calendar,
  CheckCircle,
  Users,
  Compass,
  Sparkles,
  Info,
  Disc,
  Music
} from 'lucide-react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

interface Track {
  id: string;
  title: string;
  artist: { id?: string; name: string };
  album?: { id?: string; name: string; coverUrl?: string };
  durationMs: number;
  coverUrl?: string;
  sourceType: 'youtube';
  sourceId?: string;
}

interface Artist {
  id: string;
  name: string;
  coverUrl: string;
  followers: number;
  popularity: number;
  genres: string[];
  topTracks: Track[];
  albums: { id: string; name: string; coverUrl: string; releaseDate: string; type: string }[];
}

export default function ArtistDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = params && typeof (params as any).then === 'function'
    ? use(params)
    : (params as any);
  const id = resolvedParams?.id || '4YRx37jL6VOmbfUnxwSy6g';
  
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const [isFollowing, setIsFollowing] = useState(false);

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  
  // Parallax scroll logic
  const { scrollY } = useScroll({ container: container ? { current: container } : undefined });
  const heroY = useTransform(scrollY, [0, 300], [0, -40]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.4]);

  // Fetch Artist details from our custom Spotify route
  const { data: artistResponse, isLoading, error } = useQuery<{ artist: Artist }>({
    queryKey: ['artist', id],
    queryFn: async () => {
      const res = await fetch(`/api/spotify/artists/${id}`);
      if (!res.ok) throw new Error('Artist not found');
      return res.json();
    },
    retry: 1
  });

  // Fallback Mock Artist if fetch fails
  const fallbackArtist: Artist = {
    id: 'fallback-artist',
    name: 'Arijit Singh',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80',
    followers: 45209301,
    popularity: 92,
    genres: ['bollywood', 'filmi', 'romantic'],
    topTracks: [
      { id: 'kesariya', title: 'Kesariya', artist: { name: 'Arijit Singh' }, album: { name: 'Brahmastra' }, coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80', durationMs: 268000, sourceType: 'youtube' },
      { id: 'tum-hi-ho', title: 'Tum Hi Ho', artist: { name: 'Arijit Singh' }, album: { name: 'Aashiqui 2' }, coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80', durationMs: 262000, sourceType: 'youtube' },
      { id: 'chaleya', title: 'Chaleya', artist: { name: 'Arijit Singh' }, album: { name: 'Jawan' }, coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80', durationMs: 200000, sourceType: 'youtube' }
    ],
    albums: [
      { id: 'album-1', name: 'Brahmastra (OST)', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80', releaseDate: '2022', type: 'album' },
      { id: 'album-2', name: 'Jawan Album', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80', releaseDate: '2023', type: 'album' }
    ]
  };

  const artist = artistResponse?.artist || fallbackArtist;

  const handlePlayArtist = () => {
    if (artist.topTracks.length === 0) return;
    const isPlayingCurrentArtist = artist.topTracks.some(t => t.id === currentTrack?.id);
    if (isPlayingCurrentArtist) {
      setPlaying(!isPlaying);
    } else {
      playTrack(artist.topTracks[0], artist.topTracks);
    }
  };

  const formatDuration = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] text-white">
        <Disc className="h-12 w-12 animate-spin text-cyan-400" />
        <p className="mt-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Loading Artist Profile</p>
      </div>
    );
  }

  return (
    <div 
      ref={setContainer}
      className="relative flex flex-col h-screen overflow-y-auto scrollbar-hide text-white pb-32 text-left select-none bg-[#050505]"
    >
      {/* Background Cover image blur glow */}
      <div 
        className="absolute top-0 left-0 right-0 h-[450px] -z-10 bg-cover bg-center filter blur-[80px] opacity-15 scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${artist.coverUrl})` }}
      />
      
      {/* BACK BUTTON */}
      <div className="sticky top-0 z-30 px-6 py-4 flex items-center bg-[#050505]/45 backdrop-blur-md border-b border-white/[0.04]">
        <button 
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.05] transition-colors"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <span className="ml-4 text-sm font-black truncate">{artist.name}</span>
      </div>

      <div className="px-6 sm:px-10 max-w-5xl mx-auto w-full pt-6 space-y-10">
        
        {/* HERO HEADER */}
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-4 text-center md:text-left"
        >
          <div className="relative h-44 w-44 rounded-full overflow-hidden border-2 border-white/[0.08] shadow-2xl flex-shrink-0 bg-neutral-900">
            <Image src={artist.coverUrl} alt={artist.name} fill sizes="176px" priority className="object-cover" />
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-cyan-400">
              <CheckCircle className="h-4 w-4 fill-cyan-400 text-[#050505]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Artist</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
              {artist.name}
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold text-neutral-400">
              <Users className="h-4 w-4 text-neutral-500" />
              <span>{(artist.followers || 25429188).toLocaleString()} followers</span>
            </div>
          </div>
        </motion.div>

        {/* CONTROLS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-b border-white/[0.05] py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayArtist}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying && artist.topTracks.some(t => t.id === currentTrack?.id) ? (
                <Pause className="h-6 w-6 fill-black stroke-black" />
              ) : (
                <Play className="h-6 w-6 fill-black stroke-black translate-x-[1px]" />
              )}
            </button>

            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`rounded-full px-6 py-2.5 text-xs font-bold transition-all border ${
                isFollowing 
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400/30' 
                  : 'bg-white/[0.05] border-white/[0.06] hover:bg-white/[0.1] text-neutral-300 hover:text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 font-semibold uppercase">
            <span>Popularity Index: </span>
            <span className="text-white font-black">{artist.popularity}%</span>
          </div>
        </div>

        {/* TOP SONGS */}
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">Top Tracks</h3>
          <div className="space-y-2">
            {artist.topTracks.slice(0, 5).map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, artist.topTracks)}
                  className={`group flex items-center justify-between rounded-2xl p-3 border transition-all cursor-pointer ${
                    isCurrent 
                      ? 'border-cyan-500/25 bg-cyan-950/10 shadow-[0_0_15px_rgba(0,245,255,0.02)]' 
                      : 'border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center space-x-4 truncate flex-1 pr-4">
                    <span className="text-xs font-black text-neutral-500 w-5 text-center">{idx + 1}</span>
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                      {track.coverUrl ? (
                        <Image src={track.coverUrl} alt={track.title} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                          <Music className="h-4.5 w-4.5 text-neutral-600" />
                        </div>
                      )}
                    </div>
                    <div className="truncate">
                      <p className={`truncate text-sm font-bold ${isCurrent ? 'text-cyan-400' : 'text-white'}`}>{track.title}</p>
                      <p className="truncate text-[10px] text-neutral-500 font-semibold leading-normal">{track.album?.name || 'Single'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3.5">
                    <span className="text-[11px] font-bold text-neutral-500 font-mono tabular-nums">{formatDuration(track.durationMs)}</span>
                    <button className="text-neutral-500 hover:text-white p-1">
                      {isCurrent && isPlaying ? (
                        <Pause className="h-4 w-4 fill-cyan-400 text-cyan-400" />
                      ) : (
                        <Play className="h-4 w-4 fill-neutral-400 text-neutral-400 group-hover:text-cyan-400" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ALBUMS & SINGLES */}
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">Albums & Singles</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {artist.albums.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/albums/${item.id}`)}
                className="snap-start flex-shrink-0 w-40 rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] p-4 hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3">
                  <Image src={item.coverUrl} alt={item.name} fill sizes="160px" className="object-cover" />
                </div>
                <h4 className="truncate text-xs font-bold leading-normal">{item.name}</h4>
                <p className="text-[10px] text-neutral-500 font-semibold mt-0.5 capitalize">{item.type} · {item.releaseDate}</p>
              </div>
            ))}
          </div>
        </section>

        {/* VIDEOS & LIVE PERFORMANCES */}
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Play className="h-4 w-4 text-red-500 fill-red-500" />
            <span>Live Concert Videos & Music Videos</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: `${artist.name} - Acoustic Concert Session (Live)`, views: '2.5M views', cover: artist.coverUrl },
              { title: `${artist.name} - Official Arena Tour Video`, views: '12M views', cover: artist.coverUrl }
            ].map(video => (
              <div 
                key={video.title} 
                onClick={() => playTrack(artist.topTracks[0], artist.topTracks)}
                className="group rounded-2xl border border-white/[0.06] bg-[#111111]/40 overflow-hidden cursor-pointer hover:border-cyan-500/20 transition-all"
              >
                <div className="relative aspect-video bg-neutral-900">
                  <Image src={video.cover} alt={video.title} fill sizes="480px" className="object-cover filter opacity-70" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                      <Play className="h-5 w-5 fill-white stroke-none translate-x-[1px]" />
                    </div>
                  </div>
                </div>
                <div className="p-3 text-left">
                  <h4 className="text-xs font-bold text-white line-clamp-1">{video.title}</h4>
                  <p className="text-[9px] text-neutral-500 font-semibold mt-0.5">{video.views}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TOUR & UPCOMING EVENTS */}
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Calendar className="h-4.5 w-4.5 text-cyan-400" />
            <span>Upcoming Arena Concert Events</span>
          </h3>

          <div className="space-y-2.5">
            {[
              { city: 'Mumbai, IN', venue: 'D.Y. Patil Stadium', date: 'Aug 14, 2026' },
              { city: 'London, UK', venue: 'Wembley Stadium', date: 'Sep 02, 2026' },
              { city: 'New York, US', venue: 'Madison Square Garden', date: 'Oct 19, 2026' }
            ].map(event => (
              <div 
                key={event.date}
                onClick={() => alert(`Tickets booking for ${event.venue} is opening soon!`)}
                className="flex items-center justify-between rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.04] p-4 hover:bg-neutral-900 cursor-pointer transition-all text-left"
              >
                <div>
                  <h4 className="text-xs font-bold text-white leading-normal">{event.city}</h4>
                  <p className="text-[10px] text-neutral-500 font-semibold leading-normal">{event.venue}</p>
                </div>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[9px] font-black text-cyan-400 uppercase tracking-wide">
                  {event.date}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ABOUT / BIO */}
        <section className="space-y-4 text-left border-t border-white/[0.05] pt-8">
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-500 flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-cyan-400" />
            <span>About the Artist</span>
          </h3>

          <div className="rounded-3xl border border-white/[0.06] bg-[#111111]/40 p-6 relative overflow-hidden">
            <p className="text-xs text-neutral-350 leading-relaxed font-semibold">
              {artist.name} is a global icon with a unique musical vision. Known for boundary-pushing production and spellbinding vocals, they have defined the soundscape of a generation. Seamlessly blending traditional scales with modern electronic atmospheres, their live performances sell out arenas worldwide.
            </p>
          </div>
        </section>

      </div>

    </div>
  );
}
