# Implementation Plan: Multi-Platform Publishing

## Overview

Extend El Dominical IA from LinkedIn-only publishing to multi-platform (LinkedIn, Instagram, Facebook) using a platform adapter pattern. Each platform has an independent publish lifecycle with per-platform status tracking, content formatting, and credential management. Implementation is incremental: data layer first, then shared engine logic, platform adapters, API endpoints, and finally the frontend UI.

## Tasks

- [x] 1. Data layer and platform types
  - [x] 1.1 Create the `platform_publish_status` table and run data migration
    - Create a new migration file at `server/migrations/` that creates the `platform_publish_status` table with columns: id, report_id, platform, status, platform_post_id, error_message, published_at, created_at, updated_at
    - Add CHECK constraints for platform ('linkedin', 'instagram', 'facebook') and status ('not_published', 'publishing', 'published', 'failed')
    - Add UNIQUE(report_id, platform) constraint and FOREIGN KEY to dominical_reports
    - Write migration logic to backfill existing published LinkedIn reports into the new table
    - Initialize all three platform rows for existing reports
    - Wire migration into the server startup (similar to existing db initialization pattern)
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Define shared platform types and adapter interface
    - Create `server/services/platforms/types.ts` with `PlatformName`, `PlatformStatus`, `PublishRequest`, `PublishResult`, and `PlatformAdapter` interface as specified in the design
    - Export all types for use across adapters and engine
    - _Requirements: 1.1, 2.1, 2.2, 2.3_

  - [x] 1.3 Write property test for platform status initialization
    - **Property 1: Platform Status Initialization Invariant**
    - Test that after calling initializeStatuses for any report ID, exactly 3 rows exist with status `not_published`
    - **Validates: Requirements 1.1, 1.2**

- [x] 2. Content formatter (pure logic layer)
  - [x] 2.1 Implement content formatter module
    - Create `server/services/platforms/contentFormatter.ts`
    - Implement `truncateText(text, maxLength)` — truncate at sentence boundary, fallback to word boundary with ellipsis
    - Implement `extractHashtagsAndMentions(text)` — separate body, hashtags, and mentions
    - Implement `formatForPlatform(platform, rawText, slideImageUrls, pdfBuffer?, coverImageUrl?)` with format selection logic per platform:
      - LinkedIn: `carousel_pdf` when slides >= 2, else `single_image`
      - Instagram: `multi_image` when slides >= 2, else `single_image`
      - Facebook: `multi_image` when slides >= 1, else `text_only` with cover image
    - Apply platform character limits (LinkedIn: 3000, Instagram: 2200, Facebook: 63206) via truncateText
    - Preserve hashtags and mentions by appending them after truncation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Write property test for text truncation
    - **Property 4: Text Truncation Respects Platform Limits**
    - Use fast-check to generate arbitrary strings and verify output length <= maxLength
    - Verify sentence boundary or word boundary truncation
    - **Validates: Requirements 2.4**

  - [x] 2.3 Write property test for hashtag and mention preservation
    - **Property 5: Hashtag and Mention Preservation During Truncation**
    - Use fast-check to generate text with embedded #hashtags and @mentions
    - Verify all hashtags and mentions from original text appear in truncated output
    - **Validates: Requirements 2.5**

  - [x] 2.4 Write property test for format selection by slide count
    - **Property 6: Format Selection by Slide Count**
    - Use fast-check to generate arbitrary slide counts (0..20) and verify correct media type selection per platform
    - **Validates: Requirements 2.1**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Publishing engine and LinkedIn adapter refactor
  - [x] 4.1 Implement the PublishingEngine class
    - Create `server/services/platforms/publishingEngine.ts`
    - Implement `initializeStatuses(reportId)` — insert 3 rows into `platform_publish_status`
    - Implement `getStatuses(reportId)` — query all platform statuses for a report
    - Implement `publishToPlatform(reportId, platform)` — set status to `publishing`, call adapter, update to `published`/`failed`
    - Implement `publishToAll(reportId)` — publish to all eligible platforms (has credentials + not_published) with 5-second delay between attempts
    - Wrap each platform call in try/catch to ensure failure isolation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.4_

  - [x] 4.2 Refactor existing LinkedIn service into adapter pattern
    - Create `server/services/platforms/linkedinAdapter.ts` implementing `PlatformAdapter` interface
    - Move existing publish logic from `server/services/linkedin.ts` into the adapter's `publish()` method
    - Implement `hasCredentials()` checking LinkedIn settings keys
    - Implement `validateCredentials()` with a lightweight API call
    - Preserve the existing `refreshAccessToken` retry behavior
    - Keep `server/services/linkedin.ts` as a thin re-export for backward compatibility
    - _Requirements: 1.3, 1.4, 1.5, 2.1_

  - [x] 4.3 Write property test for publish operation isolation
    - **Property 2: Publish Operation Isolation**
    - Simulate publish to one platform and verify other platform statuses remain unchanged
    - **Validates: Requirements 1.3, 1.4**

  - [x] 4.4 Write property test for post ID storage on success
    - **Property 3: Post ID Storage on Success**
    - Simulate successful publish with a mock post ID and verify it's stored correctly
    - **Validates: Requirements 1.5, 3.5, 4.5**

- [x] 5. Instagram and Facebook adapters
  - [x] 5.1 Implement Instagram adapter
    - Create `server/services/platforms/instagramAdapter.ts` implementing `PlatformAdapter`
    - Implement carousel publishing flow: create item containers → create carousel container → publish
    - Handle single-image fallback when fewer than 2 slides are available
    - Implement token refresh retry on 401/403 errors
    - Limit carousel to max 10 images (Instagram constraint)
    - Store resulting media ID on success
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Implement Facebook adapter
    - Create `server/services/platforms/facebookAdapter.ts` implementing `PlatformAdapter`
    - Implement multi-photo post flow: upload photos unpublished → create post with attached_media
    - Handle text-only fallback when no slides available (use cover image)
    - Implement token refresh retry on 401/403 errors
    - Store resulting post ID on success
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.3 Create public slides endpoint for Meta API access
    - Add GET `/api/public/slides/:reportId/:position` route to serve slide images as publicly accessible URLs
    - Read slide PNG from the file system based on report ID and position
    - Set appropriate Content-Type headers and caching
    - This endpoint does NOT require auth (Meta servers need to access it)
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

  - [x] 5.4 Write unit tests for Instagram adapter
    - Mock Meta Graph API responses for carousel creation flow
    - Test token refresh retry logic
    - Test edge cases: 0 slides, 1 slide, 10+ slides
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.5 Write unit tests for Facebook adapter
    - Mock Meta Graph API responses for multi-photo post flow
    - Test token refresh retry logic
    - Test edge cases: 0 slides, text-only fallback
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. API endpoints and auto-publish integration
  - [x] 7.1 Add platform publishing API routes
    - Add GET `/api/admin/dominical/:id/publish-status` — returns all platform statuses for a report
    - Add POST `/api/admin/dominical/:id/publish/:platform` — triggers publish to a specific platform, validates platform name
    - Add POST `/api/admin/dominical/:id/publish-all` — triggers publish to all eligible platforms
    - All endpoints require auth via `requireAuth` middleware
    - Return appropriate error responses for invalid platform names or missing credentials
    - _Requirements: 5.2, 5.6, 1.3_

  - [x] 7.2 Integrate PublishingEngine with auto-publish job
    - Modify the existing auto-publish logic to call `PublishingEngine.publishToAll()` instead of publishing only to LinkedIn
    - Add 5-second delay between platform publish attempts
    - Update notification email to include per-platform results (success/failure for each)
    - Ensure failure on one platform does not block others
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.3 Write property test for auto-publish platform selection
    - **Property 7: Auto-Publish Platform Selection and Independence**
    - Use fast-check to generate arbitrary credential/status configurations
    - Verify only platforms with credentials AND `not_published` status are attempted
    - Verify all eligible platforms are attempted even when some fail
    - **Validates: Requirements 7.1, 7.2**

- [x] 8. Platform credential management (Settings UI + backend)
  - [x] 8.1 Add Meta credential settings endpoints
    - Add POST `/api/admin/settings/meta` to save Meta/Facebook/Instagram credentials (app_id, app_secret, instagram_business_account_id, instagram_access_token, facebook_page_id, facebook_page_access_token)
    - Add GET `/api/admin/settings/meta` to retrieve current Meta credential status (configured/not, without exposing secrets)
    - Add POST `/api/admin/settings/meta/validate` to test credentials via API calls (verify permissions)
    - Return descriptive error messages for missing permissions or invalid tokens
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 8.2 Add Meta credentials section to AdminSettings page
    - Add a "Meta (Instagram & Facebook)" section to `src/pages/admin/AdminSettings.tsx`
    - Include input fields for: Meta App ID, App Secret, Instagram Business Account ID, Instagram Access Token, Facebook Page ID, Facebook Page Access Token
    - Add a "Validate Credentials" button that calls the validate endpoint and displays results
    - Show success/error status for each credential validation
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Admin UI for multi-platform publishing
  - [x] 9.1 Create PlatformPublishStatus component
    - Create `src/components/admin/PlatformPublishStatus.tsx`
    - Display status badges for each platform (LinkedIn, Instagram, Facebook) with icons
    - Show loading spinner when status is `publishing`
    - Show success indicator with timestamp when `published`
    - Show error message with retry button when `failed`
    - Show publish button when `not_published` (disabled if credentials not configured, with tooltip)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 9.2 Integrate PlatformPublishStatus into AdminDominicalDetail page
    - Replace the existing single LinkedIn publish button section in `src/pages/admin/AdminDominicalDetail.tsx` with the new `PlatformPublishStatus` component
    - Add a "Publish to All" button that calls the publish-all endpoint
    - Wire up react-query mutations for each publish action
    - Add polling/refetch for status updates while any platform is in `publishing` state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 9.3 Write unit tests for PlatformPublishStatus component
    - Test rendering for each status state (not_published, publishing, published, failed)
    - Test button disabled state when credentials not configured
    - Test retry button visibility on failed state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing LinkedIn publish flow is preserved during migration via adapter refactoring
- Meta Graph API requires publicly accessible image URLs — the public slides endpoint (5.3) must be deployed/accessible before Instagram/Facebook publishing can work in production

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "5.5", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 7, "tasks": ["8.2", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3"] }
  ]
}
```
