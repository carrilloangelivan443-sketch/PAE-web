// Interpreta el texto de horario de cada curso (campo Horario_Dias), por ejemplo:
//   "Lun 07:00-08:30, Mié 07:00-08:30"   o   "Lunes y Miércoles 7:00 - 8:30"
// Si el texto no se entiende, el curso se muestra solo en la lista, no en la cuadrícula.

const DIAS = [
  [1, /^lu/], [2, /^ma/], [3, /^mi/], [4, /^ju/], [5, /^vi/], [6, /^sa|^sá/], [0, /^do/],
];
export const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function numeroDia(palabra) {
  const p = palabra.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [n, re] of DIAS) if (re.test(p)) return n;
  return null;
}

const aMinutos = (h, m) => Number(h) * 60 + Number(m);

/** Devuelve [{ dia, inicio, fin }] con inicio/fin en minutos desde medianoche. */
export function interpretar(texto) {
  if (!texto) return [];
  const bloques = [];
  let diasPendientes = [];
  const fichas = String(texto).match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]+|\d{1,2}:\d{2}\s*(?:-|–|a)\s*\d{1,2}:\d{2}/g) ?? [];
  for (const ficha of fichas) {
    const rango = ficha.match(/(\d{1,2}):(\d{2})\s*(?:-|–|a)\s*(\d{1,2}):(\d{2})/);
    if (rango) {
      const inicio = aMinutos(rango[1], rango[2]);
      const fin = aMinutos(rango[3], rango[4]);
      if (fin > inicio) for (const dia of diasPendientes) bloques.push({ dia, inicio, fin });
      diasPendientes = [];
      continue;
    }
    const n = numeroDia(ficha);
    if (n !== null) diasPendientes.push(n);
  }
  return bloques;
}

export const textoHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Clases de un día (por defecto hoy), ordenadas por hora. */
export function clasesDelDia(cursos, dia = new Date().getDay()) {
  return cursos
    .flatMap((c) => interpretar(c.horario).filter((b) => b.dia === dia).map((b) => ({ ...b, curso: c })))
    .sort((a, b) => a.inicio - b.inicio);
}
