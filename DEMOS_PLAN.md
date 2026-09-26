# Plan del Laboratorio de Demos — Efecto Wow + Ahorro Visible

> **Objetivo.** Que cada visitante salga de `/demos` pensando *"esto me ahorra (o me hace ganar)
> dinero"*, no *"qué modelo más interesante"*. Hoy el catálogo le habla a ingenieros; tiene que
> hablarle a quien firma el presupuesto.
>
> Estado base: septiembre 2026. Fuente: `demosCatalog.items` en
> `src/i18n/locales/{en,es}/translation.json`, las páginas `src/pages/Try*.tsx` y los cuatro
> repos de APIs en Cloud Run.

---

## 1. Diagnóstico del catálogo actual

### 1.1 Lo que hay

| Demo | Estado | Wow | ¿Se entiende el ahorro? | Observación |
|------|--------|-----|-------------------------|-------------|
| Verificación de Identidad | live | Alto | No | Se presenta como "reconocimiento facial", no como "onboarding KYC en segundos". |
| Pipeline RAG | live | Medio | No | Muestra el cableado técnico (chunks, embeddings, reranking). Al comprador le importa "pregúntale a tus documentos". |
| Agente LangChain | live | Medio | No | Tiene nombre de framework. Nadie compra "LangChain". |
| Voz a Texto y Diarización | live | Alto | Parcial | El análisis de industria/roles/resumen es buen gancho, pero `/analyze` hoy falla (ver §5). |
| Detección de Objetos | live | Alto | No | Clases genéricas COCO (persona, taza, silla). Falta un caso de uso con plata detrás. |
| Reconocimiento de Emociones | live | Alto | No | Muy vistoso, pero con riesgo regulatorio (ver §4.3). |
| Imagen Médica | soon | — | — | Sin backend. Alto riesgo regulatorio y reputacional. |
| Sentimiento e Intención | soon | Bajo | Bajo | Commodity: cualquier LLM lo hace. Por sí sola no impresiona. |
| Pronóstico de Demanda | soon | Bajo–Medio | **Alto** | ROI muy claro (inventario), pero aburrido si no es interactivo. |
| Extracción de Documentos | soon | Medio–Alto | **Muy alto** | Horas de tipeo → segundos. El caso más fácil de vender. |
| Generación de Imágenes | soon | Alto | Bajo | Todos ya tienen ChatGPT/Midjourney; sin un ángulo de negocio no diferencia. |
| Motor de Recomendación | soon | Bajo | Medio | Necesita datos del cliente para impresionar; difícil de demostrar en frío. |
| Fraude y Anomalías | soon | Medio | **Alto** | Conecta con un caso de éxito real (ver §4.2). |

### 1.2 Los tres problemas de fondo

1. **Lenguaje técnico en vez de resultados.** Títulos y descripciones empiezan por el tipo de
   modelo ("Visión por Computador · Reconocimiento Facial"). El visitante tiene que traducir
   solo a su negocio, y casi nadie lo hace.
2. **Ninguna demo termina en dinero.** No hay un número de ahorro, ni una calculadora, ni un
   puente al quiz `/diagnostico-ia`, que ya existe y captura leads verificados.
3. **La lista de "próximamente" es genérica.** Es un menú de categorías de ML, no de problemas
   de clientes. Varias son commodity (sentimiento), difíciles de demostrar (recomendación) o
   riesgosas (médica).

---

## 2. Principios para cada demo

Toda demo, nueva o existente, cumple con esto antes de marcarse `live`:

1. **Título = resultado de negocio.** "Onboarding de clientes en 10 segundos", no
   "Reconocimiento facial". El tipo de modelo pasa a una etiqueta secundaria.
2. **Tarjeta "Caso de negocio"** arriba de la demo: el problema, a quién le sirve (industria /
   rol) y qué métrica mueve.
3. **Calculadora de ahorro** al terminar la demo: el visitante ingresa *sus* volúmenes y
   costos (p. ej. facturas/mes, minutos por factura, costo por hora) y ve el ahorro mensual
   estimado. **La fórmula usa sus datos, no cifras inventadas nuestras.**
4. **Cierre con acción:** "¿Cuánto ahorrarías tú? → Diagnóstico gratis" (`/diagnostico-ia`) y
   "Quiero esto para mi empresa" (contacto / Robly).
5. **Wow en menos de 30 segundos:** datos de ejemplo precargados (un clic y funciona) además
   de la opción de subir los propios.
6. **Tope de costo por sesión:** límites de duración, tamaño y rate limit en el backend. Cada
   demo pública es una puerta abierta a la cuenta de OpenAI/Deepgram.
7. **Medición:** eventos GA4 `demo_start`, `demo_complete`, `roi_calculated`, `demo_cta_click`
   por demo, para saber qué demo genera leads y no solo visitas.

> **Regla de claims.** No publicar porcentajes ni montos de ahorro que no estén respaldados.
> Solo se pueden citar (a) las cifras de nuestros casos de éxito
> (`public/case-studies/content.json`) y (b) los resultados de la calculadora con los datos del
> propio visitante. Ver también la §6 de `REMOTION_VIDEO_CONTEXT.md`.

---

## 3. Catálogo propuesto

### 3.1 Demos existentes: se quedan, reenfocadas en negocio

| Hoy | Nuevo título (resultado) | Ángulo de ahorro / ingreso | Calculadora |
|-----|--------------------------|----------------------------|-------------|
| Verificación de Identidad | **Onboarding de clientes en segundos** | Menos revisión manual de KYC, menos abandono en el alta | Altas/mes × minutos de revisión × costo/hora + tasa de abandono |
| Pipeline RAG | **Pregúntale a tus documentos** | Horas de búsqueda de información interna / soporte nivel 1 | Consultas/mes × minutos ahorrados × costo/hora |
| Agente LangChain | **Un asistente que hace tareas, no solo responde** | Tareas repetitivas automatizadas (consultas, cálculos, formularios) | Tareas/semana × minutos × costo/hora |
| Voz a Texto y Diarización | **Actas de reunión y llamadas automáticas** (evoluciona a Notas en vivo, ver D3) | Horas de minuta, QA de call center | Reuniones o llamadas/mes × minutos de minuta × costo/hora |
| Detección de Objetos | **Conteo de inventario y seguridad con cámara** | Conteos manuales, quiebres de stock, EPP en planta | Conteos/semana × horas × costo/hora |
| Reconocimiento de Emociones | **Satisfacción del cliente en tienda, en agregado** | Métrica de CX sin encuestas | Sin calculadora; enfoque de insight (ver §4.3) |

### 3.2 Nuevas demos (priorizadas)

| # | Demo | Wow | Ahorro claro | Esfuerzo | Reutiliza |
|---|------|-----|--------------|----------|-----------|
| **D1** | **"Tu chatbot en 60 segundos"**: pegás la URL de tu web y aparece un Robly entrenado con tu contenido, listo para vender y atender | Muy alto | Muy alto | M | `rag-api` (ingesta, embeddings, Pinecone) + UI de Robly |
| **D2** | **Facturas y documentos → datos en segundos**: subís una factura, contrato o formulario y sale JSON/Excel validado | Alto | Muy alto | S–M | LLM con visión (OpenAI, ya contratado) |
| **D3** | **Notas de reunión en vivo tipo Teams**: resumen, puntos por hablante, decisiones y tareas que se arman mientras hablás | Muy alto | Alto | M | `transcription-api` + diseño de "estado + ventana" ya definido |
| **D4** | **Recepcionista por voz con IA**: hablás con el navegador, la IA atiende, responde y agenda una cita | Muy alto | Muy alto (llamadas perdidas = ventas perdidas) | L | Voz en tiempo real (OpenAI Realtime u equivalente) |
| **D5** | **Simulador de fraude en vivo**: flujo de transacciones sintéticas, la IA marca las sospechosas y un contador muestra "$ evitado" | Medio–Alto | Alto | M | Caso de éxito de fraude (99.2% de precisión, más de $4.5M de ahorro anual) |
| **D6** | **Pronóstico de demanda con tu CSV**: subís ventas históricas y ves el pronóstico, más "stock inmovilizado evitado" | Medio | Alto | M | Modelo de series temporales en Cloud Run |
| **D7** | **Estudio de foto de producto**: una foto de celular se convierte en fotos de catálogo con fondos de marca | Alto | Medio | S–M | `gpt-image-1` (ya se usa en el Dominical) |

### 3.3 Qué pasa con la lista actual de "próximamente"

| Ítem actual | Decisión | Por qué |
|-------------|----------|---------|
| Extracción de Documentos | **Se hace → D2** | El ROI más fácil de explicar y de construir. |
| Fraude y Anomalías | **Se hace → D5** | Tiene un caso de éxito real que la respalda. |
| Pronóstico de Demanda | **Se hace → D6** | ROI claro; se vuelve interactiva con el CSV del visitante. |
| Generación de Imágenes | **Se reenfoca → D7** | Solo vale con un ángulo de negocio (fotografía de producto). |
| Sentimiento e Intención | **Se absorbe** en D3 (tono por hablante) y en voz / call center | Sola es commodity; como parte del análisis de llamadas sí suma. |
| Motor de Recomendación | **Se absorbe** en D1 (el chatbot recomienda productos del catálogo) | Sin datos del cliente no impresiona; dentro del chatbot sí. |
| Imagen Médica | **Sale del catálogo público** → "demo privada a pedido" | Riesgo regulatorio y de claims clínicos, costo alto, sin backend. Mejor mostrarla en reuniones con clínicas y con disclaimers. |

**Resultado:** el catálogo pasa de 6 live + 7 soon a **13 live** al terminar la Fase 3, todas
con un ángulo de dinero, y sin placeholders que no se van a construir.

---

## 4. Notas por demo

### 4.1 D1 — "Tu chatbot en 60 segundos" (la demo estrella)

- **Por qué primero:** el visitante ve *su propio negocio* funcionando con IA. Es el wow más
  personal posible, y el paso a "quiero esto" es inmediato.
- **Flujo:** ingresar URL → rastrear hasta N páginas (tope duro, p. ej. 20) → ingestar en un
  namespace efímero de Pinecone → chat con Robly usando ese contexto → CTA "instalalo en tu
  web".
- **Guardarraíles:** respetar `robots.txt`, tope de páginas y de tiempo, TTL del namespace
  (borrarlo a las 24 h), rate limit por IP, sin datos personales.
- **Calculadora:** consultas/mes que hoy atiende una persona × % resolución autónoma × costo por
  consulta. Como referencia citable: el caso de éxito telco (78% de resolución autónoma).

### 4.2 D5 — Simulador de fraude

- Transacciones **sintéticas** (nunca datos reales), streaming en pantalla, score por
  transacción y explicación ("monto atípico para este comercio + país nuevo").
- El contador "$ evitado" solo suma sobre los datos simulados, y lo aclara en pantalla.
- Enlaza al caso de éxito de fraude (99.2% de precisión, menos de 300 ms de respuesta).

### 4.3 Reconocimiento de emociones: bajar el riesgo

- En la UE, el AI Act prohíbe el reconocimiento de emociones en el trabajo y en la educación.
  **No venderla para RR.HH., evaluación de empleados ni aulas.**
- Reenfoque: insight **agregado y anónimo** de experiencia de cliente (retail, eventos). Mantener
  el mensaje actual de "todo se procesa localmente".

### 4.4 D4 — Recepcionista por voz: controlar el costo

- Es la demo más cara por minuto. Obligatorio: sesión máxima corta (p. ej. 2 minutos), una
  sesión por visitante cada X horas, captcha o verificación antes de empezar, y un tope de
  gasto diario del lado del backend.
- Guion guiado ("Probá pedir una cita para mañana a las 10") para que el wow llegue rápido.

---

## 5. Plan de implementación

### Fase 0 — Higiene y encuadre de negocio ✅ completada (2026-09-21)

Más impacto por hora invertida: no requiere modelos nuevos.

- [x] **Arreglar `/analyze` de transcripción.** Había dos fallas: la clave de OpenAI daba 401
      (rotada a la versión 4) y, con conversaciones casuales, el modelo omitía `summary`
      (`brain_bad_schema`). Se corrigió el prompt y el reintento ahora nombra los campos que
      faltan (repo `robles.ai-transcription-api`).
- [x] Títulos y descripciones del catálogo (en/es) reescritos con foco en resultados, más una
      línea de beneficio (`benefit`) en cada tarjeta.
- [x] Componentes `<BusinessCase>` y `<SavingsCalculator>` en `src/components/demo/`
      (configuración y fórmula en `business.ts`, con test).
- [x] Integrados en las 6 demos live, con CTA a `/diagnostico-ia` y a contacto. Emociones muestra
      solo los CTAs, sin calculadora (§4.3).
- [x] Eventos por demo (`demo_start`, `demo_complete`, `roi_calculated`, `demo_cta_click`) con
      `trackDemoEvent` en `src/lib/analytics.ts`, que también funciona con GTM.
      **Pendiente del lado de GTM:** crear el trigger y la etiqueta GA4 para esos eventos.
- [x] Imagen Médica fuera del catálogo público (la ruta `/try-medical` sigue, sin backend).
- [x] Sentimiento y Recomendación fuera de "próximamente". El roadmap público pasa a D1, D2, D4,
      D5, D6 y D7 (D3 es la evolución de la demo de voz).
- [x] `server/services/chatContext.ts`: Robly arranca por el caso de negocio de cada demo, ofrece
      la calculadora y el diagnóstico, y no promete cifras.
- [x] **Cold start de `rag-api`** (repo `robles.ai-rag-api`): el arranque bajó de **~60 s a
      ~29 s**. Los modelos se incluyen en la imagen, y monoT5/BGE se cargan de forma diferida. Para
      que el primer rerank no pague esa carga (~46 s), `TryRAG` llama a `POST /rag/warmup` apenas
      el visitante sube el PDF: carga los modelos y corre una inferencia de prueba (~48 s, mientras
      el visitante hace embed y query). Con eso, el rerank responde en **~1.5 s**.

### Fase 1 — Quick wins sobre infra existente (2–4 semanas)

- [ ] **D2 Facturas y documentos → datos** (S–M). LLM con visión, salida con esquema validado,
      descarga CSV/Excel, documentos de ejemplo precargados. Nuevo `docextract-api` en Cloud Run
      siguiendo las convenciones de los otros repos (scale to zero, `prune_registry.sh`,
      `rotate_secret.sh`).
- [ ] **D3 Notas de reunión en vivo** (M). Extiende `transcription-api` con el mensaje WS
      `notes`: estado por secciones con ids estables, flush cada ~25 s o ~15 finales, ops
      validadas (`upsert_topic`, `append_point`, `add_action`…) y `/analyze` como consolidación
      final.

### Fase 2 — La demo estrella (3–5 semanas)

- [x] **D1 "Tu chatbot en 60 segundos"** ✅ (2026-09). Rastreo acotado + ingesta + chat +
      CTA. Se implementó como **backend nuevo autónomo** `robles.ai-chatbot-api` (no
      extendiendo `rag-api`): FastAPI + OpenAI (`gpt-4o-mini` + `text-embedding-3-small`) +
      Pinecone, molde de `langchain-api` (1Gi, sin torch). Crawler propio de HTML estático
      (`httpx` + `beautifulsoup4`, mismo host, `robots.txt`, anti-SSRF, tope 20 páginas),
      namespace efímero por sesión con TTL 24h. Frontend `src/pages/TryChatbot.tsx`
      (`/try-chatbot`), item de catálogo `sitechatbot` → `live`. Cloud Run
      `chatbot-api.robles.ai` (proyecto `robles-ai-chatbot-project`). Es la de mayor
      potencial de leads: se mide por separado. Spec en
      `robles.ai-chatbot-api/.kiro/specs/try-chatbot-60s/`.

### Fase 3 — Alto wow, mayor inversión (4–8 semanas)

- [ ] **D5 Simulador de fraude** (M).
- [ ] **D4 Recepcionista por voz** (L), con los topes de costo de §4.4 desde el día uno.
- [ ] **D6 Pronóstico con tu CSV** (M).
- [ ] **D7 Estudio de foto de producto** (S–M).

> Los plazos son estimaciones para una persona trabajando con asistencia de IA; conviene
> recalibrarlos después de la Fase 0.

---

## 6. Priorización (resumen)

Puntaje orientativo = Wow (1–5) + Ahorro claro (1–5) + Reutilización de infra (1–3) −
Esfuerzo (S=1, M=2, L=3).

| Prioridad | Iniciativa | Wow | Ahorro | Reúso | Esfuerzo | Puntaje |
|-----------|-----------|-----|--------|-------|----------|---------|
| 1 | Fase 0: encuadre de negocio + calculadoras | 3 | 5 | 3 | 1 | **10** |
| 2 | D2 Facturas → datos | 4 | 5 | 2 | 1 | **10** |
| 3 | D1 Tu chatbot en 60 s | 5 | 5 | 3 | 2 | **11** * |
| 4 | D3 Notas en vivo | 5 | 4 | 3 | 2 | **10** |
| 5 | D5 Simulador de fraude | 4 | 4 | 1 | 2 | 7 |
| 6 | D4 Recepcionista por voz | 5 | 5 | 1 | 3 | 8 |
| 7 | D6 Pronóstico con CSV | 3 | 5 | 1 | 2 | 7 |
| 8 | D7 Foto de producto | 4 | 3 | 2 | 1 | 8 |

\* D1 tiene el puntaje más alto, pero va después de la Fase 0 y D2: necesita el cold start de
`rag-api` resuelto y las calculadoras ya construidas para capitalizar el tráfico que genere.

---

## 7. Cómo medimos el éxito

| Métrica | Fuente | Meta inicial |
|---------|--------|--------------|
| % de visitas a `/demos` que completan al menos una demo | GA4 `demo_complete` | Línea base en Fase 0, luego mejorar mes a mes |
| % de demos completadas que usan la calculadora | GA4 `roi_calculated` | Línea base en Fase 0 |
| Leads verificados que vienen de una demo | `quiz_leads` + `utm`/referrer de la demo | Línea base en Fase 0 |
| Conversaciones de Robly iniciadas desde una demo | `chat_conversations` (página de origen) | Línea base en Fase 0 |
| Costo de APIs por demo completada | Facturación OpenAI/Deepgram ÷ `demo_complete` | Mantener acotado con los topes del §2.6 |

Las metas numéricas se fijan después de medir la línea base; no se inventan de antemano.

---

## 8. Deuda de infra pendiente (no bloquea las demos)

- [ ] **Renombrar el servicio Cloud Run de identity `identity-server` → `identity-api-server`**
      para cumplir la norma de nomenclatura de los repos hermanos (`<x>-api-server`:
      `rag-api-server`, `langchain-api-server`, `chatbot-api-server`). Hoy identity es el único
      que quedó sin el sufijo `-api`.
      - **Por qué está pendiente y no se hizo junto con el chatbot:** un servicio de Cloud Run no
        se renombra in situ; hay que **crear el servicio nuevo, re-apuntar el domain mapping
        `identity-api.robles.ai` y borrar el viejo**. Recrear el mapping **re-emite el certificado
        TLS**, con posible downtime del dominio público hasta que el DNS resuelva y el cert se
        emita (el AGENTS.md de identity ya documenta un incidente de cert expirado). Es alto
        impacto sobre un servicio en producción por una mejora cosmética.
      - **Cómo ejecutarlo (ventana con downtime breve aceptable, operador corre gcloud):**
        actualizar `SERVICE_NAME` en `deploy_fresh_gcp.sh`, `update_docker.sh`,
        `delete_all_gcp_resources.sh` y `.github/workflows/deploy.yml` del repo
        `robles.ai-identity-api`; desplegar `identity-api-server`; re-crear el domain mapping
        apuntando al servicio nuevo; borrar `identity-server`; actualizar `README.md`/`AGENTS.md`.
