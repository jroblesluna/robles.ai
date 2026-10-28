# Robles.AI — Spot publicitario de 30 s en Remotion (prompt de generación)

> **Qué es este documento.** Es el prompt completo para que un agente de código genere, en
> **Remotion**, un spot de **30 segundos** que se publica dentro de robles.ai (home y landing
> `/get-started`) y que también sirve como anuncio. Trae todo lo necesario: objetivo, contexto
> real de la empresa, demos elegidas, guion cuadro por cuadro, copy exacto en español e inglés,
> diseño de la UI de cada demo, tokens visuales, reglas de animación, especificación técnica,
> audio, exportación para la web y checklist de calidad.
>
> **Relación con otros documentos.** [`REMOTION_VIDEO_CONTEXT.md`](REMOTION_VIDEO_CONTEXT.md)
> es un brief anterior de 60 s centrado en el método. Algunos de sus datos ya no están vigentes
> (rango de precio único, "cupo limitado", cifras de mercado sin fuente, "no hay logos de
> clientes"). **Si hay contradicción, manda este documento.**
>
> **Regla de oro:** no inventes cifras, clientes, testimonios ni resultados. Todo el copy de
> este documento sale del sitio en producción (`src/i18n/locales/{es,en}/translation.json`).
> Si necesitas un texto que no está aquí, usa un placeholder visible y anótalo.

---

## 1. Resumen del encargo

| Campo | Valor |
|-------|-------|
| Pieza | Spot publicitario institucional + producto |
| Duración | **30 s exactos** · **900 frames @ 30 fps** |
| Formato máster | **1920×1080 (16:9)** |
| Variantes | 1080×1920 (9:16, Reels/Shorts/TikTok) y 1080×1350 (4:5, feed Meta/LinkedIn) |
| Idiomas | **Español neutro (máster)** + inglés (mismo timing, copy de §9) |
| Dónde se usa | Embebido en robles.ai (reproducción automática **sin sonido**, en bucle) y como anuncio en Google/Meta/LinkedIn (con sonido) |
| Objetivo de negocio | Que el visitante pruebe una demo en vivo o agende su **Diagnóstico IA** |
| Mensaje en una frase | *"Robles.AI construye IA que ya puedes probar — y te dice por dónde empezar en 2 semanas."* |
| Tono | Ejecutivo, sobrio, preciso. **Premium, no startup ruidosa.** Producto real en pantalla, no metáforas de robots |

**Prueba de éxito:** silenciado, el espectador debe poder contar qué hace Robles.AI, nombrar al
menos dos demos y saber dónde entrar (`robles.ai`).

---

## 2. Contexto de la empresa (solo lo que el video necesita)

**Robles.AI** es una consultora y estudio de implementación de IA con oficinas en **Cupertino,
California (EE. UU.)** y **Lima, Perú**. Trabaja en español e inglés para empresas de EE. UU. y
Latinoamérica, con trato directo con el fundador, Antonio Robles.

- **Qué construye:** chatbots, automatización de documentos, agentes de IA y asistentes
  conectados a los sistemas que el cliente ya usa (ERP, CRM, WhatsApp, documentos, BI, nube).
- **Diferencial visible:** un **laboratorio de demos en vivo** en `robles.ai/demos` — 10 demos
  que cualquiera puede probar con sus propios datos, gratis y sin registrarse.
- **Oferta de entrada:** **Diagnóstico IA de 2 semanas** con tarifa fija en tres paquetes:
  Esencial *desde USD 1,500* (hasta 2 procesos), Avanzado *USD 2,500* (hasta 4), Integral
  *USD 3,000* (hasta 6). O proyecto directo con propuesta.
- **Lo que recibe el cliente en 2 semanas:** mapa de procesos, datos y herramientas;
  oportunidades priorizadas por impacto y esfuerzo; hoja de ruta por etapas; sesión de revisión
  en vivo.
- **Compromisos:** la hoja de ruta es del cliente · su código y sus datos son suyos · no se
  entrenan modelos con sus datos · revisión humana donde un error importa.
- **Trayectoria:** el equipo desarrolla software empresarial **desde 2011** para bancos,
  entidades públicas y empresas líderes (BBVA, Scotiabank, BCP, Interbank, Xerox, Lexmark…).
- **Contacto:** `robles.ai` · info@robles.ai · WhatsApp +1 (408) 590-0153.

**Audiencia:** dueños, gerentes generales, COO, CTO o jefes de TI de empresas medianas en
LatAm y EE. UU. hispano. Saben que la IA importa, no saben por dónde empezar y no quieren pagar
un piloto que nunca llega a producción. Nivel técnico bajo a medio: **cero jerga sin traducir**
(nada de "RAG", "LLM", "embeddings" en pantalla).

---

## 3. ⚠️ Reglas de contenido (obligatorias)

1. **Demos = datos de ejemplo.** Toda UI de demo muestra datos ficticios. Cada escena de demo
   lleva el rótulo `Datos de ejemplo` / `Sample data` (13 px, opacidad 55 %, esquina inferior
   del mockup).
2. **Sin cifras de resultado.** No mostrar porcentajes de ahorro, ROI, "X % más rápido",
   estadísticas de mercado ni casos de éxito. Los únicos números permitidos son: **2 semanas**,
   **desde USD 1,500**, **10 demos en vivo**, **desde 2011**, y los números ficticios dentro
   de las UIs de ejemplo (totales de una factura, conteos de objetos).
3. **Logos de clientes:** se pueden mostrar, siempre con el texto *"Empresas que han confiado en
   nuestro equipo desde 2011"*. Son clientes de **software empresarial** del equipo, **no** de
   proyectos de IA: nunca escribir "clientes de IA", "confían en nuestra IA" ni similares.
   Mostrarlos a color sobre fichas blancas (igual que `ClientLogos.tsx`), sin alterarlos.
4. **Sin testimonios, sin caras de stock, sin "cupo limitado" ni urgencia falsa.**
5. **Sin capturas del panel `/admin`** ni datos reales de leads o conversaciones.
6. **Robly** (la mascota del chatbot) **no aparece** en el máster: el sitio pasó a un hero
   profesional sin mascota.
7. **El precio va como "Desde USD 1,500"**, nunca como precio único ni como rango "1,500–3,000".

---

## 4. Demos elegidas

Del catálogo de 10 demos *live* se eligen **cuatro**, una por cada modalidad (texto, documentos,
voz, visión), todas con un beneficio que un gerente entiende en un segundo:

| # | id | Título en pantalla (ES / EN) | Beneficio (ES / EN) | Acento |
|---|----|------------------------------|---------------------|--------|
| 1 | `sitechatbot` | Tu chatbot en 60 segundos / *Your chatbot in 60 seconds* | Atención y ventas 24/7 sin sumar personal / *24/7 service and sales without adding staff* | Violeta `#8B5CF6` |
| 2 | `docextract` | Facturas y documentos → datos en segundos / *Invoices and documents → data in seconds* | Horas de tipeo manual convertidas en segundos / *Hours of manual data entry turned into seconds* | Índigo `#6366F1` |
| 3 | `speech` | Actas de reuniones y llamadas automáticas / *Automatic meeting and call notes* | Adiós a redactar minutas a mano / *No more writing minutes by hand* | Teal `#14B8A6` |
| 4 | `objectdetection` | Conteo e inspección con cámara / *Camera-based counting and inspection* | Conteos manuales y rondas de control automatizados / *Manual counts and inspection rounds automated* | Ámbar `#F59E0B` |

**Por qué estas:** el chatbot es la demo estrella del sitio (mayor potencial de leads); la de
documentos resuelve el dolor más universal del back-office; la de voz y la de visión muestran
amplitud. Las otras seis (asistente con tus documentos, agentes, onboarding con selfie,
pronóstico de demanda, voz neural, experiencia del cliente) aparecen solo como **chips** en el
mosaico final de demos (escena 4, subescena "+6").

**Cómo se representan:** cada demo es una **UI recreada en React dentro de Remotion** (no una
grabación de pantalla). Así el texto es nítido a cualquier resolución, existe en ES y EN, y el
movimiento queda controlado por frame. Los clips de 8 s que ya existen en
`public/assets/demo-previews/*.mp4` tienen texto en inglés incrustado: **no usarlos** en el
máster; se pueden usar como referencia visual (ver §12).

---

## 5. Concepto creativo: **"Pruébalo, no lo imagines"**

El video no promete IA: **la muestra funcionando**. Arranca con el trabajo manual que todos
reconocen (facturas, preguntas repetidas, minutas, conteos), cada tarea se convierte en una
demo real que la resuelve en segundos, y cierra con el camino para empezar: el Diagnóstico IA.

**Arco visual:** tareas sueltas y desordenadas → cuatro ventanas de producto que trabajan solas
→ todo se ordena en un mosaico limpio → una tarjeta de oferta → logo y URL.

**Lenguaje visual:**

- **Fondo:** degradado navy de marca (idéntico a `.animated-bg` de `src/index.css`):
  `linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #172554 100%)`, con desplazamiento lento
  del degradado (1 ciclo cada 30 s) y dos *glows* radiales azules (`rgba(59,130,246,0.15)`).
- **Grilla técnica** muy sutil (líneas de 1 px `rgba(148,163,184,0.06)` cada 64 px) que deriva
  4 px por segundo. Da profundidad sin competir.
- **Ventanas de producto:** tarjetas tipo navegador con barra superior de 3 puntos, esquinas de
  20 px, fondo `#0B1220` al 92 %, borde `rgba(255,255,255,0.10)`, sombra
  `0 40px 80px -20px rgba(2,6,23,0.7)`. Una leve inclinación 3D (`rotateY` ±4°, `perspective`
  1600 px) que se endereza al entrar.
- **Acento de conversión:** esmeralda `#34D399` (el mismo verde de la landing) **solo** en el
  precio, los checks y el botón del CTA final.
- **Lo que NO va:** robots humanoides, cerebros con circuitos, "lluvia matrix", stock footage de
  oficinas, partículas tipo confeti, rebotes (*bounce*), *glitch*, textos que vibran, música
  épica de tráiler.

---

## 6. Guion cuadro por cuadro (máster 16:9 · 30 fps · 900 frames)

Convención: `[inicio–fin]` en frames absolutos. Entre escenas hay un **solape de 10 frames**
(cross-dissolve + desplazamiento de 24 px). Cada escena maneja su propia entrada y salida.

| # | Escena | Frames | Segundos |
|---|--------|--------|----------|
| 1 | Hook — el trabajo manual | 0–90 | 0.0–3.0 |
| 2 | Marca + promesa | 80–165 | 2.7–5.5 |
| 3a | Demo: chatbot | 155–255 | 5.2–8.5 |
| 3b | Demo: documentos | 245–345 | 8.2–11.5 |
| 3c | Demo: reuniones | 335–435 | 11.2–14.5 |
| 3d | Demo: cámara | 425–525 | 14.2–17.5 |
| 4 | Mosaico "10 demos en vivo" | 515–600 | 17.2–20.0 |
| 5 | Confianza: logos + oficinas | 590–675 | 19.7–22.5 |
| 6 | Oferta: Diagnóstico IA | 665–800 | 22.2–26.7 |
| 7 | Cierre / CTA | 790–900 | 26.3–30.0 |

### Escena 1 — Hook `[0–90]`

- **Visual:** fondo de marca. Cuatro **chips** de tarea entran desde distintos bordes,
  ligeramente rotados (−6°…+6°), y se apilan desordenados en el centro, como papeles sobre un
  escritorio. Cada chip lleva icono lucide + texto:
  `FileText` *Facturas por digitar* · `MessageCircle` *Las mismas preguntas, todo el día* ·
  `Mic` *Minutas a mano* · `ScanLine` *Conteos manuales*.
  Stagger de 8 frames entre chips (f6, f14, f22, f30).
- **Titular** (f40–f88), centrado debajo de los chips, 72 px bold:
  **`¿Todavía a mano?`**
- **Transición a 2:** en f78 los chips se alinean de golpe en una fila horizontal perfecta
  (spring sin rebote) y se desvanecen hacia arriba — primer "orden" del video.
- **Locución (anuncio con sonido):** *"Facturas, preguntas repetidas, minutas, conteos…
  ¿todavía a mano?"*

### Escena 2 — Marca + promesa `[80–165]`

- **Visual:** el logo de Robles.AI aparece en el centro (escala 0.9→1, opacidad 0→1, 14 frames)
  con un barrido de luz diagonal (*shine*) de izquierda a derecha en f100–f118.
- **Texto** (f104–f165), dos líneas, 56 px bold, la segunda en degradado
  `#60A5FA → #34D399`:
  **`Encuentra dónde la IA rinde más —`**
  **`y ponla a trabajar.`**
- **Rótulo** (f118, 18 px, mayúsculas, tracking 0.14em, `#94A3B8`):
  `CONSULTORÍA E IMPLEMENTACIÓN DE IA · EE. UU. Y LATINOAMÉRICA`
- **Locución:** *"Robles punto A-I. Encontramos dónde la IA rinde más, y la ponemos a trabajar."*

### Escena 3 — Cuatro demos en vivo `[155–525]`

**Plantilla común para las cuatro subescenas** (100 frames cada una):

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [120 px margen]                                                         │
│  PRUÉBALO EN VIVO · 01/04            ┌────────────────────────────────┐  │
│                                      │ ● ● ●   robles.ai/try-chatbot  │  │
│  Tu chatbot                          │                                │  │
│  en 60 segundos                      │       (UI animada de la demo)  │  │
│                                      │                                │  │
│  ▍Atención y ventas 24/7             │                                │  │
│   sin sumar personal                 │                Datos de ejemplo│  │
│                                      └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Columna izquierda (≈ 38 % del ancho): rótulo `PRUÉBALO EN VIVO · 0N/04` (18 px, mayúsculas,
  color del acento de la demo), título (60 px bold, máx. 2 líneas) y beneficio (28 px, `#CBD5E1`,
  con barra vertical de 4 px en el color de acento a la izquierda).
- Columna derecha (≈ 56 %): ventana de producto de 1000×620 px con la URL real de la demo en la
  barra (`robles.ai/try-chatbot`, `robles.ai/try-docextract`, `robles.ai/try-transcription`,
  `robles.ai/try-object-detection`).
- Entrada: texto con *mask reveal* vertical (12 frames); ventana desde la derecha con `rotateY`
  4°→0° (18 frames). Salida: todo sube 24 px y se desvanece en 10 frames.
- La UI de la demo **ejecuta su acción completa** dentro de la ventana entre los frames locales
  12 y 85. Los últimos 15 frames quedan quietos para que el resultado se lea.
- Un *glow* radial del color de acento (opacidad 0.18) detrás de la ventana.

#### 3a — Chatbot `[155–255]` · violeta

UI de la ventana (frames locales):

1. **f0–f22:** campo de URL; se escribe carácter a carácter `tuempresa.com` (cursor parpadeante
   determinista). Botón `Crear mi chatbot`.
2. **f22–f40:** barra de progreso violeta + texto `Leyendo 12 páginas…` → `Listo ✓`.
3. **f40–f60:** burbuja del usuario (derecha, fondo `#1E293B`):
   *¿Hacen envíos a provincia?*
4. **f60–f85:** indicador "escribiendo" (3 puntos, 10 frames) y luego la respuesta del bot
   (izquierda, borde violeta) aparece palabra por palabra:
   *Sí, enviamos a todo el país en 48 a 72 horas. El envío es gratis desde S/ 150.*
   Debajo, chip de fuente: `Fuente: tuempresa.com/envios`.

- **Locución:** *"Un chatbot entrenado con tu web, en un minuto."*

#### 3b — Documentos `[245–345]` · índigo

1. **f0–f15:** a la izquierda de la ventana, una factura de ejemplo (dibujada en SVG, fondo
   blanco, empresa ficticia *Distribuidora Andina S.A.C.*) se inclina y se asienta.
2. **f15–f45:** una línea de escaneo índigo recorre la factura de arriba abajo; a su paso se
   encienden cajas delimitadoras sobre 4 campos.
3. **f45–f80:** cada campo "vuela" desde su caja hasta una tabla a la derecha (stagger 7 frames):

   | Campo | Valor | Confianza |
   |-------|-------|-----------|
   | Proveedor | Distribuidora Andina S.A.C. | 99 % |
   | N.º de factura | F001-004218 | 98 % |
   | Fecha | 14/10/2026 | 99 % |
   | Total | USD 1,284.50 | 97 % |

4. **f80–f85:** aparecen chips de exportación `JSON` · `Excel` · `→ ERP`.

- **Locución:** *"Facturas y contratos convertidos en datos, listos para tu ERP."*

#### 3c — Reuniones y llamadas `[335–435]` · teal

1. **f0–f30:** onda de audio animada (barras deterministas con `random()` de Remotion) y punto
   rojo `● Grabando 00:42`.
2. **f12–f55:** transcripción en vivo con burbujas por hablante (colores teal y slate):
   - **Hablante 1:** *Entonces cerramos el pedido el viernes.*
   - **Hablante 2:** *Perfecto, envío la cotización hoy.*
3. **f55–f85:** la grabación se detiene y aparece una tarjeta **Resumen** con tres líneas:
   `Industria: Distribución` · `Acuerdo: cierre del pedido el viernes` ·
   `Pendiente: enviar cotización hoy`, más chips de términos clave `pedido`, `cotización`.

- **Locución:** *"Reuniones y llamadas transcritas y resumidas solas."*

#### 3d — Cámara: conteo e inspección `[425–525]` · ámbar

- Ventana con la foto `public/images/od-loading-yard.jpg` (patio de carga: un tráiler, dos
  montacargas, dos operarios), recortada `object-fit: cover`, con un velo
  `rgba(15,23,42,0.25)`.
- **f8–f60:** las cajas de detección se dibujan una tras otra (trazo que se completa en 8
  frames, stagger 9 frames) con etiqueta y confianza. Coordenadas en % de la imagen original
  (1280×853) — verificarlas sobre la foto antes de cerrar:

  | Etiqueta ES / EN | x | y | ancho | alto |
  |------------------|---|---|-------|------|
  | camión 94 % / truck | 0 % | 28 % | 70 % | 35 % |
  | montacargas 91 % / forklift | 40 % | 44 % | 11 % | 34 % |
  | persona 96 % / person | 41 % | 45 % | 5 % | 16 % |
  | montacargas 89 % / forklift | 81 % | 43 % | 16 % | 19 % |
  | persona 92 % / person | 87 % | 46 % | 4 % | 10 % |

- **f30–f85:** panel flotante abajo a la derecha con contadores que suben de 0:
  `Personas 2` · `Vehículos 3`, y la línea `Procesado en tu navegador`.
- **Locución:** *"Y cámaras que cuentan e inspeccionan por ti."*

### Escena 4 — Mosaico "10 demos en vivo" `[515–600]`

- **Visual:** las cuatro ventanas regresan reducidas y se ordenan en una grilla 2×2 a la
  izquierda-centro; a su alrededor aparecen los **6 chips** del resto del catálogo (stagger 5
  frames): *Pregúntale a tus documentos* · *Un asistente que hace tareas* · *Onboarding con
  selfie* · *Pronóstico de demanda* · *Dale voz a tu contenido* · *Experiencia del cliente sin
  encuestas*.
- **Titular** (64 px bold): **`10 demos en vivo.`** — el `10` es un contador 0→10 en 18 frames
  con *ease-out* expo.
- **Subtítulo** (30 px): `Pruébalas gratis con tus propios datos en robles.ai/demos`
- **Locución:** *"Diez demos en vivo que puedes probar hoy con tus propios datos."*

### Escena 5 — Confianza `[590–675]`

- **Rótulo** (18 px, mayúsculas): `EMPRESAS QUE HAN CONFIADO EN NUESTRO EQUIPO DESDE 2011`
- **Visual:** una fila de 8 fichas blancas (radio 12 px, 180×84 px) con los logos a color, en
  este orden: BBVA, Scotiabank, Xerox, Lexmark, BCP, Interbank, Mibanco, Banco Falabella.
  La fila se desliza muy lento de derecha a izquierda (40 px en toda la escena). Mibanco usa
  escala mayor (logo con aire interno, como `large: true` en `CLIENT_LOGOS`).
- **Línea inferior** (24 px, `#CBD5E1`), con icono `MapPin`:
  `Cupertino, California · Lima, Perú · Español e inglés`
- **Locución:** *"Un equipo que construye software para bancos y grandes empresas desde 2011,
  con oficinas en Estados Unidos y Perú."*

### Escena 6 — Oferta `[665–800]`

Momento más quieto del video: la grilla del fondo baja a 40 % de opacidad.

- **Tarjeta central** (900×560 px, fondo `rgba(15,23,42,0.85)`, borde `rgba(52,211,153,0.45)`,
  anillo `0 0 0 1px rgba(52,211,153,0.2)`):

  ```
  DIAGNÓSTICO IA · ENTREGADO EN 2 SEMANAS        ← rótulo esmeralda
  Empieza por donde la IA rinde más              ← 48 px bold
  ✓ Mapa de tus procesos, datos y herramientas
  ✓ Oportunidades priorizadas por impacto
  ✓ Hoja de ruta por etapas
  ✓ Sesión de revisión en vivo
  ─────────────────────────────────────────
  Desde USD 1,500                                ← 56 px bold, esmeralda
  Tarifa fija · 3 paquetes según tus procesos    ← 22 px, #94A3B8
  ```

- **Animación:** rótulo y título f0–f14; los 4 checks entran uno cada 7 frames (f16, f23, f30,
  f37) con un *tick* sonoro suave; el precio entra en f50 con un barrido de máscara de
  izquierda a derecha. El precio queda **legible y quieto al menos 2.5 s**.
- **Sello bajo la tarjeta** (20 px, `#94A3B8`, iconos `ShieldCheck` / `Lock`):
  `Tu código y tus datos son tuyos · No entrenamos modelos con tu información`
- **Locución:** *"Empieza con un Diagnóstico IA: en dos semanas sabes qué automatizar primero.
  Desde mil quinientos dólares."*

### Escena 7 — Cierre / CTA `[790–900]`

- **Visual:** la tarjeta se contrae hacia el centro y se transforma en el logo. Fondo vuelve a
  su actividad plena.
- **Elementos** (todos centrados):
  - Logo Robles.AI (alto 96 px)
  - Botón esmeralda `#10B981`, texto `#022C22`, 34 px semibold, radio 14 px:
    **`Agenda tu Diagnóstico IA`**
  - URL grande (64 px bold, blanco): **`robles.ai`**
  - Línea de contacto (22 px, `#94A3B8`): `info@robles.ai · WhatsApp +1 (408) 590-0153`
- **Animación:** logo f0–f14, botón f10–f24, URL f18–f32, contacto f26–f38. **Desde f860 todo
  queda completamente quieto** (40 frames estáticos, legibles; nadie lee un CTA en movimiento).
- **Bucle en la web:** el último frame debe poder pasar al primero sin salto brusco: en f892–f900
  el fondo y el degradado vuelven exactamente al estado de f0 (el contenido ya está quieto y el
  hook de la escena 1 arranca sobre fondo vacío).
- **Locución:** *"Robles punto A-I. Agenda tu diagnóstico."*

---

## 7. Copy en pantalla — referencia rápida (ES)

```
E1  Facturas por digitar · Las mismas preguntas, todo el día · Minutas a mano · Conteos manuales
    ¿Todavía a mano?
E2  CONSULTORÍA E IMPLEMENTACIÓN DE IA · EE. UU. Y LATINOAMÉRICA
    Encuentra dónde la IA rinde más — y ponla a trabajar.
E3  PRUÉBALO EN VIVO · 01/04 … 04/04
    Tu chatbot en 60 segundos — Atención y ventas 24/7 sin sumar personal
    Facturas y documentos → datos en segundos — Horas de tipeo manual convertidas en segundos
    Actas de reuniones y llamadas automáticas — Adiós a redactar minutas a mano
    Conteo e inspección con cámara — Conteos manuales y rondas de control automatizados
    Datos de ejemplo
E4  10 demos en vivo.
    Pruébalas gratis con tus propios datos en robles.ai/demos
E5  EMPRESAS QUE HAN CONFIADO EN NUESTRO EQUIPO DESDE 2011
    Cupertino, California · Lima, Perú · Español e inglés
E6  DIAGNÓSTICO IA · ENTREGADO EN 2 SEMANAS
    Empieza por donde la IA rinde más
    ✓ Mapa de tus procesos, datos y herramientas  ✓ Oportunidades priorizadas por impacto
    ✓ Hoja de ruta por etapas  ✓ Sesión de revisión en vivo
    Desde USD 1,500 — Tarifa fija · 3 paquetes según tus procesos
    Tu código y tus datos son tuyos · No entrenamos modelos con tu información
E7  Agenda tu Diagnóstico IA · robles.ai · info@robles.ai · WhatsApp +1 (408) 590-0153
```

---

## 8. Locución completa (ES, ~68 palabras, ritmo pausado)

```
[0.2 s]  Facturas, preguntas repetidas, minutas, conteos… ¿todavía a mano?
[3.0 s]  Robles punto A-I. Encontramos dónde la IA rinde más, y la ponemos a trabajar.
[5.5 s]  Un chatbot entrenado con tu web, en un minuto.
[8.5 s]  Facturas y contratos convertidos en datos, listos para tu ERP.
[11.5 s] Reuniones y llamadas transcritas y resumidas solas.
[14.5 s] Y cámaras que cuentan e inspeccionan por ti.
[17.5 s] Diez demos en vivo que puedes probar hoy.
[20.0 s] Software para bancos y grandes empresas desde 2011, en Estados Unidos y Perú.
[22.7 s] Empieza con un Diagnóstico IA: en dos semanas sabes qué automatizar primero.
[27.0 s] Robles punto A-I. Agenda tu diagnóstico.
```

> Si la locución grabada no entra en su bloque, se recorta el texto, **no** se acelera la voz.
> La versión de la web se reproduce sin sonido: todo el mensaje debe estar en pantalla.

---

## 9. Versión en inglés (mismo timing)

**En pantalla:**

```
E1  Invoices to type in · The same questions, all day · Minutes by hand · Manual counts
    Still by hand?
E2  AI CONSULTING & IMPLEMENTATION · USA & LATIN AMERICA
    Find where AI pays off most — and put it to work.
E3  TRY IT LIVE · 01/04 … 04/04
    Your chatbot in 60 seconds — 24/7 service and sales without adding staff
    Invoices and documents → data in seconds — Hours of manual data entry turned into seconds
    Automatic meeting and call notes — No more writing minutes by hand
    Camera-based counting and inspection — Manual counts and inspection rounds automated
    Sample data
E4  10 live demos.
    Try them free with your own data at robles.ai/demos
E5  COMPANIES THAT HAVE TRUSTED OUR TEAM SINCE 2011
    Cupertino, California · Lima, Peru · English & Spanish
E6  AI DIAGNOSIS · DELIVERED IN 2 WEEKS
    Start where AI pays off most
    ✓ A map of your processes, data and tools  ✓ Opportunities ranked by impact
    ✓ A phased roadmap  ✓ A live review session
    From USD 1,500 — Fixed fee · 3 packages by number of processes
    Your code and your data stay yours · We don't train models on your data
E7  Book your AI Diagnosis · robles.ai · info@robles.ai · WhatsApp +1 (408) 590-0153
```

**Datos de las UIs en inglés:** chatbot `yourcompany.com`, *"Do you ship nationwide?"* →
*"Yes, we ship nationwide in 2–3 business days. Shipping is free on orders over $150."*,
fuente `yourcompany.com/shipping`. Factura: *Andina Distribution LLC*, `INV-004218`,
`10/14/2026`, `USD 1,284.50`. Reunión: *"So we close the order on Friday."* / *"Great, I'll
send the quote today."*, resumen `Industry: Distribution` · `Agreement: close the order on
Friday` · `Follow-up: send the quote today`. Cámara: `People 2` · `Vehicles 3` ·
`Processed in your browser`.

**Locución EN:**

```
Invoices, repeat questions, meeting notes, manual counts… still by hand?
Robles.AI. We find where AI pays off most — and put it to work.
A chatbot trained on your website, in one minute.
Invoices and contracts turned into data, ready for your ERP.
Meetings and calls, transcribed and summarized.
And cameras that count and inspect for you.
Ten live demos you can try today.
Building software for banks and large companies since 2011, in the U.S. and Peru.
Start with an AI Diagnosis: in two weeks you'll know what to automate first.
Robles.AI. Book your diagnosis.
```

---

## 10. Identidad visual — tokens

```ts
// src/theme.ts (proyecto Remotion)
export const COLORS = {
  bgFrom: '#0F172A', bgVia: '#1E3A8A', bgTo: '#172554', // .animated-bg del sitio
  bgDeep: '#020617',                                      // fondo de ventanas / velos
  window: 'rgba(11,18,32,0.92)',
  windowBorder: 'rgba(255,255,255,0.10)',
  grid: 'rgba(148,163,184,0.06)',
  glow: 'rgba(59,130,246,0.15)',

  blue400: '#60A5FA', blue500: '#3B82F6', blue600: '#2563EB',
  emerald400: '#34D399', emerald500: '#10B981', emeraldInk: '#022C22', // solo conversión

  accent: {
    sitechatbot: '#8B5CF6',
    docextract: '#6366F1',
    speech: '#14B8A6',
    objectdetection: '#F59E0B',
  },

  white: '#FFFFFF',
  text2: '#CBD5E1',
  text3: '#94A3B8',
} as const;

export const FONT = 'Inter'; // tipografía del sitio (300–700)

export const TYPE = {
  display:  { size: 72, weight: 700, tracking: '-0.03em', lineHeight: 1.05 },
  title:    { size: 60, weight: 700, tracking: '-0.02em', lineHeight: 1.08 },
  subtitle: { size: 30, weight: 500, tracking: '-0.01em', lineHeight: 1.35 },
  body:     { size: 24, weight: 400, tracking: '0',       lineHeight: 1.45 },
  label:    { size: 18, weight: 600, tracking: '0.14em',  uppercase: true },
  ui:       { size: 20, weight: 500, tracking: '0',       lineHeight: 1.4 },  // texto dentro de mockups
  legal:    { size: 13, weight: 400, tracking: '0.02em',  opacity: 0.55 },
} as const;

export const FPS = 30;
export const DURATION = 900;
```

**Reglas de diseño:**

- Titulares de **máximo 7 palabras** por pantalla; nunca más de 2 jerarquías de texto a la vez
  (más el rótulo `Datos de ejemplo`).
- Margen de seguridad: **120 px** laterales y 80 px arriba/abajo en 16:9; **80 px** laterales y
  **320 px libres abajo** en 9:16 (UI de las plataformas).
- Contraste ≥ 4.5:1 en todo texto. Si hay foto detrás, velo `rgba(15,23,42,0.55)`.
- **Nunca más de 2 acentos de color en la misma pantalla** (azul de marca + el de la demo, o
  azul + esmeralda en la oferta).
- Iconos: `lucide-react`, trazo 1.75, nunca emojis.
- El texto dentro de las UIs (mockups) usa `TYPE.ui`: mínimo 20 px en 1080p para que se lea
  también cuando el video se ve pequeño en la página.

---

## 11. Especificación técnica de Remotion

### 11.1 Dónde vive el proyecto

Crear un **proyecto Remotion independiente** (p. ej. `npx create-video@latest robles-ai-video`
con la plantilla *blank* + TypeScript) **fuera del repo del sitio**. No añadir `remotion` al
`package.json` de robles.ai: cada cambio de dependencias dispara `npm install` + build en el
VPS (`pull.sh`) y engorda el deploy. Al sitio solo se copian los videos exportados (§13).

### 11.2 Dependencias

```
remotion @remotion/cli @remotion/transitions @remotion/google-fonts
@remotion/media-utils @remotion/zod-types lucide-react zod
```

No usar `framer-motion` ni animaciones CSS por tiempo: **toda animación se deriva de
`useCurrentFrame()`**, o el render sale desincronizado.

### 11.3 Estructura

```
robles-ai-video/
  src/
    Root.tsx                    # registra las composiciones
    theme.ts                    # tokens de §10
    schema.ts                   # zod: { lang: 'es' | 'en', withVoiceover: boolean }
    copy/
      es.ts  en.ts              # TODO el copy (§7 y §9); ningún texto suelto en componentes
    timing.ts                   # tabla de §6 como constantes
    compositions/
      Spot16x9.tsx  Spot9x16.tsx  Spot4x5.tsx
    scenes/
      S1Hook.tsx  S2Brand.tsx  S3Demo.tsx  S4Mosaic.tsx
      S5Trust.tsx  S6Offer.tsx  S7Cta.tsx
    demos/
      ChatbotDemo.tsx  DocExtractDemo.tsx  SpeechDemo.tsx  ObjectDetectionDemo.tsx
    components/
      BrandBackground.tsx       # degradado + grilla + glows
      BrowserWindow.tsx         # ventana de producto con barra y URL
      TaskChip.tsx  MaskReveal.tsx  TypeWriter.tsx  Counter.tsx
      DetectionBox.tsx  Waveform.tsx  LogoStrip.tsx  SampleDataTag.tsx  Logo.tsx
    hooks/
      useEntrance.ts            # entrada estándar (abajo)
  public/                       # assets copiados (§12)
```

### 11.4 Composiciones

```tsx
// src/Root.tsx
import { Composition } from 'remotion';
import { Spot16x9 } from './compositions/Spot16x9';
import { Spot9x16 } from './compositions/Spot9x16';
import { Spot4x5 } from './compositions/Spot4x5';
import { spotSchema } from './schema';
import { FPS, DURATION } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Spot-ES-16x9" component={Spot16x9} durationInFrames={DURATION} fps={FPS}
      width={1920} height={1080} schema={spotSchema} defaultProps={{ lang: 'es', withVoiceover: false }} />
    <Composition id="Spot-EN-16x9" component={Spot16x9} durationInFrames={DURATION} fps={FPS}
      width={1920} height={1080} schema={spotSchema} defaultProps={{ lang: 'en', withVoiceover: false }} />
    <Composition id="Spot-ES-9x16" component={Spot9x16} durationInFrames={DURATION} fps={FPS}
      width={1080} height={1920} schema={spotSchema} defaultProps={{ lang: 'es', withVoiceover: true }} />
    <Composition id="Spot-ES-4x5" component={Spot4x5} durationInFrames={DURATION} fps={FPS}
      width={1080} height={1350} schema={spotSchema} defaultProps={{ lang: 'es', withVoiceover: true }} />
    {/* + EN de 9:16 y 4:5 */}
  </>
);
```

### 11.5 Sistema de animación — reglas no negociables

```ts
// src/hooks/useEntrance.ts
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const BRAND_EASE = Easing.bezier(0.16, 1, 0.3, 1); // expo-out

/** Entrada estándar: opacidad + desplazamiento + escala, sin rebote. */
export const useEntrance = (startFrame: number, distance = 28) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;
  const p = spring({ frame: local, fps, config: { damping: 200, stiffness: 110, mass: 0.6 } });
  return {
    opacity: interpolate(local, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    transform: `translateY(${interpolate(p, [0, 1], [distance, 0])}px) scale(${interpolate(p, [0, 1], [0.97, 1])})`,
  };
};
```

1. **Todo `interpolate` lleva `extrapolateLeft: 'clamp'` y `extrapolateRight: 'clamp'`.**
2. **Springs con `damping: 200`**: nada rebota.
3. **Salidas más rápidas que entradas** (entrada 12–18 frames, salida 8–10).
4. **Stagger de 5–9 frames** entre elementos hermanos.
5. Cada escena dentro de `<Sequence from={X} durationInFrames={Y}>`; dentro de la escena
   `useCurrentFrame()` ya es local (empieza en 0). No restar offsets a mano.
6. **Cero `Math.random()`**: usar `random('semilla-' + i)` de Remotion (ondas de audio, cursor,
   deriva de la grilla). Con `Math.random()` cada frame se renderiza distinto y todo tiembla.
7. Texto que se escribe (TypeWriter): número de caracteres = `Math.floor(interpolate(...))`
   sobre el frame, nunca `setInterval`.
8. `filter: blur()` solo en entradas de titulares grandes (8 px → 0 en 10 frames), nunca en
   capas de pantalla completa. No animar `box-shadow` por frame.
9. Imágenes con `<Img src={staticFile(...)} />`; fuente con
   `@remotion/google-fonts/Inter` (`loadFont()`), nunca `<link>`.
10. Máximo **2 tipos de transición** en todo el video (cross-dissolve y desplazamiento).

### 11.6 Variantes de formato

- **9:16:** apilado vertical. Texto de la demo arriba (centrado), ventana de producto abajo a
  ancho completo menos 80 px (relación 4:3). Logos en 2 filas de 4. Tarjeta de oferta a 920 px de
  ancho. Todo el texto +20 %. Subtítulos de la locución **quemados** (máx. 2 líneas, 32
  caracteres por línea, fondo `rgba(15,23,42,0.75)`, por encima de la zona libre de 320 px).
- **4:5:** como 16:9 pero con la columna de texto encima de la ventana; ventana de 960×600.

### 11.7 Render

```bash
npx remotion render Spot-ES-16x9 out/robles-ai-spot-es-1080p.mp4 --codec=h264 --crf=18
npx remotion render Spot-ES-16x9 out/robles-ai-spot-es-1080p.webm --codec=vp9 --crf=32
npx remotion still  Spot-ES-16x9 out/robles-ai-spot-es-poster.jpg --frame=880
```

---

## 12. Assets

### 12.1 Existentes en el repo del sitio — copiar al `public/` del proyecto Remotion

| Asset | Ruta en robles.ai | Uso |
|-------|-------------------|-----|
| Isotipo | `public/favicon.svg` | Base del logo de las escenas 2 y 7. Sobre navy el logo se arma como en `Footer.tsx`: isotipo + "Robles" en blanco + ".AI" en `#60A5FA` (Inter 700) |
| Logo para fondo claro | `public/images/logo.png` | **No usar sobre el navy**: el texto "Robles" es casi negro y desaparece |
| Logos de clientes | `public/images/clients/{bbva.svg, scotiabank.svg, xerox.svg, lexmark.svg, bcp.webp, interbank.webp, mibanco.webp, banco-falabella.webp}` | Escena 5 |
| Foto patio de carga | `public/images/od-loading-yard.jpg` (1280×853) | Escena 3d |
| Degradado de marca | `src/index.css` → `.animated-bg` | `BrandBackground.tsx` |
| Referencia visual de demos | `public/assets/demo-previews/{sitechatbot,docextract,speech,objectdetection}-*.mp4` y `*-960-*.webp` | Solo como referencia de estilo; no incrustar |
| Copy de demos | `src/i18n/locales/{es,en}/translation.json` → `demosCatalog.items` | Títulos y beneficios (ya copiados en §4) |

### 12.2 A producir

| Asset | Especificación |
|-------|----------------|
| Factura de ejemplo | SVG dibujado en código (empresa ficticia, sin logos reales) |
| Música | Corporativa/electrónica sobria, 100–110 BPM, pulso suave con un *build* que resuelve en f80 (marca) y otro en f665 (oferta). **Licencia comercial.** |
| Locución | ES neutro LatAm y EN EE. UU., voz grave-media, cercana y segura, nada de locutor de radio. Se puede generar con una voz neural (p. ej. el mismo `gpt-4o-mini-tts` de la demo TTS) |
| SFX | *whoosh* muy suave en cambios de escena, *tick* en los 4 checks de la oferta, un golpe grave corto en f80 |

Mientras falte un asset, usar `<PlaceholderAsset label="..." />` visible. **Nunca** sustituirlo
por imágenes de stock.

### 12.3 Audio

- Música a −20 dB bajo la voz; sube a −10 dB donde no hay locución.
- `withVoiceover: false` (versión web): solo música, con *fade in* de 15 frames y *fade out* de
  30. En la web el video arranca **sin sonido** igual; la música es para quien lo active.
- Picos ≤ −1 dBFS; loudness integrado ≈ −16 LUFS para redes.

---

## 13. Publicación dentro de robles.ai

| Archivo | Especificación |
|---------|----------------|
| `public/videos/robles-ai-spot-es.mp4` | H.264, 1920×1080, 30 fps, **≤ 6 MB**, `+faststart` |
| `public/videos/robles-ai-spot-es.webm` | VP9, mismo contenido, ≤ 4 MB |
| `public/videos/robles-ai-spot-en.{mp4,webm}` | Ídem en inglés |
| `public/videos/robles-ai-spot-poster-{es,en}.jpg` | Frame 880 (CTA quieto), 1920×1080, ≤ 200 KB |

Reglas del sitio para incrustarlo (las aplica quien integre el video, no el proyecto Remotion):

- `<video autoplay muted loop playsinline preload="none" poster="...">`, con `<source>` webm
  primero y mp4 después; idioma según `i18n.language`.
- Cargar el video solo al entrar en viewport (los previews de demos ya cargan de forma diferida,
  en hover/toque).
- Con `prefers-reduced-motion: reduce` **no** reproducir automáticamente: mostrar el póster con
  un botón de *play* (convención `useReducedMotion` del sitio).
- `aria-label` descriptivo y un botón para activar el sonido; el video no reemplaza ningún
  texto de la página (el copy sigue siendo HTML para SEO).
- Lugar sugerido: en `/get-started`, dentro o justo debajo del hero; en el home, en la sección
  de demos.

---

## 14. Checklist de calidad

**Narrativa**

- [ ] El hook se entiende en los 2 primeros segundos sin sonido.
- [ ] La marca aparece antes del segundo 4.
- [ ] Cada demo muestra la acción **completa** (entrada → resultado) y el resultado queda quieto
      ≥ 0.5 s.
- [ ] El precio "Desde USD 1,500" está legible y quieto ≥ 2.5 s.
- [ ] El CTA (`robles.ai` + *Agenda tu Diagnóstico IA*) está quieto los últimos 40 frames.
- [ ] Silenciado, se entiende todo el mensaje.

**Contenido y claims**

- [ ] Ninguna cifra de resultado, ahorro o mercado.
- [ ] `Datos de ejemplo` visible en las cuatro demos.
- [ ] Los logos llevan el texto "…han confiado en nuestro equipo desde 2011" y nada sugiere que
      sean clientes de IA.
- [ ] Sin testimonios, caras de stock, Robly ni urgencia falsa.
- [ ] Todo el copy sale de `copy/es.ts` / `copy/en.ts` y coincide con §7 y §9.

**Visual**

- [ ] Titulares de máximo 7 palabras; máximo 2 jerarquías por pantalla.
- [ ] Contraste ≥ 4.5:1; márgenes de seguridad respetados en los tres formatos.
- [ ] Ningún elemento rebota; máximo 2 acentos de color por pantalla.
- [ ] El texto de los mockups se lee con el video reducido a 640 px de ancho.

**Técnico**

- [ ] Cero `Math.random()`, `setTimeout`, `setInterval` o animaciones CSS por tiempo.
- [ ] Todos los `interpolate` con `clamp` a ambos lados.
- [ ] Fuente cargada con `@remotion/google-fonts`; imágenes con `<Img>` + `staticFile()`.
- [ ] El render termina sin advertencias; el bucle f900→f0 no tiene salto visible.
- [ ] Peso final dentro de los límites de §13.
