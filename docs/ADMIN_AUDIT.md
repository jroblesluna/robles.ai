# Auditoría funcional y responsive del administrador

Fecha: 18 octubre 2026 (PDT). Repositorio: `robles.ai`. Alcance: Dashboard, Analytics (Overview, Traffic, Behavior y Social), Conversations y detalle, Quiz Leads, Dominical y detalle, Backends y Settings. Se revisó también el código de Login/Setup y de los editores de carrusel, sin crear usuarios ni cambiar autenticación.

## Resultado y método

Se confirmó en producción un informe con cero noticias marcadas y el título de pestaña «Page not found» en las secciones administrativas. La causa del guardado se reprodujo en código: el cliente filtraba `report.selected_news`, por lo que nunca podía incorporar una noticia nueva desde `all_news`. La selección vacía permanecía vacía después de cualquier intento de añadir noticias.

La corrección envía la selección completa como `selected_slugs`. El servidor resuelve cada slug contra las noticias del propio informe, elimina duplicados, conserva la evaluación existente y rechaza identificadores ajenos o entradas inválidas antes de escribir. Mantiene compatibilidad con el contrato anterior `selected_news`. Se conserva una puntuación cero real y no se inventan puntuaciones cuando no existen.

La persistencia se comprobó mediante HTTP PUT → GET sobre SQLite real en memoria para **0 → 2 → 1 → 0** noticias. En navegador con datos sintéticos, dos selecciones permanecen marcadas después de guardar y recargar. La prueba de navegador local usa respuestas de prueba aisladas; la prueba HTTP usa la ruta de servidor real con autenticación simulada exclusivamente dentro del test. No equivale a editar un informe editorial de producción.

## Hallazgos corregidos

| ID | Severidad | Evidencia | Corrección / archivos principales |
| --- | --- | --- | --- |
| ADM-01 | HIGH | `handleSave` filtraba solo la selección anterior; informe vacío confirmado en UI pública autenticada. | Selección completa validada por servidor, contador visible y regeneración disponible después de guardar. `AdminDominicalDetail.tsx`, `server/adminRoutes.ts`, `shared/dominicalSelection.ts`. |
| ADM-02 | MEDIUM | La función de fecha añadía `T00:00:00` también a timestamps completos; «Invalid Date» observado en detalle real. | Distinguir fecha calendario de timestamp ISO. `AdminDominicalDetail.tsx`. |
| ADM-03 | HIGH | La lista de secretos de GET general de Settings no incluía Meta, Hostinger ni JSON GCP. Hallazgo de código; no se afirma acceso no autorizado ni incidente. | Política central por familia de clave, máscaras de sufijo para tokens y máscara completa para JSON/claves privadas; ignorar placeholders al guardar y `Cache-Control: no-store` para respuestas administrativas. `server/services/settingsSecrets.ts`, `server/adminRoutes.ts`, `server/backendRoutes.ts`. |
| ADM-04 | MEDIUM | Los formularios de reemplazo Meta/Backends mantenían valores vacíos aunque el estado indicaba configuración. | Placeholder con máscara y huella corta de token cuando existe, aviso de guardado para claves generales, entradas sensibles nuevas de tipo password. JSON y claves privadas sin fragmentos. Actualizar huellas tras guardado. `AdminSettings.tsx`, `AdminBackends.tsx`. |
| ADM-05 | MEDIUM | A 320 px, producción mostró ancho de contenido 379 px en Analytics, 507 px en Backends y 426 px en Settings. | `min-w-0`, controles que envuelven, padding coherente, columna única cuando corresponde y reserva fija del sidebar. Tres desbordamientos residuales en el primer preview se corrigieron y se repitió la matriz. `AdminLayout.tsx`, `AdminAnalytics.tsx`, `AdminBackends.tsx`, `AdminSettings.tsx`, `AdminDominicalDetail.tsx`. |
| ADM-06 | MEDIUM | Drawer móvil desplazado fuera de pantalla pero sin inert/foco modal. | Drawer cerrado inert; abierto con foco contenido, Escape, restauración de foco, fondo principal inert, botones y enlaces de 44 px, scroll vertical y altura dinámica. `AdminLayout.tsx`. |
| ADM-07 | LOW | Todas las pestañas administrativas mostraban «Page not found» después de hidratar; no era un fallo del router autenticado. | Título Admin/Verification en HTML y cliente, conservando noindex/nofollow. `src/hooks/useSEO.ts`, `server/seo/metaInjector.ts`. |
| ADM-08 | MEDIUM | Error de carga de Backends sin catch; estado Meta fallido silencioso; guardado general disponible tras error de carga. | Mostrar error de estado y bloquear guardado ambiguo; permitir reintento con Actualizar/recarga. `AdminBackends.tsx`, `AdminSettings.tsx`. |
| ADM-09 | MEDIUM | Guardado de Hostinger ocurría antes de validar JSON GCP de la misma solicitud. | Validar JSON antes de esas escrituras; prueba confirma cero escrituras si es inválido. `server/backendRoutes.ts`. No se afirma atomicidad ante cualquier fallo de disco. |
| ADM-10 | MEDIUM | Selector de fechas de ancho intrínseco y formulario de rango estrecho; editores de slides sin Escape/contención de foco y editor sin límite vertical. | Selector adaptable con Escape; diálogos con nombre, aria-modal, foco/restauración y contenido desplazable dentro de 90dvh. También se cubre la vista ampliada. `DateRangeSelector.tsx`, `SlideEditor.tsx`, `RegenerateModal.tsx`, `CarouselPreview.tsx`, `src/hooks/useAdminDialog.ts`. |
| ADM-11 | LOW | Dashboard no ofrecía acceso rápido a Backends aunque existía en navegación. | Añadir acceso consistente. `AdminDashboard.tsx`. |

## Validación

- **160 pruebas en 22 suites correctas**, incluidas persistencia real SQLite en memoria, selección y recarga del cliente, protección de máscaras, autorización de Backends, rechazo de conexión parcialmente inválida, navegación móvil, diálogos, paginación, analítica, publicación simulada, carrusel, SSR y metadatos.
- Se usó **Node 20.19.6 ya instalado** para coincidir con el módulo SQLite nativo ABI115 existente. El Node predeterminado ABI137 no podía cargarlo; no se instalaron ni recompilaron dependencias. Dos fixtures antiguos de publicación se actualizaron: columna `composite_image_path` ausente y expectativa «Done» sustituida por la acción real «Republish», conservando las comprobaciones de estado y fecha.
- Build de producción cliente/SSR/Express y postbuild correctos. TypeScript conserva **13 errores previos** en archivos ajenos a estas correcciones; no se declara typecheck limpio.
- **36 escenarios de navegador** con datos sintéticos: nueve pantallas (siete secciones y dos detalles) a 320, 390, 768 y 1440 px. En la última matriz, `main.scrollWidth == main.clientWidth` y ningún control revisado fuera del viewport. Tablas y pestañas conservan su scroll horizontal intencional. No es una certificación completa de accesibilidad.
- Dominical local: marcar dos, guardar, recargar y conservar selección; fecha válida; regeneración accesible tras el guardado. Guardar selección no publica ni regenera automáticamente texto, carrusel o video.
- Editor de slide y regeneración: comprobados a 320 × 640, ancho 288 px, alto 576 px, foco inicial en cerrar y Escape operativo. Vista ampliada cierra con Escape. Selector de fechas a 320 px: bordes x=16 a x=304; el rango custom no desborda.
- Menú móvil: al abrir, diálogo modal y contenido principal inert; Escape restaura foco y el drawer cerrado vuelve a inert. Se mantiene el comportamiento de autenticación, cookies y permisos existentes.
- Producción anterior al despliegue: se pudieron abrir las siete secciones con la sesión existente, inspeccionar un detalle del Dominical y las pestañas de Analytics sin editar registros. La confirmación posterior al despliegue se registra en el PR de esta entrega; no se incluyen aquí valores reales de claves, conversaciones, leads o métricas empresariales.

## Límites y acciones con efectos externos

No se publicaron posts, enviaron mensajes a terceros, generaron informes/imágenes/videos con coste, cambiaron DNS, reemplazaron claves, subieron cuentas de servicio, crearon usuarios o modificaron informes editoriales reales como prueba. Esas acciones no se ejecutan solo para comprobar la interfaz. Las pruebas de publicación usan adaptadores simulados y las comprobaciones de producción son de lectura.

Un indicador «guardada/configurada» acredita presencia, no vigencia, permisos o salud continua del proveedor. Para comprobar vigencia sin publicar se puede usar la validación existente de Meta. Fallos de cuenta/proveedor, permisos externos o credenciales caducadas requieren intervención de su propietario; no se pueden resolver inventando una credencial. Esta auditoría no garantiza todas las combinaciones futuras de datos, disponibilidad externa o conformidad integral WCAG.

La evidencia visual local con datos sintéticos se conserva en `/tmp/robles-admin-dominical-fixed.png`. No contiene noticias privadas ni claves reales. Los tests nuevos están en `src/pages/admin/__tests__/`, `src/hooks/__tests__/useAdminDialog.test.tsx`, `server/__tests__/backendCredentialStatus.test.ts` y el grupo de regresiones de `server/__tests__/metaSettingsRoutes.test.ts`.
