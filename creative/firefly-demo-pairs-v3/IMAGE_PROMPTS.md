# Procedencia y prompts de imagen

Herramienta: image_gen integrada, en modo edición con referencia. Los 13 inicios vigentes incluyen 12 ediciones generadas y un visual neutro facial existente reutilizado. Cinco finales son nuevos (sonrisa, identidad con landmarks internos, transcripción completada, factura con nueva composición y TTS completado); los otros ocho finales reutilizan v2. Los archivos se exportan a 1280×720 sin recorte. No son capturas reales del producto ni evidencia de resultados comerciales.


## sitechatbot — START

Referencia: `sitechatbot/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep the title, sidebar, SERVICES and SUPPORT cards and connectors, the intact blue brain KNOWLEDGE BASE node, and the outgoing arrow EXACTLY unchanged. In the chat panel keep the user question What do you offer? and input field unchanged. Replace the entire assistant answer bubble and Sources used panel with clean empty chat-panel background. Keep the small round chatbot avatar at its original position and put a compact pale-blue typing bubble with exactly three blue dots next to it, instead of the completed reply. No answer text, no SERVICES citation chips, no Sources used caption yet. This is a question received / assistant composing state.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## identity — START

Referencia: `identity/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep both photographs of the exact same adult man, unchanged identity, facial expression, hair, clothes and positions. Keep FACE COMPARISON, SELFIE, REFERENCE, both portrait card borders and backgrounds. Remove all cyan face contour lines and landmark dots from BOTH portraits, restoring underlying skin accurately. Remove only the center green checkmark and the word MATCH, leaving the central circle and existing horizontal connectors as subdued neutral outlines. No comparison decision yet. Do not add PENDING text or new symbols.
```


END: sustituido por la edición 3.1 con landmarks internos, descrita al final de este documento.


## rag — START

Referencia: `rag/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep title ASK YOUR DOCUMENTS, question What are the key requirements?, all three document cards with exact filenames, gray passage lines, central Search & Retrieval block, all panel geometry and the original dark top/bottom margins unchanged. Remove the selected cyan document passage highlight and source reference number chips from document cards. In the right ANSWER panel keep only its heading and empty white panel: remove all answer sentences and citation chips. Keep the SOURCES heading and outer region but remove the two result source cards, their content and the dashed result arrows. All empty output regions remain clean white. Source documents and existing neutral input connector geometry stay still, not flowing or moving.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## speech — START histórico v3 (sustituido por revisión 3.2)

Referencia: `speech/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep title, subtitle, microphone, both waveforms, axes, speaker labels and bottom player exactly unchanged. In the right transcript area preserve the two existing outlined speaker cards and SPEAKER A / SPEAKER B headings and A/B icons, but remove the spoken words Let us begin. and Ready. and their tiny timestamp labels, leaving blank transcript body areas. Remove only the two highlighted time-segment rectangles, their result connector lines, and the white vertical playhead. Keep waveform samples and timeline numbers unchanged. Do not add loading text.
```


START y END vigentes: ediciones 3.2 descritas al final de este documento.


## langchain — START

Referencia: `langchain/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep AGENT + TOOLS title, request card with text bars, DATABASE and CALCULATOR icons and labels, all card positions and original dark top/bottom margins unchanged. Change the two small green completed status dots to subdued gray circles, with identical size/position. Keep the REPORT card and REPORT heading but remove its green checkmark and its three gray result text bars: the report body is blank. Existing blue connector arrows become subdued gray in exactly the same paths and widths. No extra animation graphics or status wording.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## objectdetection — START

Referencia: `objectdetection/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep the exact laptop, clear water bottle and white cup on the same desk, with exactly the same geometry, reflections, laptop screen, lighting and framing. Remove ALL cyan bounding rectangles and the labels LAPTOP, BOTTLE and CUP completely, restoring the dark background around the objects. Remove the entire upper-right 3 OBJECTS count badge and its outline, restoring plain navy background. No detection graphics or count yet. No extra objects. The three real objects must not move or change at all.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## emotion — START

Referencia: `emotion/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep exact same adult woman's identity, hair, neutral expression, clothing, portrait framing, FACE TRACKING title and all existing UI geometry. Remove the cyan facial mesh and all landmark dots from the large portrait, restoring skin. Keep the corner framing guides. Keep NEUTRAL and SMILE labels and their bar tracks, but remove both colored bar fills so the tracks are empty. Keep the four small expression thumbnails and their text labels unchanged; remove the bright cyan selection outline and underline from the NEUTRAL thumbnail, making that thumbnail border subdued like the other thumbnails. No analysis result yet.
```


### END nuevo

```text
Use case: identity-preserve / precise-object-edit. Edit target: supplied FACE TRACKING final frame. Produce a new END frame for an eight-second facial-expression demo. Preserve exact same fictional adult woman's identity, hair, clothes, head position and size, camera, background, all panels, title, NEUTRAL and SMILE labels and thumbnails. Change only the large woman's expression from neutral to a gentle natural closed-mouth smile, with the SAME facial mesh correctly attached to the new cheek and lip anatomy. No head turn, teeth, or identity change. In the right bar panel make the NEUTRAL cyan fill short (about one quarter) and the SMILE purple fill long (about three quarters), with bar tracks and labels unchanged. Move the bright thumbnail selection outline/underline from NEUTRAL to the second SMILE thumbnail, without changing the four thumbnail pictures or labels. Keep original full 16:9 composition exactly, no crop, no extra UI. One single full frame, no diptych. Only a visible expression change and its synchronized result.
```


## docextract — START

Referencia: `docextract/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep the invoice document completely unchanged, including exact visible ID A104 and TOTAL 125.00, title, gray document lines, tabletop/background and sheet geometry. Remove only the cyan highlight outlines around those two invoice fields, preserving their printed words and numbers. Keep the right EXTRACTED DATA panel and its ID and TOTAL row labels, but clear ONLY the values A104 and 125.00 from the right row value boxes, leaving clean empty navy value boxes. Keep Export CSV button and its wording, but dim it to an inactive desaturated purple. Keep center arrow shape and position but subdued. No new field values or loading text.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## tts — START

Referencia: `tts/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep TEXT TO VOICE title, top icon, source box with exact word Welcome., blue caret, arrow, play button, speaker icon and overall composition unchanged. Remove the large cyan-purple generated waveform between the arrow and playback control, leaving the original clean navy background there. Keep the player progress track, but remove its cyan progress fill and place its existing white playhead at the far-left beginning. Preserve 0:00 and 0:02 labels unchanged. Dim the play button and speaker icon slightly to indicate output not ready. No extra text.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## voiceagent — START

Referencia: `voiceagent/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep VOICE TO ACTION title, exact smartphone, microphone, waveform, Book a meeting. request bubble, calendar grid and CALENDAR heading, navy background and all panel geometry unchanged. Clear the bright cyan selected calendar cell to the same unselected navy as the other cells. Remove the two bright workflow arrows entirely, restoring background. Keep the right rounded status-card outline but remove its checkmark circle, green check and BOOKED text, leaving an empty status panel. No calendar dates, no confirmation yet, no new wording.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## anomaly — START

Referencia: `anomaly/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep PATTERN REVIEW title/subtitle, the three transaction rows TX-01 TX-02 TX-03 and the exact bar heights and shapes of each transaction, without changing the source data. Remove classification icon/word badges TYPICAL and UNUSUAL from the right edge of all three rows, keeping their small result areas blank. Remove amber outline/glow from TX-03 and render its existing histogram bars subdued blue like the other unclassified input rows. Remove the amber connector to the right. Keep right outer panel outline but remove ALL its contents including REVIEW title, warning icon, chart, bars, mini labels and FLAGGED FOR REVIEW button: it is a clean empty navy results panel. No new text or fraud claims.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## forecast — START

Referencia: `forecast/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Image 1 is the START frame edit target; Image 2 is the matching END frame for reference only. Keep ALL of image 1 exactly unchanged except restore the tiny missing WHITE historical line segment and small WHITE endpoint that exists at the vertical dashed history/future divider in image 2. In image 1 the June white point is around x=790,y=310 on the 1672x941 canvas. Extend that historical WHITE line gently down/right to approximately x=860,y=314 at the dashed vertical divider, adding a white circular endpoint there. Match the white curve/point appearance of the equivalent last history segment in Image 2. Do NOT add any cyan future line, future dots, purple band or tint; the entire future region to the right of the divider remains empty grid. Preserve every other history point, chart label, panel border, lower inventory cards, background, camera, full 16:9 framing. One single full frame.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


## imagegen — START

Referencia: `imagegen/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep PRODUCT IMAGE STUDIO title, entire INPUT panel with its exact cyan bottle photograph, center arrow, VARIANTS outer panel and both output tile outlines in their original positions. Remove BOTH complete output variant photographs from inside the two right-hand tiles, leaving plain dark navy empty placeholders with existing thin rounded borders. No bottles, backgrounds, leaves or textures in those output placeholders yet. The sole visible bottle remains the original INPUT photo, entirely unchanged. No new text.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.

## identity — END corregido, revisión 3.1

Sustituye el final v2 reutilizado por esta edición nueva con landmarks internos.

```text
Use case: precise-object-edit, identity-preserve. Edit target: supplied FACE COMPARISON final-frame image. Replace the inadequate contour-only facial annotations with anatomically placed INTERNAL facial landmarks and restrained geometric distance guides on BOTH faces. Preserve the exact same fictional adult man's identity, facial expression, skin texture, hair, eyes, clothing, portrait sizes/positions, card borders, navy background, full 16:9 composition, heading FACE COMPARISON, center check/MATCH, bottom SELFIE and REFERENCE labels and all other interface artwork. Overlay only fine cyan points and thin connecting segments attached accurately to: inner/outer eye corners, eyelid curves, eyebrows, nose bridge, nose tip and nostril edges, lip outline/mouth corners, cheek anchors and jaw/chin. Include a small coherent triangular landmark network across the INSIDE of each face; do not merely outline the face or draw random triangles on the hair/background. Make the eyes, nose and mouth clearly readable beneath the delicate graphics. Add three thin warm-amber measurement guides with tiny endpoint ticks on each face: between eye-center anchor points, nose tip down to the upper-lip center, and across the mouth corners. These guides must sit directly on the correct anatomy and correspond across both portraits. No numerical distances, millimeters, percentages, confidence values, extra letters or labels. Keep a very faint facial boundary if needed but INTERNAL features and their relative geometry are the visual focus. Professional, precise and restrained: no laser light, heavy glow, scan band, obscuring thick lines, moving subjects or extra panels. The photo and UI must remain unchanged; only the facial overlay is replaced. One single full-frame END image, no diptych.
```

## speech — START revisión 3.2

```text
Use case: precise-object-edit. Edit target: supplied AUDIO TO TRANSCRIPT START-frame interface. Preserve exact 16:9 full composition, navy background, title/subtitle, microphone, panels, SPEAKER A/B labels, empty transcript card bodies and bottom controls. Correct it to a TRUE ZERO state. Bottom elapsed/total text must read EXACTLY '00:00 / 00:20', same font and location. Bottom seek bar from its left origin to its right endpoint is completely unfilled/subdued; white knob at the LEFTMOST start. Add a fine white vertical playback cursor aligned EXACTLY with the chart's existing 00:00 tick, spanning both waveform lanes. It must NOT be at 00:10. Replace the two source waveform PEAKS with thin subdued horizontal cyan and purple centerlines extending only from the 00:00 tick to the 00:20 tick; no sampled peaks have been processed yet. Keep speaker labels, axes, timeline tick labels 00:00 00:05 00:10 00:15 00:20, all panel geometry, microphone and typography unchanged. No selected-segment rectangles, transcript phrases, result connectors or utterance timestamps yet. Do not move or stretch any panel or change the volume control. One single full frame, no diptych. This begins an illustrative audio-processing progress sequence.
```

## speech — END revisión 3.2

```text
Use case: precise-object-edit. Edit target: supplied AUDIO TO TRANSCRIPT END-frame interface. Correct the playback/completion state while preserving the exact title/subtitle, all panels, microphone, speaker labels, transcript words 'Let us begin.' and 'Ready.', their valid UTTERANCE timestamps 00:10 and 00:15, all card positions, static selected segments and their connectors, and full 16:9 composition. Bottom elapsed/total timer MUST read EXACTLY '00:20 / 00:20', same location and font. Fill the ENTIRE existing bottom seek bar cyan from its original left origin to its original right endpoint, and move its white circular knob to that RIGHTMOST endpoint (not the volume slider). Move the fine WHITE vertical playback cursor and its small white top dot from the chart's 00:10 position to align EXACTLY above the existing 00:20 chart tick, spanning BOTH waveform lanes. Completely remove the old middle cursor at 00:10; there must be exactly one playback cursor. Keep axes/tick labels at the same coordinates. Make both cyan and purple waveform tracks fully processed: preserve the existing waveform structure/peaks before 00:20, with all completed bars clearly visible in each speaker's color, and no future/dim waveforms to the right of the 00:20 cursor. Cleanly remove any waveform dots or bars beyond that 00:20 chart tick, restoring navy background there. Do not slide the waveform or utterance selection boxes along with the cursor: those segments stay attached to the original 10s/15s source ranges. The final state must unmistakably show finished audio and completed attributed transcript. Bottom play icon may remain the same for replay. Do not add numbers, badges or new transcript words. One single full-frame END image, not a diptych.
```

## speech — START vigente revisión 3.4

Sustituye el inicio plano 3.2 por ondas visibles del audio precargado; END no cambia.

```text
Use case: precise-object-edit. Image 1 is the AUDIO TO TRANSCRIPT START-frame edit target. Image 2 is the END frame, supplied only as a waveform-shape reference. Keep ALL of Image 1 unchanged: full 16:9 framing, typography, panel geometry, microphone, speaker labels, EMPTY transcript bodies, elapsed/total 00:00 / 00:20, empty bottom seek track, knob at left, and ONE white vertical cursor at chart 00:00. Change ONLY the two flat waveform lanes. Replace their flat centerlines with the SAME complete recorded waveform patterns visible in Image 2, matched to the same chart positions, with cyan A and purple B clearly visible from 00:00 to the 00:20 tick. Use subdued but readable brightness, about half the final frame brightness, not near-invisible. Cyan A has clearly higher peaks in the first half and purple B its strongest peaks near the 00:15 range as in Image 2. This is a PRELOADED audio recording: waveform peaks MUST ALREADY EXIST at the initial frame so video does not delay them until the end. Do not add the END-frame selection rectangles, connectors, transcript words, utterance timestamps, final progress or right-side cursor. Keep future area beyond chart 00:20 empty. No flat-line-only lanes, no changes to elapsed timer or cursor position. Output one full START image, no diptych.
```

## objectdetection — START vigente revisión 3.5

Plano abierto para movimiento de cámara hacia el END existente. La edición se revisó visualmente; el recorrido se guía por los frames reales.

```text
Use case: precise-object-edit / professional product photography. Edit the supplied unannotated object-detection START frame to provide a subtly WIDER camera view for a slow cinematic push-in toward its existing matching final shot. Keep exactly the same laptop on the left, the same transparent water bottle in the center and the same white cup with handle on the right. Preserve identities, materials, relative spacing, laptop opening angle and blue/purple screen image, navy studio wall, dark tabletop, reflections and lighting. Move the CAMERA back slightly so the whole three-object arrangement appears about 8 percent smaller than in the supplied frame, with additional natural navy wall and tabletop visible around all sides. The three objects stay on the same desk in the same relative positions; do not move or change the objects independently. Use the same near-frontal camera angle, with only a tiny lateral offset suitable for a very gentle dolly correction into the final reference composition. Full 16:9 canvas. Keep all objects fully visible and sharp. NO labels, boxes, counts, overlays, letters, extra objects, extra lights or new scene elements. This is a single wide START image, not a collage or a picture with a border.
```

## emotion — START vigente revisión 3.6

Se reutiliza sin recodificar `creative/firefly-demo-clips/emotion/first-frame-v2.jpg`: rostro neutro con landmarks internos, NEUTRAL alto, SMILE bajo y selección NEUTRAL. Sustituye la edición inicial sin puntos ni barras. No se generó una imagen nueva en esta revisión; la procedencia original está en manifest.json.

## docextract — END vigente revisión 3.9

Nueva edición del final anterior.

```text
Use case: precise-object-edit, professional 2.5D enterprise motion-design keyframe. Edit target: supplied completed invoice-extraction image. Produce a revised END frame for a matched START/END camera move. Preserve the exact same white invoice sheet/stack on the left, navy environment, right EXTRACTED DATA panel, ID/TOTAL rows and Export CSV button, professional cyan/purple palette, typography and full 16:9 composition. All main elements fully inside the canvas with safe margins. This END is the closer, nearly frontal clear reading view. Source invoice MUST retain exactly ID: A104 and TOTAL: 125.00, with cyan highlight rectangles. Output boxes MUST retain exactly A104 and 125.00. Button remains bright active Export CSV. Change the FOUR EXISTING translucent ghost-paper icons in the gap to clearly DIFFERENT END positions and shallow angles: move the two upper ghosts a little RIGHT toward the result panel, one above the other with modest spacing, make one slightly smaller to read as farther away; move the lower pair a little RIGHT and stagger them vertically. Keep each entirely in the navy gap between invoice and result panel, not covering either, with distinct shallow tilts and their original blue translucent paper shapes and gray text bars. Keep exactly four ghost papers, no extra sheets or duplicate icons. Advance the existing central cyan-to-purple right arrow slightly RIGHT toward the panel, with its bright tip closer to the result card but still separated from it, retaining the clean thick single-arrow silhouette and softly glowing material. This is a deliberately new completed keyframe; ghost-paper locations/angles and arrow position should differ visibly from the old reference while the readable invoice and panel stay consistent. No extra labels, numbers, dramatic blur, camera crop, extra UI or diptych. Output ONE finished landscape END image.
```

## docextract — START vigente revisión 3.9

Edición derivada del END 3.9 nuevo para mantener continuidad.

```text
Use case: precise-object-edit, matched 2.5D motion-design START keyframe. Edit target: supplied NEW completed invoice END frame. Create its earlier START state, preserving the SAME invoice design, document stack, EXTRACTED DATA panel, row labels, four identifiable translucent ghost-paper icons, one cyan-purple arrow, navy environment, font family and materials. Output one full 16:9 image, no diptych. CAMERA/FRAMING MUST CHANGE: pull the camera back so the entire arrangement appears about 12% smaller with more navy negative space on all sides, and view the scene from a slightly LEFT-oblique angle (gentle 6-8 degree yaw, no roll), rather than the frontal completed view. Give invoice and output panel coherent shallow perspective, as flat readable planes in the same 2.5D scene; no warped letters. Keep every panel and the whole invoice fully within the canvas. INITIAL EXTRACTION STATE: source invoice still clearly reads ID: A104 and TOTAL: 125.00, but REMOVE the cyan highlight outlines around those two source fields. Right output value boxes are EMPTY: remove only A104 and 125.00 from the right-hand output boxes while keeping ID/TOTAL row labels and boxes. Dim the Export CSV button but preserve its wording. COMPONENT INITIAL POSITIONS MUST DIFFER FROM END: the SAME four ghost-paper icons are farther LEFT toward the invoice edge within the central gap, not covering the invoice, at visibly different shallow tilts and staggered depth/scale than END. Keep four and only four: two above the arrow, two below. Make each still identifiable by its size/order and shape. Retract the SINGLE right-pointing arrow a little LEFT toward the invoice, make it modestly smaller, a little more oblique, and with subdued glow, ready to move forward toward the output in END. Keep all icon shapes intact. No added papers, tails, extra arrows, floating digits, new fields or labels. This START must clearly show a wider oblique beginning and different ghost/arrow poses, not merely the same END image with its values erased.
```

## tts — START vigente revisión 3.10

```text
Use case: precise-object-edit. Edit target: supplied TEXT TO VOICE START frame. Preserve the entire full 16:9 interface, exact title, navy background, source text box, arrow, disabled play/speaker icons, empty waveform area and player geometry. CHANGE ONLY the source input state: remove the word Welcome. completely from inside the left input box. Restore the clean original navy inner-box background where those letters were. Move the existing thin cyan text caret from the end of that word to the far LEFT text inset where the W originally began, keeping the original caret height and typography alignment. The input box is truly EMPTY except for this one visible caret: no placeholder, dots, text or stray glyphs. Keep the output waveform area EMPTY, bottom seek knob at the LEFT start, progress fill empty and fixed axis labels 0:00 / 0:02 at their existing respective endpoints. No audio output yet. Do not change source-box borders, camera, layout or any other labels/icons. One single full START image, not a collage.
```

## tts — END vigente revisión 3.10

```text
Use case: precise-object-edit. Edit target: supplied TEXT TO VOICE END frame. Preserve ALL original interface artwork, exact word Welcome., caret after the period, title, waveform bars and colors, arrow, enabled play and speaker icons, navy background and full 16:9 framing. Correct ONLY the audio playback seek bar to a FINISHED state. Fill the entire existing bottom player track cyan from its original LEFT endpoint below the waveform to its original RIGHT endpoint. Move the existing white round seek knob from the middle to the exact far RIGHT endpoint above the existing 0:02 label. No knob remains in the middle and no gray unplayed track remains behind the right endpoint. Keep fixed left label 0:00 and fixed right label 0:02 unchanged: these are axis endpoints, not an elapsed-time display. Keep the waveform shape itself recognizable, no added timer, no new text or interface elements. This is generated audio after its full two-second preview has completed. One single full END image, not a diptych.
```


## v3.14 — Cinco estados de agente de voz

### 01-off.jpg

Original: /Users/antoniorobles/.codex/generated_images/01a14d57-17c2-70d1-ba0c-8219eafc3e8c/exec-5a4643f3-3773-4292-b9d5-2f7fe11dd009.png

Edit the provided Robles.AI VOICE TO ACTION reference into ONE individual 16:9 storyboard keyframe, not a collage. Preserve the exact navy/cyan/purple premium 3D style, title typography, three-part layout, left phone, center CALENDAR with exactly SIX columns and FIVE rows of blank cells, and right rounded status-card outline. Keep every panel fully within frame with margins. Calendar and right panel remain front-facing and identical in position/size to reference. No dates, new labels, timestamps, actual customer information or extra objects. Chosen eventual cell is row 3 column 3, counting from top-left, exactly as reference. Only alter phone yaw, screen content and specified UI stage. Phone stays anchored to its original left position with same height; realistic rigid rectangular phone geometry, no bending. Cinematic controlled rim light and subtle floor reflections. No captions or frame numbers. STATE 1, beginning: phone is powered OFF, entire display BLACK, with NO microphone, NO waveform and NO speech bubble. Phone front screen is angled 12 degrees toward VIEWER'S LEFT, exposing its RIGHT side edge; it remains readable as a phone, not back-facing. Every calendar cell unselected, absolutely no arrows, no checkmark and no BOOKED text: right status-card interior EMPTY. Keep title, calendar header and empty grid.

### 02-message.jpg

Original: /Users/antoniorobles/.codex/generated_images/01a14d57-17c2-70d1-ba0c-8219eafc3e8c/exec-9dc59158-1b3b-4c29-93e5-b0d2f10c0f15.png

Create one corrected individual storyboard frame 02, 16:9. Use FIRST reference as the authoritative composition and phone POSE: preserve its black phone's exact orientation facing toward VIEWER LEFT, exposing the purple RIGHT side edge; do NOT expose left-side volume buttons. Keep phone silhouette, position, size, perspective, notch and side edge EXACTLY as in first reference. Change ONLY its display from off to ON: add the microphone ring, cyan-purple irregular waveform and speech bubble reading exactly 'Book a meeting.' using SECOND reference for these screen contents only. No other changes. Exact same VOICE TO ACTION title, background waves, lighting, calendar six columns by five rows, all cells unselected, and empty right confirmation panel as first reference. No arrows, checkmark, BOOKED, dates or new words. All graphics fit the left-facing screen perspective. This frame remains left-facing; later frames turn to frontal and then right. Do not change the phone to the second reference's opposite orientation.

### 03-search.jpg

Original: /Users/antoniorobles/.codex/generated_images/01a14d57-17c2-70d1-ba0c-8219eafc3e8c/exec-eb507b11-b94d-4ce8-9d1b-a29519f6e2b6.png

Edit the provided Robles.AI VOICE TO ACTION reference into ONE individual 16:9 storyboard keyframe, not a collage. Preserve the exact navy/cyan/purple premium 3D style, title typography, three-part layout, left phone, center CALENDAR with exactly SIX columns and FIVE rows of blank cells, and right rounded status-card outline. Keep every panel fully within frame with margins. Calendar and right panel remain front-facing and identical in position/size to reference. No dates, new labels, timestamps, actual customer information or extra objects. Chosen eventual cell is row 3 column 3, counting from top-left, exactly as reference. Only alter phone yaw, screen content and specified UI stage. Phone stays anchored to its original left position with same height; realistic rigid rectangular phone geometry, no bending. Cinematic controlled rim light and subtle floor reflections. No captions or frame numbers. STATE 3, searching availability: phone EXACTLY frontal, parallel with calendar. Screen ON with reference microphone, waveform bars in a different irregular amplitude pattern, speech bubble 'Book a meeting.' Highlight ONLY calendar row 2 column 5 with soft VIOLET fill as a temporary candidate. All other cells dim and unselected, especially row3 column3. NO input or output arrows, NO checkmark, NO BOOKED: right status-card interior EMPTY. Do not add moving trails or multiple highlighted cells; this is one still of an in-progress search.

### 04-selected.jpg

Original: /Users/antoniorobles/.codex/generated_images/01a14d57-17c2-70d1-ba0c-8219eafc3e8c/exec-233d9488-4e55-474c-b06c-705a51e96659.png

Edit the provided Robles.AI VOICE TO ACTION reference into ONE individual 16:9 storyboard keyframe, not a collage. Preserve the exact navy/cyan/purple premium 3D style, title typography, three-part layout, left phone, center CALENDAR with exactly SIX columns and FIVE rows of blank cells, and right rounded status-card outline. Keep every panel fully within frame with margins. Calendar and right panel remain front-facing and identical in position/size to reference. No dates, new labels, timestamps, actual customer information or extra objects. Chosen eventual cell is row 3 column 3, counting from top-left, exactly as reference. Only alter phone yaw, screen content and specified UI stage. Phone stays anchored to its original left position with same height; realistic rigid rectangular phone geometry, no bending. Cinematic controlled rim light and subtle floor reflections. No captions or frame numbers. STATE 4, slot chosen but NOT booked yet: phone front screen angled 6 degrees toward VIEWER'S RIGHT, exposing its LEFT side edge. Screen ON, microphone, new irregular waveform bar amplitudes and 'Book a meeting.' speech bubble. Highlight ONLY calendar row3 column3 with CYAN fill, same final chosen cell as reference. Add the reference curved cyan input arrow FROM PHONE TO THIS CELL. NO output arrow to confirmation, NO checkmark, NO BOOKED: right status-card interior EMPTY. All other grid cells dim.

### 05-booked.jpg

Original: /Users/antoniorobles/.codex/generated_images/01a14d57-17c2-70d1-ba0c-8219eafc3e8c/exec-a0c14ce5-f1ee-4f70-b617-237415ab905b.png

Edit the provided Robles.AI VOICE TO ACTION reference into ONE individual 16:9 storyboard keyframe, not a collage. Preserve the exact navy/cyan/purple premium 3D style, title typography, three-part layout, left phone, center CALENDAR with exactly SIX columns and FIVE rows of blank cells, and right rounded status-card outline. Keep every panel fully within frame with margins. Calendar and right panel remain front-facing and identical in position/size to reference. No dates, new labels, timestamps, actual customer information or extra objects. Chosen eventual cell is row 3 column 3, counting from top-left, exactly as reference. Only alter phone yaw, screen content and specified UI stage. Phone stays anchored to its original left position with same height; realistic rigid rectangular phone geometry, no bending. Cinematic controlled rim light and subtle floor reflections. No captions or frame numbers. STATE 5, finished: phone front screen angled 12 degrees toward VIEWER'S RIGHT exposing its LEFT side edge, opposite to initial state; never show back cover. Screen ON, microphone, waveform bars now small resting amplitudes, speech bubble 'Book a meeting.' Calendar ONLY row3 column3 cyan selected. Show reference cyan input arrow into selected cell and output arrow from that SAME cell to right status panel. Right status panel shows exactly the large cyan/green checkmark and BOOKED, as reference. Everything complete, clean stable end-frame.
