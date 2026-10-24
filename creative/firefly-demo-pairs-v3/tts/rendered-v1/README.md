# TTS — clip con escritura programada

Alternativa al render generativo para evitar letras reveladas por máscaras. **MP4 real generado**, ocho segundos, 24 FPS, H.264/yuv420p/faststart, sin audio, explicación completa dentro del video. Interfaz recreada en Canvas; conserva el concepto y la distribución, sin prometer identidad visual píxel a píxel con los JPG generados.

- `tts-typed-master-v1.mp4`: 1280×720, 84.417 bytes.
- `tts-typed-web-v1.mp4`: 640×360, 34.358 bytes.
- `typing-proof.png`: los ocho estados completos de escritura.
- `validation.json`: formato, tiempos exactos de pulsación y comprobación de píxeles.

El cursor parpadea; cada glifo se inserta completo en una posición fija; se genera la onda; la onda pulsa durante dos segundos de reproducción; bolita y relleno llegan al final. No se usa un wipe, máscara, recorte o fade para escribir. No depende de overlays de la página.

Se verificaron 192 estados de animación, duración/formato mediante FFprobe y fotogramas decodificados del MP4 en W completa, palabra completa, reproducción activa y final. El área de la primera W permanece idéntica al añadir caracteres. No se ha integrado ni desplegado este video en la web.

Para regenerar desde el repo, usando solo dependencias existentes:

```sh
node scripts/renderTtsConceptClip.mjs /ruta/a/carpeta-nueva
```

El script rechaza sobrescribir los MP4 existentes. Produce master, versión web y pruebas locales; nunca publica ni modifica el catálogo. Los prompts Firefly se conservan como material experimental, pero este render es la vía recomendada para escritura exacta.
