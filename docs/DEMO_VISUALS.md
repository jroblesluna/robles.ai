# Imágenes y animaciones del catálogo de demos

## Registro del piloto fotográfico de expresiones faciales

Fecha: 19 de octubre de 2026. Alcance: tarjeta `emotion`, compartida por home y laboratorio, EN/ES. En ese piloto las otras tarjetas conservaban sus ilustraciones; la ampliación a las 13 se documenta más abajo; el clip de Facturas y los videos existentes de Soluciones se mantienen.

## Dirección visual e implementación

Se sustituye el icono/diagrama por un retrato fotográfico de una persona adulta ficticia generado con la herramienta integrada `image_gen`, usando la skill `imagegen`. No se utilizó Firefly ni una API con credenciales del proyecto. El original se conserva en el directorio de imágenes generadas de Codex; las variantes de producción se versionan en el repositorio:

- `public/demo-previews/emotion-portrait-v1-480.webp`: 480×360, aproximadamente 10 KB.
- `public/demo-previews/emotion-portrait-v1-960.webp`: 960×720, aproximadamente 39 KB.

Las variantes conservan la misma proporción 4:3 y se entregan mediante srcset/sizes con lazy loading. Las coordenadas faciales, el barrido y las barras son overlays SVG/CSS, no píxeles generados dentro de la foto. Las etiquetas EN/ES siguen en i18next. El aviso visible identifica retrato generado y simulación: no se ejecuta una inferencia sobre esta persona ni se presentan sus supuestas emociones como datos reales.

La animación dura cuatro segundos, se reproduce una vez cuando la imagen está cargada y la tarjeta entra en pantalla, se detiene al salir y ofrece detener/repetir. No hay bucle perpetuo, video adicional ni descarga de modelos faciales en el catálogo. Con movimiento reducido se muestra el estado estático final, sin barrido ni control de reproducción. Se comprueba también la carga desde caché anterior a la hidratación. El botón de control es hermano del enlace de la demo, con área de 44 px, nombre localizado y estado pulsado.

## Validación

133 pruebas pasan en 17 suites: interacción EN/ES, hidratación, SEO/URLs, recursos, secuencia finita, detención fuera de pantalla, limpieza de temporizadores/observer y cambios de preferencia de movimiento. Build de cliente, SSR y servidor correcto. TypeScript conserva los mismos 13 errores previos, sin nuevas firmas. Los fallos previos de la suite general están descritos en `DESIGN_AUDIT.md`; no se declara todo el repositorio libre de deuda.

Revisar en navegador home y laboratorio EN/ES, anchos 320/390/768/1440, alineación de puntos, panel dentro de la imagen, controles por teclado, parada a cuatro segundos y assets servidos con MIME correcto. Tras integrar el PR: esperar Actions y comprobar el mismo comportamiento en producción. La mejora estética es una propuesta visual, no una afirmación de aumento de conversiones medido.

## Prompt final del retrato — herramienta integrada

Use case: photorealistic-natural. Asset type: photographic background for an enterprise AI facial-expression demo card, landscape 4:3 composition. Create a premium editorial studio portrait of one fictional adult woman approximately 35 years old, with natural skin texture, short dark brown hair tucked away from her eyes, subtle composed friendly expression and closed lips, facing directly toward the camera, upright head without tilt, both eyes and entire face clearly visible. She wears a simple charcoal business-casual top. Frame head and shoulders on the LEFT HALF of the image: face centered approximately 31% across the full image width, eyes approximately 39% down its height, chin approximately 68% down. Keep the RIGHT 45% as clean dark navy negative space for interface overlays added later in code. Sophisticated natural soft key light with a restrained cool rim light, slate navy studio background, realistic photographic depth, professional technology editorial aesthetic. The subject must look like a real photographed adult, not a vector icon, robot, avatar, or plastic 3D render. No text, no logo, no UI, no boxes, no dots, no charts, no watermarks. No exaggerated facial emotion. Portrait must remain readable as a small website card.

### Revisión local completada

En navegador, el panel queda dentro de la imagen y separado del aviso a 320, 390, 768 y 1440 px, sin overflow horizontal de documento. Se revisó ES en laboratorio y EN en home, incluida imagen en caché tras recarga. Enter reproduce y detiene sin navegar al enlace de la demo; en móvil se muestran completas las tres etiquetas y barras. La preferencia de movimiento reducido se verificó mediante pruebas de estado y la regla CSS de respaldo; el navegador de revisión no expone emulación de esa preferencia, por lo que no se afirma una comprobación visual con el ajuste del sistema activado.

## Extensión a todas las tarjetas — 19 de octubre de 2026

El piloto anterior queda ampliado a las **13 tarjetas** del laboratorio y las **8 del home**, EN/ES, incluidas las tres de roadmap con su estado Próximamente intacto. Cada ID tiene una foto distinta; ya no se usan los diagramas SVG como medio de las tarjetas. Los SVG previos se conservan como recursos históricos y el clip de Facturas permanece disponible bajo solicitud.

`DemoVisualPreview.tsx` registra las fotos nuevas y dibuja overlays de conversación, verificación, documentos, flujo de herramientas, ondas de audio, detección de objetos, pronóstico, seguridad y estudio creativo. `EmotionPreview.tsx` conserva el retrato y los puntos de su piloto. Todas las tarjetas reutilizan `useDemoPreviewMotion`: una entrada breve de cuatro segundos, pausa al salir, detener/repetir, sin bucles. Las fotos y los overlays están identificados como generados/ilustrativos; no son capturas reales, inferencias ni métricas comerciales. Los controles son hermanos del enlace, nunca botones anidados dentro de él.

Las fotos se entregan como WebP 480×360 y 960×720, con srcset, tamaño reservado y carga diferida. Cada archivo nuevo de 480 px pesa entre 6 y 12 KB; los de 960 px entre 18 y 31 KB. El retrato de emociones conserva sus tamaños previos. El catálogo no descarga modelos ni invoca backends para animar las tarjetas.

### Assets y prompts finales

Herramienta: `image_gen` integrada, skill `imagegen`; sin Firefly ni API/clave del proyecto. Originales retenidos bajo el directorio de imágenes generadas de Codex. Variantes de producción guardadas en `public/demo-previews/` con estos nombres (480 y 960):

- `sitechatbot-photo-v1-{480,960}.webp`: sitechatbot.
- `identity-photo-v1-{480,960}.webp`: identity.
- `rag-photo-v1-{480,960}.webp`: rag.
- `speech-photo-v1-{480,960}.webp`: speech.
- `langchain-photo-v1-{480,960}.webp`: langchain.
- `objectdetection-photo-v1-{480,960}.webp`: objectdetection.
- `docextract-photo-v1-{480,960}.webp`: docextract.
- `tts-photo-v1-{480,960}.webp`: tts.
- `forecast-photo-v1-{480,960}.webp`: forecast.
- `voiceagent-photo-v1-{480,960}.webp`: voiceagent.
- `anomaly-photo-v1-{480,960}.webp`: anomaly.
- `imagegen-photo-v1-{480,960}.webp`: imagegen.

Prompt de cada asset, tal como se envió a la herramienta (las variantes descartadas no se publican):

#### sitechatbot

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. A beautifully lit open slim laptop on a dark business desk on the left, screen angled toward viewer showing a softly glowing plain blank dark screen, small plant behind. Website assistance context.

#### identity

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. Fictional adult male professional about 38, short dark hair, natural neutral expression, frontal head-and-shoulders portrait occupying left half. Credible photography and natural skin, slate shirt. Identity verification context. No ID documents.

#### rag

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. A neatly organized stack of open technical reference papers and a dark blue binder on a dark desk, small laptop behind, all left. Document retrieval and enterprise knowledge context. Paper surfaces contain no legible text.

#### speech

undefinedA premium tabletop conference microphone with a low round base and two subtly defocused empty meeting chairs behind it, entirely on the left, business meeting transcription context. Tangible beautiful audio equipment, no people.

#### langchain

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. One compact silver mini server with a few black cables plugged in on a dark desktop, confined to the LEFT HALF. Server occupying only x 5%–45%. Whole RIGHT HALF is featureless near-black navy studio background. No tools, screwdrivers, cameras, clutter, writing or other objects. Enterprise software orchestration context, understated cyan and amber indicator lights. Wide 4:3 composition.

#### objectdetection

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. Studio photograph of THREE PLAIN UNLABELED kraft parcels on a charcoal conveyor, all confined to x 5%–48%, clean front-facing rectangular boxes. Entire RIGHT HALF is smooth near-black navy empty backdrop, no warehouse detail there. No stickers, shipping labels, text, barcodes or numbers anywhere. Wide 4:3 frame. Large parcel behind at left, medium parcel beside it, small parcel in front. Must be dark and premium, not bright factory daylight.

#### docextract

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. A single ivory invoice-like business document clipped to an elegant dark clipboard, with a pen and subtle stamp on the desk, entirely on the left half. Paper has faint abstract gray horizontal rules but absolutely no letters, numbers, signatures or logos. Intelligent document extraction context.

#### tts

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. A premium black broadcast studio microphone in shock mount and pop filter on the left, dramatic soft cyan rim light, acoustically treated dark recording studio. Text-to-speech and voice synthesis context, no people.

#### forecast

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. Beautiful close view of neatly arranged small retail stock boxes and unbranded product bottles on warehouse shelving entirely on left, realistic dark business inventory setting. Demand forecasting context. No legible text.

#### voiceagent

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. A beautiful professional wireless call-center headset resting on a modern office telephone on the left of a clean dark reception desk. Warmly lit defocused office background only on left, no people. Voice agent and phone automation context.

#### anomaly

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. A refined metal payment card with completely blank unbranded surface beside the edge of an open dark laptop and a small security key, entirely on the left of a dark business desk. Transaction anomaly detection context. No numbers, logos, digits or personal information.

#### imagegen

Use case: photorealistic-natural. Asset: Robles.AI enterprise software demo card background. Create a premium editorial photograph, landscape 4:3. Deep navy/slate studio setting, restrained cyan light, convincing materials, sophisticated professional technology audience. Compose ALL subject detail in LEFT 52% of frame; RIGHT 45% must be clean dark navy negative space for real HTML overlays. No text, letters, logos, watermark, baked-in interface, charts, neon sci-fi, cartoons or robots. Premium product still life: one elegant unbranded frosted cyan glass cosmetic bottle on a matte charcoal circular plinth, entirely in the LEFT half, refined softbox lighting and realistic subtle reflections. Commercial image generation and creative studio context. No text or logo.

### Validación de esta ampliación

136 pruebas pasan en 17 suites, incluyendo las 13 fotos únicas, controles EN/ES de todas las tarjetas, carga previa a reproducción, pausa, repetición, fin a cuatro segundos y estado estático con movimiento reducido. También pasan hidratación y regresiones SEO/URLs. La suite completa conserva los fallos previos documentados en DESIGN_AUDIT.md; no se afirma que toda la deuda del repositorio esté resuelta.


Build de cliente, SSR y servidor correcto. TypeScript conserva exactamente las mismas 13 firmas de error previas, comparadas con el registro del piloto, sin errores nuevos. En navegador se comprobaron las 13 tarjetas del laboratorio ES a 320/390/768/1440 px, sin overflow horizontal ni paneles fuera de la foto o sobre el aviso inferior. Se revisó también el home EN móvil y la reproducción por teclado, con animación CSS activa y control fuera del enlace. Se corrigieron etiquetas RAG y margen vertical al encontrar solapamientos en 320 px. Movimiento reducido sigue validado por pruebas y CSS; el navegador no ofrece emulación de esa preferencia.

## Hover en desktop y control táctil

Las 13 tarjetas compartidas por home y laboratorio repiten su animación al entrar el mouse y la detienen al salir. Se comprueba `(hover: hover) and (pointer: fine)` para que los eventos de mouse sintetizados por touch no disparen ni interrumpan la reproducción móvil. El botón mantiene touch, teclado y pausa/repetición; el enlace de la tarjeta conserva su navegación. Se mantiene la breve presentación inicial de viewport, el fin a cuatro segundos y el respeto por movimiento reducido. No hay bucle mientras el puntero permanece quieto sobre la tarjeta.

## Textos y vista previa uniforme

Se sustituye el aviso técnico de generación/overlay por una frase de contexto propia de cada una de las 13 tarjetas, localizada en EN/ES. Se elimina el badge En vivo/Live de las diez disponibles; las tres de roadmap conservan Próximamente/Coming soon. El estado real de disponibilidad, los filtros y los enlaces no cambian.

Todas las tarjetas presentan el mismo control visible Ver animación/Play preview, junto a la imagen, con pausa y nombre accesible específico. Mantiene hover en desktop y touch/teclado, sin abrir un modal ni añadir descargas de video. Se retira del catálogo el CTA exclusivo del clip de Facturas para que no parezca que sólo una tarjeta tiene vista previa; sus MP4 y posters se conservan sin borrar archivos. Las otras doce no tienen videos generados: sus vistas previas siguen siendo fotos con overlays animados. No se inventan resultados o mediciones al cambiar los textos. Los avisos de los apartados anteriores describen versiones históricas.

Validación: 141 pruebas en 17 suites, build cliente/SSR/servidor correcto y sin nuevas firmas TypeScript frente a los 13 errores previos. Navegador: 13 controles, sólo tres badges de roadmap, sin avisos anteriores ni solapamientos a 320/390/768/1440 px en ES y a 320 px en EN. Se mantiene el mismo componente en home y laboratorio.

## Paridad de demos disponibles en home y laboratorio

El home pasaba `limit={8}` al componente compartido: por eso omitía TTS y Pronóstico pese a estar disponibles. Se reemplaza el límite numérico por `variant="home"`, que cambia sólo el layout y usa toda la lista `status="live"`, igual que el laboratorio. Actualmente son diez. Las tres de roadmap siguen exclusivas del laboratorio. Las nuevas demos disponibles aparecerán en ambos sin mantener dos listas o actualizar una cifra. Se verifica también la lista completa en HTML inicial e hidratación del home EN/ES.

Kit de Firefly: [guía de imágenes, prompts, compresión y carga a demanda](FIREFLY_CLIPS.md). La preparación reutiliza las 13 fotos ya generadas y no añade peso de video al home. Validación de esta entrega: 142 pruebas en 17 suites, build correcto, sin errores TypeScript nuevos; home ES con diez IDs y enlaces localizados a 320/390/768/1440 px, sin overflow ni solapamientos. El compresor se verificó únicamente con una muestra técnica temporal, no con un clip Firefly real.

## Self-contained Firefly kit v2 supersedes the background-only kit

The 13 first frames are newly generated conceptual scenes with their explanatory graphics already included. Rewritten eight-second video prompts require synchronized in-video tracking, labels and results; no external explanatory overlay is planned for those clips. The new full-frame 16:9 export must not use v1's central crop or five-second truncation. See FIREFLY_CLIPS.md and the per-demo acceptance criteria. Existing website CSS previews remain unchanged until actual videos have been generated, reviewed and integrated.

## Parejas de frames v3 — 21 de octubre de 2026

Kit vigente: `creative/firefly-demo-pairs-v3/`. Contiene 13 parejas (26 JPG 1280×720) y 13 prompts con cambios de estado, revisión visual de extremos y fuentes de las imágenes. Se generaron 13 inicios y un final de sonrisa; los otros 12 finales reutilizan v2. Sustituye la instrucción anterior de dejar Last vacío. No modifica los componentes ni activa videos Firefly en producción; los MP4 y su validación temporal siguen pendientes.
