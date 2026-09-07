'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Send, 
  X, 
  Play, 
  Pause, 
  Check, 
  Music, 
  Moon, 
  Dumbbell, 
  Globe, 
  ListPlus,
  ShieldAlert,
  Loader2,
  Bot
} from 'lucide-react';
import { usePlaybackStore } from '@/store/playback-store';
import { NeoAssistant, NeoAssistantResponse, PendingActionInfo } from '@/services/NeoAssistant';
import { likedSongsService } from '@/services/likedSongsService';
import { Artwork } from '@/components/ui/Artwork';
import { NeoButton } from '@/components/ui/NeoButton';
import { Track, getArtistName } from '@/types';
import { resolveArtwork } from '@/utils/artwork';

interface AskNeoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type NeoStateType = 'idle' | 'thinking' | 'responding' | 'success' | 'error';

interface ChatMessage {
  id: string;
  sender: 'user' | 'neo';
  text: string;
  intent?: string;
  tracks?: Track[];
  executedTools?: Array<{ name: string; source: string; success: boolean }>;
  pendingAction?: PendingActionInfo | null;
  suggestedPrompts?: string[];
  modelId?: string;
}

const CANONICAL_QUICK_ACTIONS = [
  "What track is currently playing?",
  "Play Bengali acoustic melodies",
  "Play relaxing calm acoustic tracks",
  "Create a high energy workout playlist",
  "Recommend something fresh from NeoTunes",
];

export default function AskNeoModal({ isOpen, onClose }: AskNeoModalProps) {
  const { currentTrack, isPlaying, setPlaying, playTrack, addToQueue } = usePlaybackStore();

  const [input, setInput] = useState('');
  const [neoState, setNeoState] = useState<NeoStateType>('idle');
  const [activeToolProgress, setActiveToolProgress] = useState<string | null>(null);
  const [addedQueueTrackIds, setAddedQueueTrackIds] = useState<Set<string>>(new Set());
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'initial_1',
      sender: 'neo',
      text: "Hello! I'm Neo, your music intelligence layer powered by Amazon Bedrock. Ask me to play songs, create curated playlists, inspect your queue, or query audio routes.",
      suggestedPrompts: CANONICAL_QUICK_ACTIONS,
    },
  ]);

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-scroll chat container to bottom with smooth behavior
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      requestAnimationFrame(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, neoState, activeToolProgress, scrollToBottom]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendPrompt = async (queryText?: string) => {
    const query = (queryText || input).trim();
    if (!query || neoState === 'thinking') return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setNeoState('thinking');
    setActiveToolProgress('Orchestrating tools with Amazon Bedrock...');

    try {
      const response: NeoAssistantResponse = await NeoAssistant.handleUserPrompt(query, messages as any);

      const neoMessage: ChatMessage = {
        id: `neo_${Date.now()}`,
        sender: 'neo',
        text: response.reply,
        intent: response.intent,
        tracks: response.tracks,
        executedTools: response.executedTools,
        pendingAction: response.pendingAction,
        modelId: response.modelId,
        suggestedPrompts: response.suggestedPrompts || [],
      };

      setMessages((prev) => [...prev, neoMessage]);
      setNeoState('responding');
      setTimeout(() => setNeoState('idle'), 400);
    } catch (err: any) {
      console.error('NeoAssistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'neo',
          text: "I encountered an issue processing that request with Amazon Bedrock. Please try again.",
        },
      ]);
      setNeoState('error');
      setTimeout(() => setNeoState('idle'), 1500);
    } finally {
      setActiveToolProgress(null);
    }
  };

  const handlePlayTrack = (track: Track) => {
    playTrack(track);
  };

  const handleAddToQueue = (track: Track) => {
    addToQueue(track);
    setAddedQueueTrackIds((prev) => new Set(prev).add(track.id));
  };

  const handleToggleLike = async (track: Track) => {
    const nextState = await likedSongsService.toggleLike(track);
    setLikedTrackIds((prev) => {
      const updated = new Set(prev);
      if (nextState) updated.add(track.id);
      else updated.delete(track.id);
      return updated;
    });
  };

  const handleConfirmAction = async (msgId: string, pendingAction: PendingActionInfo) => {
    try {
      const result = await NeoAssistant.confirmPendingAction(pendingAction.actionId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId
            ? { ...msg, pendingAction: null, text: `${msg.text}\n\n✓ ${result.reply}` }
            : msg
        )
      );
    } catch (err) {
      console.error('Failed to execute pending action:', err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none font-sans">
        
        {/* Backdrop Dismissal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Window with Thin Neon-Lime Border & Responsive Sizing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-2xl h-[min(720px,calc(100dvh-32px))] max-h-[calc(100dvh-32px)] rounded-3xl bg-[#0B0D12] border border-[#DFFF00]/60 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(223,255,0,0.12)] flex flex-col overflow-hidden text-white"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.08] bg-[#0E1117]/90 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#DFFF00] text-black shadow-[0_0_12px_rgba(223,255,0,0.3)] shrink-0">
                <Sparkles className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                    Neo AI Music Copilot
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#DFFF00]/12 text-[#DFFF00] border border-[#DFFF00]/25 shrink-0">
                    Bedrock Intelligence
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#7A8394] truncate max-w-[280px] sm:max-w-none">
                  {activeToolProgress || 'Ready for natural language music requests'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-[#7A8394] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
              aria-label="Close Neo AI"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Chat Messages Body - Independent Scroll */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 sm:space-y-4 scrollbar-none overscroll-contain"
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 w-full`}
                >
                  {/* Sender Badge */}
                  <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-[#7A8394]">
                    {isUser ? (
                      <span>You</span>
                    ) : (
                      <span className="text-[#DFFF00] flex items-center gap-1.5 font-extrabold tracking-wide">
                        <Bot className="h-3.5 w-3.5" /> Neo
                      </span>
                    )}
                  </div>

                  {/* Message Bubble Card */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-[13px] sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#171A21] text-white border border-white/10 shadow-sm max-w-[min(580px,calc(100%-24px))] ml-auto'
                        : 'bg-[#11141A]/80 text-[#F5F7FA] border border-white/[0.06] shadow-md w-full max-w-[min(680px,calc(100%-32px))] space-y-2.5'
                    }`}
                  >
                    {/* 1. Concise Answer */}
                    <p className="whitespace-pre-line text-white/95 leading-relaxed">{msg.text}</p>

                    {/* 2. Optional Executed Tools Status Pill */}
                    {msg.executedTools && msg.executedTools.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-mono font-bold text-[#7A8394] uppercase mr-1">
                          Executed tools:
                        </span>
                        {msg.executedTools.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[10px] font-mono text-[#00E5FF] flex items-center gap-1 shadow-sm"
                          >
                            <Check className="h-2.5 w-2.5 text-[#00E5FF]" />
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 3. Compact Track / Action Cards */}
                    {msg.tracks && msg.tracks.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        {msg.tracks.map((trk) => {
                          const isAdded = addedQueueTrackIds.has(trk.id);
                          const isTrackPlaying = (currentTrack?.id === trk.id || currentTrack?.canonicalId === trk.canonicalId) && isPlaying;

                          return (
                            <div
                              key={trk.id}
                              className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/15 transition-all gap-3 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <Artwork
                                  source={resolveArtwork(trk)}
                                  size="small"
                                  alt={trk.title}
                                  canonicalId={trk.id}
                                  type="track"
                                  className="h-10 w-10 rounded-lg object-cover border border-white/10 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-[13px] font-bold text-white truncate">{trk.title}</h4>
                                  <p className="text-[11px] text-[#7A8394] truncate mt-0.5">
                                    {getArtistName(trk.artists || trk.artist)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handlePlayTrack(trk)}
                                  className="w-8 h-8 rounded-full bg-[#DFFF00] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
                                  title={isTrackPlaying ? 'Pause' : 'Play'}
                                  aria-label={isTrackPlaying ? 'Pause' : 'Play'}
                                >
                                  {isTrackPlaying ? (
                                    <Pause className="h-3.5 w-3.5 fill-black" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5 fill-black ml-0.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleAddToQueue(trk)}
                                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] ${
                                    isAdded
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                      : 'bg-white/5 border-white/10 text-[#7A8394] hover:text-white hover:bg-white/10'
                                  }`}
                                  title={isAdded ? 'Added to queue' : 'Add to queue'}
                                  aria-label={isAdded ? 'Added to queue' : 'Add to queue'}
                                >
                                  {isAdded ? <Check className="h-3.5 w-3.5" /> : <ListPlus className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pending Confirmation Box */}
                    {msg.pendingAction && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 mt-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                          <ShieldAlert className="h-4 w-4" />
                          <span>Confirmation Required</span>
                        </div>
                        <p className="text-xs text-white/90">{msg.pendingAction.summary}</p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <NeoButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleConfirmAction(msg.id, msg.pendingAction!)}
                          >
                            Confirm Action
                          </NeoButton>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips: Compact, wrap gracefully */}
                  {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 w-full max-w-[min(680px,calc(100%-32px))]">
                      {msg.suggestedPrompts.map((promptText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendPrompt(promptText)}
                          className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-[#DFFF00]/40 hover:bg-[#DFFF00]/[0.06] text-[11px] sm:text-xs text-[#9AA1AD] hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
                        >
                          <Sparkles className="h-3 w-3 text-[#DFFF00] shrink-0" />
                          <span>{promptText}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Thinking Animation */}
            {neoState === 'thinking' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#11141A] border border-[#DFFF00]/20 w-fit text-xs"
              >
                <Loader2 className="h-4 w-4 animate-spin text-[#DFFF00]" />
                <span className="text-[#DFFF00] font-semibold">Thinking &amp; orchestrating Bedrock tools...</span>
              </motion.div>
            )}
          </div>

          {/* Fixed Composer Footer */}
          <div className="p-3 sm:p-4 border-t border-white/[0.06] bg-[#0E1117]/90 backdrop-blur-xl shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Neo (e.g. 'Play relaxing evening tunes', 'What's in my queue?')..."
                className="flex-1 px-4 py-2.5 sm:py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-[#606876] text-xs sm:text-sm outline-none focus:border-[#DFFF00]/60 focus:bg-white/[0.06] transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || neoState === 'thinking'}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#DFFF00] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 cursor-pointer shadow-[0_0_12px_rgba(223,255,0,0.25)] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
                aria-label="Send query"
              >
                <Send className="h-4 w-4 fill-black" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
