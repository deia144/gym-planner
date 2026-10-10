const CACHE = "gym-planner-v40";
const VCACHE = "gym-videos"; // ثابت: لا يُحذف عند تحديث نسخة التطبيق
// ملفات التطبيق الأساسية. التخزين المسبق متسامح: غياب أي ملف لا يُفشل التثبيت
const APP = ["./", "./index.html", "./manifest.webmanifest", "./icon2.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(APP.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
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

// الصفحة: الشبكة أولًا (فتصل التحديثات تلقائيًا) ثم النسخة المخزَّنة عند انقطاع الإنترنت أو بطئه
async function pageFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const r = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))
    ]);
    if (r && r.ok && r.status === 200) {
      cache.put(req, r.clone());
      cache.put("./index.html", r.clone());
    }
    return r;
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: true }))
      || (await cache.match("./index.html"))
      || (await cache.match("./"))
      || Response.error();
  }
}

// بقية الملفات (أيقونات، خطوط، manifest): من التخزين فورًا، وتُحدَّث في الخلفية
async function assetSWR(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then(r => {
    if (r && (r.type === "opaque" || (r.ok && r.status === 200))) cache.put(req, r.clone());
    return r;
  }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (same && isVideo(url)) { event.respondWith(serveVideo(req)); return; }
  if (req.mode === "navigate") { event.respondWith(pageFirst(req)); return; }
  if (same || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(assetSWR(req));
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return clients.openWindow("./");
  }));
});
