# Clips de las demos: kit y entrega web

Kit listo: [imágenes, prompts individuales e instrucciones](../creative/firefly-demo-clips/README.md). [Todos los prompts](../creative/firefly-demo-clips/PROMPTS.md).

- Alcance: diez demos disponibles y tres del roadmap. Una referencia JPG 1280×720 y un prompt independiente por tarjeta. Se reutilizan las fotos generadas anteriormente; no se han producido nuevos clips ni subido material a Adobe.
- Referencias medidas: 45–75 KB por imagen, fuera de public; no añaden peso a las páginas.
- Generación propuesta: Firefly Video, imagen inicial, 16:9, 720p, cinco segundos, 24 fps, cámara fija y sin audio. Se reservan márgenes laterales de 160 px para recortar a 4:3 sin perder contenido.
- Entrega: 640×480, MP4/H.264, sin audio, faststart; objetivo ≤500 KB, aceptación máxima 750 KB. Son presupuestos por verificar en los clips reales.
- Compresión: `node scripts/encodeFireflyClip.mjs <id> <master.mp4> <directorio-salida>`. No sobrescribe ni publica. Se verificó en una muestra técnica temporal: cinco segundos, 640×480, 24 fps y sin audio; rechaza un máster 4:3 y una sobrescritura. Esa muestra no se presenta como un video Firefly.
- Integración pendiente de recibir videos: poster lazy, sin `src`/`source` MP4 inicial, sólo asignarlo por hover desktop o toque móvil, una reproducción a la vez, pausa fuera de pantalla/pestaña, fallback ante error y acción explícita con movimiento reducido/ahorro de datos. Ver contrato y pruebas de Network en el README del kit. No se ha activado esta integración ni se simula que ya haya 13 clips.

El home y el laboratorio comparten toda la lista de demos disponibles mediante el mismo componente. Se eliminó el límite `limit={8}` y se separó el layout con `variant="home"`; actualmente se muestran diez disponibles en ambos y sólo el laboratorio añade las tres de roadmap.

Pendiente externo: generar y descargar los másteres en Firefly con sus IDs, entregarlos para revisión/compresión y entonces integrar/verificar la reproducción a demanda en producción. No se han solicitado credenciales ni consumido créditos de Adobe.

Referencias: [Adobe: generación desde imágenes](https://helpx.adobe.com/firefly/web/work-with-audio-and-video/work-with-video/generate-videos-using-images.html), [Adobe: resoluciones de Generate Video](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/usage-notes/).
