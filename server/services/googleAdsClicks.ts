import { getGoogleAdsReader } from './googleAdsApi.js';
import type { DateRange } from './ga4Client.js';
import type { AdsClickReport, AdsClickRecord, ClickAdAssets } from '../../shared/adsAnalytics.js';

const shiftDate = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export function clickDateRange(range: DateRange, today: string): DateRange | null {
  const earliest = shiftDate(today, -89);
  const startDate = range.startDate < earliest ? earliest : range.startDate;
  const endDate = range.endDate > today ? today : range.endDate;
  return startDate > endDate ? null : { startDate, endDate };
}
export const safeAdUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
};
export async function getGoogleAdsClicks(range: DateRange, campaignId?: string, requestedDate?: string): Promise<AdsClickReport> {
  if (requestedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !Number.isFinite(Date.parse(requestedDate)) || new Date(requestedDate).toISOString().slice(0, 10) !== requestedDate || requestedDate < range.startDate || requestedDate > range.endDate)) throw new Error('Invalid click date.');
  const { search, accountId } = await getGoogleAdsReader(range, campaignId);
  const customerRows = await search('SELECT customer.time_zone FROM customer LIMIT 1');
  const timeZone = customerRows[0]?.customer?.timeZone;
  if (!timeZone) throw new Error('Account time zone unavailable.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const today = ['year', 'month', 'day'].map(part => parts.find(value => value.type === part)?.value).join('-');
  const effectiveRange = clickDateRange(range, today);
  const warnings: string[] = [];
  if (!effectiveRange || effectiveRange.startDate !== range.startDate || effectiveRange.endDate !== range.endDate) warnings.push('ClickView is limited to the most recent 90 calendar days through today. Older or future dates are not reported here.');
  const report: AdsClickReport = { accountId, timeZone, fetchedAt: new Date().toISOString(), effectiveRange, days: [], selectedDate: null, records: [], ads: {}, availability: { clicks: !!effectiveRange, locations: true, ads: true }, warnings };
  if (!effectiveRange) return report;
  if (requestedDate && (requestedDate < effectiveRange.startDate || requestedDate > effectiveRange.endDate)) throw new Error('Click date is outside the supported ClickView window.');
  const campaignFilter = campaignId ? ` AND campaign.id = ${campaignId}` : '';
  const dates = await search(`SELECT segments.date, metrics.clicks FROM campaign WHERE campaign.status != 'REMOVED'${campaignFilter} AND segments.date BETWEEN '${effectiveRange.startDate}' AND '${effectiveRange.endDate}' AND metrics.clicks > 0`);
  const byDate = new Map<string, number>();
  for (const row of dates) if (/^\d{4}-\d{2}-\d{2}$/.test(row.segments?.date) && row.segments.date >= effectiveRange.startDate && row.segments.date <= effectiveRange.endDate) byDate.set(row.segments.date, (byDate.get(row.segments.date) || 0) + Number(row.metrics?.clicks || 0));
  report.days = Array.from(byDate, ([date, clicks]) => ({ date, clicks })).sort((a, b) => b.date.localeCompare(a.date));
  report.selectedDate = requestedDate || report.days[0]?.date || null;
  if (!report.selectedDate) return report;
  let rows: any[];
  try {
    rows = await search(`SELECT click_view.gclid, click_view.ad_group_ad, click_view.keyword_info.text, click_view.keyword_info.match_type, click_view.location_of_presence.city, click_view.location_of_presence.region, click_view.location_of_presence.country, campaign.id, campaign.name, ad_group.name, segments.date, segments.device, segments.ad_network_type, metrics.clicks FROM click_view WHERE segments.date = '${report.selectedDate}'${campaignFilter}`);
  } catch { report.availability.clicks = false; warnings.push('Click records unavailable for this day. This is a failed request, not a zero-click result.'); return report; }
  const geoId = (value: unknown) => String(value || '').match(/^geoTargetConstants\/(\d+)$/)?.[1];
  const geoIds = new Set<string>();
  const adResources = new Set<string>();
  for (const row of rows) {
    for (const value of Object.values(row.clickView?.locationOfPresence || {})) { const id = geoId(value); if (id) geoIds.add(id); }
    if (new RegExp(`^customers/${accountId}/adGroupAds/\\d+~\\d+$`).test(row.clickView?.adGroupAd || '')) adResources.add(row.clickView.adGroupAd);
  }
  const locations = new Map<string, string>();
  try {
    const ids = Array.from(geoIds);
    for (let i = 0; i < ids.length; i += 200) {
      const resolved = await search(`SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.canonical_name FROM geo_target_constant WHERE geo_target_constant.id IN (${ids.slice(i, i + 200).join(',')})`);
      for (const row of resolved) locations.set(String(row.geoTargetConstant.id), row.geoTargetConstant.name || row.geoTargetConstant.canonicalName);
    }
  } catch { report.availability.locations = false; warnings.push('Some location names are unavailable; location IDs are preserved.'); }
  const location = (value: unknown) => { const id = geoId(value); return id ? locations.get(id) || `Location ${id}` : null; };
  report.records = rows.map((row, index): AdsClickRecord => ({ recordId: String(row.clickView?.resourceName || `${report.selectedDate}:${index}`), gclid: row.clickView?.gclid || null, date: row.segments?.date || report.selectedDate!, campaignId: String(row.campaign?.id || ''), campaign: row.campaign?.name || '', adGroup: row.adGroup?.name || '', adResource: adResources.has(row.clickView?.adGroupAd) ? row.clickView.adGroupAd : null, keyword: row.clickView?.keywordInfo?.text || null, matchType: row.clickView?.keywordInfo?.matchType || null, device: row.segments?.device || null, network: row.segments?.adNetworkType || null, location: { country: location(row.clickView?.locationOfPresence?.country), region: location(row.clickView?.locationOfPresence?.region), city: location(row.clickView?.locationOfPresence?.city) }, clicks: Number(row.metrics?.clicks || 0) }));
  try {
    const refs = Array.from(adResources);
    for (let i = 0; i < refs.length; i += 100) {
      const ads = await search(`SELECT ad_group_ad.resource_name, ad_group_ad.ad.id, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.ad.responsive_search_ad.path1, ad_group_ad.ad.responsive_search_ad.path2 FROM ad_group_ad WHERE ad_group_ad.resource_name IN (${refs.slice(i, i + 100).map(ref => `'${ref}'`).join(',')})`);
      for (const row of ads) {
        const ad = row.adGroupAd.ad; const rsa = ad.responsiveSearchAd;
        const assets: ClickAdAssets = { adId: String(ad.id), finalUrl: safeAdUrl(ad.finalUrls?.[0]), headlines: (rsa?.headlines || []).map((asset: any) => String(asset.text)), descriptions: (rsa?.descriptions || []).map((asset: any) => String(asset.text)), path: [rsa?.path1, rsa?.path2].filter(Boolean).join('/') };
        report.ads[row.adGroupAd.resourceName] = assets;
      }
    }
  } catch { report.availability.ads = false; warnings.push('Current ad assets could not be loaded. Click records remain available.'); }
  return report;
}
