# Implementation Plan: Dominical Carousel Images

## Overview

This plan implements the LinkedIn carousel generation system for "El Dominical IA" weekly reports. It follows a bottom-up approach: database schema and shared types first, then backend services (engagement phrases → image generation → slide composition → PDF export), then API endpoints, and finally the frontend carousel preview and editing UI.

## Tasks

- [x] 1. Database schema and shared types
  - [x] 1.1 Create the `carousel_slides` table in the SQLite database
    - Add the CREATE TABLE IF NOT EXISTS statement to `server/db.ts` for the `carousel_slides` table
    - Include columns: id, report_id, position, slide_type, article_slug, title_text, engagement_phrase, background_image_path, composite_image_path, status, error_message, created_at, updated_at
    - Add CHECK constraints for slide_type ('cover', 'article', 'cta') and status ('pending', 'generating', 'generated', 'failed')
    - Add UNIQUE constraint on (report_id, position) and FOREIGN KEY on report_id
    - _Requirements: 11.1, 11.2_

  - [x] 1.2 Define shared TypeScript interfaces for carousel types
    - Create `server/services/carouselTypes.ts` with interfaces: SlideResult, SlideError, CarouselGenerationResult, ArticleInput, ComposeSlideOptions, ComposeCoverOptions, ComposeCTAOptions, PdfExportResult
    - Include slide_type literal union type and status literal union type
    - _Requirements: 11.1_

- [x] 2. Engagement phrase generation service
  - [x] 2.1 Implement the EngagementPhraseService
    - Create `server/services/engagementPhrases.ts`
    - Implement `generateEngagementPhrases(articles: ArticleInput[], apiKey: string)` that makes a single GPT-4o call with a system prompt requesting one Spanish engagement phrase per article (≤80 characters each)
    - Parse the response JSON array and validate each phrase is ≤80 chars
    - Implement retry logic: on failure, retry once; on second failure throw descriptive error
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Write property test for engagement phrase length constraint
    - **Property 1: Engagement phrase length constraint**
    - **Validates: Requirements 1.2**
    - Use fast-check to generate arbitrary ArticleInput arrays, mock GPT-4o to return phrases, verify all phrases are ≤80 chars and non-empty

  - [x] 2.3 Write unit tests for EngagementPhraseService
    - Test retry logic fires exactly once on GPT-4o failure
    - Test that phrases are generated in Spanish
    - Test error propagation on double failure
    - _Requirements: 1.4_

- [x] 3. Background image generation for carousel slides
  - [x] 3.1 Implement carousel-specific image generation
    - Create `server/services/carouselImageGen.ts`
    - Implement `generateCarouselBackgroundImage(articleTitle: string, categories: string[], apiKey: string, outputPath: string)` that:
      - Builds a prompt from article title and categories for a 1080x1080 abstract background
      - Calls gpt-image-1 with `size: "1024x1024"` (closest supported) and saves the PNG to `outputPath`
      - Uses `sharp` to resize to exactly 1080x1080 if needed
    - Implement `generateCoverBackground(apiKey: string, outputPath: string)` for abstract branded cover
    - Implement `generateCTABackground(apiKey: string, outputPath: string)` for CTA slide
    - Ensure the `server/data/carousel/{reportId}/backgrounds/` directory is created
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Write property test for image dimensions
    - **Property 5: All slides produce 1080x1080 PNG output**
    - **Validates: Requirements 2.2, 3.5, 5.3, 7.2**
    - Use fast-check to generate arbitrary slide types and verify sharp metadata returns 1080x1080

  - [x] 3.3 Write property test for file path association
    - **Property 3: File path association with report ID**
    - **Validates: Requirements 2.3**
    - Use fast-check to generate arbitrary report IDs, verify generated file paths contain the report ID as a path component

- [x] 4. Slide compositor service
  - [x] 4.1 Implement the SlideCompositor with SVG text overlay
    - Create `server/services/slideCompositor.ts`
    - Implement `composeArticleSlide(options: ComposeSlideOptions)` that:
      - Reads the background PNG with sharp
      - Generates an SVG overlay with: semi-transparent dark gradient at bottom third, article title (white, bold, max 2 lines), engagement phrase (light blue #93c5fd, italic)
      - Composites the logo at top-left (40px padding, 120x120)
      - Composites the SVG text overlay
      - Outputs final 1080x1080 PNG
    - Implement `composeCoverSlide(options: ComposeCoverOptions)` with logo, "El Dominical IA" text, and date range
    - Implement `composeCTASlide(options: ComposeCTAOptions)` with logo and CTA message
    - Handle special characters in SVG (quotes, accents, ampersands) via XML escaping
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 5.2, 5.3_

  - [x] 4.2 Write property test for background preservation on text-only changes
    - **Property 10: Background preservation on text-only changes**
    - **Validates: Requirements 10.3**
    - Use fast-check to generate arbitrary text pairs, compose twice with different text but same background, verify background file is byte-for-byte identical

- [x] 5. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Carousel generator orchestrator
  - [x] 6.1 Implement the CarouselGenerator orchestration service
    - Create `server/services/carouselGenerator.ts`
    - Implement `generateCarousel(reportId: number)` that:
      - Fetches the report from DB, parses selected_news JSON
      - Creates slide records in DB with status 'generating'
      - Calls `generateEngagementPhrases` for all articles in one batch
      - Generates background images with `Promise.allSettled` (concurrency limit of 3)
      - Composes each slide via SlideCompositor
      - Updates DB records with final status/paths
      - Returns CarouselGenerationResult with slides and errors
    - Implement `regenerateSlide(reportId: number, position: number)` that regenerates only the specified slide
    - Implement concurrency guard: reject with 409 if any slide for the report has status 'generating'
    - _Requirements: 2.4, 4.1, 5.1, 9.1, 9.2, 11.1, 11.2_

  - [x] 6.2 Write property test for carousel structural ordering
    - **Property 6: Carousel structural ordering**
    - **Validates: Requirements 4.1, 5.1**
    - Use fast-check to generate arbitrary article counts (1-20), verify carousel has exactly N+2 slides in correct order (cover, articles, cta)

  - [x] 6.3 Write property test for slide generation independence
    - **Property 4: Slide generation independence (error isolation)**
    - **Validates: Requirements 2.4**
    - Use fast-check to generate arbitrary failure patterns, verify successful slides are unaffected by failed ones

  - [x] 6.4 Write property test for slide regeneration isolation
    - **Property 9: Slide regeneration isolation**
    - **Validates: Requirements 9.1, 9.2**
    - Use fast-check to generate a carousel then regenerate a random position, verify other slides' files and DB records are unchanged

  - [x] 6.5 Write property test for carousel metadata round-trip
    - **Property 11: Carousel metadata round-trip with ordering**
    - **Validates: Requirements 11.1, 11.2**
    - Use fast-check to generate carousel data, store to DB, retrieve, and verify ordering and content match

- [x] 7. PDF export service
  - [x] 7.1 Implement the PdfExporter service
    - Add `pdfkit` as a dependency: `npm install pdfkit @types/pdfkit`
    - Create `server/services/pdfExporter.ts`
    - Implement `exportCarouselPdf(reportId: number, slidePaths: string[])` that:
      - Creates a PDFKit document with page size 1080x1080 points
      - Iterates slide paths, skips missing/corrupted files with a warning
      - Embeds each valid slide image full-bleed on its own page
      - Returns the PDF as a Buffer with page count and warnings array
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Write property test for PDF page count
    - **Property 7: PDF page count matches valid slides**
    - **Validates: Requirements 6.1**
    - Use fast-check to generate arbitrary valid slide counts, verify PDF page count equals input count

  - [x] 7.3 Write property test for PDF graceful degradation
    - **Property 8: PDF graceful degradation with missing slides**
    - **Validates: Requirements 6.4**
    - Use fast-check to generate arbitrary missing slide patterns, verify page count = total - missing and warnings count = missing

- [x] 8. API endpoints
  - [x] 8.1 Implement carousel API routes in adminRoutes.ts
    - Add POST `/api/admin/dominical/:id/generate-carousel` — triggers full carousel generation
    - Add POST `/api/admin/dominical/:id/carousel/slides/:position/regenerate` — regenerates a single slide
    - Add PUT `/api/admin/dominical/:id/carousel/slides/:position/text` — updates slide text and re-composes
    - Add GET `/api/admin/dominical/:id/carousel/pdf` — returns PDF download
    - Add GET `/api/admin/dominical/:id/carousel/slides/:position/image` — returns individual PNG
    - Add GET `/api/admin/dominical/:id/carousel` — returns carousel metadata/status JSON
    - All routes require admin authentication (reuse existing auth middleware)
    - Return appropriate status codes: 200, 400, 404, 409, 500
    - _Requirements: 6.3, 7.1, 7.2, 8.3, 9.1, 9.2, 10.2_

  - [x] 8.2 Write unit tests for carousel API endpoints
    - Test generate-carousel returns 409 if generation in progress
    - Test PDF endpoint returns correct content-type
    - Test image endpoint returns 404 for invalid position
    - Test text update endpoint re-composes with updated text
    - _Requirements: 6.3, 7.1, 9.1_

- [x] 9. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend carousel preview component
  - [x] 10.1 Create the CarouselPreview component
    - Create `src/components/admin/CarouselPreview.tsx`
    - Implement horizontal scrollable container showing slide thumbnails
    - Show status badges per slide (pending/generating/generated/failed)
    - Add "Generate Carousel" button that calls POST generate-carousel endpoint
    - Add per-slide "Regenerate" button
    - Add click-to-enlarge modal for full-size viewing
    - Use @tanstack/react-query for data fetching and mutation
    - Style with TailwindCSS
    - _Requirements: 8.1, 8.2, 8.3, 9.3_

  - [x] 10.2 Create the SlideEditor component
    - Create `src/components/admin/SlideEditor.tsx`
    - Implement modal for editing individual slide text (title + engagement phrase)
    - Show current slide image as background preview
    - "Re-compose" button calls PUT text endpoint and refreshes preview
    - Preserve background image display when editing text
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 10.3 Integrate carousel UI into AdminDominicalDetail page
    - Modify `src/pages/admin/AdminDominicalDetail.tsx` to include CarouselPreview
    - Add "Download PDF" button that triggers PDF export endpoint download
    - Add individual slide download links
    - Wire up carousel data loading from GET carousel metadata endpoint
    - _Requirements: 6.3, 7.1, 8.1, 8.2_

- [x] 11. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `pdfkit` package needs to be added as a new dependency (task 7.1)
- The existing `sharp` and `openai` packages are already available
- All carousel files are stored in `server/data/carousel/` which is preserved across builds by the existing postbuild script

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 6, "tasks": ["8.2", "10.1", "10.2"] },
    { "id": 7, "tasks": ["10.3"] }
  ]
}
```
