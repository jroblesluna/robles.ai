# Plan de Overhaul del Motor de Noticias

> **Para:** Kiro IDE, que convertirá este documento en specs (`requirements.md`, `design.md`, `tasks.md`).
> **Estado:** Listo para crear specs, con 5 decisiones de negocio en §2. Todas tienen un valor por defecto para no frenar el arranque.
> **Fecha de los datos:** 31 de octubre de 2026, medidos en producción.
> **Lectura previa obligatoria:** `AGENTS.md`, `README.md` y `.kiro/steering/`.

El documento tiene dos partes. La **Parte A** es el plan. La **Parte B** es el análisis de idoneidad, viabilidad y factores técnicos. Si difieren, manda la Parte B, y sus cambios ya están incorporados en la Parte A.

---

## 1. Resumen

Hoy el motor produce 24 posts al día con un esquema rígido: cada hora le toca a un editor fijo, ese editor busca su tema en NewsAPI y mezcla varias noticias en un solo artículo. Eso causa cuatro problemas: noticias con un día de retraso, historias repetidas, grandes noticias que se escapan y artículos que juntan temas sin relación.

El overhaul invierte el proceso. **Primero se detectan los hechos noticiosos y después se decide qué editor escribe cada uno.**

```
Cada hora:
Ingesta → Eventos → Selección → Redacción → Verificación → Publicación
                        └── evento ya publicado con novedad real → Actualización del post existente
```

**Resultados esperados:**

- Noticias publicadas con horas de retraso, no con un día.
- Un artículo por hecho noticioso, sin duplicados.
- Si una historia evoluciona, se actualiza el artículo en lugar de publicar otro.
- Citas y cifras comprobadas automáticamente contra las fuentes.
- Editores con voz propia y cierres de Robles.AI útiles y distintos entre sí.
- Una portada y un diseño más atractivos.
- Un formulario al final de cada noticia que registra qué noticia motivó la consulta.

---

## 2. Decisiones de negocio

Kiro puede avanzar con los valores por defecto. Ninguno de ellos bloquea las specs S1, S5 ni S6.

| # | Decisión | Por defecto | Por qué importa |
|---|---|---|---|
| D1 | **Fuente de noticias** | RSS de medios seleccionados + GDELT, sin pagar. Evaluar un plan pago solo si faltan fuentes | El plan actual de NewsAPI es la causa del retraso de 24 h y parece no permitir uso en producción (§B2) |
| D2 | **Volumen** | Ciclo cada hora, con un máximo de 1 post por ciclo y 24 al día. Una hora sin noticia nueva no publica | Publicar por obligación es lo que genera repetición |
| D3 | **Noticias de última hora** | Un 2.º post en el mismo ciclo solo si el evento supera el umbral de impacto, máximo 3 al día | Da cobertura inmediata sin saturar |
| D4 | **Revisión humana** | Publicación automática tras pasar las verificaciones. Revisión humana opcional en eventos con personas acusadas, salud o finanzas | Equilibra velocidad y riesgo |
| D5 | **Presupuesto mensual** | Tope de USD 50 en OpenAI, con alerta al 80 % | Evita un gasto descontrolado |

---

## 3. Diagnóstico

### Medido en producción

| Hallazgo | Dato | Consecuencia |
|---|---|---|
| Retraso | El artículo más reciente de NewsAPI tenía exactamente 24 h, y hoy devuelve 0 resultados | El retraso lo impone el proveedor, no solo el diseño |
| Claves | 7 claves de NewsAPI en rotación | Posible incumplimiento de términos (§B2) |
| Fecha mostrada | El slug lleva la fecha de ayer, y `BlogList` lo interpreta como hora UTC real | Un post recién publicado aparece como antiguo |
| Repetición | 202 de 1,814 fuentes de octubre se usaron 2 o más veces, una de ellas 8 veces | Dos posts de Rivian y varios de cuántica el mismo día |
| Editor fijo por hora | `editorId = hora + 1`, asumido también en `detectGaps`, `fillGaps` y `postExistsForDateEditor` | Una noticia enorme se pierde si no encaja con el editor de esa hora |
| Mezcla de temas | Un post juntó Binance con cámaras frigoríficas militares | El título y el enfoque se diluyen |
| Cierre | 553 de 660 posts tienen el mismo encabezado "Where Robles.AI Fits" | Se siente genérico |
| Personalidad | El prompt usa solo `systemPrompt` y `name`; `profile`, `styleNotes` y `signature` no se usan al redactar | Las voces se parecen |
| Temperatura | `gpt-6-luna` no acepta `temperature` ni `top_p` | Los rangos por editor ya no diferencian nada |
| Invención | Varias personas de `editors.json` piden citas, datos o avances ficticios | Riesgo reputacional; la regla de `postPrompt.ts` lo contiene, pero no lo verifica |
| Imagen | 0 de 660 posts tienen imagen propia | Portadas sin impacto visual |
| Extensión | Mediana de 888 palabras con `gpt-4o`, frente a 3,400 o más con `gpt-6-luna` en pruebas | Se necesita una extensión por formato, no un "2000 palabras mínimo" |
| Dominical | Solo puntúa los 30 posts más recientes y no evita temas repetidos | El top 5 no representa la semana |
| Seguridad | `/api/generate-posts` es público | Cualquiera puede gastar créditos |

### Lo que funciona y debe conservarse

- Posts como JSON por fecha, con índices SQLite para listado y búsqueda.
- `updateSitemap` y sitemaps generados desde los posts.
- `BlogArticle`, compartido por página completa y modal.
- Contenido bilingüe en un solo JSON.
- `ContactForm`, con su guardado en BD antes del email y su atribución.
- Mejoras recientes: reintento en `draftPost`, `chatOptions` y las reglas de fidelidad del prompt.

---

## 4. Requisitos e invariantes

| # | Regla |
|---|---|
| I1 | **Las noticias existentes no se tocan.** Ningún proceso reescribe ni migra los JSON actuales. Solo cambia cómo se muestran |
| I2 | Las URL existentes siguen funcionando, sin redirecciones nuevas |
| I3 | Se mantiene el ciclo cada hora con `node-cron` en `America/Lima` |
| I4 | Toda noticia nueva se publica en inglés y español |
| I5 | Nunca se inventan personas, citas, cifras, clientes ni capacidades de Robles.AI |
| I6 | El sitio funciona con los dos formatos de post (v1 y v2) |
| I7 | Los rollbacks se hacen por ajuste, sin desplegar (`news_engine_mode`) |
| I8 | Todo texto público pasa por i18n, y el panel admin sigue sin i18n |

**Fuera de alcance:** idiomas adicionales, comentarios de usuarios, newsletter por email y app móvil.

---

## 5. Arquitectura objetivo

### 5.1 Ciclo horario

| Paso | Qué hace | Si falla |
|---|---|---|
| 1. Ingesta | Lee las fuentes y guarda los artículos nuevos | Sigue con las fuentes que respondieron |
| 2. Normalización | Canonicaliza la URL, detecta idioma y obtiene el texto | Omite ese artículo |
| 3. Agrupación | Asocia el artículo a un evento existente o crea uno | Lo deja pendiente para el siguiente ciclo |
| 4. Selección | Puntúa eventos y elige qué publicar o actualizar | No publica en este ciclo |
| 5. Brief | Define el formato, el ángulo, el editor y el cierre | Reintenta una vez |
| 6. Redacción | Genera el artículo bilingüe en formato v2 | Reintenta una vez |
| 7. Verificación | Valida esquema, citas, cifras, afirmaciones y similitud | Corrige una vez y si no, queda rechazado con motivo |
| 8. Publicación | Guarda, indexa y actualiza el sitemap | Reintentable: el paso es idempotente |

El ciclo no depende de que una noticia esté "madura". La ingesta corre siempre, y los pasos 5 a 8 solo cuando hay algo que publicar.

### 5.2 Modelo de datos

Tablas nuevas en `dominical.db`. Los posts siguen en JSON como fuente de verdad.

| Tabla | Campos principales |
|---|---|
| `news_articles` | `id`, `url_canonical` (único), `url_hash`, `source_id`, `title`, `published_at`, `fetched_at`, `language`, `extracted_text`, `simhash`, `embedding` (BLOB), `event_id`, `status` |
| `news_events` | `id`, `title`, `summary`, `first_seen_at`, `last_article_at`, `article_count`, `source_count`, `status`, `primary_post_slug`, `impact`, `beat`, `entities` (JSON), `centroid` (BLOB) |
| `news_sources` | `id`, `name`, `type` (`rss`, `gdelt`, `api`), `url`, `tier`, `language`, `enabled`, `last_ok_at`, `error_count`, `allow_full_text` |
| `news_runs` | `id`, `started_at`, `finished_at`, `status`, `counts` (JSON), `tokens`, `cost_estimate`, `error` |
| `news_drafts` | `id`, `run_id`, `event_id`, `editor_id`, `brief` (JSON), `post_json`, `verification` (JSON), `status`, `rejected_reason` |
| `news_post_events` | `post_slug`, `event_id`, `kind` (`primary`, `update`) |
| `news_editor_usage` | `editor_id`, `published_at`, `format`, `closing_angle` |

Retención: el texto extraído se borra a los 30 días. Se conservan los metadatos y el hash para seguir detectando duplicados.

### 5.3 Formato de post v2

Aditivo, para que el código actual siga leyendo los posts v1.

```jsonc
{
  "schemaVersion": 2,
  "slug": "2026-10-31-21-14-07-base-slug",
  "date": "2026-10-31",
  "publishedAt": "2026-10-31T21:14:07Z",
  "updatedAt": "2026-10-31T23:40:00Z",
  "editorId": 18,
  "eventId": 812,
  "format": "breaking",
  "cover": { "src": "/generated/covers/….webp", "alt": { "en": "…", "es": "…" }, "kind": "typographic" },
  "categories": [], "keywords": [],
  "translations": {
    "en": {
      "slug": "…", "title": "…", "excerpt": "…",
      "content": [{ "heading": "…", "body": "…" }],   // se mantiene para índices, búsqueda y código v1
      "blocks": [
        { "type": "lead", "text": "…" },
        { "type": "keyFacts", "items": ["…"] },
        { "type": "section", "heading": "…", "body": "…" },
        { "type": "quote", "text": "…", "speaker": "…", "sourceId": 2 },
        { "type": "stat", "value": "$6.3B", "label": "…", "sourceId": 1 },
        { "type": "timeline", "items": [{ "time": "…", "text": "…" }] },
        { "type": "knownUnknown", "known": ["…"], "unknown": ["…"] },
        { "type": "update", "at": "…", "text": "…" },
        { "type": "roblesClosing", "angle": "decision_guide", "heading": "…", "body": "…", "link": "/try-rag" }
      ]
    },
    "es": { }
  },
  "sources": [{ "id": 1, "title": "…", "url": "…", "source": "…" }],
  "verification": { "checkedAt": "…", "quotes": 3, "figures": 9, "model": "gpt-6-luna" }
}
```

`content` se deriva de `blocks` al guardar. Así, búsqueda, Dominical, carrusel y `getArticleContentSummary` no cambian.

### 5.4 Compatibilidad con lo existente

| Pieza | Cambio |
|---|---|
| `generateHistoricalPosts`, `searchNews` | Quedan como motor v1 mientras `news_engine_mode=legacy` |
| `detectGaps`, `fillGaps` | Solo para `legacy`. Con v2 no existen huecos por hora-editor; se reemplazan por `news_runs` |
| `postExistsForDateEditor` | No aplica en v2 |
| `updateSitemap`, `savePost`, `indexPostsOfDay` | Se reutilizan |
| `/api/generate-posts` | Pasa a requerir `requireAuth` y se traslada al admin |
| `getRecentPosts` | Sin cambios de formato. S4 añade la deduplicación por `eventId` |
| `extractDateTimeFromSlug` | Sigue funcionando; el slug v2 lleva la hora UTC real |

---

## 6. Frescura sin duplicados

### 6.1 Mecanismo

El antiguo retraso de 24 h cumplía una función: esperar a tener suficiente material. Se reemplaza por dos momentos de publicación.

| Momento | Regla |
|---|---|
| **Publicación inicial** | Un evento se publica en cuanto reúne confirmación suficiente: 2 fuentes independientes, o 1 fuente de nivel 1 con impacto alto |
| **Actualización** | Si llegan datos nuevos, se agrega un bloque `update` al mismo post y se actualiza `updatedAt`. La URL y `publishedAt` no cambian |

Un evento se puede convertir en un **análisis** nuevo solo si aparece un ángulo distinto, por ejemplo la causa técnica confirmada días después. Hay un máximo de 1 análisis por evento en 7 días.

### 6.2 Deduplicación

| Nivel | Técnica | Evita |
|---|---|---|
| 1 | URL canónica sin parámetros de seguimiento | El mismo artículo dos veces |
| 2 | Título normalizado y `simhash` | Notas de agencia replicadas |
| 3 | Embeddings contra eventos activos (72 h) | Misma noticia en distintos medios |
| 4 | Comparación del brief contra los posts de 7 días | Mismo enfoque con otras palabras |
| 5 | Enfriamiento por entidad: máximo 2 posts por entidad principal en 24 h, salvo última hora | Saturación de un tema |

Los umbrales se calibran con posts reales de octubre. **Los pares Rivian y cuántica del 29 y 30 de octubre son casos de regresión obligatorios**, y también los posts de Binance (§14).

### 6.3 Qué es novedoso

```
puntaje = 0.30 impacto + 0.20 novedad + 0.20 relevancia_IA_negocio
        + 0.15 confirmación + 0.10 frescura + 0.05 relevancia_LatAm
```

- Impacto, novedad y relevancia los estima el modelo sobre el resumen del evento, con criterios escritos.
- Confirmación y frescura se calculan sin IA, a partir de fuentes y horas.
- **El foco del sitio es IA.** Un evento sin relación con IA solo se publica si es de gran impacto y pertenece a la especialidad de un editor, como Alex Cypher en seguridad o Felipe Mesh en cripto.
- Los pesos quedan en `news_settings` para ajustarlos sin desplegar.

### 6.4 Asignación de editor

Reemplaza la regla "cada hora, un editor fijo".

```
afinidad = 0.6 especialidad + 0.25 equidad + 0.15 variedad_de_formato
```

- **Equidad:** penaliza a los editores que publicaron hace poco y favorece a los inactivos.
- **Mínimo semanal:** cada editor publica al menos 3 veces por semana si hay eventos de su especialidad.
- Una categoría sin noticias no fuerza una publicación.

---

## 7. Redacción

### 7.1 Formatos

La estructura depende de la noticia. Ya no hay plantilla única ni un mínimo de 2,000 palabras.

| Formato | Uso | Palabras | Secuencia base |
|---|---|---|---|
| `breaking` | Hecho reciente en desarrollo | 400–700 | Lead, datos clave, qué se sabe y qué no, qué sigue, cierre |
| `news` | Noticia confirmada | 700–1,100 | Lead, datos clave, contexto, cómo funciona, implicaciones, cierre |
| `analysis` | Tema con profundidad técnica o de negocio | 1,200–2,000 | Tesis, evidencia, cómo funciona, contrapunto, implicaciones, cierre |
| `explainer` | Algo que el lector necesita entender | 900–1,500 | Pregunta, respuesta corta, explicación, ejemplos, cierre |

### 7.2 Calidad del contenido

- **Un artículo, un hecho.** Solo se combinan noticias que pertenezcan al mismo evento.
- **El primer párrafo responde qué pasó, a quién y por qué importa.**
- **Las secciones se ordenan por importancia para el lector**, no por el orden de las fuentes.
- Debe incluir lo que **no** se sabe aún cuando la noticia está en desarrollo.
- Títulos específicos. Se prohíben fórmulas repetidas como "Exploring…" o "Innovations in…".
- Se mantienen los patrones prohibidos de `postPrompt.ts`.

### 7.3 Personalidades de los editores

Se agrega un perfil de voz a cada uno de los 24 editores. Es la herramienta principal, porque `gpt-6-luna` no admite `temperature`.

```jsonc
"voice": {
  "beat": ["cybersecurity"],
  "tone": "Sereno, estratégico, sin alarmismo",
  "openingStyle": "Parte del impacto operativo",
  "sentenceRhythm": "Frases cortas alternadas con explicación técnica",
  "signatureMoves": ["Traduce un fallo técnico a una decisión de negocio"],
  "avoid": ["Dramatizar", "Culpar sin evidencia"],
  "formatAffinity": { "breaking": 1.0, "analysis": 0.8 },
  "examples": ["Párrafo modelo en EN", "Párrafo modelo en ES"]
}
```

- Limpiar de `systemPrompt` y `styleNotes` toda instrucción de inventar (ver NEWS-01 en `docs/PENDING_WORK.md`). Las personas conservan color mediante estilo y metáforas, nunca con hechos ficticios.
- Los recursos creativos, como las metáforas de Camila o las reflexiones de Jorge, se marcan claramente como opinión o imaginación del editor.
- La voz se usa en ambos idiomas, con un ejemplo por idioma.
- **Prueba de voz:** dado un lote de párrafos sin nombre, un evaluador automático debe identificar al editor correcto por encima del azar. Sirve para medir mejoras, no para bloquear publicaciones.

### 7.4 Cierre de Robles.AI

El cierre deja de ser una sección fija y pasa a ser un bloque `roblesClosing` con ángulo variable.

| Ángulo | Qué aporta | Ejemplo de encabezado |
|---|---|---|
| `decision_guide` | Preguntas que un directivo debería hacerse | "Tres preguntas antes de automatizar este proceso" |
| `risk_lens` | Riesgos y controles prácticos | "Qué revisaría nuestro equipo primero" |
| `implementation_view` | Cómo se abordaría en la práctica | "Cómo lo implementaríamos" |
| `measurement` | Qué medir para saber si funciona | "Qué métricas demuestran que funciona" |
| `common_mistake` | Errores habituales | "El error más común al adoptar esto" |
| `try_it` | Enlace a una demo relacionada | "Pruébalo con tus propios datos" |

**Reglas:**

- El contenido se apoya en un catálogo real: `shared/roblesCapabilities.ts`, con servicios, demos, sectores y límites de lo que Robles.AI hace. El modelo solo puede referirse a lo que esté ahí.
- Se habla en términos de criterio profesional: "esto es lo que evaluaríamos". Nunca se dice "ya lo hicimos" ni se citan clientes o resultados.
- No se insinúa que Robles.AI habría evitado un incidente.
- No se repite ángulo en los últimos 3 posts del mismo editor, y el encabezado debe ser específico de la noticia.
- Si la noticia no conecta con ninguna capacidad, se usa `decision_guide` general, sin vender.
- `isRoblesSection` usa el tipo de bloque en v2 y conserva la detección por encabezado para v1.

### 7.5 Verificación antes de publicar

| Regla | Comprobación | Acción |
|---|---|---|
| Esquema | Zod sobre v2 y paridad de bloques EN/ES | Reintentar |
| Citas | Cada cita textual debe existir en una fuente, con normalización | Corregir o quitar |
| Cifras | Cada cifra debe aparecer en las fuentes, con sus equivalencias de formato | Corregir o quitar |
| Personas y empresas | Toda entidad nombrada debe estar en las fuentes o en el catálogo | Corregir o quitar |
| Afirmación de IA | Si el evento no tiene relación con IA según las fuentes, una revisión debe confirmar que el texto no la afirma | Rechazar |
| Similitud | Comparación con las fuentes y con posts recientes | Reescribir |
| Atribución | Lo preliminar o atribuido conserva esa condición | Reescribir |
| Temas sensibles | Personas acusadas, salud o finanzas | Enviar a revisión según D4 |

Se comprueba la versión en inglés contra las fuentes, y en español se revisa que las cifras coincidan con el inglés.

---

## 8. Diseño de la noticia

### 8.1 Portada y listado

- **Portada propia por post.** Tarjeta 1200×630 generada con `sharp`: paleta del editor, categoría, título y avatar. No tiene costo por imagen ni problemas de derechos.
- Solo en `analysis` o eventos de alto puntaje se puede usar `ai_model_site_image`. Nunca se representan personas ni hechos reales como si fueran fotografías.
- **No usar `urlToImage` de terceros**, porque tiene derechos de autor.
- `/blog` con una noticia destacada, una franja de "Última hora" y etiquetas de formato.
- La fecha muestra la hora real de publicación y, si aplica, "Actualizado hace 2 h".

### 8.2 Página de artículo

Orden visual:

1. Etiqueta de formato y categoría, título, extracto, editor, hora y tiempo de lectura.
2. Portada.
3. **Resumen en 30 segundos** (`keyFacts`).
4. Cuerpo con índice lateral en escritorio.
5. Bloques visuales: dato destacado, cita, cronología, "Qué se sabe / Qué no".
6. Actualizaciones visibles, las más recientes primero.
7. Cierre de Robles.AI destacado.
8. **Formulario de consulta** (§9).
9. Fuentes, firma del editor, aviso de IA y noticias relacionadas.

### 8.3 Reglas de implementación

- `BlogArticle` se convierte en un renderizador con dos caminos: `blocks` (v2) y `content` (v1).
- La página y el modal comparten todos los bloques. El modal usa la variante `compact`.
- Los posts antiguos reciben los mejores estilos sin que se modifiquen sus archivos.
- `server/seo/publicContent.ts` debe renderizar los bloques v2 para crawlers y para la primera respuesta.
- Cumplir `.tap-target`, `prefers-reduced-motion`, contraste AA y 320 px sin desbordes.

---

## 9. Formulario al final de cada noticia

### 9.1 Experiencia

- Título que cambia según el tema, por ejemplo "¿Esto afecta a tu empresa?", y un texto breve.
- Campos: nombre, email, empresa (opcional) y consulta (opcional).
- Sugerencias de un clic: "Quiero evaluar esto en mi empresa", "Quiero una demo", "Necesito asesoría".
- Mensaje de confirmación en el mismo lugar.
- Aviso breve: "Registramos la noticia desde la que nos escribes para responderte mejor".
- Aparece en página completa y modal, también en los posts antiguos.

### 9.2 Contexto oculto

Reutilizar `ContactForm` con un nuevo prop `articleContext`.

```ts
articleContext: {
  slug: string;     // único dato en que confía el servidor
  language: 'en' | 'es';
  surface: 'page' | 'modal';
}
```

**El servidor no confía en el título enviado por el navegador.** Resuelve el slug contra el índice de posts y obtiene el título, la URL, el editor y el `eventId`. Un slug desconocido no rechaza el lead: se guarda como desconocido.

| Punto | Cambio |
|---|---|
| Esquema | `insertContactSchema` acepta `articleContext` y hace `message` opcional cuando viene ese contexto |
| BD | Columna `article_context` (JSON) en `contact_submissions` |
| Email | Bloque "Noticia vista": título, URL, editor e idioma |
| Admin | Columna en `/admin/contact-submissions` con enlace a la noticia |
| Medición | `generate_lead` con `form_id: article`, `method: article_form` |
| Atribución | Se conserva la existente, incluida Clarity |
| Privacidad | `data-clarity-mask="true"` y aviso visible |

### 9.3 Protección contra spam

Hoy `/api/contact` no tiene protección y el formulario pasará a estar en más de 12,000 páginas indexadas. Se añade:

- Campo trampa oculto para bots.
- Rechazo si el formulario se envía en menos de 3 s.
- Límite de 5 envíos por IP por hora y 3 por email al día.
- Bloqueo de dominios desechables con `disposableEmailDomains`.
- Una respuesta rechazada por spam no dispara conversión.

---

## 10. Administración y observabilidad

Nueva sección `/admin/news`:

- **Ciclos:** fecha, artículos, eventos, publicados, rechazados, tokens y costo estimado.
- **Eventos:** puntaje, fuentes, estado y post asociado.
- **Borradores:** vista previa, resultado de verificación y motivo de rechazo, con aprobar o descartar.
- **Fuentes:** estado, último éxito y activar o desactivar.
- **Ajustes:** modo del motor, pesos, umbrales, máximo diario y presupuesto.

**Alertas por email:** 3 ciclos seguidos fallidos, 6 h sin publicar en horario normal, presupuesto al 80 % o caída de más del 30 % de las fuentes.

---

## 11. SEO y distribución

- Mantener `BlogPosting` en v1 y usar `NewsArticle` en v2, con `datePublished` y `dateModified` reales y el autor.
- Agregar un **News Sitemap** solo con posts de los últimos 2 días.
- `dateModified` cambia solo con actualizaciones reales. Google considera una infracción refrescar fechas artificialmente.
- Las URL de v2 no cambian al actualizar la noticia.
- `og:image` apunta a la portada generada.
- `canonical` y `hreflang` se mantienen.
- El Dominical deduplica por `eventId`, cubre toda la semana y limita a 1 post por evento en el top 5.

---

## 12. Plan de specs para Kiro

Convenciones de `.kiro/specs/ux-overhaul`: glosario, requisitos numerados con criterios WHEN/THE/SHALL, property tests con `fast-check` (≥ 100 iteraciones) y tests opcionales marcados con `*`. La última etapa de cada spec incluye documentación, CI en verde y verificación en producción, según `.kiro/steering/delivery-standards.md`.

| Orden | Spec | Objetivo | Depende de |
|---|---|---|---|
| 1 | `news-article-inquiry` | Formulario, contexto oculto, antispam | Nada |
| 2 | `news-engine-foundation` | Tablas, modos, ciclo, `news_runs`, autenticación del endpoint | Nada |
| 3 | `news-ingestion-events` | Fuentes, extracción, agrupación, deduplicación | S2 |
| 4 | `news-editorial-engine` | Selección, editores, formatos, cierre, verificación | S3 |
| 5 | `news-publishing-lifecycle` | Publicación, actualizaciones, News Sitemap, Dominical | S4 |
| 6 | `news-reader-experience` | Bloques v2, portadas, listado, modal | S2 para el esquema |
| 7 | `news-admin-console` | `/admin/news` y alertas | S2 a S5 |

Los specs 1 y 6 dan valor visible desde el principio. El 6 se puede avanzar en paralelo con posts v2 de ejemplo.

### S1 `news-article-inquiry`

- **Archivos:** `src/components/Contact.tsx`, `src/components/BlogArticle.tsx` o nuevo `ArticleInquiry.tsx`, `src/pages/BlogPost.tsx`, `src/components/BlogModal.tsx`, `shared/schema.ts`, `server/contactRoutes.ts`, `server/db.ts`, `src/pages/admin/AdminContactSubmissions.tsx`, i18n.
- **Criterios:**
  - WHEN un visitante envía el formulario, THE sistema SHALL guardar el slug verificado, título y URL de la noticia.
  - THE sistema SHALL NOT usar un título enviado por el navegador.
  - WHEN el campo trampa está lleno, THE sistema SHALL responder éxito aparente sin guardar ni enviar email.
  - WHEN el lead se acepta, THE sitio SHALL disparar `generate_lead` con `form_id: article`.

### S2 `news-engine-foundation`

- **Archivos:** `server/db.ts`, `server/routes.ts`, nuevo `server/news/`, `shared/newsPost.ts`, `server/services/settingsSecrets.ts`.
- **Criterios:**
  - `news_engine_mode` admite `legacy`, `shadow` y `live`, con `legacy` por defecto.
  - THE ciclo SHALL impedir dos ejecuciones simultáneas mediante un bloqueo en BD con vencimiento.
  - IF el servidor se reinicia durante un ciclo, THE siguiente ciclo SHALL marcarlo como interrumpido.
  - `/api/generate-posts` SHALL exigir `requireAuth`.
- **Property:** un post v1 válido sigue siendo válido al pasar por el lector v2.

### S3 `news-ingestion-events`

- **Archivos:** `server/news/sources/`, `server/news/extract.ts`, `server/news/dedupe.ts`, `server/news/events.ts`.
- **Criterios:**
  - THE sistema SHALL definir una interfaz `NewsProvider` común.
  - WHEN una fuente falla, THE ciclo SHALL continuar con las demás.
  - THE extractor SHALL respetar `robots.txt` y `allow_full_text`, y aplicar protección contra SSRF.
  - WHEN un artículo pertenece a un evento activo, THE sistema SHALL asociarlo sin crear uno nuevo.
- **Properties:** canonicalizar es idempotente; procesar dos veces el mismo lote no crea filas nuevas.

### S4 `news-editorial-engine`

- **Archivos:** `server/news/selection.ts`, `assignment.ts`, `brief.ts`, `compose.ts`, `verify.ts`, `prompts/`, `server/data/editors.json`, `shared/roblesCapabilities.ts`.
- **Criterios:**
  - THE sistema SHALL usar Structured Outputs para brief y artículo.
  - THE contenido de las fuentes SHALL tratarse como datos, nunca como instrucciones.
  - IF una cita no aparece en las fuentes, THE borrador SHALL NOT publicarse con ella.
  - THE sistema SHALL NOT repetir ángulo de cierre en los últimos 3 posts del editor.
- **Properties:** una cita alterada siempre se detecta; la equidad reparte editores dentro de un margen.

### S5 `news-publishing-lifecycle`

- **Archivos:** `server/news/publish.ts`, `server/seo/`, `server/services/dominicalScoring.ts`, `server/jobs/generateDominical.ts`, `shared/seoMetadata.ts`.
- **Criterios:**
  - WHEN llega novedad a un evento publicado, THE sistema SHALL agregar un bloque `update` sin cambiar URL ni `publishedAt`.
  - WHEN un artículo se actualiza sin datos nuevos, THE sistema SHALL NOT cambiar `updatedAt`.
  - THE News Sitemap SHALL incluir solo posts de los últimos 2 días.
  - THE Dominical SHALL incluir máximo 1 post por evento.
- **Property:** publicar dos veces el mismo borrador no crea dos posts.

### S6 `news-reader-experience`

- **Archivos:** `src/components/BlogArticle.tsx`, nuevo `src/components/news/`, `BlogPost.tsx`, `BlogModal.tsx`, `BlogList.tsx`, `server/seo/publicContent.ts`, generador de portadas.
- **Criterios:**
  - THE sitio SHALL renderizar v1 y v2 sin error en página, modal y HTML de servidor.
  - THE página SHALL mostrar hora real y actualización visible.
  - THE diseño SHALL cumplir AA, 320 px y `prefers-reduced-motion`.

### S7 `news-admin-console`

- **Archivos:** `server/newsAdminRoutes.ts`, `src/pages/admin/AdminNews.tsx`, `AdminLayout.tsx`, `App.tsx`, `server/seo/metaInjector.ts`.
- **Importante:** agregar la ruta a `utilityRoute` en `metaInjector.ts`, o recargar `/admin/news` dará 404.
- **Criterios:** requiere `requireAuth`; permite pausar el motor sin desplegar; todas las acciones quedan registradas.

---

## 13. Despliegue por etapas

| Etapa | Modo | Duración | Salida |
|---|---|---|---|
| 0 | Resolver D1 y términos de las fuentes | 2 días | Lista de fuentes aprobada |
| 1 | S1 y S6 en producción con `legacy` | Según avance | Formulario y diseño activos |
| 2 | S2 y S3, `shadow` solo con ingesta | 7 días | Eventos y deduplicación calibrados |
| 3 | S4 y S7, `shadow` con borradores | 7 días | 20 borradores revisados con criterios de §14 |
| 4 | S5, `live` con 6 posts al día, legacy apagado | 7 días | Sin incidentes de hechos falsos |
| 5 | `live` a volumen normal | Continuo | Métricas de §14 |

**En ningún momento corren `legacy` y `live` a la vez**, para no duplicar posts.

**Rollback:** `news_engine_mode=legacy` en admin. Los posts v2 publicados siguen funcionando.

---

## 14. Criterios de éxito

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Retraso | Mediana menor a 6 h entre la primera fuente y la publicación | `news_events` y `publishedAt` |
| Duplicados | Menos de 1 % de pares con mismo evento en 7 días | `news_post_events` |
| Citas y cifras | 100 % comprobadas contra fuentes | `verification` |
| Eventos grandes | Cobertura del 90 % de un set de control manual | Revisión semanal |
| Fallos | Menos de 5 % de ciclos fallidos | `news_runs` |
| Cierres | Máximo 10 % de encabezados repetidos | Agregado mensual |
| Consultas | Tasa de envío de referencia en 30 días, para fijar objetivo | GA4 `form_id: article` |
| Costo | Dentro de D5 | `news_runs` |

**Casos de regresión obligatorios:**

1. Binance, 29–30 de octubre: se detecta como un solo evento y se publica en pocas horas, sin escribir "Binance" en ninguna búsqueda o configuración.
2. Rivian, 30 de octubre: los dos posts se detectan como duplicados.
3. Cuántica, 29–30 de octubre: se fusionan cuando son el mismo hecho.
4. Un artículo sin relación con IA: el texto no afirma que la IA intervino.
5. Una fuente con instrucciones ocultas: se ignoran.
6. El post sobre estrés postraumático de Camila: no se publica como tema del sitio.

---

# Parte B — Análisis de idoneidad y viabilidad

## B1. Veredicto

| Criterio | Evaluación |
|---|---|
| **Idoneidad** | Alta. Resuelve la causa de los problemas: el modelo editor-por-hora y el proveedor |
| **Viabilidad técnica** | Alta. Node, SQLite y un VPS bastan para este volumen |
| **Viabilidad de negocio** | Media-alta. Depende de resolver la licencia de contenidos |
| **Riesgo principal** | Legal y de calidad, más que técnico: fuentes, derechos y exactitud |
| **Decisión** | **Viable. Proceder por etapas con modo `shadow`** |

**Cambios incorporados tras este análisis:**

1. El formulario pasó a ser el primer spec, porque es independiente y genera valor de inmediato.
2. Se agregó protección antispam, que no existía.
3. Se añadió verificación programática de citas y cifras: un prompt por sí solo no garantiza que no se invente.
4. La fuente de noticias pasó de detalle técnico a decisión previa.
5. Se eliminaron las imágenes de terceros por derechos de autor.
6. El contexto oculto no confía en el navegador.
7. El mínimo de 2,000 palabras se sustituyó por una extensión según el formato.
8. Se separó el `legacy` del `live` para evitar duplicados.

## B2. Proveedor de noticias

**Este es el mayor riesgo del proyecto.**

- La medición muestra un retraso exacto de 24 h, coherente con el plan gratuito Developer.
- Fuentes públicas indican que ese plan es solo para desarrollo y que producción requiere el plan Business, reportado en USD 449 al mes.
- Rotar 7 claves podría incumplir los términos, y el uso actual ya es comercial.

No se pudo leer el texto oficial de los términos: **debe confirmarse en newsapi.org antes de la etapa 0**.

| Opción | Frescura | Costo | Texto | Evaluación |
|---|---|---|---|---|
| RSS de medios | Minutos | Gratis | Resumen | **Recomendada.** Control de calidad, pero requiere revisar cada medio |
| GDELT | ~15 min | Gratis | Solo metadatos | **Recomendada** para descubrir eventos |
| NewsAPI Business | Tiempo real | ~USD 449/mes | Parcial | Cara para este uso |
| GNews | Tiempo real | Desde ~€50/mes | Parcial | Buen complemento |
| Event Registry | Tiempo real | Desde ~USD 90/mes | Por validar | Evaluar si RSS no alcanza |
| NewsData.io | Por validar | Desde ~USD 200/mes | Por validar | Fuentes contradictorias |

Los precios provienen de terceros y deben confirmarse.

**Recomendación:** implementar la interfaz `NewsProvider`, empezar con 30 a 50 RSS seleccionados y GDELT, y dejar NewsAPI en `legacy` hasta el cambio. Si en `shadow` no se cubre el 90 % de eventos grandes, contratar GNews o Event Registry.

## B3. Derechos y uso de contenido

- **Riesgo:** extraer artículos completos y reescribirlos puede generar reclamos.
- **Mitigación:**
  - Publicar análisis propio con varias fuentes, no paráfrasis de una sola.
  - Limitar las citas textuales: máximo 2 por artículo, de 25 palabras cada una.
  - Enlazar siempre a las fuentes.
  - Control de similitud con cada fuente.
  - Respetar `robots.txt` y los términos de cada medio con `allow_full_text`.
  - Guardar el texto extraído solo 30 días.
- **Recomendación:** una revisión legal breve antes de `live`.

## B4. Precisión y responsabilidad

- Una noticia falsa sobre una empresa o persona es el peor resultado posible.
- La verificación detecta citas y cifras falsas, pero **no prueba que una fuente tenga razón**. Por eso se exige confirmación, se mantiene la atribución ("según…") y existe revisión humana en temas sensibles.
- **Corrección pública:** añadir un bloque de corrección y una vía de reporte en cada noticia.

## B5. Transparencia sobre los editores IA

El sitio ya informa "Researched and drafted by one of our AI editors". Se mantiene y se revisa:

- Cada perfil debe dejar claro que es un editor virtual. Datos como estado civil o estudios pueden parecer biografías reales.
- Se recomienda mostrar "Revisado automáticamente contra N fuentes" y no decir "verificado por humanos" salvo que lo sea.

## B6. SEO y riesgo de contenido a escala

- 24 artículos diarios generados con IA pueden caer en políticas de contenido masivo de baja calidad. No se llegó a revisar el texto vigente de Google sobre este punto: **revisarlo antes de `live`**.
- El overhaul reduce el riesgo al publicar solo con novedad real y sin duplicados.
- Las actualizaciones deben aportar información real. Google advierte contra refrescar fechas sin cambios significativos y contra reescribir una historia, borrar la original y redirigir.
- News Sitemap no garantiza aparecer en Google News.

## B7. Factores técnicos

| Factor | Consideración | Decisión |
|---|---|---|
| Concurrencia | Un ciclo lento puede solaparse con el siguiente | Bloqueo en BD con vencimiento de 50 min |
| Ciclo y servidor | LLM y extracción no deben afectar las peticiones web | Límite de concurrencia de 4 y tiempos máximos; revisar en etapa 2 si conviene un proceso PM2 separado |
| Reinicios | Cada despliegue reinicia PM2 | Pasos idempotentes y continuación en el siguiente ciclo |
| SQLite | Base de 200 MB con varias escrituras, ya en modo WAL | Transacciones cortas y `busy_timeout` |
| Crecimiento | Texto y embeddings aumentan la BD | Retención de 30 días; embeddings guardados 90 días y compactación mensual |
| Copias | `dominical.db` no está en git. El VPS tiene una carpeta `backups`, pero `crontab` no muestra un respaldo programado de la BD | Confirmar o crear un respaldo diario antes de `live` |
| Vectores | SQLite no compara vectores de forma nativa | Comparación en memoria contra eventos de 72 h, unos miles de vectores |
| Archivos | `savePost` escribe en `dist/data` y `server/data` | Mantener la escritura doble; confirmar comportamiento de los builds |
| Portadas | Crean archivos nuevos | Guardarlas fuera de `dist` o copiarlas en `postbuild` para que sobrevivan a un despliegue |
| Índice de slugs | `SlugIndex` vive en memoria | Reconstruir al publicar |
| Modelo | `gpt-6-luna` no acepta `temperature` ni `top_p`; solo se probó `json_object` | Probar `json_schema` en etapa 2. Mantener `json_object` con Zod si no funciona |
| Tiempo por post | ~70–120 s con artículos largos, ~12k tokens de salida | Ciclo con presupuesto de tiempo; los formatos cortos reducen ambos |
| Fallos de OpenAI | Rate limit, caídas o cambio de modelo | Reintento con espera, sin publicar nada parcial |
| Retiro de modelos | `gpt-4o-mini` y otros se retiran en enero de 2027 | Modelos por ajuste, sin valores fijos; `text-embedding-*` también debe ser configurable, y cambiarlo exige recalcular |
| Prompt injection | Las páginas externas entran al prompt | Delimitar como datos, sin herramientas, validación de salida y prueba de regresión |
| SSRF | El extractor visita URLs de terceros | Bloquear IP privadas, redirecciones inseguras y tipos no HTML; limitar tamaño |
| Extracción | Algunos sitios bloquean; el contenido devuelve 403 o errores | Reutilizar la lógica actual, y si el texto no alcanza, usar el resumen y no publicar con una sola fuente pobre |
| Zona horaria | El slug se interpreta en UTC | v2 usa UTC real; el cron sigue en `America/Lima` |
| Colisión de slugs | Dos posts en el mismo segundo | Hora con segundos y verificación de existencia |
| Doble renderizado | Página, modal y HTML de servidor | Un solo componente y pruebas de v1 y v2 en los tres |
| Tamaño del bundle | Nuevos bloques en una ruta muy usada | Carga diferida de los bloques pesados |
| Rutas admin | Las rutas no listadas dan 404 al recargar | Agregar `/admin/news` a `utilityRoute` |
| Costura con Dominical | Depende de `content`, `translations` y carpeta de fecha | Mantener `content` en v2 y agregar pruebas |
| Fechas de carpeta | v2 guarda según fecha real | Revisar `getRecentPosts` y su uso de rutas en `dist` |
| Pruebas | 6 fallos preexistentes y una prueba intermitente (`sessionCookie`) | No atribuirlos a estos cambios; comparar con `main` |

## B8. Costos estimados

Basado en la prueba real con `gpt-6-luna`: unos 9,000 tokens de entrada y 11,000 de salida por artículo largo. Precio de terceros usado: USD 0.20/1.20 por millón, **sin confirmar**.

| Concepto | Por post | Mensual (720 posts) |
|---|---|---|
| Artículo largo | ~USD 0.015 | ~USD 11 |
| Brief, selección y verificación | ~USD 0.005 | ~USD 4 |
| Embeddings | Muy bajo | Menos de USD 2 |
| Portadas `sharp` | USD 0 | USD 0 |
| **Total estimado IA** | | **~USD 15–25** |
| Fuentes RSS y GDELT | | USD 0 |
| Fuente paga opcional | | USD 50–450 |

Con formatos más cortos el costo real debería bajar. El gasto importante, si lo hay, será el proveedor de noticias.

## B9. Esfuerzo estimado

| Spec | Tamaño | Días de implementación con Kiro |
|---|---|---|
| S1 Formulario | Pequeño | 1–2 |
| S2 Fundación | Mediano | 2–3 |
| S3 Ingesta y eventos | Grande | 4–6 |
| S4 Motor editorial | Grande | 5–7 |
| S5 Publicación | Mediano | 2–4 |
| S6 Experiencia | Grande | 4–6 |
| S7 Admin | Mediano | 2–3 |
| **Total** | | **20–31 días**, más 21 días de `shadow` y arranque |

Son estimaciones de referencia. La mayor incertidumbre está en calibrar eventos y deduplicación.

## B10. Principales riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Términos de NewsAPI | Alta | Alto | Etapa 0, migrar a fuentes permitidas |
| Noticia inexacta publicada | Media | Alto | Verificación, confirmación, corrección pública |
| Reclamo de derechos | Media | Alto | §B3 y revisión legal |
| RSS sin cobertura suficiente | Media | Medio | Medir en `shadow`, proveedor pago de respaldo |
| Agrupación incorrecta | Alta al inicio | Medio | `shadow`, casos de regresión y fusión manual en admin |
| Spam en formulario | Alta | Medio | §9.3 |
| Voces parecidas | Media | Medio | Perfiles, ejemplos y medición |
| Duplicar posts al migrar | Baja | Medio | Modo exclusivo |
| Pérdida de BD | Baja | Alto | Confirmar respaldos |

## B11. Lista de verificación antes de crear specs

- [x] Requisitos del encargo cubiertos (tabla inferior).
- [x] Invariantes definidos.
- [x] Dependencias y orden definidos.
- [x] Datos de producción medidos.
- [ ] D1 a D5 confirmadas por el dueño. Se usan los valores por defecto hasta entonces.
- [ ] Términos de NewsAPI y lista de RSS revisados.

| Requisito del encargo | Dónde se cubre |
|---|---|
| No tocar noticias existentes | I1, §5.3, §8.3 |
| Actualización por hora | I3, §5.1 |
| Noticias frescas sin esperar 24 h | §6.1, §B2 |
| Complementar sin duplicar ni repetir | §6.1, §6.2 |
| Mejorar secciones, novedad y secuencia | §6.3, §7.1, §7.2 |
| Respetar personalidad de editores | §6.4, §7.3 |
| Cierre interesante y flexible, sin inventar | §7.4 |
| Diseño atractivo | §8 |
| Formulario con noticia oculta | §9 |
| Otros factores | §10, §11, §13, Parte B |

## B12. Fuentes externas

- [NewsAPI: Pricing](https://newsapi.org/pricing)
- [Google: Create a News Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap)
- [Google Publisher Center: Best practices for article pages](https://support.google.com/news/publisher-center/answer/9607104?hl=en)
- [GDELT: DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)
- [GNews: Top 5 News APIs in 2026](https://gnews.io/blog/top-5-news-apis-in-2026-free-tiers-pricing-and-coverage-compared)
- [Perigon: Best News APIs in 2026](https://perigon.io/blog/best-news-apis-in-2026)
- [Thunderbit: 9 Best News APIs in 2026](https://thunderbit.com/blog/best-news-apis-compared)
- [Geekflare: Best Global News APIs](https://geekflare.com/guides/global-news-api/)
- [OpenAI: Deprecations](https://developers.openai.com/api/docs/deprecations)
