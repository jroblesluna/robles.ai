# Trabajo pendiente

## PAY-01 — Pasarela de pagos online

- Registrado: 19 de octubre de 2026.
- Estado: pendiente; no implementar ni activar cobros todavía.
- Propuesta inicial: evaluar Stripe como plataforma principal, sujeto al país de la entidad que factura, cuenta bancaria, monedas y perfil de clientes.
- Alcance propuesto: Payment Links para ofertas de precio fijo; Invoicing para anticipos e hitos de consultoría; Checkout/Billing para futuras suscripciones. Evaluar cobros bancarios para importes empresariales elevados.
- Antes de implementar: confirmar entidad y países, productos/precios, impuestos aplicables, política de reembolsos y comisiones completas del flujo elegido.
- Implementación futura: comenzar en modo de prueba; usar checkout alojado, secretos sólo en servidor y webhooks firmados/idempotentes para confirmar pagos antes de entregar accesos o servicios.
- No se han creado cuentas, configurado credenciales, activado suscripciones ni modificado la web para cobrar.

## MEDIA-01 — Generar clips Firefly e integrar reproducción a demanda

- Estado: kit de 13 imágenes iniciales y prompts listo en `creative/firefly-demo-clips/`; videos aún por generar en Firefly.
- Generar y descargar cada `<id>-firefly-master.mp4` con el JPG y prompt correspondientes. Revisar estabilidad, encuadre y ausencia de texto generado.
- Comprimir y validar con `scripts/encodeFireflyClip.mjs`: 640×480, cinco segundos, 24 fps, sin audio, faststart, máximo 750 KB. El presupuesto debe comprobarse en cada clip real.
- Integrar sólo archivos aprobados; sin `src`/`source` inicial, reproducción por hover desktop o toque móvil, un clip a la vez, pausa fuera de pantalla y fallback. Contrato y pruebas de red en `docs/FIREFLY_CLIPS.md` y README del kit.
- No se han generado videos en Adobe, usado credenciales, consumido créditos ni activado nuevas descargas MP4 en producción.
