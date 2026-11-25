# PAE · versión web

Versión para computadora de la app PAE. Es una página web instalable (PWA) que usa **la misma API** que la app de Android (`/srv/pae-api`), así que no hay que cambiar nada del backend ni de la base de datos.

- Dirección: `https://pae.tail98eed5.ts.net/portal/`
- Alumnos entran con su **boleta**; profesores, con su **usuario** (igual que en la app).
- Botones **Demo alumno** y **Demo profesor** en la pantalla de inicio: muestran la página con datos de ejemplo, sin servidor. Sirven para exponer el proyecto si no hay internet.

## Qué tiene

| Alumno | Profesor |
|---|---|
| Mis clases y las clases de hoy | Mis cursos y las clases de hoy |
| Clase: novedades, tareas (entregar con texto y enlace) y videollamada | Curso: publicar, editar y borrar avisos |
| Calificaciones por parcial | Crear tareas, ver entregas y calificar |
| Horario semanal | Iniciar y finalizar la clase en vivo |
| Kárdex con promedio y créditos | Lista de asistencia de cada clase |
| Perfil, foto y tema claro/oscuro | Perfil, foto y tema claro/oscuro |

No incluye **Reinscripción** porque la API todavía no tiene esa ruta.

## Archivos

```
portal/                 ← todo esto va en /srv/http/portal
  index.html            página principal
  manifest.webmanifest  datos para instalarla como app
  sw.js                 service worker (instalación y modo sin conexión)
  css/estilos.css       diseño; los colores están al inicio, en variables
  js/config.js          dirección de la API y del SDK de video
  js/api.js             conexión con la API (token, errores, sesión)
  js/demo.js            datos del modo demostración
  js/vistas/*.js        pantallas de alumno, profesor, horario y perfil
  iconos/               íconos de la app
  vendor/               aquí va el SDK web de Agora (paso 5)
pae-web.conf            configuración de Apache
```

## Instalación en el servidor

### 1. Pasar el archivo (desde tu CachyOS)

```bash
scp ~/Descargas/pae-web.tar.gz gabriel@pae:~/
```

### 2. Copiar la página (en el servidor)

```bash
ssh gabriel@pae
tar -xzf ~/pae-web.tar.gz -C ~
sudo mkdir -p /srv/http/portal
sudo cp -r ~/pae-web/portal/. /srv/http/portal/
sudo chown -R root:pae /srv/http/portal
sudo find /srv/http/portal -type d -exec chmod 2775 {} +
sudo find /srv/http/portal -type f -exec chmod 664 {} +
```

### 3. Configurar Apache

```bash
grep -n "^LoadModule headers_module" /etc/httpd/conf/httpd.conf
sudo cp ~/pae-web/pae-web.conf /etc/httpd/conf/extra/
echo "Include conf/extra/pae-web.conf" | sudo tee -a /etc/httpd/conf/httpd.conf
sudo apachectl configtest && sudo systemctl reload httpd
```

- El primer comando debe mostrar una línea. Si no sale nada, abre `httpd.conf` y quita el `#` de `LoadModule headers_module …`.
- `configtest` debe decir `Syntax OK`.

### 4. Probar

```bash
curl -sI http://localhost/portal/ | grep -i -E "HTTP/|content-security"
```

Debe salir `200 OK` y la línea `Content-Security-Policy`. Luego abre `https://pae.tail98eed5.ts.net/portal/` en el navegador y entra con el alumno `2024050172` / `Prueba123`.

La página y la API están en el **mismo dominio**, así que no hay que configurar CORS.

### 5. Videollamadas

La web usa el SDK de Agora para navegador. Descárgalo **en el servidor** a la carpeta `vendor`:

```bash
sudo curl -L -o /srv/http/portal/vendor/AgoraRTC_N.js https://cdn.jsdelivr.net/npm/agora-rtc-sdk-ng@4/AgoraRTC_N-production.js
head -c 200 /srv/http/portal/vendor/AgoraRTC_N.js; echo
```

Debe verse código JavaScript, no un error HTML.

Además, la API debe mandar el **App ID** de Agora junto con el token. Revísalo:

```bash
TP=$(curl -s -X POST http://localhost/api/login -H 'Content-Type: application/json' -d '{"usuario":"acruz","contrasena":"Prueba123"}' | sed -n 's/.*"token":"\([a-f0-9]*\)".*/\1/p')
curl -s -X POST http://localhost/api/cursos/3/videollamada/iniciar -H "Authorization: Bearer $TP"; echo
curl -s -X POST http://localhost/api/cursos/3/videollamada/finalizar -H "Authorization: Bearer $TP"; echo
```

En la respuesta de `iniciar` deben venir `token`, `uid` y `app_id`. Si falta `app_id`, agrégalo en lo que devuelve `credencialesAgora()` (en `/srv/pae-api/lib/agora.php`) con la clave `app_id`. El App ID no es secreto; el certificado de Agora sí, y ese debe quedarse solo en el servidor.

## Instalarla como app en la computadora

En Chrome o Edge, entra a la página y haz clic en el ícono **Instalar** de la barra de direcciones (o menú ⋮ → *Instalar PAE*). Queda en el escritorio y en el menú de inicio, y se abre en su propia ventana.

## Actualizar

Copia los archivos nuevos a `/srv/http/portal` (paso 2). Los usuarios ven la versión nueva al volver a abrir la página; no tienen que descargar nada.

Si agregas o quitas archivos `.js` o `.css`, actualiza la lista `ARCHIVOS` en `sw.js` y cambia `pae-web-v1` por `pae-web-v2`.

## Seguridad

- **Token por sesión:** se guarda en `sessionStorage` y se borra al cerrar el navegador. Solo si el usuario marca *Mantener la sesión* se queda guardado. En las computadoras de la escuela conviene no marcarlo.
- **Cerrar sesión** borra el token también en el servidor (`/api/logout`). Si el token vence (24 h), la página regresa sola al inicio de sesión.
- **Sin `innerHTML`:** todo lo que viene del servidor se muestra como texto, así un aviso o una entrega con código no se ejecuta.
- **CSP:** Apache solo permite ejecutar JavaScript del propio servidor.
- **Enlaces:** solo se abren enlaces `https://`; `javascript:` y similares se bloquean.
- **Sin caché de datos:** el service worker solo guarda los archivos de la página, nunca respuestas de `/api/` (calificaciones, datos personales).
- **Permisos:** quién puede ver o cambiar qué lo sigue decidiendo la API. La página solo esconde botones; la protección real está en el servidor.

Pendiente del lado de la API: limitar los intentos de inicio de sesión (sigue en la lista de pendientes del README de `pae-api`).
