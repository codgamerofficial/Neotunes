'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, ArrowLeft, Users, Sparkles, Activity, CheckCircle } from 'lucide-react';
import { getCampaignState, CampaignState } from '@/lib/campaignManager';
import { CampaignCountdown, CampaignConfetti } from '@/components/campaign/CampaignComponents';

export default function CampaignHubPage() {
  const [state, setState] = useState<CampaignState | null>(null);
  const [votedTeam, setVotedTeam] = useState<string | null>(null);
  const [pollStats, setPollStats] = useState({ arg: 62, esp: 38 });
  const [activeTab, setActiveTab] = useState<'match' | 'stats' | 'lineups'>('match');

  useEffect(() => {
    setState(getCampaignState());
    const interval = setInterval(() => {
      setState(getCampaignState());
    }, 5000);

    // Sync poll vote
    const storedVote = localStorage.getItem('neotunes-worldcup-vote');
    if (storedVote) {
      setVotedTeam(storedVote);
      if (storedVote === 'arg') {
        setPollStats({ arg: 63, esp: 37 });
      } else {
        setPollStats({ arg: 61, esp: 39 });
      }
    }

    return () => clearInterval(interval);
  }, []);

  const handleVote = (team: 'arg' | 'esp') => {
    if (votedTeam) return;
    setVotedTeam(team);
    localStorage.setItem('neotunes-worldcup-vote', team);
    if (team === 'arg') {
      setPollStats(prev => ({ arg: prev.arg + 1, esp: prev.esp - 1 }));
    } else {
      setPollStats(prev => ({ arg: prev.arg - 1, esp: prev.esp + 1 }));
    }
  };

  if (!state || !state.isActive) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Trophy className="h-16 w-16 text-neutral-600 animate-pulse" />
        <h1 className="text-xl font-bold">Campaign is currently expired.</h1>
        <p className="text-sm text-neutral-500 max-w-sm">The World Cup Final campaign has ended and is automatically disabled.</p>
        <Link href="/home" className="text-xs font-black uppercase text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 px-6 py-2.5 rounded-full hover:bg-cyan-500/20 transition-all">
          Go back to Home
        </Link>
      </div>
    );
  }

  const isCountdown = state.phase === 'countdown';
  const isLive = state.phase === 'live';
  const isChampion = state.phase === 'champion';

  // Fallback high-quality background gradients
  const bgGradients: Record<string, string> = {
    countdown: 'from-[#0a1128] via-[#050505] to-[#7B61FF]/10',
    live: 'from-[#6b0f14]/20 via-[#050505] to-[#122e4d]/20',
    champion: 'from-[#fca311]/15 via-[#050505] to-[#0d1f2d]/25'
  };

  return (
    <div className={`min-h-screen text-white bg-gradient-to-b ${bgGradients[state.phase] || bgGradients.countdown} pb-24 relative overflow-hidden font-sans select-none`}>
      <CampaignConfetti />

      {/* Atmospheric moving ambient blur */}
      <div className="absolute top-10 left-1/4 h-[300px] w-[300px] rounded-full bg-cyan-500/5 blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-20 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-600/5 blur-[150px] -z-10 animate-pulse" />

      {/* Top Navigation */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <Link href="/home" className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-450 hover:text-white transition-colors">
          <ArrowLeft className="h-4.5 w-4.5" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-1.5 bg-neutral-900/60 border border-white/[0.08] px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-cyan-400">
          <Sparkles className="h-3.5 w-3.5 animate-spin [animation-duration:8s]" />
          <span>World Cup Campaign Center</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 pt-4">
        
        {/* LEFT COLUMN: HERO MATCH STATE, TIMELINE, STATS & TABBED VIEWS (8 Columns) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* A. HERO MATCH HEADER CARD */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c0c0c]/60 p-6 md:p-8 flex flex-col items-center text-center shadow-xl">
            <span className="text-[10px] font-black text-cyan-400 tracking-[0.25em] uppercase mb-4">{state.hero.matchName}</span>
            
            {/* Visual Teams Grid */}
            <div className="flex justify-around items-center w-full max-w-lg py-4">
              {/* Argentina */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-5xl md:text-6xl drop-shadow-lg">{state.hero.teams.argentina.flag}</span>
                <span className="text-lg md:text-xl font-black text-white">{state.hero.teams.argentina.name}</span>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Lionel Messi (C)</span>
              </div>

              {/* Score ticker */}
              <div className="flex flex-col items-center">
                {isCountdown ? (
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded border border-cyan-500/20 animate-pulse">VS</span>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      {isLive ? '2 - 2' : '2(4) - 2(3)'}
                    </span>
                    <span className="text-[9px] font-black uppercase bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 mt-2">
                      {isLive ? 'Live Match' : 'Penalties Final'}
                    </span>
                  </div>
                )}
              </div>

              {/* Spain */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-5xl md:text-6xl drop-shadow-lg">{state.hero.teams.spain.flag}</span>
                <span className="text-lg md:text-xl font-black text-white">{state.hero.teams.spain.name}</span>
                <span className="text-[10px] text-neutral-405 font-bold uppercase tracking-wider">Alvaro Morata (C)</span>
              </div>
            </div>

            {/* Stadium metadata */}
            <p className="text-[10px] text-neutral-500 font-semibold mt-4">
              {state.hero.venue} · Display kickoff: {state.hero.kickoffDisplay}
            </p>
          </div>

          {/* B. TABBED SUBVIEW SELECTOR */}
          <div className="flex border-b border-white/[0.04]">
            {[
              { id: 'match', label: 'Match Center' },
              { id: 'stats', label: 'Incidents & Stats' },
              { id: 'lineups', label: 'Lineups' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-6 py-4 text-xs font-black uppercase tracking-wider transition-colors ${
                  activeTab === tab.id ? 'text-cyan-400' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="worldcup-tab-indicator" 
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.6)]" 
                  />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* C. TAB CONTENTS */}
          <div className="space-y-6">
            
            {/* 1. MATCH CENTER SUBVIEW */}
            {activeTab === 'match' && (
              <div className="space-y-6">
                
                {/* Countdown Card (Only before kickoff) */}
                {isCountdown && (
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/40 p-6 flex flex-col items-center space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>Kickoff Countdown Clock</span>
                    </h3>
                    <CampaignCountdown targetDate={state.theme.kickoffDate} onComplete={() => setState(getCampaignState())} />
                  </div>
                )}

                {/* Match Summary / Score Card */}
                {!isCountdown && (
                  <div className="rounded-3xl border border-white/[0.06] bg-[#0c0c0c]/40 p-6 space-y-4 text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Match Summary</h3>
                    
                    <div className="bg-[#050505]/60 border border-white/[0.04] p-4.5 rounded-2xl text-xs space-y-3 leading-relaxed">
                      <p className="font-semibold text-neutral-350">
                        {isLive && 'The match is in its final phase of extra time! Spain struck a dramatic late equalizer in the 88th minute through Dani Olmo to cancel out Julián Álvarez’s lead.'}
                        {isChampion && 'Argentina claim their second title in three tournaments! In an absolute thriller at MetLife Stadium, Gonzalo Montiel struck the winning penalty to secure Argentina a 4-3 penalty victory after a 2-2 scoreline at the end of extra time.'}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 text-left border-t border-white/[0.04] pt-3 text-[11px] font-bold text-neutral-400">
                        <div>
                          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Argentina scorers</span>
                          <p>⚽ Lionel Messi (34&apos; Pen)</p>
                          <p>⚽ Julián Álvarez (75&apos;)</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Spain scorers</span>
                          <p>⚽ Lamine Yamal (65&apos;)</p>
                          <p>⚽ Dani Olmo (88&apos;)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Hero Player Matchup Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lionel Messi Profile */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/40 p-5 text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-3xl font-black">10</div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20 mb-3.5 inline-block">Argentina Hero</span>
                    <h4 className="text-base font-black text-white">Lionel Messi</h4>
                    <p className="text-xs text-neutral-450 font-bold mb-4">Inter Miami · Forward</p>
                    <div className="grid grid-cols-3 gap-2 border-t border-white/[0.04] pt-3 text-center">
                      <div>
                        <span className="text-lg font-black text-white">5</span>
                        <span className="text-[9px] text-neutral-500 uppercase block">Goals</span>
                      </div>
                      <div>
                        <span className="text-lg font-black text-white">3</span>
                        <span className="text-[9px] text-neutral-500 uppercase block">Assists</span>
                      </div>
                      <div>
                        <span className="text-lg font-black text-white">22</span>
                        <span className="text-[9px] text-neutral-500 uppercase block">Shots</span>
                      </div>
                    </div>
                  </div>

                  {/* Lamine Yamal Profile */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/40 p-5 text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-3xl font-black">19</div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#F1A80A] bg-[#F1A80A]/10 px-2.5 py-1 rounded border border-[#F1A80A]/20 mb-3.5 inline-block">Spain Hero</span>
                    <h4 className="text-base font-black text-white">Lamine Yamal</h4>
                    <p className="text-xs text-neutral-450 font-bold mb-4">Barcelona · Forward</p>
                    <div className="grid grid-cols-3 gap-2 border-t border-white/[0.04] pt-3 text-center">
                      <div>
                        <span className="text-lg font-black text-white">3</span>
                        <span className="text-[9px] text-neutral-500 uppercase block">Goals</span>
                      </div>
                      <div>
                        <span className="text-lg font-black text-white">5</span>
                        <span className="text-[9px] text-neutral-500 uppercase block">Assists</span>
                      </div>
                      <div>
                        <span className="text-lg font-black text-white">18</span>
                        <span className="text-[9px] text-neutral-500 uppercase block">Shots</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 2. STATS & LIVE INCIDENTS SUBVIEW */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                
                {/* Timeline events */}
                <div className="rounded-3xl border border-white/[0.06] bg-[#0c0c0c]/40 p-6 text-left space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Match Timeline & Key Events</h3>
                  
                  {isCountdown ? (
                    <div className="py-12 text-center text-xs text-neutral-500 border border-dashed border-white/[0.06] bg-black/10 rounded-2xl">
                      Timeline will start recording incidents once kickoff begins.
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l border-white/[0.08] space-y-6 ml-3">
                      {state.hero.timeline.map((event, idx) => {
                        const isGoal = event.type === 'goal';
                        const isPenalty = event.type === 'penalty';
                        
                        return (
                          <div key={idx} className="relative text-xs">
                            {/* Bullet icon */}
                            <span className={`absolute -left-[31px] top-0 h-4.5 w-4.5 rounded-full border border-neutral-950 flex items-center justify-center text-[10px] ${
                              isGoal || isPenalty ? 'bg-cyan-400 text-black font-black' : 'bg-neutral-800 text-white'
                            }`}>
                              {isGoal || isPenalty ? '⚽' : '•'}
                            </span>
                            
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-[9px] font-black text-cyan-400 bg-cyan-400/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">{event.minute}</span>
                                <h4 className="text-sm font-bold text-white mt-1.5">{event.player}</h4>
                                <p className="text-[11px] text-neutral-500 font-semibold">{event.detail}</p>
                              </div>
                              {event.score && (
                                <span className="text-xs font-black text-white bg-white/[0.04] px-2.5 py-1 rounded border border-white/[0.05]">{event.score}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Match Statistics */}
                {!isCountdown && (
                  <div className="rounded-3xl border border-white/[0.06] bg-[#0c0c0c]/40 p-6 text-left space-y-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Match Statistics</h3>
                    
                    {[
                      { label: 'Possession', arg: state.hero.matchStats.possession.arg, esp: state.hero.matchStats.possession.esp, unit: '%' },
                      { label: 'Total Shots', arg: state.hero.matchStats.shots.arg, esp: state.hero.matchStats.shots.esp },
                      { label: 'Shots on Target', arg: state.hero.matchStats.shotsOnTarget.arg, esp: state.hero.matchStats.shotsOnTarget.esp },
                      { label: 'Corners', arg: state.hero.matchStats.corners.arg, esp: state.hero.matchStats.corners.esp },
                      { label: 'Fouls Committed', arg: state.hero.matchStats.fouls.arg, esp: state.hero.matchStats.fouls.esp }
                    ].map((stat, i) => {
                      const total = stat.arg + stat.esp;
                      const argPct = total > 0 ? (stat.arg / total) * 100 : 50;
                      
                      return (
                        <div key={i} className="space-y-1 text-xs font-bold text-white">
                          <div className="flex justify-between">
                            <span>{stat.arg}{stat.unit}</span>
                            <span className="text-neutral-500 uppercase text-[10px]">{stat.label}</span>
                            <span>{stat.esp}{stat.unit}</span>
                          </div>
                          <div className="w-full h-1 bg-neutral-850 rounded-full flex overflow-hidden">
                            <div className="h-full bg-cyan-400" style={{ width: `${argPct}%` }} />
                            <div className="h-full bg-rose-500" style={{ width: `${100 - argPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

            {/* 3. LINEUPS SUBVIEW */}
            {activeTab === 'lineups' && (
              <div className="rounded-3xl border border-white/[0.06] bg-[#0c0c0c]/40 p-6 text-left space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Predicted Match Day Lineups</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Argentina Lineup */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>🇦🇷 Argentina Lineup</span>
                      </h4>
                      <span className="text-[10px] font-bold text-cyan-400">4-3-3 Attacking</span>
                    </div>
                    <ul className="text-xs text-neutral-400 font-semibold space-y-2.5">
                      {state.hero.teams.argentina.lineup.map((player, idx) => (
                        <li key={idx} className="flex justify-between px-2 py-1 rounded bg-[#050505]/40 border border-white/[0.03]">
                          <span>{player}</span>
                          <span className="text-neutral-500">#{idx === 8 ? '10' : idx + 2}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Spain Lineup */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>🇪🇸 Spain Lineup</span>
                      </h4>
                      <span className="text-[10px] font-bold text-rose-450">4-2-3-1 Fluid</span>
                    </div>
                    <ul className="text-xs text-neutral-400 font-semibold space-y-2.5">
                      {state.hero.teams.spain.lineup.map((player, idx) => (
                        <li key={idx} className="flex justify-between px-2 py-1 rounded bg-[#050505]/40 border border-white/[0.03]">
                          <span>{player}</span>
                          <span className="text-neutral-500">#{idx === 7 ? '19' : idx + 2}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: AI ANALYSIS, Interactive Fan Poll, STADIUM GLOW EFFECTS (4 Columns) */}
        <div className="lg:col-span-4 space-y-8 text-left">
          
          {/* A. AI ANALYSIS & PREDICTION */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c0c]/60 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
              <span>AI Match Predictor</span>
            </h3>
            
            <div className="space-y-3">
              {/* Pie comparison line */}
              <div className="flex justify-between text-xs font-bold text-white">
                <span>ARG: {state.hero.aiPrediction.argentina}%</span>
                <span>ESP: {state.hero.aiPrediction.spain}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-850 rounded-full flex overflow-hidden border border-white/[0.06]">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500" style={{ width: `${state.hero.aiPrediction.argentina}%` }} />
                <div className="h-full bg-gradient-to-r from-rose-500 to-rose-600" style={{ width: `${state.hero.aiPrediction.spain}%` }} />
              </div>
              
              <p className="text-xs text-neutral-400 leading-relaxed font-semibold pt-1">
                {state.hero.aiPrediction.analysis}
              </p>
            </div>
          </div>

          {/* B. INTERACTIVE FAN POLL */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c0c]/60 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-neutral-500" />
              <span>Fan Opinion Poll</span>
            </h3>
            <p className="text-xs text-neutral-400 font-semibold leading-normal">
              Cast your vote. Who do you think will lift the trophy?
            </p>

            <div className="space-y-3.5 pt-1">
              {/* Argentina Vote Button */}
              <button
                disabled={!!votedTeam}
                onClick={() => handleVote('arg')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-xs font-bold text-left ${
                  votedTeam === 'arg'
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-white'
                    : votedTeam
                    ? 'border-white/[0.03] bg-neutral-900/10 text-neutral-500'
                    : 'border-white/[0.06] bg-neutral-900/30 hover:border-cyan-500/30 hover:bg-neutral-850/40 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>🇦🇷 Argentina</span>
                  {votedTeam === 'arg' && <CheckCircle className="h-4 w-4 text-cyan-400 fill-none" />}
                </div>
                {votedTeam && <span className="font-mono text-cyan-400">{pollStats.arg}%</span>}
              </button>

              {/* Spain Vote Button */}
              <button
                disabled={!!votedTeam}
                onClick={() => handleVote('esp')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-xs font-bold text-left ${
                  votedTeam === 'esp'
                    ? 'border-rose-500/40 bg-rose-500/10 text-white'
                    : votedTeam
                    ? 'border-white/[0.03] bg-neutral-900/10 text-neutral-500'
                    : 'border-white/[0.06] bg-neutral-900/30 hover:border-rose-500/30 hover:bg-neutral-850/40 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>🇪🇸 Spain</span>
                  {votedTeam === 'esp' && <CheckCircle className="h-4 w-4 text-rose-400 fill-none" />}
                </div>
                {votedTeam && <span className="font-mono text-rose-450">{pollStats.esp}%</span>}
              </button>
            </div>
          </div>

          {/* C. QUICK MATCH TIPS CARD */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c0c]/60 p-6 space-y-3">
            <h4 className="text-[10px] font-black uppercase text-neutral-450 tracking-wider">Broadcaster Info</h4>
            <p className="text-xs text-neutral-400 leading-normal font-semibold">
              Live broadcast begins July 20 at 12:30 AM IST. Watch full match coverage on official regional networks.
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}
