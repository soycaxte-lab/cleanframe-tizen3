# Solución de problemas

| Síntoma | Comprobación |
| --- | --- |
| Diseño vacío | Regenera `npm run build:tizen3`; comprueba archivos Tizen 3 y fuerza `?legacy=1` en la vista previa. |
| El navegador no abre apps | Instala el widget: la vista previa no tiene la API Tizen. |
| YouTube no hace nada | Comprueba ID real y `launchControls` del ejemplo. Comprueba también que funcione desde Samsung. |
| Prime Video no abre | El ID observado fue `evKhCgZelL.AmazonIgnitionLauncher2`; puede variar por región/modelo. |
| Error 118 al 22 % | Es genérico. Revisa DUID, fechas, firmas y permiso XML. En la prueba se resolvió regenerando el distribuidor con extensión 2.0.75 y enviando el XML a la ruta SDK. |
| `Content is not allowed in prolog` | El permiso puede ser PEM en lugar de XML por el fallo de 2.0.73. Usa extensión actualizada y regenera solo el distribuidor. No fabriques un permiso. |
| `/home/developer` no existe | En la prueba se usó `/home/owner/share/tmp/sdk_tools/device-profile.xml`. Revisa `capability`. |
| `Module java.se.ee not found` | El empaquetador antiguo usa Java moderno. Usa Java 8 para él. |
| No encuentra firmas | Revisa perfil y rutas; no instales el resultado como firmado. |
| Certificate Manager falla | Usa una ruta SDK corta de Windows. |
| SDB execute dice closed | Comprueba instalación con applist y abre desde Apps manualmente. |
| Arranca otra aplicación | «Última aplicación» recupera la última; no sustituye Home. Deja CleanFrame en pantalla antes de apagar. |

Para pedir ayuda indica modelo, Tizen, firmware y error, ocultando direcciones y datos personales. No adjuntes DUID, perfiles privados, archivos p12, contraseñas, claves ni widgets firmados con tus datos.
