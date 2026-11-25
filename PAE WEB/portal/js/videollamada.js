// Videollamada en el navegador con el SDK web de Agora (el mismo servicio que usa la app).
// El servidor da el canal y las credenciales; aquí solo se conecta la cámara y el micrófono.
// Cuando alguien apaga su cámara, en su recuadro se muestra su foto de perfil (o sus iniciales).
import { h, icono } from './dom.js';
import { AGORA_SDK } from './config.js';
import * as api from './api.js';
import { accion, aviso, iniciales, mensajeError, modal } from './ui.js';

function cargarSdk() {
  if (window.AgoraRTC) return Promise.resolve(window.AgoraRTC);
  return new Promise((resolver, rechazar) => {
    const s = document.createElement('script');
    s.src = AGORA_SDK;
    s.onload = () => (window.AgoraRTC ? resolver(window.AgoraRTC) : rechazar(new Error('sdk')));
    s.onerror = () => rechazar(new Error('sdk'));
    document.head.append(s);
  });
}

/** Lee las credenciales sin importar cómo las nombre la API. */
function credenciales(r) {
  return {
    appId: r.app_id ?? r.appId ?? r.appid ?? r.agora_app_id ?? null,
    token: r.token ?? r.rtc_token ?? null,
    uid: r.uid ?? null,
    canal: r.canal ?? r.sesion?.canal ?? null,
    uidProfesor: r.uid_profesor ?? null,
    uidPantallaProfesor: r.uid_pantalla_profesor ?? r.uid_pantalla ?? null,
  };
}

// ---------- Foto de perfil propia ----------

let fotoPropia = null; // promesa con la URL de la foto (o null), se pide una sola vez

function urlFotoPropia() {
  if (!fotoPropia) {
    fotoPropia = (async () => {
      try {
        const { datos } = await api.yo();
        if (!datos?.id_foto) return null;
        return URL.createObjectURL(await api.archivo(datos.id_foto));
      } catch {
        return null;
      }
    })();
  }
  return fotoPropia;
}
window.addEventListener('pae:sesion-expirada', () => { fotoPropia = null; });

// Fotos de los participantes, por id de archivo (se pide cada una una sola vez).
const fotos = new Map();
function urlFoto(idFoto) {
  if (!idFoto) return null;
  if (!fotos.has(idFoto)) {
    fotos.set(idFoto, api.archivo(idFoto).then((b) => URL.createObjectURL(b)).catch(() => null));
  }
  return fotos.get(idFoto);
}

/** Quién es cada uid de la clase: { uid: { nombre, rol, id_foto } }, incluyendo su pantalla compartida. */
async function mapaParticipantes(idCurso) {
  const mapa = new Map();
  if (idCurso == null) return mapa;
  try {
    const { participantes } = await api.participantes(idCurso);
    for (const p of participantes ?? []) {
      mapa.set(String(p.uid), p);
      mapa.set(String(1_000_000_000 + (Number(p.uid) % 1_000_000_000)), { ...p, pantalla: true });
    }
  } catch { /* si la API no tiene la ruta, se muestran como "Participante" */ }
  return mapa;
}

/** Círculo con la foto, o con las iniciales mientras carga o si no hay foto. */
function avatar(nombre, urlFoto, generico = false) {
  const circulo = h('div', { class: 'avatar grande' }, generico ? icono('perfil', 'icono icono-avatar') : iniciales(nombre));
  if (urlFoto) {
    Promise.resolve(urlFoto).then((url) => {
      if (url) circulo.replaceWith(h('img', { class: 'avatar grande', src: url, alt: '' }));
    });
  }
  return circulo;
}

/**
 * Abre la ventana de videollamada.
 * @param {object} opciones { titulo, idCurso, respuesta (de iniciar/unirse), esProfesor, demo, alSalir }
 */
export async function abrirVideollamada({ titulo, idCurso, respuesta, esProfesor = false, demo = false, alSalir }) {
  const sesion = api.sesionActual();
  const miNombre = sesion?.usuario?.nombre ?? 'Tú';
  let cliente = null;
  let pistas = [];
  let cerrada = false;
  let vigilancia = null;

  const videos = h('div', { class: 'videos' });
  const nota = h('p', { class: 'nota-llamada oculto' });
  const estado = h('span', { class: 'chico' }, 'Conectando…');
  const botonMic = h('button', { class: 'boton', type: 'button', 'aria-label': 'Silenciar micrófono', title: 'Micrófono', disabled: true }, icono('mic'));
  const botonCam = h('button', { class: 'boton', type: 'button', 'aria-label': 'Apagar cámara', title: 'Cámara', disabled: true }, icono('video'));
  const botonColgar = h('button', { class: 'boton colgar', type: 'button', 'aria-label': 'Salir de la clase', title: 'Salir' }, icono('colgar'));

  const ventana = h('div', { class: 'llamada', role: 'dialog', 'aria-label': `Videollamada: ${titulo}` },
    h('div', { class: 'barra-llamada' }, h('div', {}, h('strong', {}, titulo), h('br'), estado)),
    h('div', { class: 'zona-videos' }, videos, nota),
    h('div', { class: 'controles' }, botonMic, botonCam, botonColgar));
  document.body.append(ventana);

  const salirAlCerrar = () => alSalir?.({ alCerrarPestana: true });
  window.addEventListener('pagehide', salirAlCerrar);

  async function salir() {
    if (cerrada) return;
    cerrada = true;
    clearInterval(vigilancia);
    window.removeEventListener('pagehide', salirAlCerrar);
    for (const p of pistas) { try { p.stop(); p.close(); } catch { /* nada */ } }
    try { await cliente?.leave(); } catch { /* nada */ }
    ventana.remove();
    alSalir?.({ alCerrarPestana: false });
  }
  /** La clase terminó (el profesor la finalizó): se cierra la llamada para todos. */
  const terminar = (texto = 'El profesor finalizó la clase.') => {
    if (cerrada) return;
    aviso(texto);
    salir();
  };

  // El profesor elige si solo sale o si termina la clase para todos.
  botonColgar.addEventListener('click', () => {
    if (!esProfesor) { salir(); return; }
    const soloSalir = h('button', { class: 'boton', type: 'button' }, 'Solo salir');
    const finalizar = h('button', { class: 'boton peligro lleno', type: 'button' }, 'Finalizar clase para todos');
    const cerrar = modal('Salir de la clase', h('div', { class: 'formulario' },
      h('p', {}, 'Si solo sales, la clase sigue abierta y puedes volver a entrar, pero ningún alumno nuevo podrá unirse mientras no estés. Si la finalizas, todos salen de la llamada.'),
      h('div', { class: 'fila-botones derecha' }, soloSalir, finalizar)));
    soloSalir.addEventListener('click', () => { cerrar(); salir(); });
    finalizar.addEventListener('click', async () => {
      try {
        await accion(finalizar, () => api.finalizarClase(idCurso), 'Clase finalizada');
        cerrar();
        salir();
      } catch { /* aviso mostrado */ }
    });
  });

  // Alumnos: cada 20 s se revisa si la clase sigue en vivo; si el profesor la finalizó, se sale solo.
  if (!esProfesor && idCurso != null) {
    const canalInicial = respuesta?.canal ?? respuesta?.sesion?.canal ?? null;
    vigilancia = setInterval(async () => {
      try {
        const { sesion: s } = await api.videollamada(idCurso);
        if (!s || s.estado !== 'EN_VIVO' || (canalInicial && s.canal !== canalInicial)) terminar();
      } catch { /* sin conexión: se vuelve a revisar en 20 s */ }
    }, 20000);
  }

  const mostrarNota = (...textos) => {
    nota.replaceChildren(...textos.flatMap((t, i) => (i ? [h('br'), t] : [t])));
    nota.classList.remove('oculto');
  };

  /** Recuadro de un participante: video encima y, debajo, su foto para cuando apague la cámara. */
  function cajaVideo(id, nombre, urlFoto, generico = false) {
    let caja = videos.querySelector(`[data-id="${id}"]`);
    if (caja) return caja;
    caja = h('div', { class: 'video camara-apagada', dataset: { id } },
      h('div', { class: 'lienzo' }),
      h('div', { class: 'sin-video' }, avatar(nombre, urlFoto, generico)),
      h('span', { class: 'nombre-video' }, nombre));
    if (id === 'local') videos.prepend(caja); else videos.append(caja);
    return caja;
  }

  const propia = cajaVideo('local', `${miNombre} (tú)`, urlFotoPropia());

  if (demo) {
    estado.textContent = 'Modo demostración';
    botonCam.disabled = false;
    botonCam.classList.add('apagado');
    botonCam.addEventListener('click', () => aviso('En el modo demostración no se usa la cámara.'));
    cajaVideo('demo-1', 'Andrea López Díaz');
    cajaVideo('demo-2', 'Bruno Sánchez Gil');
    mostrarNota('Modo demostración: así se ven los participantes con la cámara apagada.',
      'Con el servidor real, aquí aparece el video de cada uno y la asistencia se registra al entrar.');
    return;
  }

  const c = credenciales(respuesta);
  if (!c.appId || !c.canal) {
    estado.textContent = 'No se pudo conectar';
    mostrarNota('La API no envió las credenciales de Agora (app_id, canal, token, uid).');
    return;
  }

  const quienes = await mapaParticipantes(idCurso);
  if (cerrada) return;

  // Recuadro de un participante remoto, con su nombre y foto si la API los da.
  const cajaRemota = (uid) => {
    const p = quienes.get(String(uid));
    if (p?.pantalla) return cajaVideo(`remoto-${uid}`, `Pantalla de ${p.nombre}`, null, true);
    if (p) return cajaVideo(`remoto-${uid}`, p.rol === 'profesor' ? `${p.nombre} (profesor)` : p.nombre, urlFoto(p.id_foto));
    if (c.uidPantallaProfesor != null && String(uid) === String(c.uidPantallaProfesor)) return cajaVideo(`remoto-${uid}`, 'Pantalla del profesor', null, true);
    if (c.uidProfesor != null && String(uid) === String(c.uidProfesor)) return cajaVideo(`remoto-${uid}`, 'Profesor');
    return cajaVideo(`remoto-${uid}`, 'Participante', null, true);
  };

  let AgoraRTC;
  try {
    AgoraRTC = await cargarSdk();
  } catch {
    estado.textContent = 'Falta el SDK de video';
    mostrarNota('No se encontró el archivo del SDK web de Agora en la carpeta vendor/.');
    return;
  }

  try {
    AgoraRTC.setLogLevel?.(3);
    cliente = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    // Alguien entra (aunque llegue con la cámara apagada): se muestra su recuadro con avatar.
    cliente.on('user-joined', (usuario) => cajaRemota(usuario.uid));
    cliente.on('user-published', async (usuario, tipo) => {
      await cliente.subscribe(usuario, tipo);
      if (tipo === 'video') {
        const caja = cajaRemota(usuario.uid);
        usuario.videoTrack.play(caja.querySelector('.lienzo'));
        caja.classList.remove('camara-apagada');
      }
      if (tipo === 'audio') usuario.audioTrack.play();
    });
    // Apagó la cámara: se conserva el recuadro y se muestra su avatar.
    cliente.on('user-unpublished', (usuario, tipo) => {
      if (tipo === 'video') videos.querySelector(`[data-id="remoto-${usuario.uid}"]`)?.classList.add('camara-apagada');
    });
    cliente.on('user-left', (usuario) => videos.querySelector(`[data-id="remoto-${usuario.uid}"]`)?.remove());
    // Al finalizar la clase, el servidor cierra el canal en Agora y saca a todos al instante.
    cliente.on('connection-state-change', (actual, _anterior, razon) => {
      if (actual === 'DISCONNECTED' && ['UID_BANNED', 'CHANNEL_BANNED', 'IP_BANNED'].includes(razon)) terminar();
    });

    await cliente.join(c.appId, c.canal, c.token || null, c.uid ?? null);
    estado.textContent = 'En la clase';
    if (cerrada) { await cliente.leave(); return; }

    // Micrófono y cámara por separado: si no hay cámara, igual se entra con audio y avatar.
    const [mic, cam] = await Promise.all([
      AgoraRTC.createMicrophoneAudioTrack().catch(() => null),
      AgoraRTC.createCameraVideoTrack().catch(() => null),
    ]);
    pistas = [mic, cam].filter(Boolean);
    if (pistas.length) await cliente.publish(pistas);

    if (mic) alternar(botonMic, 'Micrófono', (activo) => mic.setEnabled(activo));
    else aviso('No se pudo usar el micrófono. Revisa los permisos del navegador.', 'error');

    if (cam) {
      cam.play(propia.querySelector('.lienzo'), { mirror: true });
      propia.classList.remove('camara-apagada');
      alternar(botonCam, 'Cámara', async (activo) => {
        // Se oculta el video antes de apagar para no dejar la última imagen congelada.
        propia.classList.toggle('camara-apagada', !activo);
        await cam.setEnabled(activo);
      });
    } else {
      botonCam.classList.add('apagado');
      aviso('No se pudo usar la cámara. Los demás verán tu foto de perfil.', 'error');
    }
  } catch (error) {
    estado.textContent = 'No se pudo conectar';
    mostrarNota(`Error al conectar: ${mensajeError(error)}`);
  }
}

function alternar(boton, nombre, cambiar) {
  let activo = true;
  boton.disabled = false;
  boton.addEventListener('click', async () => {
    activo = !activo;
    boton.disabled = true;
    try {
      await cambiar(activo);
      boton.classList.toggle('apagado', !activo);
      boton.setAttribute('aria-label', `${activo ? 'Apagar' : 'Encender'} ${nombre.toLowerCase()}`);
    } catch {
      activo = !activo;
    } finally {
      boton.disabled = false;
    }
  });
}
