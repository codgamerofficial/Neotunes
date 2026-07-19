import themeConfig from '../../campaigns/worldcup-final/theme.json';
import heroConfig from '../../campaigns/worldcup-final/hero.json';
import motionConfig from '../../campaigns/worldcup-final/motion.json';

export interface CampaignState {
  isActive: boolean;
  phase: 'countdown' | 'live' | 'champion' | 'inactive';
  theme: typeof themeConfig;
  hero: typeof heroConfig;
  motion: typeof motionConfig;
}

export function getCampaignState(testDate?: Date): CampaignState {
  if (!themeConfig.active) {
    return {
      isActive: false,
      phase: 'inactive',
      theme: themeConfig,
      hero: heroConfig,
      motion: motionConfig,
    };
  }

  const now = testDate || new Date();
  const start = new Date(themeConfig.startDate);
  const kickoff = new Date(themeConfig.kickoffDate);
  const matchEnd = new Date(themeConfig.matchEndDate);
  const expiry = new Date(themeConfig.expiryDate);

  if (now < start || now > expiry) {
    return {
      isActive: false,
      phase: 'inactive',
      theme: themeConfig,
      hero: heroConfig,
      motion: motionConfig,
    };
  }

  let phase: 'countdown' | 'live' | 'champion' = 'countdown';
  if (now >= kickoff && now < matchEnd) {
    phase = 'live';
  } else if (now >= matchEnd && now <= expiry) {
    phase = 'champion';
  }

  return {
    isActive: true,
    phase,
    theme: themeConfig,
    hero: heroConfig,
    motion: motionConfig,
  };
}
