# Trabajo pendiente

## PAY-01 — Pasarela de pagos online

- Registrado: 19 de octubre de 2026.
- Estado: pendiente; no implementar ni activar cobros todavía.
- Propuesta inicial: evaluar Stripe como plataforma principal, sujeto al país de la entidad que factura, cuenta bancaria, monedas y perfil de clientes.
- Alcance propuesto: Payment Links para ofertas de precio fijo; Invoicing para anticipos e hitos de consultoría; Checkout/Billing para futuras suscripciones. Evaluar cobros bancarios para importes empresariales elevados.
- Antes de implementar: confirmar entidad y países, productos/precios, impuestos aplicables, política de reembolsos y comisiones completas del flujo elegido.
- Implementación futura: comenzar en modo de prueba; usar checkout alojado, secretos sólo en servidor y webhooks firmados/idempotentes para confirmar pagos antes de entregar accesos o servicios.
- No se han creado cuentas, configurado credenciales, activado suscripciones ni modificado la web para cobrar.

## SEC-01 — Rotar claves de las APIs de demos desde el admin

- Registrado: 30 de octubre de 2026.
- Estado: pendiente; no implementar todavía.
- Objetivo: cambiar desde `/admin/backends` las claves que hoy viven en Secret Manager (OpenAI, Speechmatics, Deepgram, Pinecone) y se rotan con `rotate_secret.sh` en cada repo.
- Requisito: solo la cuenta de Antonio puede hacerlo, y con 2FA. El login admin actual no tiene 2FA ni cuentas con permisos distintos, así que hay que construir ambos antes.
- Permisos: una cuenta de servicio nueva, separada de `backend-viewer`, limitada a agregar versiones de esos secretos y actualizar sus servicios de Cloud Run.
- Comportamiento: campos de solo escritura; validar la clave con el proveedor antes de aplicarla; desplegar una revisión nueva para que Cloud Run la lea; destruir las versiones viejas, como hace `rotate_secret.sh`.
- Auditoría: registrar quién cambió qué clave y cuándo, nunca su valor.
- Riesgo a aceptar: hoy el servidor del sitio no puede modificar GCP. Con esto, comprometer el admin o el servidor podría afectar a las APIs de demos.

## SEC-02 — Endurecer el acceso a las APIs

- Registrado: 31 de octubre de 2026.
- Las API keys ya existen. Falta cuota y costo por cliente, e identificar la IP real en cada API: en Cloud Run todas las peticiones llegan con la misma IP interna, así que el límite por IP actual es compartido.
- `demo-token` es público: quien automatice la página puede obtener tokens. Lo acotan los 15 minutos y el límite por IP; revisar si hace falta un desafío anti-bots.
- El `callback` de Identity acepta cualquier URL: restringirlo antes de ofrecer esa API.

## SEC-03 — Medición de uso, créditos y cuotas por cliente

- Registrado: 31 de octubre de 2026.
- Estado: pendiente; hacerlo antes de entregar API keys a clientes, porque el uso no registrado no se recupera.
- Hoy no hay medición por clave: solo `last_used_at`, peticiones totales por servicio en Cloud Monitoring, y segundos de audio y tokens en los logs de Transcription.
- Unidad propuesta: créditos para el cliente, calculados desde la unidad real de cada API. Transcription: minutos de audio. TTS: caracteres. DocExtract: documentos. Identity: verificaciones. RAG: preguntas y fragmentos indexados. Chatbot: páginas leídas y mensajes. LangChain: mensajes.
- Paso 1, registrar: cada API reporta a robles.ai la clave, la unidad y la cantidad de cada operación, más los tokens de OpenAI para calcular el margen. Incluye las demos, en su propia clave.
- Paso 2, mostrar: consumo por clave y por API en el admin, por día y por mes.
- Paso 3, limitar: cuota mensual por clave, con 429 al agotarla. Hacerlo después de reunir datos reales.
- Antes del paso 3: revisar precios de los proveedores y fijar el valor del crédito.
- Caso a resolver: en Transcription en vivo el consumo se conoce al terminar, así que la sesión debe cortarse al agotarse el saldo o el cliente podría pasarse.

## MEDIA-01 — Integración completada; kit de autoría conservado

- **Estado actualizado — 23 de octubre de 2026: completado.** Los 13 clips se integraron en el PR #33 (commit `46573d0`) con activación por hover/touch y carga a demanda. Ver [entrega](DEMO_VIDEO_RELEASE.md) y [manifiesto](DEMO_VIDEO_ASSETS.json).
- Los prompts, frames y renders alternativos se conservan como fuentes de edición, sin sustituir automáticamente los archivos publicados. Las indicaciones siguientes documentan el estado histórico anterior a esa entrega.

### Registro histórico previo a la integración

- Estado: **13 parejas completas (26 JPG) y 13 prompts** en `creative/firefly-demo-pairs-v3/`; sustituyen las instrucciones de una sola imagen v2/v2.1.
- Cada carpeta contiene `start.jpg`, `end.jpg` y `firefly-prompt.txt`: subir a Frames → First/Last, 16:9, 720p, ocho segundos, 24 FPS y Audio off.
- Revisión 3.2: 13 inicios y tres finales nuevos (sonrisa, identidad con landmarks internos y transcripción completada); 10 finales reutilizan los visuales existentes. Transcripción usa 00:00 → 00:20 con ondas/cursor/barra sincronizados. Imágenes revisadas; interpolación/video todavía sin verificar.
- Generar primero un piloto; revisar texto, identidad, objetos, cajas/malla, campos, conteos, citas y composición durante todo el clip. No aceptar una simple disolución ni solo resaltes. Explicación completa dentro del MP4.
- Codificar sin recorte con el encoder existente: 640×360, ocho segundos, sin audio, faststart, máximo 750 KB. El pase técnico no certifica calidad visual.
- Integrar solo archivos aprobados: sin src/source inicial, hover/touch solicitado, un clip activo, pausa fuera de pantalla, reduced motion/data saver y poster de respaldo. Usar contain y desactivar overlays explicativos CSS en modo video.
- Pendientes: generación real en Adobe, revisión temporal e integración. No se usaron credenciales/créditos de Adobe ni se habilitaron videos nuevos en producción. Imágenes con image_gen integrada.

- Actualización TTS 3.12: MP4 programado local ya generado y verificado (`creative/firefly-demo-pairs-v3/tts/rendered-v1/`). Para TTS quedan revisión del usuario e integración; no es necesario regenerar letras en Firefly. Las demás generaciones externas siguen sin verificarse desde los archivos locales.
