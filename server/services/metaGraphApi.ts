// server/services/metaGraphApi.ts
// Single source of truth for the Meta Graph API version used by publishing and insights.
// Check https://developers.facebook.com/docs/graph-api/changelog/versions before bumping.

export const GRAPH_API_VERSION = 'v26.0';
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
