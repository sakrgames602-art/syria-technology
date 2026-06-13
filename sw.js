// sw.js - Service Worker لسوريا تكنولوجي
const CACHE_STATIC = 'static-v3';
const CACHE_DYNAMIC = 'dynamic-v3';
const CACHE_IMAGES = 'images-v3';
const OFFLINE_PAGE = '/offline.html';

// تثبيت الـ Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_STATIC).then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/offline.html',
                'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
            ]);
        })
    );
});

// تفعيل الـ Service Worker وحذف الكاش القديم
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_STATIC && name !== CACHE_DYNAMIC && name !== CACHE_IMAGES)
                    .map(name => caches.delete(name))
            );
        })
    );
});

// استراتيجيات الجلب
self.addEventListener('fetch', event => {
    const request = event.request;

    // طلبات الصور: Cache-First
    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request).then(cached => {
                const fetchPromise = fetch(request).then(networkResponse => {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_IMAGES).then(cache => cache.put(request, clone));
                    return networkResponse;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
    }
    // طلبات API: Network-First مع تخزين احتياطي
    else if (request.url.includes('script.google.com')) {
        event.respondWith(
            fetch(request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_DYNAMIC).then(cache => cache.put(request, clone));
                return response;
            }).catch(() => caches.match(request))
        );
    }
    // باقي الملفات: Cache-First
    else {
        event.respondWith(
            caches.match(request).then(cached => {
                const fetchPromise = fetch(request).then(networkResponse => {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_DYNAMIC).then(cache => cache.put(request, clone));
                    return networkResponse;
                });
                return cached || fetchPromise;
            })
        );
    }
});

// Background Sync لإرسال الطلبات المخزنة عند عودة الاتصال
self.addEventListener('sync', event => {
    if (event.tag === 'send-order') {
        event.waitUntil(sendPendingOrder());
    }
});

async function sendPendingOrder() {
    // يمكن تفعيل إشعار للمستخدم
    self.registration.showNotification('سوريا تكنولوجي', {
        body: 'تم استعادة الاتصال. اضغط لإرسال طلبك السابق عبر واتساب.',
        icon: '/icon.png'
    });
}