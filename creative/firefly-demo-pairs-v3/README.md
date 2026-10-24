> **TTS:** el flujo activo vuelve a Firefly por solicitud del usuario, con prompt 3.13 simplificado y pendiente de validar en video. El [MP4 programado](tts/rendered-v1/README.md) se conserva como alternativa; las demás demos mantienen sus referencias actuales.

# Firefly — 13 parejas de frames v3.13

Este paquete sustituye el flujo de una sola imagen inicial por **13 parejas completas: 26 JPG y 13 prompts de transición**. Se prepararon 13 inicios: 12 ediciones generadas y el visual neutro facial existente, reutilizado con puntos y barras pobladas. Cinco finales son ediciones nuevas (sonrisa, landmarks de identidad, transcripción completada, factura con composición nueva y TTS terminado); los otros ocho finales reutilizan v2. No se afirma que los 26 sean generaciones nuevas.

**Límite:** cada prompt de video tiene como máximo 2.500 caracteres, incluido el salto de línea final. Los 13 archivos se verifican con `node scripts/verifyFireflyPrompts.mjs`.

Cada carpeta contiene **start.jpg**, **end.jpg**, **firefly-prompt.txt** y README.md. Los nombres y la estructura son iguales para todos los casos.

## Cómo usarlos

1. Selecciona Veo 3.1, 720p, 16:9, 8 segundos, 24 FPS y Audio off, según el flujo actual.
2. En References → Frames sube start.jpg a **First** y end.jpg a **Last**, de la MISMA carpeta. Si Last aparece desactivado, confirma primero modelo/configuración compatibles; no generes con dos archivos colocados como simples Images.
3. Pega el prompt completo de esa carpeta. No uses el prompt anterior que fijaba todos los resultados o decía dejar Last vacío.
4. Genera un caso piloto, revisa sus ocho segundos y ajusta antes de gastar créditos en el lote.

[Todos los prompts](PROMPTS.md) · [Prompts de imagen y procedencia](IMAGE_PROMPTS.md) · [Vista de las parejas](overview-pairs.webp)

Adobe documenta First/Last para Veo 3.1 y especifica 16:9 y ocho segundos para referencias: https://helpx.adobe.com/firefly/web/work-with-audio-and-video/work-with-video/generate-videos-using-non-adobe-models.html

## Qué debe animarse

El chatbot pasa de escribir a mostrar respuesta/citas; identidad adquiere landmarks internos, malla y guías geométricas y muestra la comparación; RAG recupera fuentes y construye una respuesta citada; transcripción reproduce ondas precargadas visibles desde el inicio y revela A antes de B mientras timer, cursor y barra avanzan de 00:00 a 00:20; herramientas producen un reporte; detección dibuja tres cajas y cuenta; el rostro empieza neutro con landmarks y NEUTRAL alto, luego pasa a sonrisa con seguimiento y SMILE alto; factura completa campos; TTS escribe Welcome., genera una onda y reproduce hasta el final; voz crea una reserva; anomalías generan una revisión; pronóstico dibuja el futuro; imágenes completan variantes.

Las transiciones deben mostrar esas acciones, sin disolver la imagen completa. En interfaces, el fondo, textos ya visibles, geometría de paneles y datos fuente permanecen estables. Excepción intencional: detección de objetos usa un START más abierto y un acercamiento cinematográfico hacia END, con cajas que siguen la proyección de los objetos. Los conectores del chatbot no persiguen objetos y el cerebro no se transforma.

## Revisión y límites

Los extremos fueron revisados visualmente. Las ediciones generativas pueden variar ligeramente bordes, textura y tipografía; no se promete identidad de píxeles entre frames. Comparar ambos y rechazar desplazamientos notorios del encuadre. El video sigue pendiente: First/Last orientan los extremos pero no garantizan trayectorias, letras o seguimiento correcto entre ellos.

Rechazar texto deformado, campos o citas incorrectos, objetos extra, rostros que cambian de identidad, mallas flotantes y cajas desalineadas. Si el generador no respeta la interfaz, el siguiente paso es animación/composición determinista dentro del MP4 final, no una capa estática en la web. Una sonrisa describe expresión visible; una bandera de anomalía solicita revisión y no prueba fraude. No son resultados reales de clientes.

Los textos incrustados son inglés; el archivo de instrucciones es español. Las etiquetas de estado Available/Roadmap del catálogo se conservan en el manifiesto: estos visuales no hacen disponibles demos futuras.

## Exportación y web

Frames: 1280×720 JPG, composición 16:9 completa. El MP4 final conservará ocho segundos, 24 FPS y sin audio. La guía/encoder v2 existente permite 640×360 H.264, faststart, objetivo ≤500 KB y máximo 750 KB; comprobar calidad con cada video real. No recortar etiquetas para llenar una tarjeta 4:3: usar contain.

Los assets están fuera de public. No se habilitaron nuevos videos ni se modificó la web en esta entrega. La integración posterior mantendrá posters lazy, carga de video solo al hover/touch solicitado, un clip activo, reduced motion/data saver y pausa fuera de pantalla. Sin descargas MP4 iniciales ni overlays explicativos externos.

Herramienta: image_gen integrada. No se generaron videos en Firefly ni se consumieron créditos de Adobe.

Revisión facial 3.7: expresión, malla y ambas barras llegan juntas a END a los 4,5 s y se mantienen hasta 8 s, sin sonrisa intermedia más intensa ni barras independientes. Las fotografías de miniaturas no se animan. START/END permanecen iguales.

Revisión documental 3.8: cámara 2.5D suave entre los mismos frames, documentos fantasma con deriva corta y flecha con impulsos ligados a cada extracción. Todo se estabiliza al llegar a END; no cambian las imágenes ni los datos.

Revisión documental 3.9 sustituye la 3.8: ambos frames se regeneraron, con diferencias reales de encuadre, perspectiva y poses de los cuatro ghost papers/flecha. Usar la pareja nueva completa y el nuevo prompt. El resto de las correcciones anteriores se conserva.

TTS 3.10: ambos frames nuevos. START tiene input vacío con cursor; END tiene Welcome., onda y bolita al final. El prompt ordena escritura → generación → reproducción, sin mover la bolita antes de tener la onda completa.

TTS 3.11: escritura por inserciones discretas de glifos completos y saltos del cursor; prohíbe máscaras/wipes que descubren letras. Frames 3.10 conservados.


## v3.14 — Agente de voz con cinco estados

[Storyboard y guía Edit video](voiceagent/storyboard-v1/README.md): móvil apagado a la izquierda → mensaje → búsqueda de varios días → selección → BOOKED a la derecha. Prompt adaptativo y cuatro prompts por transición, todos ≤2.500 caracteres. start.jpg/end.jpg corresponden a los nuevos extremos; los otros casos se conservan. No se generó ni publicó un nuevo video Firefly.
