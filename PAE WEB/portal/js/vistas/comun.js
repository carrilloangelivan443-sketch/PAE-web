import { h, icono, reemplazar } from '../dom.js';
import * as api from '../api.js';
import { aviso, conCarga, encabezado, iniciales, mensajeError, accion } from '../ui.js';
import { aplicarTema, temaGuardado } from '../tema.js';

// ---------- Inicio de sesión ----------

export function pantallaLogin(raiz, { mensaje, alEntrar }) {
  const usuario = h('input', { class: 'entrada', id: 'usuario', name: 'usuario', autocomplete: 'username', required: true, maxlength: '50', placeholder: 'Ej. 2024050172' });
  const clave = h('input', { class: 'entrada', id: 'contrasena', name: 'contrasena', type: 'password', autocomplete: 'current-password', required: true, maxlength: '200' });
  const verClave = h('button', { class: 'boton fantasma icono-solo', type: 'button', 'aria-label': 'Mostrar contraseña', onclick: () => {
    clave.type = clave.type === 'password' ? 'text' : 'password';
    verClave.setAttribute('aria-label', clave.type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
  } }, icono('ojo'));
  const recordar = h('input', { type: 'checkbox', id: 'recordar' });
  const error = h('div', { class: 'mensaje-error oculto', role: 'alert' });
  const entrar = h('button', { class: 'boton primario', type: 'submit' }, 'Entrar');

  const formulario = h('form', { class: 'formulario', onsubmit: async (e) => {
    e.preventDefault();
    error.classList.add('oculto');
    entrar.disabled = true;
    entrar.textContent = 'Entrando…';
    try {
      await api.login(usuario.value.trim(), clave.value, recordar.checked);
      alEntrar();
    } catch (err) {
      error.textContent = err.codigo === 401 ? 'Boleta/usuario o contraseña incorrectos.' : mensajeError(err);
      error.classList.remove('oculto');
      clave.select();
    } finally {
      entrar.disabled = false;
      entrar.textContent = 'Entrar';
    }
  } },
    mensaje ? h('div', { class: 'mensaje-info' }, mensaje) : null,
    h('label', { class: 'campo', for: 'usuario' }, h('span', {}, 'Boleta o usuario'), usuario),
    h('label', { class: 'campo', for: 'contrasena' }, h('span', {}, 'Contraseña'), h('div', { class: 'clave-envoltura' }, clave, verClave)),
    h('label', { class: 'casilla', for: 'recordar' }, recordar,
      h('span', {}, 'Mantener la sesión en este equipo', h('br'), h('span', { class: 'texto-2 chico' }, 'No lo actives en computadoras compartidas.'))),
    error,
    entrar);

  reemplazar(raiz, h('main', { class: 'pantalla-login' },
    h('div', { class: 'tarjeta-login' },
      marca(),
      h('div', {}, h('h1', {}, 'Inicia sesión'), h('p', { class: 'texto-2' }, 'Alumnos con su boleta; profesores con su usuario.')),
      formulario,
      h('div', { class: 'demo-caja' },
        h('p', { class: 'texto-2 chico' }, '¿Quieres verla sin servidor? Entra al modo demostración:'),
        h('div', { class: 'fila-botones' },
          h('button', { class: 'boton chico', type: 'button', onclick: () => { api.loginDemo('alumno'); alEntrar(); } }, icono('perfil'), 'Demo alumno'),
          h('button', { class: 'boton chico', type: 'button', onclick: () => { api.loginDemo('profesor'); alEntrar(); } }, icono('personas'), 'Demo profesor'))),
      h('p', { class: 'pie-login' }, 'PAE: una herramienta para alumnos y profesores del CECyT 5 "Benito Juárez".'))));
  usuario.focus();
}

export function marca() {
  return h('div', { class: 'marca' },
    h('img', { src: 'iconos/icono.svg', alt: '' }),
    h('div', {}, h('strong', {}, 'PAE'), h('small', {}, 'Portal de Aprendizaje Estudiantil')));
}

// ---------- Perfil y apariencia ----------

export async function vistaPerfil(cont) {
  const s = api.sesionActual();
  const cuerpo = h('div');
  cont.append(encabezado('Mi perfil', 'Tus datos y la apariencia de PAE.'), cuerpo);

  await conCarga(cuerpo, async () => {
    const { datos } = await api.yo();
    const avatar = h('div', { class: 'avatar grande' }, iniciales(datos?.nombre ?? s.usuario.nombre));
    if (datos?.id_foto) cargarFoto(datos.id_foto, avatar);

    const elegirFoto = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'oculto', onchange: async () => {
      const archivo = elegirFoto.files[0];
      if (!archivo) return;
      if (archivo.size > 5 * 1024 * 1024) { aviso('La foto debe pesar menos de 5 MB.', 'error'); return; }
      try {
        await accion(botonFoto, () => api.subirFoto(archivo), 'Foto de perfil actualizada');
        cont.replaceChildren();
        vistaPerfil(cont);
      } catch { /* el aviso ya se mostró */ }
    } });
    const botonFoto = h('button', { class: 'boton chico', type: 'button', onclick: () => elegirFoto.click() }, icono('camara'), 'Cambiar foto');

    const filas = s.rol === 'alumno'
      ? [['Nombre', datos?.nombre], ['Boleta', datos?.boleta], ['Grupo', datos?.grupo], ['Estatus', datos?.estatus], ['Correo', datos?.correo]]
      : [['Nombre', datos?.nombre], ['Número de empleado', datos?.num_empleado], ['Usuario', datos?.usuario]];

    return [
      h('section', { class: 'panel' },
        h('div', { class: 'perfil' }, avatar,
          h('div', { class: 'formulario' },
            h('h2', {}, datos?.nombre ?? s.usuario.nombre),
            h('p', { class: 'texto-2' }, s.rol === 'alumno' ? 'Alumno' : 'Profesor', s.demo ? ' · modo demostración' : ''),
            h('div', {}, botonFoto, elegirFoto)))),
      h('section', { class: 'panel' },
        h('h2', {}, 'Datos'),
        h('dl', { class: 'datos-lista' }, filas.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v ?? '—')]))),
      panelApariencia(),
      h('section', { class: 'panel' },
        h('h2', {}, 'Sobre PAE'),
        h('p', { class: 'texto-2' }, 'PAE es una herramienta para alumnos y profesores del CECyT 5: clases, tareas, avisos, horario, calificaciones y videollamadas en un solo lugar.')),
    ];
  });
}

async function cargarFoto(id, avatar) {
  try {
    const blob = await api.archivo(id);
    const img = h('img', { class: 'avatar grande', alt: 'Foto de perfil', src: URL.createObjectURL(blob) });
    avatar.replaceWith(img);
  } catch { /* se quedan las iniciales */ }
}

function panelApariencia() {
  const opciones = [['sistema', 'Sistema', 'sistema'], ['claro', 'Claro', 'sol'], ['oscuro', 'Oscuro', 'luna']];
  const grupo = h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Tema' });
  const pintar = () => reemplazar(grupo, opciones.map(([valor, texto, ic]) =>
    h('button', { type: 'button', class: temaGuardado() === valor ? 'activo' : '', 'aria-pressed': String(temaGuardado() === valor),
      onclick: () => { aplicarTema(valor); pintar(); } }, icono(ic), texto)));
  pintar();
  return h('section', { class: 'panel' }, h('h2', {}, 'Apariencia'), grupo);
}
