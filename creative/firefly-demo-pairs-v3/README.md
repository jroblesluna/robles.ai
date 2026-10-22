# Firefly — 13 parejas de frames v3

Este paquete sustituye el flujo de una sola imagen inicial por **13 parejas completas: 26 JPG y 13 prompts de transición**. Se generaron 13 inicios nuevos a partir de los visuales existentes y un final nuevo para la sonrisa. Los otros 12 finales reutilizan los visuales v2: no se afirma que los 26 sean generaciones nuevas.

Cada carpeta contiene **start.jpg**, **end.jpg**, **firefly-prompt.txt** y README.md. Los nombres y la estructura son iguales para todos los casos.

## Cómo usarlos

1. Selecciona Veo 3.1, 720p, 16:9, 8 segundos, 24 FPS y Audio off, según el flujo actual.
2. En References → Frames sube start.jpg a **First** y end.jpg a **Last**, de la MISMA carpeta. Si Last aparece desactivado, confirma primero modelo/configuración compatibles; no generes con dos archivos colocados como simples Images.
3. Pega el prompt completo de esa carpeta. No uses el prompt anterior que fijaba todos los resultados o decía dejar Last vacío.
4. Genera un caso piloto, revisa sus ocho segundos y ajusta antes de gastar créditos en el lote.

[Todos los prompts](PROMPTS.md) · [Prompts de imagen y procedencia](IMAGE_PROMPTS.md) · [Vista de las parejas](overview-pairs.webp)

Adobe documenta First/Last para Veo 3.1 y especifica 16:9 y ocho segundos para referencias: https://helpx.adobe.com/firefly/web/work-with-audio-and-video/work-with-video/generate-videos-using-non-adobe-models.html

## Qué debe animarse

El chatbot pasa de escribir a mostrar respuesta/citas; identidad adquiere contornos y muestra la comparación; RAG recupera fuentes y construye una respuesta citada; transcripción revela frases por hablante; herramientas producen un reporte; detección dibuja tres cajas y cuenta; el rostro pasa de neutro a sonrisa con seguimiento; factura completa campos; TTS genera una onda; voz crea una reserva; anomalías generan una revisión; pronóstico dibuja el futuro; imágenes completan variantes.

Las transiciones deben mostrar esas acciones, sin disolver la imagen completa. El fondo, textos ya visibles, geometría de paneles y datos fuente permanecen estables. Los conectores del chatbot no persiguen objetos y el cerebro no se transforma.

## Revisión y límites

Los extremos fueron revisados visualmente. Las ediciones generativas pueden variar ligeramente bordes, textura y tipografía; no se promete identidad de píxeles entre frames. Comparar ambos y rechazar desplazamientos notorios del encuadre. El video sigue pendiente: First/Last orientan los extremos pero no garantizan trayectorias, letras o seguimiento correcto entre ellos.

Rechazar texto deformado, campos o citas incorrectos, objetos extra, rostros que cambian de identidad, mallas flotantes y cajas desalineadas. Si el generador no respeta la interfaz, el siguiente paso es animación/composición determinista dentro del MP4 final, no una capa estática en la web. Una sonrisa describe expresión visible; una bandera de anomalía solicita revisión y no prueba fraude. No son resultados reales de clientes.

Los textos incrustados son inglés; el archivo de instrucciones es español. Las etiquetas de estado Available/Roadmap del catálogo se conservan en el manifiesto: estos visuales no hacen disponibles demos futuras.

## Exportación y web

Frames: 1280×720 JPG, composición 16:9 completa. El MP4 final conservará ocho segundos, 24 FPS y sin audio. La guía/encoder v2 existente permite 640×360 H.264, faststart, objetivo ≤500 KB y máximo 750 KB; comprobar calidad con cada video real. No recortar etiquetas para llenar una tarjeta 4:3: usar contain.

Los assets están fuera de public. No se habilitaron nuevos videos ni se modificó la web en esta entrega. La integración posterior mantendrá posters lazy, carga de video solo al hover/touch solicitado, un clip activo, reduced motion/data saver y pausa fuera de pantalla. Sin descargas MP4 iniciales ni overlays explicativos externos.

Herramienta: image_gen integrada. No se generaron videos en Firefly ni se consumieron créditos de Adobe.
