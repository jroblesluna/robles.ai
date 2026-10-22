# Procedencia y prompts de imagen

Herramienta: image_gen integrada, en modo edición con referencia. Se generaron 13 estados iniciales y dos finales nuevos: sonrisa e identidad con landmarks internos; los otros 11 finales reutilizan los visuales v2 existentes. Los archivos se exportan a 1280×720 sin recorte. No son capturas reales del producto ni evidencia de resultados comerciales.


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


## speech — START

Referencia: `speech/first-frame-v2.jpg` del kit anterior.

```text
Use case: precise-object-edit. Edit target: the supplied existing final frame of a professional conceptual AI demo. Create its START frame, not another completed result. Preserve the exact full 16:9 canvas, camera, composition, palette, font sizes, background, panel rectangles and positions of every unchanged element. Do not redesign, zoom, crop, move panels, change faces or invent text. Fill removed-result regions with their original panel background, cleanly. Output one single full frame, not a diptych or contact sheet. Keep title, subtitle, microphone, both waveforms, axes, speaker labels and bottom player exactly unchanged. In the right transcript area preserve the two existing outlined speaker cards and SPEAKER A / SPEAKER B headings and A/B icons, but remove the spoken words Let us begin. and Ready. and their tiny timestamp labels, leaving blank transcript body areas. Remove only the two highlighted time-segment rectangles, their result connector lines, and the white vertical playhead. Keep waveform samples and timeline numbers unchanged. Do not add loading text.
```


END: reutiliza el final v2 sin regenerarlo; su procedencia original figura en manifest.json.


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
