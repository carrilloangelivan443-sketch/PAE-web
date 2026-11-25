import { h } from '../dom.js';
import * as api from '../api.js';
import { conCarga, conTono, encabezado, vacio } from '../ui.js';
import { interpretar, NOMBRES_DIA, textoHora } from '../horario.js';

export async function vistaHorario(cont) {
  const s = api.sesionActual();
  const ruta = s.rol === 'alumno' ? 'clase' : 'curso';
  const cuerpo = h('div');
  cont.append(encabezado('Horario', 'Tus clases de la semana.'), cuerpo);

  await conCarga(cuerpo, async () => {
    const { cursos } = await api.cursos();
    if (!cursos.length) return vacio('No tienes clases registradas en este periodo.', 'horario');

    const bloques = cursos.flatMap((c) => interpretar(c.horario).map((b) => ({ ...b, curso: c })));
    const partes = [];

    if (bloques.length) partes.push(h('section', { class: 'seccion' }, h('div', { class: 'tabla-envoltura' }, cuadricula(bloques, ruta))));

    partes.push(h('section', { class: 'seccion' },
      h('h2', {}, 'Detalle'),
      h('div', { class: 'tabla-envoltura' },
        h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Materia'), h('th', {}, s.rol === 'alumno' ? 'Profesor' : 'Grupo'), h('th', {}, 'Horario'), h('th', {}, 'Aula'))),
          h('tbody', {}, cursos.map((c) => h('tr', {},
            h('td', {}, h('a', { href: `#/${ruta}/${c.id_curso}` }, c.materia)),
            h('td', {}, s.rol === 'alumno' ? c.profesor : c.grupo),
            h('td', {}, c.horario || '—'),
            h('td', {}, c.aula || '—'))))))));
    return partes;
  });
}

function cuadricula(bloques, ruta) {
  const SLOT = 30; // minutos por fila
  const inicio = Math.floor(Math.min(...bloques.map((b) => b.inicio)) / 60) * 60;
  const fin = Math.ceil(Math.max(...bloques.map((b) => b.fin)) / 60) * 60;
  const dias = [1, 2, 3, 4, 5];
  if (bloques.some((b) => b.dia === 6)) dias.push(6);
  if (bloques.some((b) => b.dia === 0)) dias.push(0);
  const hoy = new Date().getDay();
  const filaDe = (min) => 2 + Math.round((min - inicio) / SLOT);

  const rejilla = h('div', { class: 'horario', role: 'table', 'aria-label': 'Horario semanal' });
  rejilla.style.setProperty('--dias', String(dias.length));

  dias.forEach((d, i) => {
    const cab = h('div', { class: `dia-cabeza ${d === hoy ? 'hoy-dia' : ''}`, role: 'columnheader' }, NOMBRES_DIA[d]);
    cab.style.gridColumn = String(i + 2);
    rejilla.append(cab);
  });

  for (let m = inicio; m <= fin; m += 60) {
    const marca = h('div', { class: 'hora-marca' }, textoHora(m));
    marca.style.gridRow = String(filaDe(m));
    const linea = h('div', { class: 'linea' });
    linea.style.gridRow = String(filaDe(m));
    rejilla.append(marca, linea);
  }

  for (const b of bloques) {
    const col = dias.indexOf(b.dia);
    if (col < 0) continue;
    const el = conTono(h('a', { class: 'bloque', href: `#/${ruta}/${b.curso.id_curso}`, role: 'cell' },
      h('strong', {}, b.curso.materia),
      `${textoHora(b.inicio)}–${textoHora(b.fin)}`, b.curso.aula ? ` · ${b.curso.aula}` : '',
      b.curso.grupo && ruta === 'curso' ? ` · ${b.curso.grupo}` : ''), b.curso.materia);
    el.style.gridColumn = String(col + 2);
    el.style.gridRow = `${filaDe(b.inicio)} / ${filaDe(b.fin)}`;
    rejilla.append(el);
  }
  return rejilla;
}
