# Prueba de CleanFrame en Tizen 3.0

Adaptación experimental para el motor antiguo. El diagnóstico del Samsung confirmó Chromium 47 sin variables CSS, gap de Flexbox ni inset. La conexión SDB y sus datos privados permanecen en .local/.

## Cambios
- scripts/build-tizen3.cjs genera style-tizen3.css sin esas propiedades y una tabla de reglas.
- app/tizen3.js resuelve variables por elemento y pseudoelemento conservando herencia, especificidad, !important y los valores que cambia la aplicación.
- El espaciado de Flexbox se sustituye por márgenes conservando los márgenes originales.
- La capa solo se activa cuando faltan variables CSS o al abrir ?legacy=1. Se actualiza con cambios de interfaz y reloj; no procesa fotos ni genera desenfoque.
- Los navegadores modernos conservan el CSS original.
- CleanFrameProfile permite una lista inicial de aplicaciones e IDs confirmados, su almacenamiento independiente y excluir Art Mode. El perfil concreto del usuario se mantiene en .local/.
- Los comandos de desarrollo eligen python en Windows y python3 en otros sistemas.

## Comprobación
npm run build:tizen3
npm run check
npm run check:tizen3

Para las pruebas originales:
CLEANFRAME_PUBLIC_FONTS=1 npm run check:browser
CLEANFRAME_PUBLIC_FONTS=1 CLEANFRAME_LEGACY=1 npm run check:browser

En PowerShell se asignan esas variables con $env:NOMBRE='valor' antes del comando.

check:tizen3 compara estilos y geometría con la versión moderna, incluidos temas, lista, dock, fuente y ajustes. Utiliza Chromium moderno con un CSS que elimina de verdad las propiedades no soportadas; no equivale a certificar Chromium 47. Se necesita la observación del TV.

## Alcance actual
El propietario confirmó la instalación firmada, los accesos a aplicaciones y la recuperación al encender con «última aplicación» el 24 de octubre de 2026. Consulta TUTORIAL-ES.md para reproducir el proceso. El navegador por sí solo no expone las APIs de aplicaciones instaladas. scripts/prepare-tv.py genera una identidad independiente y el manifiesto Tizen 3.0 en .local/tv-app. No se distribuyen certificados ni widgets firmados del autor. No se modifica Home, firmware ni root.
