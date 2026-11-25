// Tema claro / oscuro / del sistema. Se guarda en este navegador.
const CLAVE = 'pae.tema';

export function temaGuardado() {
  try { return localStorage.getItem(CLAVE) || 'sistema'; } catch { return 'sistema'; }
}

export function aplicarTema(tema = temaGuardado()) {
  try { localStorage.setItem(CLAVE, tema); } catch { /* nada */ }
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#1f1b1e' : '#6d1f3f');
}

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (temaGuardado() === 'sistema') aplicarTema('sistema');
});
