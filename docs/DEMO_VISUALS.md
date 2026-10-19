# Piloto fotográfico de expresiones faciales

Fecha: 19 de octubre de 2026. Alcance: tarjeta `emotion`, compartida por home y laboratorio, EN/ES. Las otras tarjetas conservan sus ilustraciones; el clip de Facturas y los videos existentes de Soluciones se mantienen.

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
