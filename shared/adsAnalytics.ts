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

export interface AdsMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  results: number;
}
export interface AdsSegment extends AdsMetrics { label: string }
export interface AdsInsights {
  accountId: string;
  fetchedAt: string;
  availability: Record<'terms' | 'geography' | 'devices' | 'networks' | 'ages' | 'genders' | 'targeting', boolean>;
  warnings: string[];
  terms: Array<AdsMetrics & { term: string; campaignId: string; campaign: string; adGroup: string; keyword: string; matchType: string }>;
  countries: AdsSegment[];
  locations: AdsSegment[];
  devices: AdsSegment[];
  networks: AdsSegment[];
  ages: AdsSegment[];
  genders: AdsSegment[];
  targeting: Array<{ campaignId: string; campaign: string; location: string; excluded: boolean; presence: string; exclusionPresence: string }>;
}
