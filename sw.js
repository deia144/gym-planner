// Gym Planner offline service worker
// Version bumped so Safari downloads the new offline-video logic.
const CACHE = "gym-planner-v12";
const APP = ["./", "./index.html", "./manifest.webmanifest"];
const VIDEOS = [
  'videos/arnold-240.mp4',
  'videos/arnold-360.mp4',
  'videos/barrow-240.mp4',
  'videos/barrow-360.mp4',
  'videos/bench-240.mp4',
  'videos/bench-360.mp4',
  'videos/benchdip-240.mp4',
  'videos/benchdip-360.mp4',
  'videos/bicepsbest-240.mp4',
  'videos/bicepsbest-360.mp4',
  'videos/butterfly-240.mp4',
  'videos/butterfly-360.mp4',
  'videos/cablefly-240.mp4',
  'videos/cablefly-360.mp4',
  'videos/calf-240.mp4',
  'videos/calf-360.mp4',
  'videos/dips-240.mp4',
  'videos/dips-360.mp4',
  'videos/hammer-240.mp4',
  'videos/hammer-360.mp4',
  'videos/incline-240.mp4',
  'videos/incline-360.mp4',
  'videos/lat-pulldown-240.mp4',
  'videos/lat-pulldown-360.mp4',
  'videos/lateral-240.mp4',
  'videos/lateral-360.mp4',
  'videos/legcurl-240.mp4',
  'videos/legcurl-360.mp4',
  'videos/legpress-240.mp4',
  'videos/legpress-360.mp4',
  'videos/lunge-240.mp4',
  'videos/lunge-360.mp4',
  'videos/plank-240.mp4',
  'videos/plank-360.mp4',
  'videos/pullup-240.mp4',
  'videos/pullup-360.mp4',
  'videos/rdl-240.mp4',
  'videos/rdl-360.mp4',
  'videos/reardelt-240.mp4',
  'videos/reardelt-360.mp4',
  'videos/rope-240.mp4',
  'videos/rope-360.mp4',
  'videos/seatedrow-240.mp4',
  'videos/seatedrow-360.mp4',
  'videos/shoulder-240.mp4',
  'videos/shoulder-360.mp4',
  'videos/squat-240.mp4',
  'videos/squat-360.mp4'
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    await Promise.all(APP.map(async path => {
      try {
        const url = new URL(path, self.registration.scope).href;
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (response.ok && response.status === 200) await cache.put(url, response);
      } catch (_) {}
    }));

    // Pre-download the exercise videos while online. Missing files are skipped.
    for (const path of VIDEOS) {
      try {
        const url = new URL(path, self.registration.scope).href;
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (response.ok && response.status === 200) await cache.put(url, response);
      } catch (_) {}
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function withRange(request, fullResponse) {
  const range = request.headers.get("Range");
  if (!range || fullResponse.status !== 200) return fullResponse;

  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return fullResponse;

  const buffer = await fullResponse.arrayBuffer();
  const size = buffer.byteLength;
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;

  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }
  end = Math.min(end, size - 1);

  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const headers = new Headers(fullResponse.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(buffer.slice(start, end + 1), { status: 206, statusText: "Partial Content", headers });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isVideo = url.origin === self.location.origin &&
    url.pathname.includes("/videos/") &&
    url.pathname.toLowerCase().endsWith(".mp4");

  if (isVideo) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(url.href);
      if (cached) return withRange(request, cached);

      try {
        // Fetch without Range to cache the whole video, not a partial segment.
        const response = await fetch(new Request(url.href, { cache: "no-store" }));
        if (response.ok && response.status === 200) {
          await cache.put(url.href, response.clone());
          return withRange(request, response);
        }
        return response;
      } catch (_) {
        return new Response("هذا الفيديو لم يُحمّل للاستخدام دون إنترنت. افتح التطبيق بالإنترنت واتركه حتى ينتهي تحميل الفيديوهات.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && response.status === 200 && !request.headers.has("Range")) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      const fallback = await cache.match(new URL("./index.html", self.registration.scope).href);
      return fallback || new Response("غير متصل بالإنترنت", { status: 503 });
    }
  })());
});
