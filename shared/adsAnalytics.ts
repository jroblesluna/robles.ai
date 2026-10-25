export interface AdsCampaign {
  campaignId: string;
  campaign: string;
  status?: string;
  dailyBudget?: number;
  impressions: number;
  clicks: number;
  cost: number;
  results: number;
}

export interface AdsReport {
  source: 'google_ads_api' | 'ga4';
  accountId: string;
  currency: string | null;
  fetchedAt: string;
  campaignOptions: Array<{ campaignId: string; campaign: string }>;
  campaigns: AdsCampaign[];
  totals: { impressions: number; clicks: number; cost: number; results: number };
  daily: Array<{ date: string; cost: number; clicks: number }>;
  availability: { cost: boolean; results: boolean; daily: boolean };
  warnings: string[];
}

export interface WebsiteChannel {
  channelGroup: string;
  sessions: number;
  keyEvents: number;
  sessionKeyEventRate: number | null;
  paid: boolean;
}

export interface WebsiteChannelsReport {
  channels: WebsiteChannel[];
}

export type LeadForm = 'all' | 'contact' | 'quiz';
export interface LeadSignalsReport {
  count: number | null;
  form: LeadForm;
  segmentationAvailable: boolean;
  warnings: string[];
}
