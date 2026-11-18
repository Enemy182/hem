// Service worker de HEM: la app funciona sin internet después de la primera
// visita y se actualiza sola cuando hay versión nueva publicada.
//
// El script de compilación (build_todo.ps1) reemplaza estas dos líneas:
const VERSION = '2.2.0+13-20261118161409';
const PRECACHE = [
  '.nojekyll',
  'favicon.png',
  'flutter.js',
  'flutter_bootstrap.js',
  'index.html',
  'main.dart.js',
  'manifest.json',
  'privacidad.html',
  'assets/AssetManifest.bin',
  'assets/AssetManifest.bin.json',
  'assets/FontManifest.json',
  'assets/NOTICES',
  'assets/assets/branding/app_logo.png',
  'assets/assets/frases/estoicas.json',
  'assets/fonts/MaterialIcons-Regular.otf',
  'assets/fonts/fallback/Roboto-Regular.ttf',
  'assets/packages/cupertino_icons/assets/CupertinoIcons.ttf',
  'assets/packages/flutter_local_notifications_web/web/notifications_service_worker.js',
  'assets/shaders/ink_sparkle.frag',
  'assets/shaders/stretch_effect.frag',
  'canvaskit/canvaskit.js',
  'canvaskit/canvaskit.js.symbols',
  'canvaskit/canvaskit.wasm',
  'canvaskit/wimp.js',
  'canvaskit/wimp.js.symbols',
  'canvaskit/wimp.wasm',
  'download/index.html',
  'icons/apple-touch-icon.png',
  'icons/Icon-192.png',
  'icons/Icon-512.png',
  'icons/Icon-maskable-192.png',
  'icons/Icon-maskable-512.png',
  'splash/img/branding-1x.png',
  'splash/img/branding-2x.png',
  'splash/img/branding-3x.png',
  'splash/img/branding-4x.png',
  'splash/img/branding-dark-1x.png',
  'splash/img/branding-dark-2x.png',
  'splash/img/branding-dark-3x.png',
  'splash/img/branding-dark-4x.png',
  'splash/img/dark-1x.png',
  'splash/img/dark-2x.png',
  'splash/img/dark-3x.png',
  'splash/img/dark-4x.png',
  'splash/img/light-1x.png',
  'splash/img/light-2x.png',
  'splash/img/light-3x.png',
  'splash/img/light-4x.png'
];

const CACHE = 'hem-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['./', ...PRECACHE]))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('hem-') && k !== CACHE)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La consulta de la hora oficial nunca sale de la caché.
  if (url.pathname.endsWith('version.json')) return;
  // Los APK (pesados) y su info van siempre directo, sin caché ni límite.
  if (/\.apk$|apk\.json$/.test(url.pathname)) return;

  // Tipografías de Google: se guardan la primera vez y se reusan.
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      caches.open(CACHE).then((c) => c.match(req).then((hit) => hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') c.put(req, res.clone());
          return res;
        }))),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Primero internet (para tener siempre la última versión); si no hay o
  // tarda, lo guardado.
  event.respondWith(
    caches.open(CACHE).then((c) =>
      Promise.race([fetch(req), timeout(4000)])
        .then((res) => {
          if (res.ok) c.put(req, res.clone());
          return res;
        })
        .catch(() => c.match(req, { ignoreSearch: true })
          .then((hit) => hit || (req.mode === 'navigate' ? c.match('./') : undefined))
          .then((hit) => hit || Response.error())),
    ),
  );
});
