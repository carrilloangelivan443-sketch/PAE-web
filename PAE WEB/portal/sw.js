// Service worker de PAE: permite instalar la página como app y abrirla sin conexión.
// Reglas de seguridad:
//   - NUNCA guarda respuestas de /api/ (calificaciones, datos personales). En una
//     computadora compartida, otra persona podría verlas.
//   - Solo guarda los archivos de la página (HTML, CSS, JS, íconos).
// Estrategia "primero la red": si hay internet siempre se usa la versión más nueva
// del servidor, así las actualizaciones llegan solas.

const CACHE = 'pae-web-v1';
const ARCHIVOS = [
  './', 'index.html', 'GAGA.html', 'manifest.webmanifest', 'css/estilos.css',
  'js/app.js', 'js/api.js', 'js/config.js', 'js/demo.js', 'js/dom.js', 'js/horario.js', 'js/tema.js', 'js/ui.js', 'js/videollamada.js',
  'js/vistas/alumno.js', 'js/vistas/comun.js', 'js/vistas/horario.js', 'js/vistas/profesor.js',
  'iconos/icono.svg', 'iconos/icono-192.png', 'iconos/icono-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const alcance = new URL(self.registration.scope);
  const esDeLaPagina = url.origin === alcance.origin && url.pathname.startsWith(alcance.pathname);
  if (e.request.method !== 'GET' || !esDeLaPagina || url.pathname.includes('/api/')) return; // la API va directo a la red

  e.respondWith(
    fetch(e.request)
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
