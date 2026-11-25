import { h, icono, esHttps } from '../dom.js';
import * as api from '../api.js';
import {
  accion, aFecha, aviso, calificacion, celdaCalificacion, conCarga, conTono, encabezado, enlaceVolver,
  etiqueta, fechaHora, hora, pestanas, vacio,
} from '../ui.js';
import { clasesDelDia, textoHora } from '../horario.js';
import { abrirVideollamada } from '../videollamada.js';

// ---------- Inicio ----------

export async function inicioAlumno(cont) {
  const s = api.sesionActual();
  const nombre = s.usuario.nombre.split(' ')[0];
  const cuerpo = h('div');
  cont.append(encabezado(`Hola, ${nombre}`, 'Tus clases de este periodo.'), cuerpo);

  await conCarga(cuerpo, async () => {
    const { cursos } = await api.cursos();
    if (!cursos.length) return vacio('No tienes materias inscritas en este periodo.', 'clases');
    return [seccionHoy(cursos, 'clase'), h('section', { class: 'seccion' }, h('h2', {}, 'Mis clases'), rejillaClases(cursos))];
  });
}

export function seccionHoy(cursos, ruta) {
  const hoy = clasesDelDia(cursos);
  const ahora = new Date().getHours() * 60 + new Date().getMinutes();
  return h('section', { class: 'seccion' },
    h('h2', {}, 'Hoy'),
    hoy.length
      ? h('div', { class: 'hoy' }, hoy.map((b) => h('a', { class: `hoy-fila ${ahora >= b.inicio && ahora < b.fin ? 'ahora' : ''}`, href: `#/${ruta}/${b.curso.id_curso}` },
        h('span', { class: 'hora' }, `${textoHora(b.inicio)}–${textoHora(b.fin)}`),
        h('span', {}, h('strong', {}, b.curso.materia), b.curso.grupo && ruta === 'curso' ? ` · ${b.curso.grupo}` : ''),
        h('span', { class: 'texto-2 chico' }, b.curso.aula ?? ''))))
      : h('p', { class: 'texto-2' }, 'Hoy no tienes clases.'));
}

function rejillaClases(cursos) {
  return h('div', { class: 'rejilla-clases' }, cursos.map((c) => conTono(h('a', { class: 'tarjeta-clase', href: `#/clase/${c.id_curso}` },
    h('h3', {}, c.materia),
    h('span', { class: 'dato' }, icono('perfil'), c.profesor ?? '—'),
    h('span', { class: 'dato' }, icono('reloj'), c.horario || 'Sin horario'),
    c.aula ? h('span', { class: 'dato' }, icono('lugar'), c.aula) : null), c.materia)));
}

// ---------- Clase ----------

export async function claseAlumno(cont, [id, pestana = 'novedades']) {
  const cuerpo = h('div');
  cont.append(enlaceVolver('#/inicio', 'Mis clases'), cuerpo);

  await conCarga(cuerpo, async () => {
    const c = await api.curso(id);
    const zona = h('div');
    const vistas = { novedades: novedades, tareas: tareasAlumno, video: videoAlumno };
    (vistas[pestana] ?? novedades)(zona, c);
    return [
      encabezado(c.materia, [c.profesor, c.horario, c.aula].filter(Boolean).join(' · ')),
      pestanas([
        ['novedades', 'Novedades', `#/clase/${id}`, 'anuncio'],
        ['tareas', 'Tareas', `#/clase/${id}/tareas`, 'tarea'],
        ['video', 'Videollamada', `#/clase/${id}/video`, 'video'],
      ], vistas[pestana] ? pestana : 'novedades'),
      zona,
    ];
  });
}

export function novedades(zona, c) {
  return conCarga(zona, async () => {
    const { anuncios } = await api.anuncios(c.id_curso);
    if (!anuncios.length) return vacio('Todavía no hay novedades en esta clase.', 'anuncio');
    return h('div', { class: 'lista' }, anuncios.map(tarjetaAnuncio));
  });
}

export function tarjetaAnuncio(a, ...acciones) {
  return h('article', { class: 'elemento' },
    h('div', { class: 'elemento-cabeza' },
      h('div', {}, h('h3', {}, a.titulo), h('div', { class: 'meta' }, h('span', {}, a.autor), h('span', {}, fechaHora(a.fecha)))),
      acciones.length ? h('div', { class: 'fila-botones' }, acciones) : null),
    h('p', { class: 'cuerpo pre' }, a.contenido));
}

function estadoTarea(t) {
  if (t.estado_entrega === 'REVISADA') return etiqueta(`Calificada: ${calificacion(t.calificacion)}/${calificacion(t.puntos_maximos)}`, 'ok');
  if (t.estado_entrega) return etiqueta('Entregada', 'info');
  const limite = aFecha(t.fecha_limite);
  if (limite && limite < new Date()) return etiqueta('Vencida', 'error');
  return etiqueta('Pendiente', 'alerta');
}

function tareasAlumno(zona, c) {
  return conCarga(zona, async () => {
    const { tareas } = await api.tareas(c.id_curso);
    if (!tareas.length) return vacio('No hay tareas en esta clase.', 'tarea');
    return h('div', { class: 'lista' }, tareas.map((t) => {
      const revisada = t.estado_entrega === 'REVISADA';
      return h('details', { class: 'elemento' },
        h('summary', {},
          h('div', { class: 'elemento-cabeza' },
            h('div', {}, h('h3', {}, t.titulo),
              h('div', { class: 'meta' },
                h('span', {}, t.fecha_limite ? `Entrega: ${fechaHora(t.fecha_limite)}` : 'Sin fecha límite'),
                h('span', {}, `${calificacion(t.puntos_maximos)} puntos`))),
            estadoTarea(t))),
        t.descripcion ? h('p', { class: 'pre' }, t.descripcion) : null,
        t.entregada ? h('p', { class: 'texto-2 chico' }, `Entregaste el ${fechaHora(t.entregada)}.`) : null,
        t.comentario ? h('div', { class: 'mensaje-info' }, h('strong', {}, 'Comentario del profesor: '), t.comentario) : null,
        revisada ? null : formularioEntrega(t, () => tareasAlumno(zona, c)));
    }));
  });
}

function formularioEntrega(t, alTerminar) {
  const contenido = h('textarea', { class: 'entrada', required: true, maxlength: '10000', placeholder: 'Escribe tu respuesta o una descripción de tu entrega.' });
  const enlace = h('input', { class: 'entrada', type: 'url', maxlength: '500', placeholder: 'https://drive.google.com/…' });
  const boton = h('button', { class: 'boton primario', type: 'submit' }, t.estado_entrega ? 'Actualizar entrega' : 'Entregar tarea');
  return h('form', { class: 'formulario cuerpo', onsubmit: async (e) => {
    e.preventDefault();
    const url = enlace.value.trim();
    if (url && !esHttps(url)) { aviso('El enlace debe empezar con https://', 'error'); return; }
    try {
      const r = await accion(boton, () => api.entregar(t.id, { contenido: contenido.value.trim(), archivo_url: url || null }));
      aviso(r.mensaje ?? 'Tarea entregada', 'ok');
      alTerminar();
    } catch { /* aviso mostrado */ }
  } },
    t.estado_entrega ? h('p', { class: 'texto-2 chico' }, 'Si vuelves a enviar, se reemplaza tu entrega anterior.') : null,
    h('label', { class: 'campo' }, h('span', {}, 'Tu entrega'), contenido),
    h('label', { class: 'campo' }, h('span', {}, 'Enlace al archivo ', h('span', { class: 'ayuda' }, '(opcional, por ejemplo de Google Drive)')), enlace),
    h('div', { class: 'fila-botones' }, boton));
}

function videoAlumno(zona, c) {
  return conCarga(zona, async () => {
    const { sesion } = await api.videollamada(c.id_curso);
    const recargar = h('button', { class: 'boton', type: 'button', onclick: () => videoAlumno(zona, c) }, icono('recargar'), 'Actualizar');

    if (sesion?.estado === 'EN_VIVO') {
      const unirse = h('button', { class: 'boton primario', type: 'button', onclick: async () => {
        try {
          const r = await accion(unirse, () => api.unirseClase(c.id_curso));
          aviso(`Asistencia registrada: ${r.asistencia === 'RETARDO' ? 'retardo' : 'presente'}`, 'ok');
          abrirVideollamada({
            titulo: c.materia, idCurso: c.id_curso, respuesta: r, demo: api.sesionActual()?.demo,
            alSalir: ({ alCerrarPestana }) => (alCerrarPestana ? api.salirClaseAlCerrar(c.id_curso) : api.salirClase(c.id_curso).catch(() => {})),
          });
        } catch { /* aviso mostrado */ }
      } }, icono('video'), 'Unirme a la clase');
      return h('section', { class: 'panel' },
        h('div', { class: 'elemento-cabeza' },
          h('div', {}, h('h2', {}, 'La clase está en vivo'), h('p', { class: 'texto-2' }, `Comenzó a las ${hora(sesion.inicio)}. Tu asistencia se registra al entrar.`)),
          etiqueta('En vivo', 'error')),
        h('div', { class: 'fila-botones cuerpo' }, unirse, recargar));
    }

    return h('section', { class: 'panel' },
      h('h2', {}, 'No hay clase en vivo ahora'),
      h('p', { class: 'texto-2' }, sesion?.estado === 'PROGRAMADA' && sesion.inicio
        ? `La próxima clase en línea está programada para el ${fechaHora(sesion.inicio)}.`
        : 'Cuando tu profesor inicie la clase en línea, aquí aparecerá el botón para entrar.'),
      h('div', { class: 'fila-botones cuerpo' }, recargar));
  });
}

// ---------- Calificaciones ----------

export async function vistaCalificaciones(cont) {
  const cuerpo = h('div');
  cont.append(encabezado('Calificaciones', 'Parciales del periodo actual.'), cuerpo);
  await conCarga(cuerpo, async () => {
    const { cursos } = await api.cursos();
    if (!cursos.length) return vacio('No tienes materias en este periodo.', 'calificaciones');
    return h('div', { class: 'tabla-envoltura' },
      h('table', {},
        h('thead', {}, h('tr', {},
          h('th', {}, 'Materia'), h('th', { class: 'num' }, '1er parcial'), h('th', { class: 'num' }, '2º parcial'),
          h('th', { class: 'num' }, '3er parcial'), h('th', { class: 'num' }, 'Extra'), h('th', { class: 'num' }, 'Final'))),
        h('tbody', {}, cursos.map((c) => h('tr', {},
          h('td', {}, h('a', { href: `#/clase/${c.id_curso}` }, c.materia), h('div', { class: 'texto-2 chico' }, c.profesor ?? '')),
          celdaCalificacion(c.parcial_1), celdaCalificacion(c.parcial_2), celdaCalificacion(c.parcial_3),
          celdaCalificacion(c.extraordinario), celdaCalificacion(c.final, { final: true }))))));
  });
}

// ---------- Kárdex ----------

export async function vistaKardex(cont) {
  const cuerpo = h('div');
  cont.append(encabezado('Kárdex', 'Tu historial académico.'), cuerpo);
  await conCarga(cuerpo, async () => {
    const { resumen, materias } = await api.kardex();
    const avance = resumen.creditos_cursados ? Math.round((resumen.creditos_aprobados / resumen.creditos_cursados) * 100) : 0;
    const barra = h('span');
    barra.style.width = `${avance}%`;

    const porSemestre = new Map();
    for (const m of materias) {
      if (!porSemestre.has(m.semestre)) porSemestre.set(m.semestre, []);
      porSemestre.get(m.semestre).push(m);
    }
    const situacion = (s) => etiqueta(s, s === 'APROBADA' ? 'ok' : s === 'REPROBADA' ? 'error' : 'info');

    return [
      h('div', { class: 'resumen' },
        datoGrande(resumen.promedio != null ? resumen.promedio.toFixed(2) : '—', 'Promedio general'),
        datoGrande(String(resumen.materias_calificadas), 'Materias calificadas'),
        h('div', { class: 'dato-grande' },
          h('div', { class: 'valor' }, `${resumen.creditos_aprobados}`, h('span', { class: 'texto-2 chico' }, ` / ${resumen.creditos_cursados}`)),
          h('div', { class: 'rotulo' }, 'Créditos aprobados / cursados'),
          h('div', { class: 'barra', role: 'progressbar', 'aria-valuenow': String(avance), 'aria-valuemin': '0', 'aria-valuemax': '100' }, barra))),
      h('div', { class: 'tabla-envoltura' },
        h('table', {},
          h('thead', {}, h('tr', {},
            h('th', {}, 'Periodo'), h('th', {}, 'Clave'), h('th', {}, 'Materia'), h('th', { class: 'num' }, 'Créditos'),
            h('th', { class: 'num' }, 'Final'), h('th', { class: 'num' }, 'Extra'), h('th', {}, 'Situación'))),
          h('tbody', {}, [...porSemestre].map(([semestre, lista]) => [
            h('tr', { class: 'grupo' }, h('td', { colspan: '7' }, semestre)),
            ...lista.map((m) => h('tr', {},
              h('td', {}, m.periodo), h('td', {}, m.codigo), h('td', {}, m.materia), h('td', { class: 'num' }, m.creditos),
              celdaCalificacion(m.final, { final: true }), celdaCalificacion(m.extraordinario), h('td', {}, situacion(m.situacion)))),
          ])))),
    ];
  });
}

const datoGrande = (valor, rotulo) => h('div', { class: 'dato-grande' }, h('div', { class: 'valor' }, valor), h('div', { class: 'rotulo' }, rotulo));
