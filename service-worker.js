self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("smartbay-v1").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/app.html",
        "/index.css",
        "/app.css",
        "/index.js",
        "/manifest.json"
      ]);
    })
  );
});