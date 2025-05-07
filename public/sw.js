// This is the service worker with the combined offline experience (Offline page + Offline copy of pages)

const CACHE = "bison-books-offline"

// Install stage sets up the offline page in the cache and opens a new cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          "/offline",
          "/dashboard",
          "/login",
          "/images/bisonbookslogo-removebg-preview.png",
          "/images/bisonbookslogo.png",
        ]),
      ),
  )
})

// If any fetch fails, it will look for the request in the cache and serve it from there first
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If request was successful, add result to cache
        event.waitUntil(updateCache(event.request, response.clone()))
        return response
      })
      .catch((error) => {
        // If network request failed, try to get it from cache
        return fromCache(event.request)
      }),
  )
})

function fromCache(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then((matching) => {
      if (!matching || matching.status === 404) {
        // If no match in cache, return the offline page for navigate requests
        if (request.destination === "document") {
          return caches.match("/offline")
        }
        return Promise.reject("no-match")
      }
      return matching
    }),
  )
}

function updateCache(request, response) {
  return caches.open(CACHE).then((cache) => {
    // Only cache successful responses
    if (response.status >= 200 && response.status < 300) {
      return cache.put(request, response)
    }
    return Promise.resolve()
  })
}
