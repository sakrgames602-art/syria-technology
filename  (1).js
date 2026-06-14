// sw.js - Service Worker لسوريا تكنولوجي (الإصدار النهائي)
const CACHE_STATIC = 'syria-static-v4';
const CACHE_DYNAMIC = 'syria-dynamic-v4';
const CACHE_IMAGES = 'syria-images-v4';

// قائمة الملفات الأساسية التي سيتم تخزينها فور التثبيت
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Poppins:wght@400;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// حدث التثبيت: تخزين الملفات الأساسية
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_STATIC).then(cache => {
            console.log('Service Worker: تخزين الملفات الأساسية');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // تفعيل الـ Service Worker فوراً دون انتظار إغلاق التبويب
    self.skipWaiting();
});

// حدث التفعيل: تنظيف الكاش القديم
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_STATIC && name !== CACHE_DYNAMIC && name !== CACHE_IMAGES)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// استراتيجيات الجلب
self.addEventListener('fetch', event => {
    const request = event.request;

    // 1. الصور: Cache First (تقديم المخزن أولاً لسرعة التصفح)
    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                const fetchPromise = fetch(request).then(networkResponse => {
                    // تحديث الكاش بالصورة الجديدة في الخلفية
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_IMAGES).then(cache => cache.put(request, responseClone));
                    return networkResponse;
                }).catch(() => cachedResponse);
                return cachedResponse || fetchPromise;
            })
        );
    }
    // 2. طلبات Google Sheets API: Network First (الحصول على بيانات حديثة)
    else if (request.url.includes('script.google.com')) {
        event.respondWith(
            fetch(request).then(networkResponse => {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_DYNAMIC).then(cache => cache.put(request, responseClone));
                return networkResponse;
            }).catch(() => {
                // إذا فشل الاتصال، استخدم المخزن (إن وجد)
                return caches.match(request);
            })
        );
    }
    // 3. باقي الملفات (HTML, CSS, JS, الخطوط): Cache First مع تحديث في الخلفية
    else {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                const fetchPromise = fetch(request).then(networkResponse => {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_DYNAMIC).then(cache => cache.put(request, responseClone));
                    return networkResponse;
                });
                return cachedResponse || fetchPromise;
            })
        );
    }
});

// Background Sync: إرسال الطلبات المعلقة عند عودة الاتصال
self.addEventListener('sync', event => {
    if (event.tag === 'send-order') {
        event.waitUntil(sendPendingOrder());
    }
});

async function sendPendingOrder() {
    // يمكن إظهار إشعار للمستخدم
    self.registration.showNotification('سوريا تكنولوجي', {
        body: 'تم استعادة الاتصال. اضغط لإرسال طلبك السابق عبر واتساب.',
        icon: '/icon.png',
        vibrate: [200, 100, 200]
    });
}