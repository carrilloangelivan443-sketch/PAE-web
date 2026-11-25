import { h, icono, esHttps } from '../dom.js';
import * as api from '../api.js';
import {
  accion, calificacion, confirmar, conCarga, conTono, encabezado, enlaceVolver, etiqueta,
  fechaHora, hora, modal, pestanas, vacio,
} from '../ui.js';
import { seccionHoy, tarjetaAnuncio } from './alumno.js';
import { abrirVideollamada } from '../videollamada.js';

// ---------- Inicio ----------

export async function inicioProfesor(cont) {
  const s = api.sesionActual();
  const cuerpo = h('div');
  cont.append(encabezado(`Hola, ${s.usuario.nombre.split(' ')[0]}`, 'Los cursos que impartes.'), cuerpo);
  await conCarga(cuerpo, async () => {
    const { cursos } = await api.cursos();
    if (!cursos.length) return vacio('No tienes cursos asignados en este periodo.', 'clases');
    return [
      seccionHoy(cursos, 'curso'),
      h('section', { class: 'seccion' }, h('h2', {}, 'Mis cursos'),
        h('div', { class: 'rejilla-clases' }, cursos.map((c) => conTono(h('a', { class: 'tarjeta-clase', href: `#/curso/${c.id_curso}` },
          h('span', {}, etiqueta(c.grupo, 'marca')),
          h('h3', {}, c.materia),
          h('span', { class: 'dato' }, icono('reloj'), c.horario || 'Sin horario'),
          c.aula ? h('span', { class: 'dato' }, icono('lugar'), c.aula) : null,
          h('span', { class: 'dato' }, icono('personas'), `${c.alumnos ?? 0} alumnos`)), c.materia)))),
    ];
  });
}

// ---------- Curso ----------

export async function cursoProfesor(cont, [id, pestana = 'novedades', idTarea]) {
  const cuerpo = h('div');
  cont.append(enlaceVolver('#/inicio', 'Mis cursos'), cuerpo);
  await conCarga(cuerpo, async () => {
    const c = await api.curso(id);
    const zona = h('div');
    if (pestana === 'tareas' && idTarea) vistaEntregas(zona, c, idTarea);
    else if (pestana === 'tareas') tareasProfesor(zona, c);
    else if (pestana === 'video') claseEnVivo(zona, c);
    else { pestana = 'novedades'; anunciosProfesor(zona, c); }
    return [
      encabezado(c.materia, [`Grupo ${c.grupo}`, c.horario, c.aula].filter(Boolean).join(' · ')),
      pestanas([
        ['novedades', 'Novedades', `#/curso/${id}`, 'anuncio'],
        ['tareas', 'Tareas', `#/curso/${id}/tareas`, 'tarea'],
        ['video', 'Clase en vivo', `#/curso/${id}/video`, 'video'],
      ], pestana),
      zona,
    ];
  });
}

// ---------- Novedades ----------

function formularioAnuncio({ titulo = '', contenido = '' } = {}, textoBoton, alEnviar) {
  const t = h('input', { class: 'entrada', required: true, maxlength: '150', value: titulo, placeholder: 'Ej. Examen del segundo parcial' });
  const c = h('textarea', { class: 'entrada', required: true, maxlength: '10000', value: contenido, placeholder: 'Escribe el aviso para tus alumnos.' });
  const boton = h('button', { class: 'boton primario', type: 'submit' }, textoBoton);
  return h('form', { class: 'formulario', onsubmit: (e) => {
    e.preventDefault();
    alEnviar({ titulo: t.value.trim(), contenido: c.value.trim() }, boton);
  } },
  h('label', { class: 'campo' }, h('span', {}, 'Título'), t),
  h('label', { class: 'campo' }, h('span', {}, 'Contenido'), c),
  h('div', { class: 'fila-botones derecha' }, boton));
}

function anunciosProfesor(zona, c) {
  const recargar = () => anunciosProfesor(zona, c);
  return conCarga(zona, async () => {
    const { anuncios } = await api.anuncios(c.id_curso);
    const publicar = h('section', { class: 'panel' }, h('h2', {}, 'Publicar un aviso'),
      formularioAnuncio({}, 'Publicar', async (d, boton) => {
        try { await accion(boton, () => api.publicarAnuncio(c.id_curso, d), 'Aviso publicado'); recargar(); } catch { /* aviso mostrado */ }
      }));

    const lista = anuncios.length
      ? h('div', { class: 'lista' }, anuncios.map((a) => tarjetaAnuncio(a,
        h('button', { class: 'boton fantasma icono-solo', type: 'button', title: 'Editar', 'aria-label': `Editar "${a.titulo}"`, onclick: () => {
          const cerrar = modal('Editar aviso', formularioAnuncio(a, 'Guardar cambios', async (d, boton) => {
            try { await accion(boton, () => api.editarAnuncio(a.id, d), 'Aviso actualizado'); cerrar(); recargar(); } catch { /* aviso mostrado */ }
          }));
        } }, icono('editar')),
        h('button', { class: 'boton fantasma icono-solo', type: 'button', title: 'Eliminar', 'aria-label': `Eliminar "${a.titulo}"`, onclick: async (e) => {
          const boton = e.currentTarget;
          if (!await confirmar(`¿Eliminar el aviso "${a.titulo}"? Los alumnos ya no lo verán.`, { titulo: 'Eliminar aviso', aceptar: 'Eliminar', peligro: true })) return;
          try { await accion(boton, () => api.borrarAnuncio(a.id), 'Aviso eliminado'); recargar(); } catch { /* aviso mostrado */ }
        } }, icono('borrar')))))
      : vacio('Aún no has publicado avisos en este curso.', 'anuncio');

    return [publicar, h('section', { class: 'seccion' }, h('h2', {}, 'Avisos publicados'), lista)];
  });
}

// ---------- Tareas ----------

function tareasProfesor(zona, c) {
  return conCarga(zona, async () => {
    const { tareas } = await api.tareas(c.id_curso);
    const nueva = h('button', { class: 'boton primario', type: 'button', onclick: () => nuevaTarea(c, () => tareasProfesor(zona, c)) }, icono('mas'), 'Nueva tarea');
    return [
      h('div', { class: 'fila-botones' }, nueva),
      h('section', { class: 'seccion' },
        tareas.length
          ? h('div', { class: 'lista' }, tareas.map((t) => h('article', { class: 'elemento' },
            h('div', { class: 'elemento-cabeza' },
              h('div', {}, h('h3', {}, t.titulo),
                h('div', { class: 'meta' },
                  h('span', {}, t.fecha_limite ? `Entrega: ${fechaHora(t.fecha_limite)}` : 'Sin fecha límite'),
                  h('span', {}, `${calificacion(t.puntos_maximos)} puntos`),
                  h('span', {}, `${t.entregas ?? 0} de ${c.alumnos ?? '?'} entregas`))),
              h('a', { class: 'boton chico', href: `#/curso/${c.id_curso}/tareas/${t.id}` }, 'Ver entregas')),
            t.descripcion ? h('p', { class: 'cuerpo pre texto-2' }, t.descripcion) : null)))
          : vacio('Aún no has publicado tareas en este curso.', 'tarea')),
    ];
  });
}

function nuevaTarea(c, alTerminar) {
  const titulo = h('input', { class: 'entrada', required: true, maxlength: '150' });
  const descripcion = h('textarea', { class: 'entrada', maxlength: '10000' });
  const fechaLimite = h('input', { class: 'entrada', type: 'datetime-local' });
  const puntos = h('input', { class: 'entrada', type: 'number', min: '1', max: '100', step: '0.5', value: '10' });
  const boton = h('button', { class: 'boton primario', type: 'submit' }, 'Publicar tarea');
  const cerrar = modal('Nueva tarea', h('form', { class: 'formulario', onsubmit: async (e) => {
    e.preventDefault();
    const d = {
      titulo: titulo.value.trim(),
      descripcion: descripcion.value.trim() || null,
      // datetime-local da "AAAA-MM-DDTHH:MM"; la API espera "AAAA-MM-DD HH:MM".
      fecha_entrega: fechaLimite.value ? fechaLimite.value.replace('T', ' ') : null,
      puntos_maximos: puntos.value ? Number(puntos.value) : null,
    };
    try { await accion(boton, () => api.crearTarea(c.id_curso, d), 'Tarea publicada'); cerrar(); alTerminar(); } catch { /* aviso mostrado */ }
  } },
  h('label', { class: 'campo' }, h('span', {}, 'Título'), titulo),
  h('label', { class: 'campo' }, h('span', {}, 'Instrucciones ', h('span', { class: 'ayuda' }, '(opcional)')), descripcion),
  h('div', { class: 'dos-columnas' },
    h('label', { class: 'campo' }, h('span', {}, 'Fecha límite ', h('span', { class: 'ayuda' }, '(opcional)')), fechaLimite),
    h('label', { class: 'campo' }, h('span', {}, 'Puntos máximos'), puntos)),
  h('div', { class: 'fila-botones derecha' }, boton)));
}

function vistaEntregas(zona, c, idTarea) {
  return conCarga(zona, async () => {
    const [{ tareas }, { entregas }] = await Promise.all([api.tareas(c.id_curso), api.entregas(idTarea)]);
    const t = tareas.find((x) => String(x.id) === String(idTarea));
    const maximo = t?.puntos_maximos ?? 10;
    const recargar = () => vistaEntregas(zona, c, idTarea);

    return [
      enlaceVolver(`#/curso/${c.id_curso}/tareas`, 'Todas las tareas'),
      h('section', { class: 'panel' },
        h('h2', {}, t?.titulo ?? 'Tarea'),
        h('div', { class: 'meta' },
          h('span', {}, t?.fecha_limite ? `Entrega: ${fechaHora(t.fecha_limite)}` : 'Sin fecha límite'),
          h('span', {}, `${calificacion(maximo)} puntos`),
          h('span', {}, `${entregas.length} entregas`))),
      h('section', { class: 'seccion' },
        h('h2', {}, 'Entregas'),
        entregas.length
          ? h('div', { class: 'lista' }, entregas.map((e) => tarjetaEntrega(e, maximo, recargar)))
          : vacio('Ningún alumno ha entregado esta tarea todavía.', 'tarea')),
    ];
  });
}

function tarjetaEntrega(e, maximo, recargar) {
  const nota = h('input', { class: 'entrada', type: 'number', min: '0', max: String(maximo), step: '0.1', required: true, value: e.calificacion ?? '' });
  const comentario = h('textarea', { class: 'entrada', maxlength: '5000', value: e.comentario ?? '', placeholder: 'Comentario para el alumno (opcional)' });
  const boton = h('button', { class: 'boton primario', type: 'submit' }, e.estado === 'REVISADA' ? 'Actualizar calificación' : 'Calificar');

  return h('details', { class: 'elemento', open: e.estado !== 'REVISADA' },
    h('summary', {},
      h('div', { class: 'elemento-cabeza' },
        h('div', {}, h('h3', {}, e.alumno), h('div', { class: 'meta' }, h('span', {}, `Boleta ${e.boleta}`), h('span', {}, `Entregó: ${fechaHora(e.fecha)}`))),
        e.estado === 'REVISADA' ? etiqueta(`${calificacion(e.calificacion)}/${calificacion(maximo)}`, 'ok') : etiqueta('Por calificar', 'alerta'))),
    h('p', { class: 'pre' }, e.contenido),
    e.archivo_url && esHttps(e.archivo_url)
      ? h('p', { class: 'cuerpo' }, h('a', { href: e.archivo_url, target: '_blank', rel: 'noopener noreferrer' }, icono('enlace'), ' Abrir archivo adjunto'))
      : null,
    h('form', { class: 'formulario cuerpo', onsubmit: async (ev) => {
      ev.preventDefault();
      try {
        await accion(boton, () => api.calificar(e.id, { calificacion: Number(nota.value), comentario: comentario.value.trim() || null }), 'Entrega calificada');
        recargar();
      } catch { /* aviso mostrado */ }
    } },
    h('div', { class: 'dos-columnas' },
      h('label', { class: 'campo' }, h('span', {}, `Calificación (0 a ${calificacion(maximo)})`), nota),
      h('div')),
    h('label', { class: 'campo' }, h('span', {}, 'Comentario'), comentario),
    h('div', { class: 'fila-botones' }, boton)));
}

// ---------- Clase en vivo ----------

function claseEnVivo(zona, c) {
  const recargar = () => claseEnVivo(zona, c);
  return conCarga(zona, async () => {
    const { sesion } = await api.videollamada(c.id_curso);
    const botonActualizar = h('button', { class: 'boton', type: 'button', onclick: recargar }, icono('recargar'), 'Actualizar');

    const entrar = async (boton) => {
      // "iniciar" abre la clase o, si ya está en vivo, devuelve la misma sesión con las credenciales.
      try {
        const r = await accion(boton, () => api.iniciarClase(c.id_curso));
        abrirVideollamada({ titulo: `${c.materia} · ${c.grupo}`, idCurso: c.id_curso, esProfesor: true, respuesta: r, demo: api.sesionActual()?.demo || r.demo, alSalir: () => recargar() });
      } catch { /* aviso mostrado */ }
    };

    if (sesion?.estado !== 'EN_VIVO') {
      const iniciar = h('button', { class: 'boton primario', type: 'button', onclick: (e) => entrar(e.currentTarget) }, icono('video'), 'Iniciar clase en vivo');
      return h('section', { class: 'panel' },
        h('h2', {}, 'No hay una clase en vivo'),
        h('p', { class: 'texto-2' }, 'Al iniciar, tus alumnos verán el botón para entrar. Su asistencia se registra sola: presente, o retardo después de 10 minutos.'),
        h('div', { class: 'fila-botones cuerpo' }, iniciar, botonActualizar));
    }

    const unirme = h('button', { class: 'boton primario', type: 'button', onclick: (e) => entrar(e.currentTarget) }, icono('video'), 'Entrar a la videollamada');
    const finalizar = h('button', { class: 'boton peligro', type: 'button', onclick: async () => {
      if (!await confirmar('¿Finalizar la clase en vivo? Los alumnos que sigan conectados quedarán registrados con su hora de salida.', { titulo: 'Finalizar clase', aceptar: 'Finalizar', peligro: true })) return;
      try {
        const r = await accion(finalizar, () => api.finalizarClase(c.id_curso), 'Clase finalizada');
        const resultado = h('div');
        zona.replaceChildren(h('section', { class: 'panel' }, h('h2', {}, 'Clase finalizada'), h('p', { class: 'texto-2' }, 'Esta es la asistencia final de la sesión.'),
          h('div', { class: 'fila-botones cuerpo' }, h('button', { class: 'boton', type: 'button', onclick: recargar }, 'Listo'))), resultado);
        tablaAsistencia(resultado, r.id_sesion);
      } catch { /* aviso mostrado */ }
    } }, 'Finalizar clase');

    const asistencia = h('div');
    tablaAsistencia(asistencia, sesion.id);
    return [
      h('section', { class: 'panel' },
        h('div', { class: 'elemento-cabeza' },
          h('div', {}, h('h2', {}, 'Clase en vivo'), h('p', { class: 'texto-2' }, `Iniciada a las ${hora(sesion.inicio)}.`)),
          etiqueta('En vivo', 'error')),
        h('div', { class: 'fila-botones cuerpo' }, unirme, finalizar, botonActualizar)),
      asistencia,
    ];
  });
}

function tablaAsistencia(cont, idSesion) {
  return conCarga(cont, async () => {
    const { asistencia } = await api.asistencia(idSesion);
    const cuenta = (e) => asistencia.filter((a) => a.estado === e).length;
    const tipo = { PRESENTE: 'ok', RETARDO: 'alerta', AUSENTE: 'error' };
    return h('section', { class: 'seccion' },
      h('h2', {}, 'Asistencia'),
      h('p', { class: 'texto-2 chico' }, `${cuenta('PRESENTE')} presentes · ${cuenta('RETARDO')} con retardo · ${cuenta('AUSENTE')} ausentes`),
      h('div', { class: 'tabla-envoltura cuerpo' },
        h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Alumno'), h('th', {}, 'Boleta'), h('th', {}, 'Estado'), h('th', {}, 'Entrada'), h('th', {}, 'Salida'))),
          h('tbody', {}, asistencia.map((a) => h('tr', {},
            h('td', {}, a.alumno), h('td', {}, a.boleta), h('td', {}, etiqueta(a.estado, tipo[a.estado] ?? '')),
            h('td', {}, a.entrada ? hora(a.entrada) : '—'), h('td', {}, a.salida ? hora(a.salida) : '—')))))));
  });
}

