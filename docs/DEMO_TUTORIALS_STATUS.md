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
| `emotion` | `/try-emotion` | ✅ (56 s) | ⬜ |
| `rag` | `/try-rag` | ⬜ | ⬜ |
| `sitechatbot` | `/try-chatbot` | ⬜ | ⬜ |
| `identity` | `/try-identity` | ⬜ | ⬜ |
| `speech` | `/try-transcription` | ⬜ | ⬜ |
| `langchain` | `/try-langchain` | ⬜ | ⬜ |
| `docextract` | `/try-docextract` | ⬜ | ⬜ |
| `tts` | `/try-tts` | ⬜ | ⬜ |
| `forecast` | `/try-forecast` | ⬜ | ⬜ |
| `voiceagent`, `anomaly`, `imagegen` | — (soon) | — | — |

**Avance**: 3 de 20 videos (10 demos live × 2 idiomas) · 1 demo completa en ambos idiomas.

## Detalle por etapa

| Demo | Capturas | Brief Remotion | Video ES | Video EN | En `TUTORIALS` | Botón en la página |
|------|:--------:|:--------------:|:--------:|:--------:|:--------------:|:------------------:|
| `objectdetection` | ✅ | ✅ | ✅ | ✅ | ✅ ES + EN | ✅ |
| `emotion` | ✅ | ✅ | ✅ | ⬜ | 🟡 solo ES | ✅ |
| `rag` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `sitechatbot` | ✅ | ✅ (EN bloqueado, §0) | ⬜ | ⬜ | ⬜ | ⬜ |
| `identity` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `speech` | ✅ (llamada de ejemplo en `audio/`) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `langchain` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `docextract` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `tts` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `forecast` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Próximos pasos sugeridos

1. `emotion`: producir la versión en inglés y registrarla en `TUTORIALS.emotion.en`.
2. `rag`: ya tiene brief y capturas; falta renderizar ES y EN, registrar y montar `<DemoTutorial demoId="rag">`.
3. `sitechatbot`: renderizar ES; EN espera a que el bot responda en el idioma de la pregunta.
4. `speech`: renderizar ES y EN (se puede ya); en paralelo, corregir en `TryTranscription.tsx` las
   líneas provisionales que no se borran y el orden de los turnos (§0 del prompt) y recapturar.

## Checklist para publicar un tutorial

- [ ] Capturas + `capture-screenshots.mjs` en `docs/demo-tutorials/<ruta>/`
- [ ] `REMOTION_TUTORIAL_PROMPT.md` (duración, locución, reglas de claims)
- [ ] MP4 H.264 con `+faststart` y póster JPG por idioma en `public/videos/tutorials/`
- [ ] Entrada en `TUTORIALS` (`src`, `poster`, `seconds`) por idioma
- [ ] `<DemoTutorial demoId="…" returnToId="…">` en la página de la demo
- [ ] Actualizar este tracker, AGENTS.md §11 y README (*Tutorial videos*)
