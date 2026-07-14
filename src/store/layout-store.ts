import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  isRightPanelOpen: boolean;
  activeTab: 'lyrics' | 'visualizer' | 'effects';
  eqBass: number; // 0 to 100
  eqMid: number; // 0 to 100
  eqTreble: number; // 0 to 100
  reverb: number; // 0 to 100
  isVisualizerEnabled: boolean;
  visualizerStyle: 'bars' | 'wave' | 'retro' | 'nebula';
  
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveTab: (tab: 'lyrics' | 'visualizer' | 'effects') => void;
  setEq: (band: 'bass' | 'mid' | 'treble', value: number) => void;
  setReverb: (value: number) => void;
  setVisualizerEnabled: (enabled: boolean) => void;
  setVisualizerStyle: (style: 'bars' | 'wave' | 'retro' | 'nebula') => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isRightPanelOpen: false,
      activeTab: 'lyrics',
      eqBass: 50,
      eqMid: 50,
      eqTreble: 50,
      reverb: 0,
      isVisualizerEnabled: true,
      visualizerStyle: 'bars',

      toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
      setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setEq: (band, value) => {
        if (band === 'bass') set({ eqBass: value });
        else if (band === 'mid') set({ eqMid: value });
        else if (band === 'treble') set({ eqTreble: value });
      },
      setReverb: (value) => set({ reverb: value }),
      setVisualizerEnabled: (enabled) => set({ isVisualizerEnabled: enabled }),
      setVisualizerStyle: (style) => set({ visualizerStyle: style }),
    }),
    {
      name: 'neotunes-layout-storage',
    }
  )
);
