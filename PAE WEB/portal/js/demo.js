// Modo demostración: imita las respuestas de la API con datos de ejemplo,
// para enseñar la página sin servidor (por ejemplo, en una exposición).
// Nada de esto se guarda: al recargar la página vuelve al estado inicial.

export const ALUMNO = { id: '2024050172', nombre: 'Alumno Demo' };
export const PROFESOR = { id: '10001', nombre: 'Ana Cruz Méndez', usuario: 'acruz' };

const hoy = new Date();
const dia = (desplazamiento, hh = 23, mm = 59) => {
  const f = new Date(hoy);
  f.setDate(f.getDate() + desplazamiento);
  f.setHours(hh, mm, 0, 0);
  return formato(f);
};
function formato(f) {
  const p = (n) => String(n).padStart(2, '0');
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())} ${p(f.getHours())}:${p(f.getMinutes())}:00`;
}

const CURSOS = [
  { id_curso: 1, codigo: 'BD-501', materia: 'Base de Datos', creditos: 8, profesor: 'Ana Cruz Méndez', grupo: '5IV11', horario: 'Lun 07:00-08:30, Mié 07:00-08:30', aula: 'Lab. 3', parcial_1: 9, parcial_2: 8.5, parcial_3: null },
  { id_curso: 2, codigo: 'IUC-501', materia: 'Interacción Usuario-Computadora', creditos: 6, profesor: 'Luis Herrera Ramos', grupo: '5IV11', horario: 'Lun 08:30-10:00, Mié 08:30-10:00', aula: 'Lab. 1', parcial_1: 10, parcial_2: 9, parcial_3: null },
  { id_curso: 3, codigo: 'MIC-501', materia: 'Microeconomía', creditos: 6, profesor: 'Patricia Solís Vega', grupo: '5IV11', horario: 'Mar 08:30-10:00, Jue 08:30-10:00', aula: 'Aula 204', parcial_1: 7.5, parcial_2: 8, parcial_3: null },
  { id_curso: 4, codigo: 'PYE-501', materia: 'Probabilidad y Estadística', creditos: 8, profesor: 'Jorge Medina Ortiz', grupo: '5IV11', horario: 'Lun 10:00-11:30, Vie 10:00-11:30', aula: 'Aula 210', parcial_1: 5.5, parcial_2: 7, parcial_3: null },
  { id_curso: 5, codigo: 'ING-501', materia: 'Inglés V', creditos: 4, profesor: 'Karen Ríos Luna', grupo: '5IV11', horario: 'Mié 11:30-13:00, Vie 11:30-13:00', aula: 'Aula 105', parcial_1: 9.5, parcial_2: 9, parcial_3: null },
  { id_curso: 6, codigo: 'FIS-501', materia: 'Física IV', creditos: 8, profesor: 'Ricardo Núñez Paz', grupo: '5IV11', horario: 'Mar 11:30-13:00, Jue 11:30-13:00', aula: 'Lab. Física', parcial_1: 8, parcial_2: null, parcial_3: null },
].map((c) => ({ ...c, periodo: '2026-2', extraordinario: null, final: null }));

const CURSOS_PROFESOR = [
  { id_curso: 1, codigo: 'BD-501', materia: 'Base de Datos', grupo: '5IV11', horario: 'Lun 07:00-08:30, Mié 07:00-08:30', aula: 'Lab. 3', alumnos: 6 },
  { id_curso: 7, codigo: 'BD-501', materia: 'Base de Datos', grupo: '5IV12', horario: 'Mar 10:00-11:30, Jue 10:00-11:30', aula: 'Lab. 3', alumnos: 6 },
  { id_curso: 8, codigo: 'PW-601', materia: 'Programación Web', grupo: '6IV11', horario: 'Vie 07:00-10:00', aula: 'Lab. 2', alumnos: 6 },
];

const ALUMNOS = [
  ['2024050172', 'Alumno Demo'], ['2024050101', 'Andrea López Díaz'], ['2024050115', 'Bruno Sánchez Gil'],
  ['2024050128', 'Camila Torres Ruiz'], ['2024050133', 'Diego Morales Paz'], ['2024050147', 'Elena Vargas Soto'],
].map(([boleta, alumno]) => ({ boleta, alumno }));

let siguienteId = 100;

const anuncios = {
  1: [
    { id: 1, titulo: 'Examen del segundo parcial', contenido: 'El examen será el próximo lunes en el laboratorio 3.\nTemas: modelo E-R, normalización y consultas con JOIN.', fecha: dia(-1, 9, 15), autor: 'Ana Cruz Méndez' },
    { id: 2, titulo: 'Bienvenidos al curso', contenido: 'Aquí publicaré avisos, tareas y el enlace a las clases en línea.', fecha: dia(-20, 8, 0), autor: 'Ana Cruz Méndez' },
  ],
  2: [{ id: 3, titulo: 'Revisión del prototipo', contenido: 'Traigan su prototipo de Figma para revisarlo en equipo.', fecha: dia(-2, 12, 0), autor: 'Luis Herrera Ramos' }],
  3: [], 4: [], 5: [], 6: [], 7: [], 8: [],
};

const tareas = {
  1: [
    { id: 11, titulo: 'Práctica 5: consultas con JOIN', descripcion: 'Resuelve las 10 consultas del documento usando la base de la panadería. Sube tu archivo .sql a Drive y pega el enlace.', publicada: dia(-6, 8), fecha_limite: dia(3), puntos_maximos: 10 },
    { id: 12, titulo: 'Diagrama E-R del proyecto', descripcion: 'Entrega el diagrama entidad-relación de tu proyecto final en PDF.', publicada: dia(-14, 8), fecha_limite: dia(-7), puntos_maximos: 10 },
    { id: 13, titulo: 'Cuestionario de normalización', descripcion: 'Responde las preguntas sobre 1FN, 2FN y 3FN.', publicada: dia(-10, 8), fecha_limite: dia(-3), puntos_maximos: 10 },
  ],
  2: [{ id: 21, titulo: 'Personas y escenarios', descripcion: 'Describe tres personas usuarias con sus escenarios de uso.', publicada: dia(-4, 8), fecha_limite: dia(5), puntos_maximos: 10 }],
  3: [], 4: [], 5: [], 6: [], 7: [], 8: [],
};

// entregas[idTarea][boleta] = { ... }
const entregas = {
  12: {
    '2024050172': { contenido: 'Adjunto el diagrama.', archivo_url: 'https://drive.google.com/', fecha: dia(-8, 21, 40), estado: 'REVISADA', calificacion: 9, comentario: 'Muy bien, revisa la cardinalidad de Pedido–Producto.' },
    '2024050101': { contenido: 'Diagrama del equipo 2.', archivo_url: null, fecha: dia(-7, 18, 5), estado: 'ENTREGADA', calificacion: null, comentario: null },
  },
  13: {
    '2024050172': { contenido: '1FN: valores atómicos…', archivo_url: null, fecha: dia(-4, 20, 0), estado: 'ENTREGADA', calificacion: null, comentario: null },
  },
  11: {
    '2024050115': { contenido: 'Mis consultas están en el enlace.', archivo_url: 'https://drive.google.com/', fecha: dia(-1, 22, 10), estado: 'ENTREGADA', calificacion: null, comentario: null },
  },
};

const sesionesClase = {}; // idCurso -> sesión en vivo
const asistencias = {}; // idSesion -> { boleta: {estado, entrada, salida} }

const KARDEX = [
  ['2025-1', 'Primer semestre', 'ALG-101', 'Álgebra', 8, 9], ['2025-1', 'Primer semestre', 'CMP-101', 'Computación Básica I', 6, 10],
  ['2025-1', 'Primer semestre', 'ING-101', 'Inglés I', 4, 8.5], ['2025-2', 'Segundo semestre', 'GEO-201', 'Geometría y Trigonometría', 8, 7.5],
  ['2025-2', 'Segundo semestre', 'CMP-201', 'Computación Básica II', 6, 9.5], ['2025-2', 'Segundo semestre', 'QUI-201', 'Química I', 8, 5, 7],
  ['2026-1', 'Tercer semestre', 'GEA-301', 'Geometría Analítica', 8, 8], ['2026-1', 'Tercer semestre', 'PRG-301', 'Programación', 8, 9.5],
  ['2026-1', 'Tercer semestre', 'FIS-301', 'Física I', 8, 8.5],
];

// ---------- "Servidor" ----------

const espera = () => new Promise((r) => setTimeout(r, 180));

class ErrorDemo extends Error {
  constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; }
}
const fallar = (codigo, mensaje) => { throw new ErrorDemo(codigo, mensaje); };

const rutas = [
  ['GET', /^yo$/, (s) => (s.rol === 'alumno'
    ? { rol: 'alumno', datos: { boleta: ALUMNO.id, nombre: ALUMNO.nombre, correo: 'alumno.demo@alumno.ipn.mx', estatus: 'Regular', grupo: '5IV11', id_foto: null } }
    : { rol: 'profesor', datos: { num_empleado: PROFESOR.id, nombre: PROFESOR.nombre, usuario: PROFESOR.usuario, id_foto: null } })],

  ['GET', /^cursos$/, (s) => ({ cursos: structuredClone(s.rol === 'alumno' ? CURSOS : CURSOS_PROFESOR) })],

  ['GET', /^kardex$/, (s) => {
    if (s.rol !== 'alumno') fallar(403, 'No tienes permiso para esta acción');
    const materias = [
      ...KARDEX.map(([periodo, semestre, codigo, materia, creditos, final, extra]) => ({ periodo, semestre, codigo, materia, creditos, final, extraordinario: extra ?? null })),
      ...CURSOS.map((c) => ({ periodo: c.periodo, semestre: 'Quinto semestre', codigo: c.codigo, materia: c.materia, creditos: c.creditos, final: null, extraordinario: null })),
    ];
    let suma = 0; let calificadas = 0; let cursados = 0; let aprobados = 0;
    for (const m of materias) {
      cursados += m.creditos;
      if (m.final == null) { m.situacion = 'EN CURSO'; continue; }
      const def = m.final < 6 && m.extraordinario != null ? m.extraordinario : m.final;
      m.situacion = def >= 6 ? 'APROBADA' : 'REPROBADA';
      suma += def; calificadas++;
      if (def >= 6) aprobados += m.creditos;
    }
    return { resumen: { promedio: Math.round((suma / calificadas) * 100) / 100, materias_calificadas: calificadas, creditos_cursados: cursados, creditos_aprobados: aprobados }, materias };
  }],

  ['GET', /^cursos\/(\d+)\/anuncios$/, (s, [id]) => ({ anuncios: structuredClone(anuncios[id] ?? []) })],
  ['POST', /^cursos\/(\d+)\/anuncios$/, (s, [id], d) => {
    soloProfesor(s);
    validar(d, ['titulo', 'contenido']);
    (anuncios[id] ??= []).unshift({ id: ++siguienteId, titulo: d.titulo.trim(), contenido: d.contenido.trim(), fecha: formato(new Date()), autor: PROFESOR.nombre });
    return { id: siguienteId, mensaje: 'Anuncio publicado' };
  }],
  ['PUT', /^anuncios\/(\d+)$/, (s, [id], d) => {
    soloProfesor(s);
    validar(d, ['titulo', 'contenido']);
    const a = Object.values(anuncios).flat().find((x) => String(x.id) === id) ?? fallar(404, 'Anuncio no encontrado');
    Object.assign(a, { titulo: d.titulo.trim(), contenido: d.contenido.trim() });
    return { mensaje: 'Anuncio actualizado' };
  }],
  ['DELETE', /^anuncios\/(\d+)$/, (s, [id]) => {
    soloProfesor(s);
    for (const lista of Object.values(anuncios)) {
      const i = lista.findIndex((x) => String(x.id) === id);
      if (i >= 0) { lista.splice(i, 1); return { mensaje: 'Anuncio eliminado' }; }
    }
    return fallar(404, 'Anuncio no encontrado');
  }],

  ['GET', /^cursos\/(\d+)\/tareas$/, (s, [id]) => ({
    tareas: (tareas[id] ?? []).map((t) => {
      if (s.rol === 'alumno') {
        const e = entregas[t.id]?.[ALUMNO.id];
        return { ...t, estado_entrega: e?.estado ?? null, entregada: e?.fecha ?? null, calificacion: e?.calificacion ?? null, comentario: e?.comentario ?? null };
      }
      return { ...t, entregas: Object.keys(entregas[t.id] ?? {}).length };
    }),
  })],
  ['POST', /^cursos\/(\d+)\/tareas$/, (s, [id], d) => {
    soloProfesor(s);
    validar(d, ['titulo']);
    (tareas[id] ??= []).push({ id: ++siguienteId, titulo: d.titulo.trim(), descripcion: d.descripcion ?? null, publicada: formato(new Date()), fecha_limite: d.fecha_entrega ? `${d.fecha_entrega}:00` : null, puntos_maximos: Number(d.puntos_maximos ?? 10) });
    return { id: siguienteId, mensaje: 'Tarea publicada' };
  }],
  ['POST', /^tareas\/(\d+)\/entrega$/, (s, [id], d) => {
    if (s.rol !== 'alumno') fallar(403, 'No tienes permiso para esta acción');
    validar(d, ['contenido']);
    if (d.archivo_url && !String(d.archivo_url).startsWith('https://')) fallar(422, "El campo 'archivo_url' debe ser un enlace https://");
    const previa = entregas[id]?.[ALUMNO.id];
    if (previa?.estado === 'REVISADA') fallar(409, 'Esta tarea ya fue calificada y no se puede modificar');
    (entregas[id] ??= {})[ALUMNO.id] = { contenido: d.contenido, archivo_url: d.archivo_url ?? null, fecha: formato(new Date()), estado: 'ENTREGADA', calificacion: null, comentario: null };
    return { mensaje: previa ? 'Entrega actualizada' : 'Tarea entregada' };
  }],
  ['GET', /^tareas\/(\d+)\/entregas$/, (s, [id]) => {
    soloProfesor(s);
    return {
      entregas: Object.entries(entregas[id] ?? {}).map(([boleta, e]) => ({
        id: `${id}-${boleta}`, boleta, alumno: ALUMNOS.find((a) => a.boleta === boleta)?.alumno ?? boleta, ...e,
      })).sort((a, b) => a.alumno.localeCompare(b.alumno)),
    };
  }],
  ['POST', /^entregas\/(\d+)-(\d+)\/calificar$/, (s, [idTarea, boleta], d) => {
    soloProfesor(s);
    const e = entregas[idTarea]?.[boleta] ?? fallar(404, 'Entrega no encontrada');
    const max = Object.values(tareas).flat().find((t) => String(t.id) === idTarea)?.puntos_maximos ?? 10;
    const n = Number(d.calificacion);
    if (d.calificacion === '' || Number.isNaN(n) || n < 0 || n > max) fallar(422, `El campo 'calificacion' debe estar entre 0 y ${max}`);
    Object.assign(e, { calificacion: n, comentario: d.comentario || null, estado: 'REVISADA' });
    return { mensaje: 'Entrega calificada' };
  }],

  ['GET', /^cursos\/(\d+)\/videollamada$/, (s, [id]) => ({ sesion: sesionesClase[id] ?? null })],
  ['POST', /^cursos\/(\d+)\/videollamada\/iniciar$/, (s, [id]) => {
    soloProfesor(s);
    if (sesionesClase[id]) return { sesion: sesionesClase[id], mensaje: 'La clase ya estaba en vivo', demo: true };
    const idSesion = ++siguienteId;
    sesionesClase[id] = { id: idSesion, canal: `pae-curso-${id}-demo`, estado: 'EN_VIVO', inicio: formato(new Date()), fin: null };
    asistencias[idSesion] = {};
    return { sesion: sesionesClase[id], mensaje: 'Clase iniciada', demo: true };
  }],
  ['POST', /^cursos\/(\d+)\/videollamada\/finalizar$/, (s, [id]) => {
    soloProfesor(s);
    const ses = sesionesClase[id] ?? fallar(409, 'No hay una clase en vivo');
    delete sesionesClase[id];
    for (const a of Object.values(asistencias[ses.id] ?? {})) a.salida ??= formato(new Date());
    return { mensaje: 'Clase finalizada', id_sesion: ses.id };
  }],
  ['POST', /^cursos\/(\d+)\/videollamada\/unirse$/, (s, [id]) => {
    if (s.rol !== 'alumno') fallar(403, 'No tienes permiso para esta acción');
    const ses = sesionesClase[id] ?? fallar(409, 'El profesor todavía no ha iniciado la clase');
    const lista = (asistencias[ses.id] ??= {});
    lista[ALUMNO.id] ??= { estado: 'PRESENTE', entrada: formato(new Date()), salida: null };
    lista[ALUMNO.id].salida = null;
    return { canal: ses.canal, asistencia: lista[ALUMNO.id].estado, demo: true };
  }],
  ['POST', /^cursos\/(\d+)\/videollamada\/salir$/, () => ({ mensaje: 'Salida registrada' })],
  ['GET', /^sesiones\/(\d+)\/asistencia$/, (s, [id]) => {
    soloProfesor(s);
    const lista = asistencias[id] ?? {};
    // Para la demostración, algunos alumnos "entraron" a la clase.
    const ejemplo = { '2024050101': 'PRESENTE', '2024050128': 'RETARDO', '2024050147': 'PRESENTE' };
    return {
      asistencia: ALUMNOS.map(({ boleta, alumno }) => {
        const a = lista[boleta] ?? (ejemplo[boleta] ? { estado: ejemplo[boleta], entrada: formato(new Date()), salida: null } : null);
        return { boleta, alumno, estado: a?.estado ?? 'AUSENTE', entrada: a?.entrada ?? null, salida: a?.salida ?? null };
      }),
    };
  }],

  ['POST', /^yo\/foto$/, () => fallar(400, 'En el modo demostración no se pueden subir fotos.')],
  ['GET', /^archivos\/(\d+)$/, () => fallar(404, 'Archivo no encontrado')],
];

function soloProfesor(s) {
  if (s.rol !== 'profesor') fallar(403, 'No tienes permiso para esta acción');
}

function validar(d, campos) {
  for (const c of campos) {
    if (!d || typeof d[c] !== 'string' || !d[c].trim()) fallar(422, `Falta el campo '${c}'`);
  }
}

export async function pedir(metodo, ruta, cuerpo, sesion) {
  await espera();
  for (const [m, patron, fn] of rutas) {
    const coincide = ruta.match(patron);
    if (coincide && m === metodo) return fn(sesion, coincide.slice(1), cuerpo);
  }
  return fallar(404, 'Ruta no encontrada');
}
