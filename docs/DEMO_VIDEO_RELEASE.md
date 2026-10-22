# Demo preview videos — 2026-10-22

The home catalog and demo lab use the same `DemoVideoPreview`. Home retains the ten live demos; the lab also includes the three existing roadmap cards. A preview does not activate a roadmap feature or call any inference API.

## Media

- Twelve masters came from the supplied `exported_videos` directory. Imagegen was absent there, so it uses the latest locally generated product-orbit master from this conversation.
- Thirteen silent H.264 clips, at most 960×540, 24 FPS, full 16:9, `faststart`, no crop. Source duration is preserved within one frame; sources are never overwritten.
- Video payload: **1,950,071 bytes**, compared with **12,104,544 bytes** of masters (84% reduction). The largest delivery clip is 326,248 bytes.
- Posters at 480 and 960 pixels come from the completed state of the corresponding clip. Clip/poster filenames contain content hashes and use the existing `/assets` immutable cache policy.
- Embedded video text remains English in both site languages. Labels, controls, descriptions and navigation remain localized. These are illustrative previews, not measured results or live inference recordings.
- `DEMO_VIDEO_ASSETS.json` records source digests, output paths, dimensions, sizes and durations. To regenerate, run `node scripts/importDemoClips.mjs <masters-directory> [imagegen-master.mp4]` with existing dependencies. Intermediate files stay in `.demo-clip-import`, outside the published assets.

## Interaction and resource loading

- Posters load lazily and reserve their 16:9 space. Initial HTML and the initial DOM have **no video `src` or `<source>`**, and `preload="none"`.
- A fine pointer hovering a visible card requests and plays its clip once. Leaving the card pauses it. Playback ends on the media's real `ended` event, not the former four-second overlay timer.
- Touch and keyboard use the preview button. The media control and destination link are separate, so tapping a preview never opens the demo accidentally.
- Only one preview plays at a time. Offscreen cards and hidden documents pause. Filtering/unmounting releases playback and listeners.
- Reduced-motion, Save-Data and slow 2G connections suppress hover playback. The explicit play button remains available as a deliberate opt-in.
- A failed media load retains its poster and offers a retry; blocked autoplay returns to the play control. Demo navigation is independent of media success.
- The existing SVG explanations and generated-photo overlays are no longer mounted over the exported clips. Prior authoring assets are retained as history.

## Validation

- Production client and SSR build completed successfully.
- Updated component, asset and localized-navigation tests cover no initial source, fine-pointer hover, touch/keyboard activation, one active player, offscreen/visibility pause, completion/replay, error/retry and reduced-motion/data-saver opt-in.
- Browser inspection verified lazy sources, real media decoding, complete playback, shared home/lab media, localized destination links and responsive layout at desktop and 390-pixel mobile width. Unit tests separately simulate coarse touch pointers and user preferences.
- TypeScript retains the same 13 pre-existing errors found on main in legacy application handlers, forecast/identity types and historical publishing scripts; none concern this integration.
- Focused media/navigation/hydration tests: 43 passed. Complete repository run: 657 passed, seven failed; main baseline: 647 passed, six failed. Six failures concern unchanged carousel/public-slide tests; the additional session-cookie failure occurs under the complete parallel suite. Its isolated file passes on both main and the release branch (five tests each). This is not a green whole-repository suite; backend test isolation remains a separate maintenance item.

Production deployment and verification are performed through the existing GitHub Actions workflow after merge. Live verification must check the exact hashed assets, cache and range responses, both languages, desktop hover, mobile-width controls and navigation. No production infrastructure, secrets, authentication or tracking is changed.
