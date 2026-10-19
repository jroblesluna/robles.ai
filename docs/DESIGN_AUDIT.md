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
