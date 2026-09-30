---
inclusion: always
---

# Edicion de archivos: usa herramientas dedicadas, no la terminal

Para crear o modificar archivos usa SIEMPRE las herramientas dedicadas de edicion (write / str-replace / edit), NUNCA la terminal (execute_bash).

## Prohibido para escribir o editar archivos

- NO uses here-documents: cat > file <<EOF ... EOF (ni <<QUOTED).
- NO uses echo o printf redirigido a un archivo de codigo (> file, >> file).
- NO uses sed -i, awk, tee, ni python3 -c con open().write() para editar codigo.

## Por que

En este entorno los here-documents y los comandos de shell largos o multilinea fallan de forma intermitente y silenciosa: devuelven exit -1 sin escribir nada, o truncan la salida. Eso provoco "ediciones fantasma": el comando parecia correr pero el archivo no cambiaba, y hubo que reintentar varias veces. Las herramientas de edicion son atomicas, verificables y no dependen del shell.

## Que hacer en su lugar

- Crear archivo nuevo: herramienta de escritura de archivos.
- Cambio puntual: herramienta de reemplazo de cadenas (str-replace), con contexto suficiente para un match unico.
- Reescritura grande: herramienta de escritura completa del archivo.
- Leer: herramienta de lectura (no cat/head/tail).
- Buscar: grep/busqueda dedicada (no grep/find por shell).

## La terminal es solo para ejecucion real

Reserva execute_bash para lo que de verdad requiere ejecutarse: build, tests, git, gcloud, curl, gestores de paquetes. Nunca mutes archivos del repo por ahi.

## Verifica despues de editar

Tras una edicion, confirma el efecto (relee el archivo o haz grep del cambio) antes de asumir que quedo. Si un comando de terminal devuelve exit -1 o sin salida, NO reintentes a ciegas: probablemente ya corrio o no escribio nada. Verifica el estado real (el archivo, el servicio, git) y recien ahi decide.
