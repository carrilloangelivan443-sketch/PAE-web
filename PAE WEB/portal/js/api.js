// Cliente de la API de PAE (/srv/pae-api). Todas las reglas de seguridad
// viven en el servidor; aquí solo se manda el token y se leen las respuestas.
import { API_BASE } from './config.js';
import * as demo from './demo.js';

const CLAVE = 'pae.sesion';

export class ErrorApi extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

// ---------- Sesión ----------
// Por defecto la sesión se guarda en sessionStorage: se borra al cerrar el navegador,
// que es lo correcto en computadoras compartidas (laboratorios, biblioteca).
// Solo si el usuario marca "Mantener la sesión" se usa localStorage.

let sesion = leerSesion();

function leerSesion() {
  for (const almacen of [sessionStorage, localStorage]) {
    try {
      const s = JSON.parse(almacen.getItem(CLAVE) ?? 'null');
      if (s && s.expira > Date.now()) return s;
      almacen.removeItem(CLAVE);
    } catch { /* almacenamiento no disponible */ }
  }
  return null;
}

function guardarSesion(s, recordar) {
  sesion = s;
  try {
    (recordar ? localStorage : sessionStorage).setItem(CLAVE, JSON.stringify(s));
  } catch { /* si no se puede guardar, la sesión dura mientras la pestaña esté abierta */ }
}

function borrarSesion() {
  sesion = null;
  cacheCursos = null;
  try { sessionStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE); } catch { /* nada */ }
}

export const sesionActual = () => (sesion && sesion.expira > Date.now() ? sesion : null);

export async function login(usuario, contrasena, recordar) {
  const r = await pedir('POST', 'login', { usuario, contrasena }, { sinToken: true });
  guardarSesion({
    token: r.token,
    rol: r.rol,
    usuario: r.usuario,
    expira: Date.now() + (r.expira_en_horas ?? 24) * 3600_000,
  }, recordar);
  return sesion;
}

export function loginDemo(rol) {
  const usuario = rol === 'profesor' ? demo.PROFESOR : demo.ALUMNO;
  guardarSesion({ token: 'demo', rol, usuario: { id: usuario.id, nombre: usuario.nombre }, demo: true, expira: Date.now() + 8 * 3600_000 }, false);
  return sesion;
}

export async function logout() {
  try {
    if (sesion && !sesion.demo) await pedir('POST', 'logout');
  } catch { /* aunque falle, se borra la sesión local */ }
  borrarSesion();
}

// ---------- Peticiones ----------

async function pedir(metodo, ruta, cuerpo, { sinToken = false, binario = false } = {}) {
  if (sesion?.demo && !sinToken) return demo.pedir(metodo, ruta, cuerpo, sesion);

  const cabeceras = { Accept: 'application/json' };
  if (!sinToken && sesion) cabeceras.Authorization = `Bearer ${sesion.token}`;
  const esFormulario = cuerpo instanceof FormData;
  if (cuerpo && !esFormulario) cabeceras['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE}/${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo ? (esFormulario ? cuerpo : JSON.stringify(cuerpo)) : undefined,
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch {
    const e = new ErrorApi(0, 'Sin conexión con el servidor');
    e.sinConexion = true;
    throw e;
  }

  if (binario && respuesta.ok) return respuesta.blob();

  let datos = {};
  try { datos = await respuesta.json(); } catch { /* respuesta vacía o no JSON */ }

  if (!respuesta.ok) {
    const porDefecto = respuesta.status >= 500 || respuesta.status === 404
      ? `El servidor de PAE no respondió correctamente (error ${respuesta.status}). Intenta más tarde.`
      : `Error ${respuesta.status}`;
    const error = new ErrorApi(respuesta.status, datos.error || porDefecto);
    if (respuesta.status === 401 && !sinToken) {
      borrarSesion();
      window.dispatchEvent(new CustomEvent('pae:sesion-expirada', { detail: error.message }));
    }
    throw error;
  }
  return datos;
}

// ---------- Rutas de la API ----------

let cacheCursos = null;

export const yo = () => pedir('GET', 'yo');

/** Los cursos se guardan en memoria para no pedirlos en cada pantalla. */
export function cursos({ refrescar = false } = {}) {
  if (!cacheCursos || refrescar) {
    cacheCursos = pedir('GET', 'cursos').catch((e) => { cacheCursos = null; throw e; });
  }
  return cacheCursos;
}

export async function curso(id) {
  const { cursos: lista } = await cursos();
  const c = lista.find((x) => String(x.id_curso) === String(id));
  if (!c) throw new ErrorApi(404, 'No encontramos esta clase.');
  return c;
}

export const kardex = () => pedir('GET', 'kardex');

export const anuncios = (idCurso) => pedir('GET', `cursos/${idCurso}/anuncios`);
export const publicarAnuncio = (idCurso, d) => pedir('POST', `cursos/${idCurso}/anuncios`, d);
export const editarAnuncio = (id, d) => pedir('PUT', `anuncios/${id}`, d);
export const borrarAnuncio = (id) => pedir('DELETE', `anuncios/${id}`);

export const tareas = (idCurso) => pedir('GET', `cursos/${idCurso}/tareas`);
export const crearTarea = (idCurso, d) => pedir('POST', `cursos/${idCurso}/tareas`, d);
export const entregar = (idTarea, d) => pedir('POST', `tareas/${idTarea}/entrega`, d);
export const entregas = (idTarea) => pedir('GET', `tareas/${idTarea}/entregas`);
export const calificar = (idEntrega, d) => pedir('POST', `entregas/${idEntrega}/calificar`, d);

export const videollamada = (idCurso) => pedir('GET', `cursos/${idCurso}/videollamada`);
export const iniciarClase = (idCurso) => pedir('POST', `cursos/${idCurso}/videollamada/iniciar`);
export const finalizarClase = (idCurso) => pedir('POST', `cursos/${idCurso}/videollamada/finalizar`);
export const unirseClase = (idCurso) => pedir('POST', `cursos/${idCurso}/videollamada/unirse`);
export const salirClase = (idCurso) => pedir('POST', `cursos/${idCurso}/videollamada/salir`);
export const asistencia = (idSesion) => pedir('GET', `sesiones/${idSesion}/asistencia`);
export const participantes = (idCurso) => pedir('GET', `cursos/${idCurso}/videollamada/participantes`);

/** Avisa la salida aunque se esté cerrando la pestaña (keepalive). */
export function salirClaseAlCerrar(idCurso) {
  if (!sesion || sesion.demo) return;
  fetch(`${API_BASE}/cursos/${idCurso}/videollamada/salir`, {
    method: 'POST', keepalive: true, headers: { Authorization: `Bearer ${sesion.token}` },
  }).catch(() => {});
}

export const archivo = (id) => pedir('GET', `archivos/${id}`, null, { binario: true });

export function subirFoto(file) {
  const datos = new FormData();
  datos.append('archivo', file);
  return pedir('POST', 'yo/foto', datos);
}
