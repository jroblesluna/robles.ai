# Trabajo pendiente

## PAY-01 — Pasarela de pagos online

- Registrado: 19 de octubre de 2026.
- Estado: pendiente; no implementar ni activar cobros todavía.
- Propuesta inicial: evaluar Stripe como plataforma principal, sujeto al país de la entidad que factura, cuenta bancaria, monedas y perfil de clientes.
- Alcance propuesto: Payment Links para ofertas de precio fijo; Invoicing para anticipos e hitos de consultoría; Checkout/Billing para futuras suscripciones. Evaluar cobros bancarios para importes empresariales elevados.
- Antes de implementar: confirmar entidad y países, productos/precios, impuestos aplicables, política de reembolsos y comisiones completas del flujo elegido.
- Implementación futura: comenzar en modo de prueba; usar checkout alojado, secretos sólo en servidor y webhooks firmados/idempotentes para confirmar pagos antes de entregar accesos o servicios.
- No se han creado cuentas, configurado credenciales, activado suscripciones ni modificado la web para cobrar.

## MEDIA-01 — Generar videos Firefly desde parejas v3 e integrar carga a demanda

- Estado: **13 parejas completas (26 JPG) y 13 prompts** en `creative/firefly-demo-pairs-v3/`; sustituyen las instrucciones de una sola imagen v2/v2.1.
- Cada carpeta contiene `start.jpg`, `end.jpg` y `firefly-prompt.txt`: subir a Frames → First/Last, 16:9, 720p, ocho segundos, 24 FPS y Audio off.
- Revisión 3.1: 13 inicios nuevos y dos finales nuevos (sonrisa e identidad con landmarks internos); 11 finales reutilizan los visuales existentes. Imágenes revisadas; interpolación/video todavía sin verificar.
- Generar primero un piloto; revisar texto, identidad, objetos, cajas/malla, campos, conteos, citas y composición durante todo el clip. No aceptar una simple disolución ni solo resaltes. Explicación completa dentro del MP4.
- Codificar sin recorte con el encoder existente: 640×360, ocho segundos, sin audio, faststart, máximo 750 KB. El pase técnico no certifica calidad visual.
- Integrar solo archivos aprobados: sin src/source inicial, hover/touch solicitado, un clip activo, pausa fuera de pantalla, reduced motion/data saver y poster de respaldo. Usar contain y desactivar overlays explicativos CSS en modo video.
- Pendientes: generación real en Adobe, revisión temporal e integración. No se usaron credenciales/créditos de Adobe ni se habilitaron videos nuevos en producción. Imágenes con image_gen integrada.
