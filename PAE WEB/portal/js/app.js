// PAE · versión web. Punto de entrada: sesión, menú y rutas (#/inicio, #/clase/3/tareas, …).
import { h, icono, reemplazar } from './dom.js';
import * as api from './api.js';
import { iniciales } from './ui.js';
import { aplicarTema } from './tema.js';
import { pantallaLogin, marca, vistaPerfil } from './vistas/comun.js';
import { inicioAlumno, claseAlumno, vistaCalificaciones, vistaKardex } from './vistas/alumno.js';
import { inicioProfesor, cursoProfesor } from './vistas/profesor.js';
import { vistaHorario } from './vistas/horario.js';

aplicarTema();

const raiz = document.getElementById('app');

const MENU = {
  alumno: [
    ['inicio', 'Mis clases', 'inicio'],
    ['calificaciones', 'Calificaciones', 'calificaciones'],
    ['horario', 'Horario', 'horario'],
    ['kardex', 'Kárdex', 'kardex'],
    ['perfil', 'Mi perfil', 'perfil'],
  ],
  profesor: [
    ['inicio', 'Mis cursos', 'inicio'],
    ['horario', 'Horario', 'horario'],
    ['perfil', 'Mi perfil', 'perfil'],
  ],
};

const VISTAS = {
  alumno: { inicio: inicioAlumno, clase: claseAlumno, calificaciones: vistaCalificaciones, horario: vistaHorario, kardex: vistaKardex, perfil: vistaPerfil },
  profesor: { inicio: inicioProfesor, curso: cursoProfesor, horario: vistaHorario, perfil: vistaPerfil },
};

// Qué opción del menú se marca para cada pantalla.
const SECCION_MENU = { clase: 'inicio', curso: 'inicio' };

let estructura = null;

function construirEstructura(s) {
  const nav = h('nav', { class: 'navegacion', 'aria-label': 'Menú principal' },
    MENU[s.rol].map(([clave, texto, ic]) => h('a', { href: `#/${clave}`, dataset: { seccion: clave } }, icono(ic), texto)));

  const salir = h('button', { class: 'boton fantasma icono-solo', type: 'button', title: 'Cerrar sesión', 'aria-label': 'Cerrar sesión', onclick: async () => {
    salir.disabled = true;
    await api.logout();
    estructura = null;
    location.hash = '';
    iniciar();
  } }, icono('salir'));

  const lateral = h('aside', { class: 'lateral' },
    marca(),
    nav,
    h('div', { class: 'usuario' },
      h('div', { class: 'avatar' }, iniciales(s.usuario.nombre)),
      h('div', {},
        h('div', { class: 'nombre', title: s.usuario.nombre }, s.usuario.nombre),
        h('div', { class: 'rol' }, s.rol === 'alumno' ? `Boleta ${s.usuario.id}` : 'Profesor', ' ', s.demo ? h('span', { class: 'distintivo-demo' }, 'Demo') : null)),
      salir));

  const contenido = h('main', { class: 'contenido', id: 'contenido', tabindex: '-1' });
  const envoltura = h('div', { class: 'estructura' });
  const barraMovil = h('div', { class: 'barra-movil' },
    h('button', { class: 'boton fantasma icono-solo', type: 'button', 'aria-label': 'Abrir menú', onclick: () => envoltura.classList.toggle('menu-abierto') }, icono('menu')),
    h('strong', {}, 'PAE'));

  envoltura.append(lateral, h('div', {}, barraMovil, contenido));
  envoltura.addEventListener('click', (e) => {
    if (e.target === envoltura || e.target.closest('.navegacion a')) envoltura.classList.remove('menu-abierto');
  });
  reemplazar(raiz, envoltura);
  return { nav, contenido, rol: s.rol };
}

function mostrarVista() {
  const s = api.sesionActual();
  if (!s) return iniciar();
  if (!estructura || estructura.rol !== s.rol) estructura = construirEstructura(s);

  const [nombre = 'inicio', ...parametros] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const vistas = VISTAS[s.rol];
  const vista = vistas[nombre] ?? vistas.inicio;
  const seccion = SECCION_MENU[nombre] ?? (vistas[nombre] ? nombre : 'inicio');

  for (const a of estructura.nav.querySelectorAll('a')) {
    const activo = a.dataset.seccion === seccion;
    a.classList.toggle('activo', activo);
    if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }

  // Cada pantalla se dibuja en un contenedor nuevo; si el usuario cambia de pantalla
  // antes de que termine de cargar, la respuesta vieja se descarta sola.
  const pantalla = h('div');
  reemplazar(estructura.contenido, pantalla);
  window.scrollTo(0, 0);
  vista(pantalla, parametros);
  const titulo = MENU[s.rol].find(([clave]) => clave === seccion)?.[1];
  document.title = titulo ? `${titulo} · PAE` : 'PAE · Portal de Aprendizaje Estudiantil';
}

function iniciar(mensaje) {
  if (api.sesionActual()) return mostrarVista();
  estructura = null;
  document.title = 'Iniciar sesión · PAE';
  pantallaLogin(raiz, { mensaje, alEntrar: () => {
    if (location.hash === '#/inicio') mostrarVista();
    else location.hash = '#/inicio'; // el evento hashchange dibuja la pantalla
  } });
}

window.addEventListener('hashchange', () => { if (api.sesionActual()) mostrarVista(); });
window.addEventListener('pae:sesion-expirada', () => iniciar('Tu sesión terminó. Vuelve a iniciar sesión.'));

iniciar();

// PWA: permite instalar PAE como aplicación en la computadora.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sin service worker la página funciona igual */ });
}
