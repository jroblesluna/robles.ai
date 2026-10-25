# Admin advertising and website analytics

The Ads tab is scoped to a configured Google Ads customer ID (default `5850899991`) and an optional campaign ID. The date range applies to all displayed reports. The Traffic tab contains website-wide channels, including historical organic, direct and paid traffic; those rows are not totals from the current advertising campaigns.

## Sources and results

- **Direct Google Ads API**: campaign catalog (including paused zero-activity campaigns), average daily budgets, spend, impressions, clicks, primary Ads conversions, and daily spend. Micro currency units are converted to the account currency. No campaign mutation endpoints are implemented.
- **GA4 fallback**: explicitly labeled imported data, constrained by Google Ads customer/campaign IDs. Campaign key events include all configured types and must not be labeled qualified leads. Imported reports can lag behind Ads. An empty import does not prove zero spending.
- **Website submissions**: counts only `generate_lead`, attributed to the configured Ads customer and optional campaign. Contact means form acceptance by the server; quiz registration is recorded before email verification. Neither is a qualification decision. Contact/quiz filters require the event-scoped `form_id` custom dimension; missing definitions yield unavailable breakdowns, never fabricated zeros. Registering a dimension does not backfill past values.
- **Website channel rate**: uses GA4 `sessionKeyEventRate`, not `keyEvents / sessions`. Key-event counts can exceed sessions because multiple events can occur per session.

A failed cost, daily-spend or result query is marked unavailable. Successful sibling queries can still be displayed with warnings. Partial reports are not cached. Refresh clears server cache and invalidates active client analytics queries.

## Direct API connection

Settings → Google Ads API (Analytics) accepts `google_ads_customer_id`, `google_ads_client_id`, `google_ads_client_secret`, `google_ads_refresh_token` and optional `google_ads_login_customer_id`. Secrets use the existing protected settings storage/masking policy. They are never returned unmasked to the frontend. API and OAuth endpoints are fixed to official Google hosts; credentials stay on the server. The provider uses REST v26 `googleAds:search` only, follows pagination, and does not silently replace direct API failures with GA4 zero values.

The OAuth client project needs production Google Ads API access, and its authorized user must have access to the Ads customer. An ordinary Cloud login or GA4 service-account file does not establish that connection. Existing GA4 credentials remain independent.

For a Desktop OAuth client, the operator can use the loopback helper. It requests offline Ads authorization, verifies direct customer access, and saves the renewable credential through the authenticated production admin API. This is a persistent server authorization: obtain the owner's consent before starting it. The helper never writes a local token file or prints secrets.

```sh
export ROBLES_ADMIN_EMAIL=antonio@robles.ai
read -s ROBLES_ADMIN_PASSWORD
export ROBLES_ADMIN_PASSWORD
node scripts/connectGoogleAds.mjs /absolute/path/to/desktop-client.json 5850899991
unset ROBLES_ADMIN_PASSWORD
```

The operator opens the printed Google authorization URL on the same machine and completes consent. The helper binds only to 127.0.0.1, checks OAuth state and PKCE, uses fixed HTTPS endpoints, and logs out its temporary admin session. Do not commit client JSON, refresh tokens, passwords or exported settings.

## Validation

```sh
npm test -- server/services/__tests__/googleAdsReport.test.ts server/services/__tests__/googleAdsApi.test.ts server/services/__tests__/ga4Client.test.ts server/__tests__/adsAnalyticsRoutes.test.ts src/components/admin/analytics/__tests__/AdsReporting.test.tsx
npm run build
```

After deploying, check authenticated reports for the account/date range, campaign-specific totals, channel session rates, and explicit missing-custom-dimension states. Check the public API returns 401 without admin authentication. No paid ad clicks or lead submissions are required for these checks.
