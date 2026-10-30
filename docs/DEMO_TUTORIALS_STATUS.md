# Estado de los tutoriales en video de las demos

Tracker de los videos tutoriales (*Ver cómo se usa*) de cada demo del laboratorio, por idioma.
Actualízalo cada vez que avance una etapa. Última revisión: **2026-10-29**.

Cómo funciona un tutorial publicado: `src/components/demo/DemoTutorial.tsx` (registro `TUTORIALS`
por demo e idioma), archivos en `public/videos/tutorials/<ruta>-tutorial-<lang>.mp4` +
`-poster-<lang>.jpg`, y `<DemoTutorial demoId="…">` montado en la página de la demo. Un idioma sin
video oculta el botón. Briefs y capturas en `docs/demo-tutorials/<ruta>/`.

**Leyenda**: ✅ hecho · 🟡 en curso · ⬜ pendiente · — no aplica

## Resumen

| Demo (`id`) | Ruta | Video ES | Video EN |
|-------------|------|:--------:|:--------:|
| `objectdetection` | `/try-object-detection` | ✅ (45 s) | ✅ (45 s) |
| `emotion` | `/try-emotion` | ✅ (56 s) | ✅ (59 s) |
| `rag` | `/try-rag` | ⬜ | ⬜ |
| `sitechatbot` | `/try-chatbot` | ✅ (59 s) | ✅ (58 s) |
| `identity` | `/try-identity` | ⬜ | ⬜ |
| `speech` | `/try-transcription` | ✅ (60 s) | ✅ (57 s) |
| `langchain` | `/try-langchain` | ✅ (59 s) | ✅ (58 s) |
| `docextract` | `/try-docextract` | ⬜ | ⬜ |
| `tts` | `/try-tts` | ⬜ | ⬜ |
| `forecast` | `/try-forecast` | ⬜ | ⬜ |
| `voiceagent`, `anomaly`, `imagegen` | — (soon) | — | — |

**Avance**: 10 de 20 videos (10 demos live × 2 idiomas) · 5 demos completas en ambos idiomas.

## Detalle por etapa

| Demo | Capturas | Brief Remotion | Video ES | Video EN | En `TUTORIALS` | Botón en la página |
|------|:--------:|:--------------:|:--------:|:--------:|:--------------:|:------------------:|
| `objectdetection` | ✅ | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ |
| `emotion` | ✅ | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ |
| `rag` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `sitechatbot` | ✅ | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ (botón en el hero + tarjeta destacada) |
| `identity` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `speech` | ✅ (llamada de ejemplo en `audio/`) | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ (botón junto a *Cómo funciona* + tarjeta destacada) |
| `langchain` | ✅ | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ (botón junto a *Cómo funciona* + tarjeta destacada) |
| `docextract` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `tts` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `forecast` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Notas por demo

| Demo | Estado (2026-10-29) |
|------|---------------------|
| `objectdetection` | Publicado en ES y EN (45 s cada uno) |
| `emotion` | Publicado en ES (56 s) y EN (59 s) |
| `rag` | Brief y capturas listos (sin `capture-report.json`); falta producir los videos |
| `sitechatbot` | Publicado en ES (59 s) y EN (58 s). Es la demo estrella, así que además del botón en el hero lleva una tarjeta grande con póster (`variant="featured"`) justo después del hero. Pendiente aparte: que el bot responda en el idioma de la pregunta (§0 del prompt) |
| `speech` | Publicado en ES (60 s) y EN (57 s): botón junto a *Cómo funciona* y tarjeta destacada entre la cabecera y el espacio de trabajo (se ve antes de pedir el micrófono); al cerrar, la página queda en `#transcription-workspace`. Sin subtítulos `.vtt` (§13.1 del prompt, opcional). Sigue pendiente corregir en la demo los bugs de la transcripción en vivo (§0 del prompt) |
| `langchain` | Publicado en ES (59 s) y EN (58 s) el 30 oct 2026: botón junto a *Cómo funciona* y tarjeta destacada antes del playground; al cerrar, la página queda en `#langchain-workspace`. Póster: la respuesta con fuente y el caso "no está en el documento". Queda en el backend: el 500 sin CORS, las `citations` inventadas y el cálculo de descuento + impuesto (§0 del prompt) |
| resto | Sin empezar |

## Próximos pasos sugeridos

1. `speech`: corregir en `TryTranscription.tsx` las líneas provisionales que no se borran y el
   orden de los turnos (§0 del prompt); el video ya los muestra corregidos.
2. `rag`: renderizar ES y EN, registrar y montar `<DemoTutorial demoId="rag">`.
3. Siguiente brief: `docextract`, `tts` o `identity` (mismo flujo: capturas → brief → zip).

## Checklist para publicar un tutorial

- [ ] Capturas + `capture-screenshots.mjs` en `docs/demo-tutorials/<ruta>/`
- [ ] `REMOTION_TUTORIAL_PROMPT.md` (duración, locución, reglas de claims)
- [ ] MP4 H.264 con `+faststart` y póster JPG por idioma en `public/videos/tutorials/`
- [ ] Entrada en `TUTORIALS` (`src`, `poster`, `seconds`) por idioma
- [ ] `<DemoTutorial demoId="…" returnToId="…">` en la página de la demo (`variant="featured"` para una tarjeta grande con póster)
- [ ] Actualizar este tracker, AGENTS.md §11 y README (*Tutorial videos*)
