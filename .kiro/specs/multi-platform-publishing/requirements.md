# Requirements Document

## Introduction

Multi-platform publishing extends El Dominical IA to publish the weekly newsletter to Instagram and Facebook in addition to the existing LinkedIn integration. Each platform maintains an independent publication status, allowing selective publishing. The system adapts content format per platform: PDF carousel for LinkedIn, multi-image carousel for Instagram, and multi-image or link posts for Facebook.

## Glossary

- **Publishing_Engine**: The backend service responsible for orchestrating content publishing to social media platforms
- **Platform_Adapter**: A service module that handles API communication and content formatting for a specific social platform (LinkedIn, Instagram, or Facebook)
- **Admin_UI**: The admin interface at /admin/dominical/:id where editors manage and publish reports
- **Dominical_Report**: A weekly newsletter report stored in the `dominical_reports` table, containing post text, selected news, and carousel slides
- **Platform_Status**: The publication state for a specific platform, one of: `not_published`, `publishing`, `published`, or `failed`
- **Carousel_Slides**: The set of 1080x1080 PNG images generated for a report, used as visual content across platforms
- **Meta_Graph_API**: The Facebook/Instagram Graph API used for publishing to both Facebook Pages and Instagram Business accounts
- **Content_Formatter**: A module that adapts post text and media to meet platform-specific constraints (character limits, media formats)

## Requirements

### Requirement 1: Independent Platform Status Tracking

**User Story:** As an admin, I want each social platform to have its own publication status per report, so that I can publish to LinkedIn without affecting Instagram or Facebook status.

#### Acceptance Criteria

1. THE Publishing_Engine SHALL maintain a separate Platform_Status for each supported platform (LinkedIn, Instagram, Facebook) per Dominical_Report
2. WHEN a Dominical_Report is created, THE Publishing_Engine SHALL initialize all Platform_Status values to `not_published`
3. WHEN publishing to one platform succeeds, THE Publishing_Engine SHALL update only that platform's Platform_Status to `published` without modifying other platforms' statuses
4. WHEN publishing to one platform fails, THE Publishing_Engine SHALL set that platform's Platform_Status to `failed` and store the error message, without affecting other platforms
5. THE Publishing_Engine SHALL store the platform-specific post identifier (e.g., LinkedIn post URN, Instagram media ID, Facebook post ID) upon successful publication

### Requirement 2: Platform-Specific Content Formatting

**User Story:** As an admin, I want the system to automatically adapt my post content to each platform's requirements, so that posts display correctly on LinkedIn, Instagram, and Facebook.

#### Acceptance Criteria

1. WHEN publishing to LinkedIn, THE Content_Formatter SHALL format the post as a document carousel (PDF) when two or more Carousel_Slides are available, or as a text-with-image post otherwise
2. WHEN publishing to Instagram, THE Content_Formatter SHALL format the post as a multi-image carousel using the individual Carousel_Slides (1080x1080 PNG images)
3. WHEN publishing to Facebook, THE Content_Formatter SHALL format the post as a multi-image post using the individual Carousel_Slides
4. WHEN the post text exceeds a platform's character limit (LinkedIn: 3000, Instagram: 2200, Facebook: 63206), THE Content_Formatter SHALL truncate the text to fit within the limit while preserving complete sentences
5. THE Content_Formatter SHALL preserve hashtags and mentions when truncating text, moving them to the end of the truncated content if necessary

### Requirement 3: Instagram Publishing via Meta Graph API

**User Story:** As an admin, I want to publish El Dominical IA as an Instagram carousel post, so that I can reach my Instagram audience with the weekly newsletter.

#### Acceptance Criteria

1. WHEN the admin triggers Instagram publishing, THE Platform_Adapter SHALL create an Instagram carousel post using the individual Carousel_Slides as image items
2. WHEN creating an Instagram carousel, THE Platform_Adapter SHALL upload each slide image as a container item, then create a carousel container referencing all items, and finally publish the carousel container
3. IF the Instagram access token is expired or invalid, THEN THE Platform_Adapter SHALL attempt a token refresh and retry the operation once before marking the Platform_Status as `failed`
4. IF fewer than two Carousel_Slides are available, THEN THE Platform_Adapter SHALL publish a single-image post using the first available slide or the report's cover image
5. THE Platform_Adapter SHALL store the resulting Instagram media ID in the Dominical_Report upon successful publication

### Requirement 4: Facebook Publishing via Meta Graph API

**User Story:** As an admin, I want to publish El Dominical IA to a Facebook Page, so that I can reach my Facebook audience with the weekly newsletter.

#### Acceptance Criteria

1. WHEN the admin triggers Facebook publishing, THE Platform_Adapter SHALL create a multi-photo post on the configured Facebook Page using the Carousel_Slides as attached images
2. WHEN creating a Facebook multi-photo post, THE Platform_Adapter SHALL upload each slide image individually, then create a post referencing all uploaded photo IDs
3. IF the Facebook Page access token is expired or invalid, THEN THE Platform_Adapter SHALL attempt a token refresh and retry the operation once before marking the Platform_Status as `failed`
4. IF no Carousel_Slides are available, THEN THE Platform_Adapter SHALL publish a text-only post with the report's cover image attached
5. THE Platform_Adapter SHALL store the resulting Facebook post ID in the Dominical_Report upon successful publication

### Requirement 5: Admin UI for Multi-Platform Publishing

**User Story:** As an admin, I want to see the publication status for each platform and publish to each one independently from the admin detail page, so that I have full control over where and when the newsletter is distributed.

#### Acceptance Criteria

1. THE Admin_UI SHALL display the current Platform_Status for each platform (LinkedIn, Instagram, Facebook) on the Dominical_Report detail page
2. THE Admin_UI SHALL provide an independent publish button for each platform that has a Platform_Status of `not_published` or `failed`
3. WHILE a platform's Platform_Status is `publishing`, THE Admin_UI SHALL display a loading indicator and disable the publish button for that platform
4. WHEN a platform's Platform_Status is `published`, THE Admin_UI SHALL display a success indicator and the publication timestamp for that platform
5. WHEN a platform's Platform_Status is `failed`, THE Admin_UI SHALL display the error message and provide a retry button for that platform
6. THE Admin_UI SHALL provide a "Publish to All" button that triggers publication to all platforms with `not_published` status simultaneously

### Requirement 6: Platform Credential Management

**User Story:** As an admin, I want to configure and manage API credentials for Instagram and Facebook independently, so that I can connect and disconnect platforms without affecting others.

#### Acceptance Criteria

1. THE Admin_UI SHALL provide a settings section where the admin can configure Meta Graph API credentials (app ID, app secret, page access token, Instagram business account ID, Facebook page ID)
2. WHEN Meta credentials are saved, THE Publishing_Engine SHALL validate the credentials by making a test API call to verify permissions
3. IF credential validation fails, THEN THE Publishing_Engine SHALL display a descriptive error indicating which permission or configuration is missing
4. THE Publishing_Engine SHALL store all platform credentials securely in the settings table
5. WHEN a platform's credentials are not configured, THE Admin_UI SHALL display the publish button for that platform as disabled with a tooltip indicating credentials are required

### Requirement 7: Auto-Publish Extension for Multiple Platforms

**User Story:** As an admin, I want the auto-publish feature to support publishing to all configured platforms, so that the weekly newsletter is distributed automatically across all channels.

#### Acceptance Criteria

1. WHEN auto-publish is triggered, THE Publishing_Engine SHALL attempt to publish to all platforms that have valid credentials configured and a Platform_Status of `not_published`
2. IF auto-publish fails for one platform, THEN THE Publishing_Engine SHALL continue attempting to publish to remaining platforms independently
3. WHEN auto-publish completes, THE Publishing_Engine SHALL send a single notification email summarizing the result for each platform (success or failure with error details)
4. THE Publishing_Engine SHALL respect platform-specific rate limits by spacing publication attempts with a minimum 5-second delay between platforms
