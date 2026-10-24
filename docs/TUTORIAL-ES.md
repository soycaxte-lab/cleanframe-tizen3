# Tutorial: CleanFrame en Samsung Tizen 3.0

Proceso probado en UN75MU6103 de 2017 con Windows. No requiere Home Assistant ni root. Otros modelos necesitan sus propias pruebas. No modifica el firmware ni el botón Home.

## 1. Requisitos y herramientas

PC y TV en la misma red; Git; Node.js 22+; Python 3.10+; cuenta Samsung; Tizen Studio con CLI/SDB, Certificate Manager y **Samsung Certificate Extension 2.0.74 o posterior**. Se utilizó **2.0.75** para la instalación exitosa.

Instala desde la [fuente oficial Samsung](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) y acepta personalmente las licencias. Usa una ruta corta de Windows, por ejemplo `C:\tizen-studio`, para evitar errores al extraer bibliotecas. No necesitas un emulador para esta prueba en la TV real.

**Evita 2.0.73**: generó un `device-profile.xml` con contenido PEM en vez del permiso XML necesario. El registro de cambios oficial indica que 2.0.74 recuperó la API de distribuidor V1.

## 2. Descargar y comprobar

```powershell
 git clone https://github.com/soycaxte-lab/cleanframe-tizen3.git
 cd cleanframe-tizen3
 npm ci
 npm run build:tizen3
 npm run check
 npm run dev:public
```

Abre `http://localhost:4795/home/?legacy=1`. Detén el servidor con Ctrl+C. Esto comprueba el diseño; la vista previa no puede controlar la TV.

## 3. Activar modo desarrollador y conectar

Abre Apps en la TV e introduce **12345**, si ese acceso corresponde a tu modelo. Activa Developer Mode e introduce la **IP de la PC**. Reinicia como indique el diálogo. Consulta la [guía oficial TV Device](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) si el menú difiere. No uses el menú de servicio.

En Windows usa `ipconfig` para consultar la IP de la PC. Reemplaza los marcadores por tus propios valores:

```powershell
$sdk = 'C:\tizen-studio'
$sdb = Join-Path $sdk 'tools\sdb.exe'
$tvIp = '[IP_DE_TU_TV]'
$serial = $tvIp + ':26101'
& $sdb connect $serial
& $sdb devices
& $sdb -s $serial capability
& $sdb -s $serial shell 0 getduid
& $sdb -s $serial shell 0 applist
```

Guarda privadamente tu DUID y los IDs reales de tus apps. No copies el DUID de otra persona ni publiques estos datos.

## 4. Crear certificados Samsung

En Certificate Manager:

1. Pulsa el **+ superior** junto a Certificate Profile.
2. Elige **Samsung → TV**, crea un perfil propio, por ejemplo `MiCleanFrame`.
3. Crea un certificado de autor. Si ya lo tienes, usa **Select an existing author certificate**, selecciona tu `author.p12` y escribe su contraseña.
4. Completa personalmente el inicio de sesión Samsung y las verificaciones.
5. Elige **Create a new distributor certificate**.
6. Selecciona **Public** y crea su contraseña: mínimo ocho caracteres, mayúscula, minúscula y número según el asistente.
7. Añade tu TV conectada o su propio DUID y comprueba que esté marcado.
8. Finaliza con **Finish** y guarda una copia privada de los certificados.

El lápiz de la ventana principal selecciona un certificado existente; no lo regenera. Para corregir un distribuidor, crea otro perfil con el + superior, reutiliza el autor y genera un distribuidor nuevo.

Localiza `device-profile.xml` junto al distribuidor: en esta TV fue necesario transferirlo. Debe ser XML, no comenzar por `-----BEGIN CERTIFICATE-----`. [Guía oficial de certificados](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html).

## 5. Preparar tu configuración e identidad

```powershell
New-Item .local -ItemType Directory -Force
Copy-Item config/tv.example.json .local/tv.json
```

Edita `.local/tv.json` con los IDs encontrados mediante `applist`. Los IDs del ejemplo funcionaron en el modelo probado, pero pueden variar. `settingsAppId: null` desactiva un acceso al sistema no verificado y `artMode: false` evita ofrecer Art Mode en este modelo.

La entrada `launchControls` usa `launchAppControl` para YouTube, operación `view`, URI `https://www.youtube.com/tv`, dirigida a su app instalada. Ese cambio resolvió el acceso que no hacía nada. Las otras apps mantienen `tizen.application.launch`.

```powershell
python -B scripts/prepare-tv.py --config .local/tv.json
```

Genera `.local/tv-app`, mínimo Tizen 3.0, fuentes públicas e identidad propia en `.local/tv-identity.json`. **Conserva ese JSON y el certificado de autor para actualizar la misma instalación.** No empaquetes `app/` directamente: conserva el manifiesto original y necesita esta preparación.

## 6. Firmar

Para reproducir la variante probada usamos el firmador oficial antiguo con SHA-256. Se intentó SHA-512 antes de corregir el permiso, por lo que no se aisló si habría funcionado con el permiso correcto. No atribuimos el error 118 solo al algoritmo.

Este script descarga los paquetes oficiales `new-common-cli 2.4.73` y `new-web-cli 2.5.107` en `.local/`; no descarga ni publica tus certificados:

```powershell
.\scripts\setup-legacy-cli.ps1 -SdkPath $sdk
$env:PATH = (Join-Path $sdk 'jdk\bin') + ';' + $env:PATH
$cli = (Resolve-Path '.local\legacy-cli\data\tools\ide\bin\tizen.bat').Path
& $cli security-profiles list
```

El empaquetador antiguo necesita **Java 8**. Comprueba `java -version`. Si tu SDK incluye Java moderno, usa un Java 8 obtenido de una fuente oficial y antepón su carpeta `bin` solo al PATH de esta sesión.

Si la lista está vacía, comprueba la ubicación de `profiles.xml` de Certificate Manager. Ajusta `default.profiles.path` en `tools/.tizen-cli-config` del SDK indicado en `sdk.info`, preservando el resto. Ejemplo con barras `/`: `default.profiles.path=C\:/ruta/privada/profile/profiles.xml`. No publiques ese archivo ni recrees el autor para resolver una ruta.

```powershell
$stage = (Resolve-Path '.local\tv-app').Path
New-Item dist -ItemType Directory -Force
$out = (Resolve-Path dist).Path
& $cli package -t wgt -s MiCleanFrame -o $out -- $stage
```

Cambia `MiCleanFrame` por tu perfil. El widget debe contener `author-signature.xml` y `signature1.xml`. Si aparecen avisos de firmas ausentes, resuelve el perfil antes de instalar. La herramienta de instalación comprueba que ambas existen y que la identidad coincide; la TV valida los certificados.

## 7. Instalar

Ajusta el nombre si cambiaste `name` en el JSON:

```powershell
.\scripts\install-tv.ps1 -Sdb $sdb -TvIp $tvIp `
  -Widget '.\dist\CleanFrame TV.wgt' `
  -DeviceProfile 'C:\RUTA_PRIVADA\device-profile.xml'
```

El permiso se copia a `/home/owner/share/tmp/sdk_tools/device-profile.xml`, la ruta SDK del modelo probado. `/home/developer` no existía en ese aparato. Si `capability` indica otra ruta SDK, revisa la ruta antes de transferir.

La salida debe contener **install completed**. Samsung puede devolver código 0 aunque imprima `install failed[118]`; no basta con transferir el archivo.

Abre **Apps → CleanFrame TV** manualmente. En este modelo SDB `shell 0 execute` cerraba la conexión sin confirmar apertura, pero abrir desde Apps funcionó. Prueba cada acceso con OK.

## 8. Inicio automático al encender

Para modelos 2017–2021, comprueba **Inicio → Configuración → General → Funciones inteligentes**:

- Activa **Ejecutar automáticamente la última aplicación**.
- Desactiva **Ejecutar automáticamente Smart Hub**, si aparece.
- Abre CleanFrame, déjalo en pantalla y apaga con una pulsación normal. Espera unos 15 segundos y enciende.

El propietario confirmó que recuperó CleanFrame repetidamente. Si apagas dentro de otra app, podría recuperar esa otra app. No se probó aquí después de desconectar la corriente. [Guía oficial Samsung](https://www.samsung.com/au/support/tv-audio-video/use-autorun-start-screen-options-on-your-samsung-tv/).

## 9. Actualizar, retirar y límites

Conserva identidad, perfil y certificado de autor. Repite preparación, firma e instalación tras cambios. Guarda privadamente el widget anterior para volver a esa versión. Para retirar el inicio automático, revierte los ajustes; para retirar la app usa la administración de Apps Samsung.

Exit desde Netflix o YouTube, sustituir Home y forzar CleanFrame desde cualquier estado **no están implementados**. No se instala un servicio residente. Revisa las fechas y condiciones de vigencia de tus certificados en Samsung.
