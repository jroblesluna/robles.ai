// server/services/linkedin.ts
// Thin re-export wrapper for backward compatibility.
// The actual implementation has moved to platforms/linkedinAdapter.ts.

export {
  refreshAccessToken,
  getValidAccessToken,
  uploadImageToLinkedIn,
  publishPost,
  publishPostWithDocument,
  LinkedInAdapter,
} from './platforms/linkedinAdapter.js';
