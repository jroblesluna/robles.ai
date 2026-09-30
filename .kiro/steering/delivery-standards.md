---
inclusion: always
---

# Estandar de entrega: CI/CD verde y persistencia

## 1. CI/CD siempre debe terminar en exito

Una tarea NO esta terminada hasta que el CI/CD termina en verde y se verifico que todo funciona de punta a punta (build, tests, deploy y el servicio/pagina respondiendo en su URL real).

- Tras un push o deploy, revisa el estado del pipeline (p. ej. `gh run list`/`gh run view`) hasta su conclusion final.
- Si el CI/CD falla, NO lo dejes asi ni lo reportes como "listo con una falla": investiga la causa raiz (lee los logs del step que fallo), resuelvela e itera hasta que quede verde.
- Verifica el resultado real: haz curl/health-check al endpoint o carga la pagina desplegada, no asumas que el deploy funciono solo porque el step dijo success.
- Un fallo de infra (timeout SSH, cola de build lenta, cold start) igual hay que resolverlo: reintenta, y si se repite, diagnostica y busca otra via, pero no lo abandones.

## 2. Persistencia por defecto (no pedir "sigue iterando")

Asume SIEMPRE que el usuario quiere que sigas iterando hasta terminar. No te detengas a preguntar "continuo?" ni entregues a medias esperando confirmacion. Aplica de base al menos un 50% mas de esfuerzo que el minimo: no pares en el primer resultado aceptable si aun se puede dejar verificado y cerrado.

Excepciones en las que SI conviene parar y avisar:

- El proceso y la respuesta serian exactamente los mismos que un intento anterior (repetir no aporta): no repitas a ciegas.
- Ya hubo varios intentos con esperas/delays y sigue igual: antes de rendirte, prueba una alternativa distinta (otra via, otra herramienta, otro enfoque) y solo escala al usuario si de verdad se agotaron las opciones.
- Una accion destructiva o de alto riesgo (borrar datos, tocar produccion/infra compartida, credenciales) que requiere confirmacion explicita.

Ante un exit -1 o salida vacia de un comando: NO reintentes identico a ciegas; verifica el estado real y, si toca reintentar, cambia algo (comando mas corto, otra via) o mete un delay y reevalua.
