# Requirements: El Dominical IA

## R1: Admin Setup & Authentication

### R1.1: First-time Setup
WHEN no admin user exists in the system
THE SYSTEM SHALL display a setup form at `/admin` requesting email and password (entered twice for confirmation)

WHEN the user submits valid setup data (matching passwords, valid email format)
THE SYSTEM SHALL create the first admin user with status `active` and redirect to login

WHEN the user submits mismatched passwords
THE SYSTEM SHALL display an error "Passwords do not match" and not create any user

### R1.2: Admin Login
WHEN an admin user exists and is not authenticated
THE SYSTEM SHALL display a login form at `/admin` requesting email and password

WHEN the user submits valid credentials
THE SYSTEM SHALL authenticate the user, set a secure session (JWT in httpOnly cookie, 7 days), and redirect to `/admin` dashboard

WHEN the user submits invalid credentials
THE SYSTEM SHALL display "Invalid email or password" and not authenticate

### R1.3: Protected Routes
WHEN an unauthenticated user attempts to access any `/admin/*` route (except `/admin` itself for setup/login)
THE SYSTEM SHALL redirect to `/admin` login

WHEN an authenticated admin accesses `/admin`
THE SYSTEM SHALL display the admin dashboard with navigation to dominical and settings

### R1.4: Logout
WHEN an authenticated admin clicks "Logout"
THE SYSTEM SHALL clear the session cookie and redirect to `/admin`

---

## R2: Admin Settings

### R2.1: LinkedIn OAuth Configuration
WHEN the admin navigates to `/admin/settings`
THE SYSTEM SHALL display fields for LinkedIn client_id and client_secret

WHEN the admin clicks "Connect LinkedIn" (after saving client_id and client_secret)
THE SYSTEM SHALL redirect to LinkedIn OAuth authorization URL with scope `w_member_social`

WHEN LinkedIn redirects back with an authorization code
THE SYSTEM SHALL exchange the code for access_token and refresh_token, store them securely in the database, and display "LinkedIn connected" with expiry date

### R2.2: Image Generation Provider
WHEN the admin navigates to `/admin/settings`
THE SYSTEM SHALL display a selector with options: DALL-E 3, Stability AI, Replicate FLUX

WHEN the admin selects a provider that requires an API key (Stability, Replicate)
THE SYSTEM SHALL display the corresponding API key input field

### R2.3: Dominical Preferences
WHEN the admin navigates to `/admin/settings`
THE SYSTEM SHALL display:
- Notification email (default: antonio@robles.ai)
- Auto-publish toggle (on/off, default: on)
- Number of news to select (3-7, default: 5)

WHEN the admin saves settings
THE SYSTEM SHALL persist all values to the database and display a success confirmation

### R2.4: Sensitive Data Display
WHEN displaying stored API keys or tokens
THE SYSTEM SHALL show only the last 4 characters, masked (e.g., `••••••••ab3f`)

---

## R3: Weekly Report Generation (Saturday Job)

### R3.1: Scheduled Generation
AT 12:00pm America/Lima every Saturday
THE SYSTEM SHALL:
1. Collect all blog posts generated in the last 7 days from `server/data/posts/`
2. Send them to GPT-4o for relevance scoring (score 1-10 + one-line reason per post)
3. Select the top N posts (configured in settings, default 5)
4. Generate a LinkedIn post draft (hook + 1-2 opinion lines per selected news + closing with hashtags)
5. Store the report in `dominical_reports` with status `pending_review`

### R3.2: Notification
WHEN a new Dominical report is generated
THE SYSTEM SHALL send an email to the configured notification address with:
- Subject: "Tu Dominical IA de esta semana está listo para revisión"
- Body: short summary of selected news titles
- Link: direct URL to `/admin/dominical`

### R3.3: Manual Trigger
WHEN an authenticated admin clicks "Generate Now" in `/admin/dominical`
THE SYSTEM SHALL execute the generation job immediately (same logic as scheduled)

---

## R4: Dominical Review Panel

### R4.1: Report Listing
WHEN an authenticated admin navigates to `/admin/dominical`
THE SYSTEM SHALL display a list of recent weekly reports with: week dates, status badge, creation date

### R4.2: Report Detail View
WHEN the admin opens a specific report
THE SYSTEM SHALL display:
- Left panel: all news of the week (scrollable), with selected ones highlighted (showing score and reason)
- Right panel: editable textarea with the LinkedIn post draft + character counter (max 3000)
- Image section: preview of current image + options (upload file, paste URL, generate with AI)
- Action buttons: "Send to LinkedIn", "Cancel this week"

### R4.3: Editing
WHEN the admin edits the post text, changes selected news, or updates the image
THE SYSTEM SHALL update `last_edited_at` timestamp and change status to `edited`

### R4.4: Manual Selection
WHEN the admin checks/unchecks a news item in the selection
THE SYSTEM SHALL update the selected_news list and optionally offer to regenerate the post text based on new selection

### R4.5: Image Generation
WHEN the admin clicks "Generate image from selected news"
THE SYSTEM SHALL use the configured image provider to generate an image based on the selected news titles/themes and display the preview

### R4.6: Manual Publish
WHEN the admin clicks "Send to LinkedIn"
THE SYSTEM SHALL publish the current post text (and image if present) to LinkedIn via the Share API, mark status as `published`, and store the LinkedIn post ID

### R4.7: Cancel Publication
WHEN the admin clicks "Cancel this week"
THE SYSTEM SHALL mark the report as `cancelled` and prevent auto-publish

---

## R5: Auto-Publish (Sunday Job)

### R5.1: Scheduled Auto-Publish
AT 12:00pm America/Lima every Sunday
THE SYSTEM SHALL check the current week's dominical report and:
- IF status is `cancelled` → do nothing
- IF status is `published` → do nothing (already published manually)
- IF `last_edited_at` > `created_at` → publish the edited version
- IF no edits were made → publish the auto-generated version

### R5.2: Publish Success
WHEN LinkedIn publish succeeds
THE SYSTEM SHALL mark status as `published`, store `published_at` timestamp and `linkedin_post_id`

### R5.3: Publish Failure
WHEN LinkedIn publish fails
THE SYSTEM SHALL mark status as `failed`, store the error in `error_log`, and send an error notification email to the admin

### R5.4: Token Refresh
WHEN the LinkedIn access token is expired at publish time
THE SYSTEM SHALL attempt to refresh using the refresh_token

WHEN the refresh token is also expired (>365 days)
THE SYSTEM SHALL mark as `failed`, notify admin by email to reconnect LinkedIn in settings

---

## R6: Database & Cleanup

### R6.1: Remove Dead Dependencies
WHEN this feature is implemented
THE SYSTEM SHALL remove `drizzle-orm`, `drizzle-zod` from package.json, delete `shared/schema.ts`, and remove the `db:push` script

### R6.2: SQLite Setup
WHEN the server starts
THE SYSTEM SHALL open/create `server/data/dominical.db` and ensure all tables exist (admin_users, settings, dominical_reports)

### R6.3: Gitignore
THE SYSTEM SHALL add `server/data/dominical.db` to `.gitignore`
