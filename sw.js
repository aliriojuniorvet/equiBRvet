const CACHE_NAME = "equibr-shell-v5";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Imagens (fotos dos animais, ícones): cache primeiro - mais rápido, e continuam
// disponíveis offline depois de vistas uma vez. Aceita respostas "opacas" (comuns
// em imagens de outro domínio, como o Storage do Supabase) que antes não eram salvas.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const isImage = event.request.destination === "image" || /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(event.request.url);

  if (isImage) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && (response.status === 200 || response.type === "opaque")) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Network-first para o resto (HTML/JS/manifest): sempre busca a versão mais nova quando
  // online, e só usa a versão salva quando não há conexão de verdade.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
