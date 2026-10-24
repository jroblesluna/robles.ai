# Firefly clips — parejas de inicio y fin v3

> **Estado actualizado — 23 de octubre de 2026:** los 13 clips del catálogo ya se integraron con carga a demanda en el PR #33 (commit `46573d0`). Ver [entrega de vídeos](DEMO_VIDEO_RELEASE.md) y [manifiesto publicado](DEMO_VIDEO_ASSETS.json). Las notas de generación y los pendientes de las revisiones siguientes son históricos y describen el estado del kit en cada revisión; no son pendientes del sitio actual. Los frames, prompts, storyboard y render TTS alternativo se conservan para futuras ediciones; commitearlos no sustituye los vídeos publicados.

**Revisión 3.13:** los 13 prompts individuales respetan 2.500 caracteres, incluido el salto de línea final. Verificar con `node scripts/verifyFireflyPrompts.mjs`.

**Guía vigente:** [13 parejas v3](../creative/firefly-demo-pairs-v3/README.md) y [13 prompts de transición](../creative/firefly-demo-pairs-v3/PROMPTS.md). Cada caso tiene start.jpg para First y end.jpg para Last, 1280×720, más un prompt con acciones hasta el resultado y dos segundos de pausa final. Revisión 3.2: 13 inicios y tres finales nuevos (sonrisa, landmarks internos de identidad y transcripción terminada); los otros 10 finales reutilizan v2. Transcripción usa ondas precargadas visibles desde el primer frame: A tiene actividad inmediata, B se activa después. Cursor, timer y barra avanzan de 00:00 a 00:20; ya no se espera a construir las ondas. Las 26 imágenes fueron revisadas como parejas. No son 26 generaciones nuevas.

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

Detección de objetos (3.5): START más abierto, acercamiento continuo y paralaje suave hacia END, con seguimiento de cajas/etiquetas durante la cámara. El resto conserva sus instrucciones por caso; no se aplica este movimiento a las interfaces. Video pendiente de generación y revisión temporal.

Expresión facial (3.6): START ya tiene landmarks, NEUTRAL alto y SMILE bajo; los puntos se deforman con la sonrisa y las barras evolucionan en sincronía. Se reutiliza el neutral existente, sin generación nueva. END conserva la sonrisa; video temporal pendiente.

Expresión facial (3.7): avance conjunto de sonrisa y barras, sin sobrepasar la expresión final; END a los 4,5 s, pausa hasta 8 s. Miniaturas estáticas. Se revisaron capturas, no el MP4 completo; generación/validación temporal pendientes. No cambian los frames.

Factura (3.8): cámara con paralaje suave, movimiento limitado de los cuatro ghost papers existentes y pulsos de la flecha durante extracción de A104/125.00. Conserva First/Last, lectura completa y pausa final. Video pendiente de generación y revisión.

Factura (3.9) sustituye 3.8: ambos frames nuevos muestran vista abierta/oblicua → cercana/frontal y posiciones/escalas/ángulos diferentes de ghosts/flecha. El prompt guía un recorrido continuo sin regresar al encuadre inicial. Referencias revisadas visualmente; video e interpolación pendientes.

TTS (3.10): nuevos First vacío con cursor y Last con bolita al final. Prompt separa parpadeo, escritura Welcome., generación de onda y reproducción de dos segundos. No comienza reproducción antes de generar la onda. Escritura y sincronía del MP4 pendientes de generación/revisión.

TTS (3.11): prompt con ocho estados exactos de texto y glifos completos insertados por pulsación; cursor por saltos, sin revelar letras con máscaras. No cambian los frames. Video nuevo pendiente.

TTS (3.12): se generó un MP4 programado con Canvas/FFmpeg para resolver la escritura parcial persistente. Ver `creative/firefly-demo-pairs-v3/tts/rendered-v1/README.md`. Glifos enteros, cursor por saltos, onda/reproducción sincronizadas; master 1280×720 y web 640×360, ocho segundos/24 FPS/sin audio. Verificado por estados, píxeles y frames decodificados. No desplegado ni habilitado en el catálogo.

TTS 3.13: se retoma Firefly a solicitud del usuario. Prompt simplificado con ocho prefijos exactos y glifos completos en un fotograma; tiempos 0–1/1–3/3–4/4–6/6–8. Descripción validada, nueva generación sin verificar. Se mantiene el MP4 programado como alternativa.
