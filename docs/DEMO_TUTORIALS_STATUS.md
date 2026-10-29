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
| `speech` | `/try-transcription` | ⬜ | ⬜ |
| `langchain` | `/try-langchain` | ⬜ | ⬜ |
| `docextract` | `/try-docextract` | ⬜ | ⬜ |
| `tts` | `/try-tts` | ⬜ | ⬜ |
| `forecast` | `/try-forecast` | ⬜ | ⬜ |
| `voiceagent`, `anomaly`, `imagegen` | — (soon) | — | — |

**Avance**: 6 de 20 videos (10 demos live × 2 idiomas) · 3 demos completas en ambos idiomas.

## Detalle por etapa

| Demo | Capturas | Brief Remotion | Video ES | Video EN | En `TUTORIALS` | Botón en la página |
|------|:--------:|:--------------:|:--------:|:--------:|:--------------:|:------------------:|
| `objectdetection` | ✅ | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ |
| `emotion` | ✅ | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ |
| `rag` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `sitechatbot` | ✅ | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ (botón en el hero + tarjeta destacada) |
| `identity` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `speech` | ✅ (llamada de ejemplo en `audio/`) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `langchain` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `docextract` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `tts` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `forecast` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Notas por demo

| Demo | Estado (2026-10-29) |
|------|---------------------|
| `objectdetection` | Publicado en ES y EN (45 s cada uno) |
| `emotion` | EN (59 s) listo y registrado en `TUTORIALS`; el MP4 y el póster EN aún sin commit (`git status`) |
| `rag` | Brief y capturas listos (sin `capture-report.json`); falta producir los videos |
| `sitechatbot` | Publicado en ES (59 s) y EN (58 s). Es la demo estrella, así que además del botón en el hero lleva una tarjeta grande con póster (`variant="featured"`) justo después del hero. Los MP4 y pósters ES/EN aún sin commit (`git status`). Pendiente aparte: que el bot responda en el idioma de la pregunta (§0 del prompt) |
| `speech` | Capturas, llamada de ejemplo (`audio/`), `capture-report.json` y brief listos; carpeta empaquetada en zip con un prompt corto para el agente de Remotion. ES y EN se pueden producir ya. La demo tiene bugs en la transcripción en vivo (§0 del prompt) que el video recrea corregidos |
| resto | Sin empezar |

## Próximos pasos sugeridos

1. Commitear juntos los tutoriales pendientes: `try-emotion-tutorial-en.mp4` + póster EN, y
   `try-chatbot-tutorial-{es,en}.mp4` + pósters, con los cambios de `DemoTutorial.tsx`,
   `TryChatbot.tsx` y los `translation.json`.
2. `speech`: producir ES y EN con el zip; al recibirlos, registrar `TUTORIALS.speech` y montar
   `<DemoTutorial demoId="speech" returnToId="transcription-workspace">` (§13 del prompt). En
   paralelo, corregir en `TryTranscription.tsx` las líneas provisionales que no se borran y el orden
   de los turnos, y recapturar.
3. `rag`: renderizar ES y EN, registrar y montar `<DemoTutorial demoId="rag">`.
4. Siguiente brief: `docextract`, `tts` o `identity` (mismo flujo: capturas → brief → zip).

## Checklist para publicar un tutorial

- [ ] Capturas + `capture-screenshots.mjs` en `docs/demo-tutorials/<ruta>/`
- [ ] `REMOTION_TUTORIAL_PROMPT.md` (duración, locución, reglas de claims)
- [ ] MP4 H.264 con `+faststart` y póster JPG por idioma en `public/videos/tutorials/`
- [ ] Entrada en `TUTORIALS` (`src`, `poster`, `seconds`) por idioma
- [ ] `<DemoTutorial demoId="…" returnToId="…">` en la página de la demo (`variant="featured"` para una tarjeta grande con póster)
- [ ] Actualizar este tracker, AGENTS.md §11 y README (*Tutorial videos*)
