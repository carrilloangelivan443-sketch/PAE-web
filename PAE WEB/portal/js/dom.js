// Utilidades para construir la interfaz SIN innerHTML.
// Todo el texto que viene del servidor se agrega como nodo de texto,
// así nunca se interpreta como HTML (esto evita ataques XSS).

export function h(etiqueta, props = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props ?? {})) {
    if (valor == null || valor === false) continue;
    if (clave === 'class') el.className = valor;
    else if (clave === 'dataset') Object.assign(el.dataset, valor);
    else if (clave === 'style') Object.assign(el.style, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2), valor);
    else if (clave === 'href') el.setAttribute('href', enlaceSeguro(valor));
    else if (['value', 'checked', 'disabled', 'selected', 'required', 'multiple', 'open'].includes(clave)) el[clave] = valor;
    else el.setAttribute(clave, valor === true ? '' : String(valor));
  }
  agregar(el, hijos);
  return el;
}

export function agregar(el, hijos) {
  for (const hijo of [hijos].flat(Infinity)) {
    if (hijo == null || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

export function reemplazar(el, ...hijos) {
  el.replaceChildren();
  return agregar(el, hijos);
}

/** Solo permite enlaces internos (#, /, relativos) o https://. Bloquea javascript:, data:, etc. */
export function enlaceSeguro(url) {
  const texto = String(url ?? '').trim();
  if (texto.startsWith('#') || texto.startsWith('/') || texto.startsWith('./')) return texto;
  try {
    const u = new URL(texto, location.href);
    if (u.protocol === 'https:' || (u.protocol === 'http:' && u.origin === location.origin)) return u.href;
  } catch { /* enlace inválido */ }
  return '#';
}

export function esHttps(url) {
  try { return new URL(url).protocol === 'https:'; } catch { return false; }
}

// Íconos de línea (24×24). Son constantes del código, no datos del servidor.
const TRAZOS = {
  inicio: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  clases: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h8M8 11h6',
  calificaciones: 'M4 20V11M10 20V5M16 20v-8M21 20H3',
  horario: 'M3 6h18v15H3zM3 10h18M8 3v4M16 3v4',
  kardex: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8',
  perfil: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  salir: 'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3',
  video: 'M3 6h12v12H3zM15 10l6-4v12l-6-4',
  tarea: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9',
  anuncio: 'M3 10v4h4l8 5V5L7 10zM18 9a4 4 0 010 6',
  menu: 'M3 6h18M3 12h18M3 18h18',
  mas: 'M12 5v14M5 12h14',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  borrar: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3',
  colgar: 'M3 15c5-4.5 13-4.5 18 0l-2.5 3-3.5-1.5V14a10 10 0 00-6 0v2.5L5.5 18z',
  sol: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  luna: 'M20 14.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 10.5z',
  sistema: 'M3 4h18v12H3zM8 20h8M12 16v4',
  atras: 'M15 5l-7 7 7 7',
  personas: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M16 3.5a4 4 0 010 7.5M22 21a7 7 0 00-4.5-6.5',
  enlace: 'M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1',
  reloj: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  lugar: 'M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  cerrar: 'M6 6l12 12M18 6L6 18',
  camara: 'M4 7h4l2-3h4l2 3h4v13H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
  ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  recargar: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  vacio: 'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5',
};

export function icono(nombre, clase = 'icono') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', clase);
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', TRAZOS[nombre] ?? TRAZOS.vacio);
  svg.append(path);
  return svg;
}
