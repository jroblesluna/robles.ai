# Robles.AI — continuidad para nuevas sesiones

Actualizado: **24 de octubre de 2026**, zona **America/Los_Angeles**. Este documento resume decisiones y evidencia fechada; no sustituye leer el código y comprobar el estado actual. No contiene secretos. No tratar observaciones antiguas como estado de producción actual.

## 1. Leer primero y retomar

1. Leer `AGENTS.md` y este archivo; después solo la documentación relevante.
2. Trabajar en **`/Users/antoniorobles/Dev/robles.ai`**, remoto `https://github.com/jroblesluna/robles.ai`.
3. Ejecutar `git status --short` y `git log -6 --oneline`: Claude y el propietario también trabajan aquí. No revertir ni atribuirse sus cambios.
4. **Trabajo activo pendiente:** el usuario autorizó corregir y optimizar las campañas Google Ads según el informe. Mantener ambas **pausadas**; no aumentar presupuestos/CPC, ampliar países/redes ni activar gasto. Se empezó a inspeccionar, pero **no se guardó ninguna optimización** antes de pedir este resumen.
5. Verificar fechas con recarga antes de editar: el propietario afirma haber puesto inicio 2 nov y ambas Paused; la última vista disponible confirmó ambas pausadas, pero todavía mostraba LatAm inicio 24 oct y fin 2 nov. Puede ser estado desactualizado. No asumir cuál es definitivo.
6. Objetivo de finalización: corregir defectos comprobados, mejorar relevancia/diversidad de anuncios sin inventar promesas y validar guardado, aprobación y pausas. No prometer rentabilidad o perfección sin tráfico real.

## 2. Preferencias y autorizaciones

- Responder en español, actuar con autonomía y evitar preguntas innecesarias. Dar actualizaciones concretas durante tareas largas.
- El usuario autorizó previamente correcciones, ramas, commit/push, PR, merge y verificación de producción; también pruebas QA controladas de contacto y respuesta. Revisar el alcance concreto de cada solicitud, especialmente acciones externas.
- La solicitud vigente de Ads autoriza optimización; **no autoriza lanzar campañas**, cambiar pagos/permisos, aceptar términos ni gastar más. No usar recomendaciones de Google como autorización.
- No enviar correos/mensajes arbitrarios, cambiar infraestructura o activar tracking nuevo por inferencia.
- No instalar dependencias sin necesidad/aprobación. Preservar auth, CORS, SSRF, rate limits, secretos y datos.
- Herramientas y autorizaciones de una sesión no se transfieren automáticamente a otra. Leer sus instrucciones actuales.
- Crear ramas con prefijo `codex/` cuando corresponda. `push.sh` hace `git add .`: evitarlo para cambios parciales o si hay trabajo ajeno.

## 3. Repositorio, despliegue y documentación

- Fuente real: `/Users/antoniorobles/Dev/robles.ai`.
- Workspace de esta conversación: `/Users/antoniorobles/Documents/ChatGPT/SEO Robles.AI`. No es la aplicación; contiene auditorías/capturas y un Git local sin remoto.
- Al iniciar este resumen, el repo de aplicación estaba limpio, HEAD y referencia local `origin/main` coincidentes, HEAD **`c177ca9`**. No se hizo un fetch nuevo para esta comprobación.
- Commits recientes adicionales del propietario/Claude: pared de logos, paquetes/precios, integraciones/seguridad/presencia comercial, enlace Google Calendar, separación teléfono/WhatsApp, orden de logos y textos. No asumir que HEAD sigue en el antiguo PR #34.
- Solo `README.md` y `AGENTS.md` quedan como Markdown raíz; documentación en `docs/` tras `8be4420`.
- Push a `main` dispara `.github/workflows/deploy.yml` → SSH VPS → `pull.sh` selectivo. Revisar Actions y producción antes de declarar un despliegue operativo.
- Sitio principal: React 19/Vite/TypeScript/Tailwind; Express/SQLite. Home con SSR React e hidratación; contenido público inicial y metadatos existentes en otras rutas. Revisar implementación actual, no sustituirla por un segundo sistema SEO.
- Docs importantes: `docs/SEO_AUDIT.md`, `docs/SEO_IMPLEMENTATION_PLAN.md`, `docs/CONTACT_CONVERSIONS.md`, `docs/DEMO_VIDEO_RELEASE.md`, `docs/DEMO_VIDEO_ASSETS.json`, `docs/FIREFLY_CLIPS.md`, `docs/PENDING_WORK.md`.

### Entregas conocidas

| Entrega | Evidencia histórica |
|---|---|
| Vídeos optimizados a demanda | PR #33, commit `46573d0` |
| Contacto confirmado y Reply-To | PR #34, commit `95f9b50`; Actions `39904109912` exitoso |
| Fuentes creativas pendientes conservadas | `3f558c3`: 47 archivos; push main y Actions `40065876912` exitoso |
| Ads analytics y señales de contacto/quiz | `6c82e48`; revisar código actual |

Los cambios creativos anteriores **ya se commitearon y pushearon**. No presentarlos como pendientes locales ni ignorar fuentes útiles para ocultar cambios. `.gitignore` no deja de versionar archivos ya tracked.

## 4. Google Ads — cuenta correcta y campañas

Cuenta vigente **Robles.AI: `585-089-9991`**, con `antonio@robles.ai`. Parámetro de navegación observado `ocid=8624925545`, `authuser=0`; no es el Customer ID público. Verificar identidad en cada nueva sesión.

Existe otra cuenta histórica **Inversiones On Line `971-189-1212`**, con `jrobles@sistemas.com.pe`: cancelada desde 9 sep 2025, método principal caducado. **No usarla ni reactivarla por confusión.** El motivo exacto de cancelación no se confirmó. No es la cuenta de estas campañas.

### Baseline auditado el 24 octubre, antes de optimizar

| Campo | EE. UU. | LatAm |
|---|---|---|
| Nombre | Search - US - AI Consulting (EN) | Search - LatAm - Consultoría IA (ES) |
| Campaign ID | `24392675435` | `24393066470` |
| Presupuesto medio diario | USD 15 | USD 5 |
| Puja / CPC máximo | Maximize clicks / USD 6 | Maximize clicks / USD 1,50 |
| Países | United States | Chile, Colombia, Mexico, Peru |
| Ubicación avanzada | Presence | Presence |
| Redes | Solo Google Search | Solo Google Search |
| Grupos y anuncios | 5 y 5 | 5 y 5 |
| Keywords | 34, frase/exacta | 30, frase/exacta |
| Negativas | 13 de frase, nivel campaña | 13 de frase, nivel campaña |
| Recursos | 4 sitelinks + 4 callouts elegibles | 4 sitelinks + 4 callouts elegibles |
| Ad Strength | 3 Poor, 2 Average | 5 Poor |
| Inicio/fin observado | 2 nov 2026 / sin fin | 24 oct / 2 nov: discrepancia con lo comunicado por el usuario |
| Estado más reciente | Paused | Paused |

Ambas con cero impresiones, clics, gasto y conversiones atribuidas en las vistas revisadas. Los encabezados y resúmenes quedaron desactualizados en ocasiones: confirmar con tablas/paneles recargados, no interpretar un error visual como guardado correcto. El usuario arregló así la discrepancia inicial de países.

El control de inicio LatAm apareció deshabilitado al consultar el calendario. Si sigue igual, no prometer que se puede mover: una opción conservadora es retirar fin, mantener pausa y lanzar manualmente el 2 nov. No hacerlo sin comprobar primero si el propietario ya lo corrigió.

### Estructura y URLs

Cinco intenciones: Consultoría IA / AI Consulting; Chatbots / AI Chatbots; Asistente de conocimiento (RAG) / Knowledge Assistant (RAG); Agentes IA / AI Agents; IA documental / Document AI.

- Landing EN: `https://robles.ai/get-started`, variantes `?s=chatbots`, `?s=rag`, `?s=agents`, `?s=docs`.
- Landing ES: `https://robles.ai/get-started?lang=es`, variantes con `&s=...`.
- Las diez URLs respondieron HTTP 200 y HTML lang/H1 EN/ES correcto el 24 oct. No afirmar que ese test prueba interacción ni conversión atribuida.
- Precios: `#diagnostico`; contacto: `#contacto`, **también en inglés**. Anclas confirmadas en HTML. No cambiarlas por `#pricing` o `#contact` por intuición.
- Sitelinks españoles: Demos de IA en vivo; Precios y paquetes; Test de IA gratis; Contáctanos. Ingleses: Live AI Demos; Pricing & Packages; Free AI Readiness Test; Contact Us.
- Callouts ES: Tarifa Fija; NDA Desde el Primer Día; Español e Inglés; Trato con el Fundador. EN: Fixed-Fee Pricing; NDA From Day One; English & Spanish; Direct Access to Founder.
- Cada callout ≤25 caracteres y no clicable. Son recursos de campaña; conservar idiomas separados. Toda afirmación debe ser verificable y coherente con la landing.
- Negativas ES: certificación, curso, cursos, descargar, diplomado, empleo, gratis, login, maestría, prácticas, sueldo, trabajo, tutorial.
- Negativas EN: careers, certification, course, courses, degree, free, internship, job, jobs, login, resume, salary, tutorial.
- Cuatro keywords ES con bajo volumen observado: chatbot ia para negocio; digitalización de documentos con ia; ia con documentos de la empresa; buscador inteligente empresa. No bloquean toda la campaña.

### Qué optimizar y qué no confundir

- Revisar diversidad/relevancia de títulos y descripciones de los diez RSA. Baseline: 10 títulos/4 descripciones cada uno salvo consultoría EN con 12 títulos. No copiar literalmente el mismo beneficio en todo; no rellenar por puntaje.
- Ad Strength Poor es diagnóstico de recursos, no rechazo ni garantía de resultados. La revisión previa no guardó cambios de anuncios.
- No activar AI Max, broad match, Search Partners/Display ni auto-apply para subir Optimization Score. AI Max/expansión de URL/personalización de texto estaban apagados; auto-apply cuenta apagado.
- “All channels set to high priority” no es un defecto por sí solo si las redes adicionales están desactivadas. La recomendación inicial de personalizar prioridades era conservadora, no requisito de lanzamiento.
- No segments es válido en Search; audiencias opcionales preferentemente Observation, no Targeting que limite compradores sin evidencia. No se añadieron segmentos.
- Google retiró el selector manual de idioma de Search desde septiembre 2026: se usa el idioma de anuncios. Ver referencia oficial abajo; su ausencia no demuestra configuración errónea.
- Presupuesto diario es promedio. Para la mayoría de campañas, puede facturarse hasta 2× en un día y 30,4× en un mes completo con presupuesto constante. No llamarlo tope diario estricto.
- La aprobación del anuncio y el rendimiento comercial son cosas diferentes. Revisar calidad del lead y términos por país tras el lanzamiento; no hacer clic en anuncios propios para probar atribución.

## 5. Medición, contacto y lead real

### IDs públicos útiles (no credenciales)

- GA4 measurement: `G-XDN2F4YSNQ`; propiedad `492769320`, cuenta `353425668`, nombre robles-ai.
- GTM: `GTM-5K5J3P2Z`; account `6370618809`, container `260806970`, workspace `5`.
- Meta dataset/píxel **`657101637173005`**. **`1510997440798902` es la app vinculada**, no el dataset web.
- Meta business `10066282143404394`; ad account `566810459797141` (independiente de Google Ads).

### Contrato del código y cambios posteriores

- `server/contactRoutes.ts` montado desde `server/routes.ts`: valida, escapa HTML, texto plano, espera aceptación SMTP, Reply-To al visitante, responde `{success:true}` solo tras aceptación. No expone inbox ni secretos.
- `src/components/Contact.tsx`: exige HTTP éxito y success true antes de emitir lead. Fallos no producen lead; analítica fallida no invalida un correo enviado.
- `src/lib/analytics.ts`: GTM/dataLayer como ruta exclusiva cuando está configurado; fallback GA4/Meta directo sin tracking duplicado. Payload sin valores personales.
- **Importante: al 24 oct el código también envía generate_lead para el quiz** después de recibir leadId, antes de verificación del email (`src/pages/Quiz.tsx`). No todo generate_lead es un formulario de contacto ni un lead verificado/cualificado. Distinguir `form_id` y `method`.
- `contact_click` representa intención (teléfono, WhatsApp, email/calendario), no entrega de mensaje: mantener secundario si se importa en Ads.
- La documentación actual deja como pendiente comprobar mapeo GTM `contact_click → Contact`, evento clave GA4 e importación secundaria. **No se verificó ni configuró esto en la auditoría de Ads**; inspeccionar antes de duplicar.

### Google Ads verificado el 24 oct

- Cuenta activa, auto-tagging Yes. Las dos campañas usan Account-default: Submit lead forms.
- Acción `robles-ai (web) generate_lead`, ID `7867585111`, creada 23 oct: fuente GA4, propiedad robles-ai, evento generate_lead, Primary, Count One, ventana de clic 90 días, atribución data-driven / Google paid channels.
- Valor configurado: distintos valores y **USD 1 por defecto si no llega valor**. Propuesta pendiente: valorar si dejarlo sin valor para no confundir leads con ingresos; no inventar valor comercial ni ROAS. No se cambió todavía.
- Existe `Lead form - Submit`, Google hosted, Primary pero “Included in account-level goals: No”; no se confirmó duplicación. No borrar por el solo hecho de existir.
- No recent conversions y 0: la importación existe; no demuestra atribución real. La afirmación del informe del 23 oct “no hay cuenta/vínculo Ads” **quedó superada** por esta evidencia.

### Circuito QA ya probado

- 23 oct 2026: consulta controlada en producción, recepción en Antonio y Reply-To al visitante de un segundo buzón autorizado; respuesta recibida realmente en el segundo Inbox. GA4 realtime generate_lead 1 y key event 1.
- Meta: prueba del **22 oct**, dos recepciones brutas (Pixel 1, CAPI 1), calidad 8,3/10 y estado individual explícito **Deduplicado** comprobado el 23. El resumen agregado seguía sin porcentaje. No llamarlas dos leads ni atribuir esa prueba al 23.
- GTM existente: lookup generate_lead→Lead; GA4 y Meta comparten event_id derivado de gtm.start/uniqueEventId. No añadir otro Pixel/CAPI sin necesidad.
- Diagnóstico Meta consultado entonces sin errores. No es estado en tiempo real garantizado.
- No se enviaron consultas ni se generaron clics pagados durante la auditoría del 24.

## 6. Demos, vídeos y materiales creativos

- Home muestra diez demos live; laboratorio incluye además tres roadmap. Comparten componente. Un vídeo ilustrativo no activa una API ni convierte una demo roadmap en disponible.
- Trece vídeos H.264 silenciosos ≤960×540, 24 FPS, faststart, 16:9 sin recorte. Total entrega 1.950.071 bytes frente a 12.104.544 de masters; mayor clip 326.248 bytes. Evidencia histórica PR #33; consultar manifiesto si cambia.
- `src/components/demo/DemoVideoPreview.tsx`: sin src/source inicial, preload none; hover puntero fino, touch/teclado explícitos, un vídeo activo, pausa offscreen/documento oculto, fallback, reduced-motion/Save-Data/2G con opt-in.
- Posters 480/960, nombres con hash y caché assets. No montar overlays explicativos estáticos sobre vídeos que ya incluyen explicación.
- `creative/firefly-demo-pairs-v3/`: 13 parejas First/Last, prompts, manifiesto. Prompts de vídeo **máximo 2.500 caracteres** incluyendo whitespace del archivo. Validar con `node scripts/verifyFireflyPrompts.mjs`.
- Correcciones conceptuales importantes: landmarks interiores y distancias faciales; sonrisa/malla/barras sincronizadas sin retroceso; ondas visibles desde inicio y A antes de B en transcripción, timer/cursor/barra juntos hasta 00:20; TTS glifos completos discretos; factura con movimientos coherentes entre extremos; agente de voz con 5 frames, mensaje→búsqueda de fechas→selección→Booked.
- `scripts/renderTtsConceptClip.mjs` crea alternativa Canvas/FFmpeg con escritura exacta, sin sobrescribir MP4. Se conservan master/web/prueba y validación; conservar como autoría, no sustituir clips publicados automáticamente.
- Las notas creativas antiguas “video pendiente/no desplegado” describen revisiones históricas. PR #33 ya integró clips; `3f558c3` preservó fuentes y aclaró estado en dos documentos.
- Nunca afirmar que se generó un vídeo en Firefly si solo se escribió un prompt; el usuario produjo exports externos. Imagegen final usa un master local de órbita de producto.

## 7. SEO y pendientes no cerrados por Ads

- Historial: slugs EN/ES compartidos, href del blog, CTA sin lang, metadatos/canonicals/sitemap y contenido inicial fueron corregidos en ciclos previos. Leer encabezado vigente de auditoría, no reabrir defectos históricos como confirmados.
- Home SSR real e hidratación EN/ES; JS sigue siendo normal para interacciones. No declarar que CSR implica por sí solo desindexación.
- Auditoría SEO con cierre 18 oct conserva laboratorio móvil Performance 54, LCP 9,1 s y TBT 560 ms: **histórico**, no score actual ni CWV de campo. No se volvió a medir en la revisión de Ads.
- Indexación y posiciones reales requieren propiedad GSC/Bing o exportaciones. En esta conversación hubo intentos de conexión posteriores, pero no hay evidencia consolidada aquí para declararlas verificadas. Reconsultar cuentas/reportes; no inferir de sitemap/HTTP 200.
- CrUX/PSI sin datos suficientes en revisión anterior; no p75 real de LCP/INP/CLS confirmado. TBT no equivale a INP. No añadir RUM/terceros sin aprobación aplicable.
- Despliegue histórico observó 502 mientras PM2 se detenía antes del build; verificar procedimiento actual antes de tocar infraestructura.
- Pasarela de pago PAY-01 sigue pendiente: evaluar según entidad/país/banco/moneda; no hay autorización para activar cobros por esta tarea.
- Admin/Dominical/API-key indicators fueron solicitudes anteriores: no declarar auditoría funcional completa del admin con base en esta revisión de Ads.

## 8. Evidencia y comandos de bajo coste

Evidencia local fuera de Git (puede no existir en otra máquina):

`/Users/antoniorobles/Documents/ChatGPT/SEO Robles.AI/artifacts/`

- `GOOGLE_ADS_REVIEW_2026-10-24.md`: baseline de Ads previo a optimización; no refleja futuros cambios.
- `ads-latam-dates-2026-10-24.png`: evidencia de inicio bloqueado/fin incorrecto antes de corrección.
- `ads-campaigns-final-settings-2026-10-24.txt`: tabla textual al cerrar esa auditoría.
- `LEAD_LOOP_VERIFICATION_2026-10-23.md`: circuito correo/GA4/Meta; apartado Ads histórico superado.
- Capturas `lead-verification-2026-10-23-*`: deduplicación, correo y GA4. No publicar PII en Git.

### Preferencia de herramientas

1. **CLI/API oficial ya autorizada** para Git, código, Actions, HTTP y datos tabulares. Guardar respuestas grandes localmente y devolver resúmenes. No instalar SDK ni extraer cookies/tokens del navegador para “ahorrar screenshots”.
2. **Navegador con DOM/texto/locators** para Google Ads/GTM/GA4/Meta cuando no hay API configurada. Leer main/dialog/tabla relevante, no snapshots gigantes con iframes/srcdoc. El DOM puede virtualizar filas: paginar/scroll y comprobar totales.
3. **Captura** para diseño, errores visuales o evidencia tras guardar una modificación web. No tomar una captura por cada clic. Un texto enorme también consume contexto: CLI no es ahorro automático si se vuelca todo.
4. No existe una CLI Ads autenticada y verificada en esta sesión. La API oficial puede servir con OAuth, developer token y permisos adecuados; requiere una integración real. No suponer que `gcloud` da acceso a campañas. No CDP/Playwright externo/HTTP interno para saltarse las herramientas de navegador disponibles.
5. Cuando el navegador falle, releer instrucciones/troubleshooting y probar alternativas documentadas. IDs de navegador/tab cambian: descubrirlos; no reutilizar IDs antiguos como permanentes. Mac bloqueado puede impedir control nativo aunque DOM siga funcionando.
6. Las capturas son contexto de imagen y el texto es contexto de texto. No hay una cifra fija de coste por captura verificada aquí; depende de modelo, resolución/contexto y producto. No confundir tokens con porcentaje exacto de cuota o créditos.

Comandos orientativos, revisar scripts antes de ejecutar:

```sh
cd /Users/antoniorobles/Dev/robles.ai
git status --short
git log -6 --oneline
node scripts/verifyFireflyPrompts.mjs
node --check scripts/renderTtsConceptClip.mjs
gh run list --branch main --limit 3 --json headSha,status,conclusion,url
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' 'https://robles.ai/get-started?lang=es'
```

- Python urllib falló validación del almacén CA local; `/usr/bin/curl` validó TLS correctamente. **No usar -k ni desactivar certificados.**
- Pruebas históricas de contacto: cuatro suites específicas, 20 pasadas; tests/build no se reejecutaron para este resumen. No proclamar suite global verde: hubo fallos preexistentes de carousel/public slides y aislamiento de cookies.
- TypeScript tuvo diagnósticos preexistentes en ciclos anteriores; comparar baseline actual, no usar una cifra histórica como estado actual.
- Publicar un commit no prueba producción: comprobar Actions y artefacto/HTTP real después.

## 9. Investigación de VS Code

El archivo `/Users/antoniorobles/Dev/robles.ai.code-workspace` no incluía SEO Robles.AI; siete carpetas de desarrollo y mtime 28 sep 2026. Git.log registró apertura del repo SEO el **22 oct 21:59:26.754 PDT**, justo tras activar Markdown a las 21:59:26.100. Historial de editor incluía `artifacts/CONTACT_CONVERSION_TEST_2026-10-22.md`; ajuste `git.openRepositoryInParentFolders: always`.

Conclusión sustentada: probable detección automática al abrir ese informe, no una adición al workspace guardado. No hay evidencia de que la extensión Chrome lo añadiera ni de quién abrió el documento. El usuario cerró el repo y confirmó que ya no aparece. No reabrir carpeta en VS Code sin necesidad.

## 10. Referencias oficiales consultadas

- Idioma Search, cambio desde septiembre 2026: https://support.google.com/google-ads/answer/1722078?hl=en
- Ad Strength no determina elegibilidad: https://support.google.com/google-ads/answer/9921843?hl=en
- Observation/Targeting: https://support.google.com/google-ads/answer/7365594?hl=en
- Prioridades de canal: https://support.google.com/google-ads/answer/18385152?hl=en
- Callouts: https://support.google.com/google-ads/answer/6079510?hl=en
- Presupuesto promedio: https://support.google.com/google-ads/answer/6385083?hl=en
- Reactivar cuenta cancelada puede reactivar anuncios habilitados: https://support.google.com/google-ads/answer/2375392?hl=en

## Prompt breve para una sesión nueva

> Lee AGENTS.md y docs/SESSION_HANDOFF.md en /Users/antoniorobles/Dev/robles.ai. Retoma la optimización autorizada de las campañas Google Ads US/LatAm, manteniendo ambas pausadas y sus límites de gasto. Antes de editar, recarga y confirma fechas/estado: hay discrepancia histórica de calendario LatAm. Conserva cambios de Claude, no dupliques medición, utiliza CLI/API oficial o lecturas DOM selectivas y guarda evidencia tras cambios. Actualiza el handoff con lo realmente completado y los límites de verificación.
