# Firefly clips — parejas de inicio y fin v3

**Guía vigente:** [13 parejas v3](../creative/firefly-demo-pairs-v3/README.md) y [13 prompts de transición](../creative/firefly-demo-pairs-v3/PROMPTS.md). Cada caso tiene start.jpg para First y end.jpg para Last, 1280×720, más un prompt con acciones hasta el resultado y dos segundos de pausa final. Revisión 3.1: se generaron 13 inicios y dos finales nuevos (sonrisa y landmarks internos de identidad); los otros 11 finales reutilizan v2. Las 26 imágenes fueron revisadas como parejas. No son 26 generaciones nuevas.

El flujo anterior de dejar Last vacío y empezar mostrando todos los resultados queda sustituido. El chatbot ahora tiene puntos de escritura, entrada de respuesta y aparición de citas; los demás casos también cambian de estado, en vez de limitarse a resaltes. Mantener 16:9, ocho segundos y Audio off. Video Firefly, revisión temporal e integración en la web siguen pendientes.

## Registro histórico — kit de una sola imagen v2

The v1 background-motion kit is superseded. Use [the v2 kit](../creative/firefly-demo-clips/README.md), [video prompts](../creative/firefly-demo-clips/PROMPTS.md), and [new image prompts/provenance](../creative/firefly-demo-clips/IMAGE_PROMPTS.md).

All 13 first frames have been newly generated with built-in image_gen and contain the concept: labelled detections/count, tracked face guides, source-to-answer retrieval/citations, request-to-tools-to-report, matching extracted fields, diarized transcript, text-to-audio, forecast, calendar action, anomaly review and product variants. These are synthetic illustrative scenes, not production screenshots or customer/model-performance evidence.

The complete explanation must be inside the finished MP4. Face meshes, detection boxes, labels, values and state transitions must remain synchronized with their subjects. A static webpage overlay is not an acceptable fallback. If generative video fails temporal accuracy, regenerate or perform genuine tracked compositing into the video, then review the resulting MP4.

Use the user's current Veo 3.1 workflow: 720p, 16:9, eight seconds, 24 FPS, Audio off, Frames → First → first-frame-v2.jpg, Last empty, and the matching firefly-prompt-v2.txt. The clip establishes the concept, demonstrates it, then holds the final result for two seconds. Embedded words in this kit are English; fully localized in-video editions need separate checked masters.

First frames are 1280×720 without v1 side overscan. Delivery is 640×360, eight seconds, 24 FPS, silent H.264 MP4, faststart, full 16:9. Target <=500KB, acceptance maximum 750KB; actual video quality/size must be measured. The encoder no longer crops to 4:3 or truncates to five seconds. Preserve the full frame with contain inside existing card geometry if needed. Do not show old CSS explanatory overlays over the self-contained video.

`node scripts/prepareFireflyDemoKit.mjs` validates the generated v2 frames/prompts and rebuilds overview-v2.webp; it never substitutes old photos. `node scripts/encodeFireflyClip.mjs <id> <v2-master.mp4> <output-dir>` performs technical validation/export only, without overwriting or publishing.

Actual Firefly generation and temporal validation are still pending. Before accepting each clip, check its per-demo acceptance list, text, counts, source/answer/value correspondence, object/face tracking, final hold, crop and size. Technical-format approval is not a tracking/readability certificate.

Runtime integration remains pending receipt of approved masters: lazy poster, no initial video src/source, only requested video on hover desktop or explicit mobile touch, one at a time, pause offscreen/hidden, reduced-motion/data-saver opt-in and error fallback. No new Firefly videos have been enabled on the production website by this kit-only revision.
