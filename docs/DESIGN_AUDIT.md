# Auditoría de diseño profesional — Robles.AI

Fecha: 18 octubre 2026 (PDT). Alcance: portada EN/ES, navegación compartida, previews de soluciones y demos, HTML inicial y versión hidratada. Revisión de código y navegador sobre build de producción local; comprobación pública posterior registrada en el PR de esta entrega. No se enviaron formularios ni se modificaron cuentas, infraestructura o seguimiento.

## Dictamen

La portada anterior destacaba la mascota, partículas, efectos de radar y mensajes rotativos antes que la oferta comercial. La percepción de «infantil» es una valoración del propietario y de posicionamiento, no una infracción técnica. Se sustituyó por una presentación estable de ingeniería de IA para empresas, con una arquitectura de referencia explícitamente ilustrativa. Robly permanece exclusivamente como asistente flotante inferior derecho.

La nueva dirección facilita entender qué se ofrece y cómo iniciar un proyecto. Su atractivo para CTO, responsables de ingeniería y equipos de IA es una hipótesis de diseño fundamentada en claridad, jerarquía y evidencia; no existe una certificación objetiva de belleza ni se ha realizado un estudio de preferencia con esos públicos. Las comprobaciones medibles se separan de las recomendaciones editoriales.

## Hallazgos y decisiones

| ID | Evidencia / implicación | Resolución / prioridad |
| --- | --- | --- |
| DES-01 | `Hero.tsx` incluía mascota dominante, canvas/partículas y carrusel; competía con el mensaje empresarial. | Corregido: sin imagen, canvas, temporizadores o movimiento en el Hero. Mascota del chat conservada. |
| DES-02 | Mensaje genérico y múltiples CTA de peso similar hacían menos evidente la siguiente acción comercial. | Corregido: H1 estable, descripción concreta de aplicaciones/RAG/agentes, CTA principal a proyecto, secundario a demos; enfoque y noticias pasan a enlaces terciarios. |
| DES-03 | Encabezado medido de 76 px frente a reserva CSS de 68 px. | Corregido: padding vertical de 12 px; altura efectiva y token coinciden en 68 px en los 14 escenarios. |
| DES-04 | `Solutions.tsx` mostraba «live» sobre cifras estáticas 94,2% / +18,4%; las ilustraciones del catálogo incluían porcentajes sin distinguir su carácter de ejemplo. | Corregido: «Datos ilustrativos» / «Illustrative data» y «Datos de ejemplo» / «Sample data». No son métricas de clientes ni benchmarks. El estado de demos ejecutables no cambia. |
| DES-05 | Secciones existentes emplean distintos gradientes, radios, badges y superficies; observación del código de Features, Solutions, DemosCatalog y Courses. | P2: acordar tokens comunes de superficie, acento, radio, borde, espaciado y escala tipográfica. Recomendación estética; no se afirma incumplimiento WCAG. |
| DES-06 | La portada combina servicios, demos, casos, cursos y equipo en un recorrido largo. El DOM permite confirmarlo; la pérdida de conversiones no está medida. | P2: priorizar problema/servicio → proceso → evidencia → equipo/contacto; mantener educación y noticias accesibles como recursos. Validar antes de eliminar secciones o alterar su oferta. |
| DES-07 | Los casos se declaran ilustrativos; no equivalen a referencias verificadas de clientes. Una arquitectura dibujada tampoco acredita resultados reales. | P2: publicar implementaciones propias con repositorio, decisiones, limitaciones y resultados reproducibles; casos comerciales solo con evidencia y autorización del cliente. No añadir logos, ratings o cifras inventadas. |
| DES-08 | La cobertura de accesibilidad comprobada se limita a los elementos y rutas descritos abajo. | Pendiente: revisión completa con lector de pantalla, zoom, espaciado de texto y todos los estados de formularios. No se declara conformidad integral WCAG 2.2 AA. |
| DES-09 | Auditoría SEO previa registra LCP móvil de laboratorio alto. Retirar recursos del Hero reduce trabajo, pero no demuestra por sí solo una mejora de LCP. | P1 de rendimiento ya abierto: comparar trazas y mediana de al menos tres ejecuciones equivalentes. Sin nueva puntuación de PageSpeed ni mejora de campo atribuida a este cambio. |

## Validación objetiva realizada

- Build de producción completo: cliente Vite, SSR de React y servidor Express: correcto. 132 pruebas de 23 suites: correctas, incluyendo hidratación, HTML inicial, metadatos, teclado y enlaces localizados.
- Navegador, 14 escenarios: EN y ES en 320, 390, 768, 1024, 1280, 1440 y 1920 px de ancho, altura 900 px. Ningún texto/enlace del Hero ni control visible del encabezado desborda horizontalmente; H1 sin solapamiento con header. No es un escaneo de overflow de cada elemento del sitio.
- CTA del Hero: principales de 48 px de alto y enlaces auxiliares de 44 px. Las rutas ES conservan `lang=es`; el ancla local conserva la URL de idioma.
- Menú móvil español: Enter abre, Escape cierra y restaura foco al botón. Tab llega al CTA principal con contorno visible azul de 2 px. Revisión visual móvil adicional a 390 × 844.
- Un H1 estable, panel con H2, etapas H3 en lista ordenada; iconos decorativos ocultos a tecnologías asistivas. No hay imagen/canvas en `#hero`.
- Vista local sin script de módulo: H1, texto y enlaces del Hero presentes en HTML inicial; CTA ES correcto. La capa de diagnóstico local solo retira el script y no inicia APIs, base de datos o tareas programadas.
- Contraste calculado desde colores CSS observados en navegador mediante luminancia sRGB: blanco/azul600 **5,17:1**; blanco/slate950 **20,17:1**; slate400/slate900 **6,96:1**; slate300/slate950 **13,59:1**; azul300/slate900 **9,90:1**. Cubren las combinaciones principales del nuevo Hero, no todas las superficies del sitio. Hover del CTA usa azul700 más oscuro.
- `git diff --check`: correcto. TypeScript conserva los mismos **13 errores preexistentes**, sin nuevas firmas; no se declara typecheck limpio ni se corrige deuda ajena al diseño.

WCAG exige 4,5:1 para texto normal y 3:1 para texto grande ([contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). La comprobación de 320 px se basa en [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Los 44–48 px son una elección de usabilidad de esta implementación; el criterio AA de [tamaño mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) usa 24 × 24 CSS px con excepciones. Estas verificaciones parciales no certifican el sitio completo.

## Criterios para el público tecnológico

La composición usa tipografía existente, fondos opacos slate, un solo acento comercial azul, espacios constantes y una acción principal. La arquitectura explica datos → modelos/orquestación → aplicaciones; no simula actividad ni prueba una implementación particular. El texto evita prometer resultados universales. Se mantienen demos, noticias, diagnóstico y contacto, con EN/ES y SSR existentes.

La mejora más valiosa después de esta entrega es evidencia técnica propia: un caso RAG con evaluación de recuperación y citas, un agente con límites de herramientas y trazabilidad, y una integración empresarial con seguridad, costes y operación documentados. Cada pieza debe mostrar metodología, fecha y limitaciones. Un profesional puede evaluar la profundidad de ingeniería mediante esos materiales; una mascota, una animación o un porcentaje ilustrativo no sustituyen esa evidencia.

## Investigación pendiente y criterio de éxito

Realizar sesiones formativas con 5–8 CTO, tech leads e ingenieros de ML. Alternar el orden de la portada anterior/nueva y pedir: explicar qué hace la empresa tras cinco segundos, encontrar una demo RAG, iniciar un proyecto y localizar contacto. Medir finalización, tiempo, errores, claridad y credibilidad percibidas; recoger motivos de preferencia. La muestra es formativa, no estadísticamente representativa. No se inventan resultados de conversión o preferencia. Analizar conversiones usando la medición ya aprobada; no se añadió tracking.

## Archivos de esta entrega

- UI: `src/components/Hero.tsx`, `Header.tsx`, `Solutions.tsx`, `DemosCatalog.tsx`.
- Copy: `src/i18n/locales/en/translation.json`, `src/i18n/locales/es/translation.json`.
- HTML alternativo compartido: `server/seo/publicContent.ts`, `shared/publicContent.ts` (retirada de constante/imagen de mascota obsoleta, sin duplicar SEO).
- Regresiones: `src/components/__tests__/LocalizedContentLinks.test.tsx`, `server/seo/__tests__/homeSSR.test.tsx`, `publicContent.test.ts`, `metaInjector.integration.test.ts`.
- Evidencia visual local: `/tmp/robles-design-before-desktop.png`, `/tmp/robles-design-after-desktop.png`, `/tmp/robles-design-after-mobile.png`; son artefactos locales, no archivos del repositorio.

No se incorporaron dependencias, fuentes, imágenes generadas, framework, proveedor analítico o configuración de despliegue. La retirada de efectos se limita al Hero; no se elimina framer-motion del resto del producto. Antes de dar la entrega por terminada se debe confirmar Actions correcto y verificar en producción el H1 nuevo, ausencia de mascota en Hero, conservación del chat y rutas EN/ES.

## Revisión de home y medios — 19 de octubre de 2026

### Hallazgos y decisiones

- **HOME-01 — recorrido automático, corregido.** `Solutions.tsx` pausaba el progreso por `onMouseEnter` de toda la sección, incluido el botón que lo iniciaba. Además, el cambio dependía de `animationend`. Ahora un temporizador cancelable de 7 s controla la selección; el movimiento sigue siendo opt-in, se detiene con selección manual/foco interactivo o video y respeta reduced-motion. La barra sólo representa el progreso. El botón informa su estado mediante `aria-pressed`.
- **HOME-02 — reproducción, corregido.** Watch Video monta el iframe dentro del mismo panel que contiene la ilustración, tanto en escritorio como en móvil. Cambiar de solución o volver a la ilustración desmonta el reproductor. Cambiar entre móvil y escritorio lo cierra para evitar audio de un iframe oculto. No se monta YouTube al cargar la página. Se mantienen los videos e idiomas existentes.
- **HOME-03 — entidades visibles, corregido.** Los títulos H2/H3 y metadatos extraídos del HTML se convierten a texto con `DOMParser` una sola vez. `Results &amp; Impact` se muestra como `Results & Impact`; `&amp;amp;` conserva el literal `&amp;`. No se decodifica el cuerpo HTML antes de insertarlo, para no convertir texto escapado en etiquetas ejecutables.
- **HOME-04 — scroll de Casos de Uso, corregido.** El diálogo bloquea raíz y body, conserva estilos y posición y contiene overscroll en su scroller. El índice desplaza exclusivamente ese contenedor, en lugar de `scrollIntoView` sobre ancestros. Escape, Tab/Shift+Tab y restauración de foco quedan contenidos en `usePublicDialog`; cierre localizado y área de 44 px. Este hook se comparte únicamente con el nuevo visor de clips; no altera autenticación ni overlays administrativos.
- **HOME-05 — Hero, ajustado.** Se retiran 01/02/03: son capas conceptuales, no tres fases obligatorias del proyecto. Se conserva el orden datos → orquestación → aplicaciones con lista semántica y títulos. La línea final sí es pertinente como resumen; ahora se introduce con “Core capabilities / Capacidades principales”, para aclarar su relación con la propuesta comercial.
- **HOME-06 — medios de demos, corregido.** Un único `DemoCard` sirve home y laboratorio. Las 13 demos disponen de portada SVG EN/ES: 26 archivos, con escenas de entrada/salida y datos identificados como ilustrativos. Se eliminan las variantes genéricas basadas sólo en iconos, las cajas de detección sin escena y la cara sonriente con porcentajes. La escena de visión también se utiliza en Soluciones. Los destinos, estados live/soon, filtros y beneficio existentes se conservan; filtros exponen estado pulsado y búsqueda tiene nombre accesible.

### Imagen, overlays o Firefly

**Elección implementada:** misma portada por demo en home y laboratorio, proporción 4:3; ilustración específica para cada función; clip bajo demanda sólo donde exista material acabado. Las imágenes se cargan con `loading="lazy"`, dimensiones y espacio reservado. No se añaden videos en bucle a todas las tarjetas. El botón de clip es hermano del enlace, nunca un botón anidado dentro de él, y se coloca debajo de su contenido para no tapar la portada.

Para software, una captura autorizada de su interfaz o una composición SVG permite mantener correctos texto, datos y relaciones. Es un criterio de diseño de esta entrega, no una prueba comparativa de conversión. [Firefly admite generación de video a partir de imágenes](https://helpx.adobe.com/firefly/web/work-with-audio-and-video/work-with-video/generate-videos-using-images.html); lo reservaría para escenas de contexto, por ejemplo entorno industrial, incorporando después cajas y etiquetas controladas. No se ha utilizado una cuenta Adobe ni consumido créditos. Si se produjeran clips adicionales, conservar la misma portada y dirección artística por demo, con pausado, controles y accesibilidad; no prometer que un render conceptual sea evidencia de una API real.

El piloto de Facturas está terminado en EN/ES: MP4 H.264, 960×720, 24 fps, 10 s, sin pista de audio, faststart; aproximadamente 100 KB por idioma. Sus portadas WebP pesan 35–37 KB. La interfaz y su copy explican que los datos son ficticios y la duración no representa tiempos de procesamiento. El video sólo se monta tras pulsar el botón; entonces puede comenzar silenciado y ofrece controles nativos. Al cerrar se desmonta. Esta estrategia evita descargar varios videos en la entrada; el uso de poster/preload sigue las recomendaciones de [web.dev](https://web.dev/articles/lazy-loading-video). Los controles y activación explícita siguen el objetivo de [Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), sin certificar todo el sitio.

Reproducción de assets, usando dependencias ya instaladas:

```sh
node scripts/renderDemoPreviews.mjs
node scripts/renderInvoicePreview.mjs es
node scripts/renderInvoicePreview.mjs en
```

Los medios se versionan; no se regeneran durante el despliegue. El renderizador publica el MP4 mediante rename de un archivo temporal para impedir archivos parcialmente escritos. No hay APIs externas ni datos de clientes en estos scripts.

### Validación y límites

- Build completo cliente + SSR + servidor correcto. `git diff --check` correcto. TypeScript conserva las mismas **13 firmas de error preexistentes**, sin errores en los archivos modificados; no es un typecheck limpio.
- **131 pruebas de 17 suites pasan**: hidratación EN/ES, SEO, política de URLs, enlaces localizados, rotación con cursor dentro de la sección, parada manual, reduced-motion, iframe inline, entidades decodificadas una vez, cuerpo escapado inerte, bloqueo/restauración de estilos y foco, portadas de todo el inventario y contenedor MP4 faststart.
- Suite completa: **630 pasan / 7 fallan, 97 suites**. Seis fallos ajenos a la home se reproducen sobre una copia intacta de `origin/main` `8652035`: tres expectativas de imágenes públicas con mock de `fs.statSync` incompleto, dos propiedades del generador de carruseles y timeout de 5 s del compositor. Un fallo adicional de cookie por `ECONNRESET` fue transitorio: la suite correspondiente pasó al repetirla dentro del conjunto final. No se afirma que toda la suite esté verde ni que esos fallos impliquen necesariamente averías de producción.
- Navegador: home y `/demos`, EN/ES, anchos 320/768/1440 px, después de esperar el H1 del catálogo; un H1, sin overflow horizontal de documento y cero reproductores iniciales. Home muestra ocho portadas; laboratorio las trece. No es un escaneo exhaustivo de cada píxel ni todos los dispositivos.
- Reproducción real del clip: duración DOM 10 s, avance de `currentTime`, sin error multimedia; validación ffprobe y decodificación FFmpeg. En escritorio y móvil, YouTube se muestra inline con controles y contenido real. El avance automático cambió de solución sin retirar el cursor.
- Casos de Uso: `Results & Impact` correcto en inglés; rueda repetida al final conserva scroll del diálogo en máximo 3009 px, `window.scrollY=0` mientras el body fijo conserva `top=-4631px`; al cerrar restaura `scrollY=4631`. En el extremo superior permanece en cero. Prueba móvil adicional a 390 px y cierre por Escape/restauración de foco; Tab inverso vuelve al último control del diálogo, no al fondo.
- No se instalaron paquetes, cambiaron credenciales, modificaron selecciones editoriales ni añadieron tracking. No se atribuyen mejoras de conversión sin medición con usuarios.

La comprobación posterior al despliegue se documenta en la entrega y sus evidencias de producción. Persisten las limitaciones de pruebas y deuda TypeScript descritas; no son promesas de corrección incluidas en esta entrega de home.
