import { getGoogleAdsReader } from './googleAdsApi.js';
import type { DateRange } from './ga4Client.js';
import type { AdsInsights, AdsMetrics, AdsSegment } from '../../shared/adsAnalytics.js';

const metricsFields = 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions';
const metrics = (row: any): AdsMetrics => ({ impressions: Number(row.metrics?.impressions || 0), clicks: Number(row.metrics?.clicks || 0), cost: Number(row.metrics?.costMicros || 0) / 1e6, results: Number(row.metrics?.conversions || 0) });
const sum = (a: AdsMetrics, b: AdsMetrics) => { a.impressions += b.impressions; a.clicks += b.clicks; a.cost += b.cost; a.results += b.results; };
const sort = <T extends AdsMetrics>(rows: T[]) => rows.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
export function groupAdsSegments(rows: any[], key: (row: any) => string): AdsSegment[] {
  const grouped = new Map<string, AdsSegment>();
  for (const row of rows) {
    const label = key(row) || 'UNKNOWN';
    const item = grouped.get(label) || { label, impressions: 0, clicks: 0, cost: 0, results: 0 };
    sum(item, metrics(row)); grouped.set(label, item);
  }
  return sort(Array.from(grouped.values()));
}

export async function getGoogleAdsInsights(dateRange: DateRange, campaignId?: string): Promise<AdsInsights> {
  const { search, filter, accountId } = await getGoogleAdsReader(dateRange, campaignId);
  const active = `${filter} AND metrics.impressions > 0`;
  const keys = ['terms', 'geography', 'devices', 'networks', 'ages', 'genders', 'targeting'] as const;
  const settled = await Promise.allSettled([
    search(`SELECT campaign.id, campaign.name, ad_group.name, search_term_view.search_term, segments.keyword.info.text, segments.keyword.info.match_type, ${metricsFields} FROM search_term_view WHERE ${active} ORDER BY metrics.clicks DESC`),
    search(`SELECT campaign.id, campaign.status, geographic_view.country_criterion_id, geographic_view.location_type, segments.geo_target_region, segments.geo_target_city, ${metricsFields} FROM geographic_view WHERE ${active} AND geographic_view.location_type = 'LOCATION_OF_PRESENCE'`),
    search(`SELECT segments.device, ${metricsFields} FROM campaign WHERE ${active}`),
    search(`SELECT segments.ad_network_type, ${metricsFields} FROM campaign WHERE ${active}`),
    search(`SELECT ad_group_criterion.age_range.type, ${metricsFields} FROM age_range_view WHERE ${active}`),
    search(`SELECT ad_group_criterion.gender.type, ${metricsFields} FROM gender_view WHERE ${active}`),
    search(`SELECT campaign.id, campaign.name, campaign.geo_target_type_setting.positive_geo_target_type, campaign.geo_target_type_setting.negative_geo_target_type, campaign_criterion.negative, campaign_criterion.location.geo_target_constant FROM campaign_criterion WHERE campaign_criterion.type = 'LOCATION' AND campaign_criterion.status != 'REMOVED' AND campaign.status != 'REMOVED'${campaignId ? ` AND campaign.id = ${campaignId}` : ''}`),
  ]);
  const warnings: string[] = [];
  const availability = {} as AdsInsights['availability'];
  const rows = {} as Record<typeof keys[number], any[]>;
  keys.forEach((key, index) => {
    const result = settled[index]; availability[key] = result.status === 'fulfilled';
    rows[key] = result.status === 'fulfilled' ? result.value : [];
    if (result.status === 'rejected') warnings.push(`${key} unavailable: Google Ads could not return this breakdown. Other reports remain available.`);
  });
  if (settled.every(result => result.status === 'rejected')) throw new Error('Google Ads detail reports unavailable. Check the connection and try Refresh.');

  const ids = new Set<string>();
  const geoId = (value: unknown) => { const match = String(value || '').match(/^(?:geoTargetConstants\/)?(\d+)$/); return match?.[1]; };
  for (const row of rows.geography) for (const value of [row.geographicView?.countryCriterionId, row.segments?.geoTargetRegion, row.segments?.geoTargetCity]) { const id = geoId(value); if (id) ids.add(id); }
  for (const row of rows.targeting) { const id = geoId(row.campaignCriterion?.location?.geoTargetConstant); if (id) ids.add(id); }
  const names = new Map<string, string>();
  const list = Array.from(ids);
  try {
    for (let i = 0; i < list.length; i += 200) {
      const locations = await search(`SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.canonical_name FROM geo_target_constant WHERE geo_target_constant.id IN (${list.slice(i, i + 200).join(',')})`);
      for (const row of locations) names.set(String(row.geoTargetConstant.id), row.geoTargetConstant.canonicalName || row.geoTargetConstant.name);
    }
  } catch { warnings.push('Some location names could not be resolved; Google location IDs are shown instead.'); }
  const location = (value: unknown) => { const id = geoId(value); return id ? names.get(id) || `Location ${id}` : 'Unknown location'; };
  return {
    accountId, fetchedAt: new Date().toISOString(), availability, warnings,
    terms: rows.terms.map(row => ({ ...metrics(row), term: row.searchTermView?.searchTerm || '(not disclosed)', campaignId: String(row.campaign.id), campaign: row.campaign.name, adGroup: row.adGroup?.name || '', keyword: row.segments?.keyword?.info?.text || '', matchType: row.segments?.keyword?.info?.matchType || 'UNKNOWN' })),
    countries: groupAdsSegments(rows.geography, row => location(row.geographicView?.countryCriterionId)),
    locations: groupAdsSegments(rows.geography, row => location(row.segments?.geoTargetCity || row.segments?.geoTargetRegion || row.geographicView?.countryCriterionId)),
    devices: groupAdsSegments(rows.devices, row => row.segments?.device),
    networks: groupAdsSegments(rows.networks, row => row.segments?.adNetworkType),
    ages: groupAdsSegments(rows.ages, row => row.adGroupCriterion?.ageRange?.type),
    genders: groupAdsSegments(rows.genders, row => row.adGroupCriterion?.gender?.type),
    targeting: rows.targeting.map(row => ({ campaignId: String(row.campaign.id), campaign: row.campaign.name, location: location(row.campaignCriterion?.location?.geoTargetConstant), excluded: !!row.campaignCriterion?.negative, presence: row.campaign.geoTargetTypeSetting?.positiveGeoTargetType || 'UNKNOWN', exclusionPresence: row.campaign.geoTargetTypeSetting?.negativeGeoTargetType || 'UNKNOWN' })),
  };
}
