# Trabajo pendiente

## PAY-01 — Pasarela de pagos online

- Registrado: 19 de octubre de 2026.
- Estado: pendiente; no implementar ni activar cobros todavía.
- Propuesta inicial: evaluar Stripe como plataforma principal, sujeto al país de la entidad que factura, cuenta bancaria, monedas y perfil de clientes.
- Alcance propuesto: Payment Links para ofertas de precio fijo; Invoicing para anticipos e hitos de consultoría; Checkout/Billing para futuras suscripciones. Evaluar cobros bancarios para importes empresariales elevados.
- Antes de implementar: confirmar entidad y países, productos/precios, impuestos aplicables, política de reembolsos y comisiones completas del flujo elegido.
- Implementación futura: comenzar en modo de prueba; usar checkout alojado, secretos sólo en servidor y webhooks firmados/idempotentes para confirmar pagos antes de entregar accesos o servicios.
- No se han creado cuentas, configurado credenciales, activado suscripciones ni modificado la web para cobrar.

## MEDIA-01 — Generate self-contained Firefly v2 clips and integrate demand loading

- State: 13 NEW concept first frames and 13 rewritten prompts are ready in `creative/firefly-demo-clips/`; v1 background-only prompts are superseded.
- Use `first-frame-v2.jpg` + `firefly-prompt-v2.txt`, 16:9, 720p, eight seconds, 24 FPS, audio off. Save `<id>-firefly-v2-master.mp4`.
- Validate every video frame: landmarks/boxes must track their subject; counts, invoice values and citations must agree; labels must remain readable. All explanatory graphics belong INSIDE the MP4, not a static web layer. Reject or regenerate drift/morphing; tracked compositing into the final MP4 is acceptable if necessary.
- Encode without crop/truncation using `scripts/encodeFireflyClip.mjs`: 640×360, eight seconds, 24 FPS, silent, faststart, maximum 750KB. Review visual quality separately.
- Integrate only approved files with no initial src/source, selected hover/touch playback, one clip at a time, pause offscreen and poster fallback. Preserve full frame with contain; suppress existing CSS explanatory overlays for video mode.
- Actual Adobe video generation, temporal validation and runtime video integration remain pending. No Adobe credentials/upload/credits or production video activation occurred in this authoring revision. Image generation used built-in image_gen.
