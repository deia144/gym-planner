const CACHE = "gym-planner-v37";
const VCACHE = "gym-videos"; // ثابت: لا يُحذف عند تحديث نسخة التطبيق
const APP = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE && k !== VCACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

function isVideo(url) {
  return /\/videos\//.test(url.pathname) || /\.(mp4|webm|m4v|mov)$/i.test(url.pathname);
}

// يخدم الفيديو من التخزين المحلي مع دعم طلبات Range (ضرورية للتشغيل على الآيفون)
async function serveVideo(req) {
  try {
    const cache = await caches.open(VCACHE);
    const hit = await cache.match(req.url);
    if (!hit) return fetch(req);
    const range = req.headers.get("range");
    if (!range) return hit;
    const blob = await hit.blob();
    const size = blob.size;
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = 0, end = size - 1;
    if (m) {
      if (m[1] === "" && m[2] !== "") { start = Math.max(0, size - Number(m[2])); }
      else { start = m[1] === "" ? 0 : Number(m[1]); if (m[2] !== "") end = Math.min(Number(m[2]), size - 1); }
    }
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
    }
    return new Response(blob.slice(start, end + 1), {
      status: 206,
      statusText: "Partial Content",
      headers: {
        "Content-Type": hit.headers.get("Content-Type") || "video/mp4",
        "Content-Range": "bytes " + start + "-" + end + "/" + size,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes"
      }
    });
  } catch (e) {
    return fetch(req);
  }
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && isVideo(url)) {
    event.respondWith(serveVideo(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        if (response.ok && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match("./index.html"))
    )
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return clients.openWindow("./");
  }));
});
