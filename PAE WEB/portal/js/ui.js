import { h, icono, reemplazar } from './dom.js';

// ---------- Avisos ----------

export function aviso(texto, tipo = '') {
  const caja = document.getElementById('avisos');
  const el = h('div', { class: `aviso ${tipo}` }, texto);
  caja.append(el);
  setTimeout(() => el.remove(), tipo === 'error' ? 6000 : 3500);
}

// ---------- Ventanas ----------

/** Abre una ventana. `contenido` es un nodo; devuelve una función para cerrarla. */
export function modal(titulo, contenido, { alCerrar } = {}) {
  const anterior = document.activeElement;
  const cerrar = () => {
    fondo.remove();
    document.removeEventListener('keydown', teclas);
    anterior?.focus?.();
    alCerrar?.();
  };
  const teclas = (e) => { if (e.key === 'Escape') cerrar(); };
  const fondo = h('div', { class: 'fondo-modal', onclick: (e) => { if (e.target === fondo) cerrar(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div', { class: 'cabeza-modal' },
        h('h2', {}, titulo),
        h('button', { class: 'boton fantasma icono-solo', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, icono('cerrar'))),
      contenido));
  document.addEventListener('keydown', teclas);
  document.body.append(fondo);
  fondo.querySelector('input, textarea, select, button.primario')?.focus();
  return cerrar;
}

export function confirmar(texto, { titulo = 'Confirmar', aceptar = 'Aceptar', peligro = false } = {}) {
  return new Promise((resolver) => {
    let respuesta = false;
    const cerrar = modal(titulo, h('div', { class: 'formulario' },
      h('p', {}, texto),
      h('div', { class: 'fila-botones derecha' },
        h('button', { class: 'boton', type: 'button', onclick: () => cerrar() }, 'Cancelar'),
        h('button', { class: `boton ${peligro ? 'peligro lleno' : 'primario'}`, type: 'button', onclick: () => { respuesta = true; cerrar(); } }, aceptar))),
    { alCerrar: () => resolver(respuesta) });
  });
}

// ---------- Estados de carga ----------

export const cargando = (texto = 'Cargando…') => h('div', { class: 'cargando' }, h('span', { class: 'giro' }), texto);

export const vacio = (texto, nombreIcono = 'vacio') => h('div', { class: 'vacio' }, icono(nombreIcono), h('p', {}, texto));

/** Muestra "Cargando…" en `cont`, ejecuta `fn` y pone su resultado; si falla, muestra el error con botón de reintentar. */
export async function conCarga(cont, fn) {
  reemplazar(cont, cargando());
  try {
    const resultado = await fn();
    reemplazar(cont, resultado);
  } catch (error) {
    if (error?.codigo === 401) return; // la sesión expiró: app.js ya muestra el inicio de sesión
    reemplazar(cont, h('div', { class: 'vacio' },
      h('p', {}, mensajeError(error)),
      h('p', {}, h('button', { class: 'boton', type: 'button', onclick: () => conCarga(cont, fn) }, icono('recargar'), 'Reintentar'))));
  }
}

export function mensajeError(error) {
  if (error?.name === 'TypeError' || error?.sinConexion) return 'No hay conexión con el servidor de PAE. Revisa tu internet e intenta de nuevo.';
  return error?.message || 'Ocurrió un error inesperado.';
}

/** Desactiva el botón mientras corre la acción y muestra avisos de éxito o error. */
export async function accion(boton, fn, textoExito) {
  if (boton) boton.disabled = true;
  try {
    const r = await fn();
    if (textoExito) aviso(textoExito, 'ok');
    return r;
  } catch (error) {
    if (error?.codigo !== 401) aviso(mensajeError(error), 'error');
    throw error;
  } finally {
    if (boton) boton.disabled = false;
  }
}

// ---------- Piezas comunes ----------

export function encabezado(titulo, subtitulo, ...extra) {
  return h('header', { class: 'encabezado' },
    h('div', {}, h('h1', {}, titulo), subtitulo ? h('p', {}, subtitulo) : null),
    extra.length ? h('div', { class: 'fila-botones' }, extra) : null);
}

export function enlaceVolver(href, texto) {
  return h('a', { class: 'volver', href }, icono('atras'), texto);
}

export function pestanas(lista, activa) {
  return h('nav', { class: 'pestanas', 'aria-label': 'Secciones' },
    lista.map(([clave, texto, href, nombreIcono]) =>
      h('a', { href, class: clave === activa ? 'activo' : '', 'aria-current': clave === activa ? 'page' : null },
        icono(nombreIcono), texto)));
}

export function etiqueta(texto, tipo = '') {
  return h('span', { class: `etiqueta ${tipo}` }, texto);
}

/** Tono de color estable para cada materia (el mismo nombre siempre da el mismo color). */
export function tono(texto) {
  let n = 0;
  for (const c of String(texto)) n = (n * 31 + c.codePointAt(0)) >>> 0;
  return n % 360;
}

export function conTono(el, texto) {
  el.style.setProperty('--tono', String(tono(texto)));
  return el;
}

export function iniciales(nombre) {
  return String(nombre ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

// ---------- Formatos ----------

/** Convierte "AAAA-MM-DD HH:MM:SS" (hora local del servidor) a Date. */
export function aFecha(texto) {
  if (!texto) return null;
  const f = new Date(String(texto).replace(' ', 'T'));
  return Number.isNaN(f.getTime()) ? null : f;
}

const fmtFecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtFechaHora = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

export const fecha = (t) => { const f = aFecha(t); return f ? fmtFecha.format(f) : '—'; };
export const fechaHora = (t) => { const f = aFecha(t); return f ? fmtFechaHora.format(f) : '—'; };
export const hora = (t) => { const f = aFecha(t); return f ? fmtHora.format(f) : '—'; };

export function calificacion(valor) {
  if (valor == null || valor === '') return '—';
  const n = Number(valor);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function celdaCalificacion(valor, { final = false } = {}) {
  const baja = valor != null && Number(valor) < 6;
  return h('td', { class: `num ${baja ? 'cal-baja' : ''} ${final ? 'cal-final' : ''}` }, calificacion(valor));
}
