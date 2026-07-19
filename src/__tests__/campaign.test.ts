import { describe, it, expect } from 'vitest';
import { getCampaignState } from '../lib/campaignManager';
import themeConfig from '../../campaigns/worldcup-final/theme.json';

describe('Campaign Scheduler Engine', () => {
  it('should be inactive before start date', () => {
    const beforeStart = new Date(new Date(themeConfig.startDate).getTime() - 10000);
    const state = getCampaignState(beforeStart);
    expect(state.isActive).toBe(false);
    expect(state.phase).toBe('inactive');
  });

  it('should be in countdown phase after start date but before kickoff', () => {
    const duringCountdown = new Date(new Date(themeConfig.startDate).getTime() + 10000);
    const state = getCampaignState(duringCountdown);
    expect(state.isActive).toBe(true);
    expect(state.phase).toBe('countdown');
  });

  it('should be in live phase during match kickoff duration', () => {
    const duringLive = new Date(new Date(themeConfig.kickoffDate).getTime() + 10000);
    const state = getCampaignState(duringLive);
    expect(state.isActive).toBe(true);
    expect(state.phase).toBe('live');
  });

  it('should be in champion victory phase after match conclusion but before expiry', () => {
    const duringChampion = new Date(new Date(themeConfig.matchEndDate).getTime() + 10000);
    const state = getCampaignState(duringChampion);
    expect(state.isActive).toBe(true);
    expect(state.phase).toBe('champion');
  });

  it('should expire and deactivate automatically after expiry date', () => {
    const afterExpiry = new Date(new Date(themeConfig.expiryDate).getTime() + 10000);
    const state = getCampaignState(afterExpiry);
    expect(state.isActive).toBe(false);
    expect(state.phase).toBe('inactive');
  });
});
