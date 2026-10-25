// «Помощник» приложения (service worker): сохраняет файлы дашборда в телефоне,
// чтобы он открывался и без интернета, и показывает утреннее уведомление, когда дашборд закрыт.
// Порядок: сначала пробуем взять свежую версию из интернета, нет сети — берём сохранённую.
importScripts('plan.js');   // morningPlan() и inMorningWindow() — общие со страницей

const CACHE = 'dashboard-v2';
const DATA = 'dashboard-data';   // копия данных и дата последнего уведомления (кладёт страница)
const FILES = ['./', './index.html', './plan.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== DATA).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// Браузер иногда будит помощника в фоне (Chrome на Android, дашборд установлен на экран).
// Если уже утро, а уведомления сегодня ещё не было, — показываем план дня.
self.addEventListener('periodicsync', e => {
  if (e.tag === 'morning-plan') e.waitUntil(morningCheck());
});

async function morningCheck() {
  const c = await caches.open(DATA);
  const saved = await c.match('state.json');
  if (!saved) return;
  const state = await saved.json();
  const n = state.settings && state.settings.notify;
  if (!n || !n.on || !inMorningWindow(n.time)) return;
  const d = new Date(), z = x => String(x).padStart(2, '0');
  const today = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  const mark = await c.match('notified');
  if (mark && await mark.text() === today) return;   // сегодня уже было
  await c.put('notified', new Response(today));
  const p = morningPlan(state, today);
  await self.registration.showNotification(p.title, { body: p.body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'morning-plan' });
}

// Нажали на уведомление — открываем дашборд (или переключаемся на уже открытый)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list =>
    list.length ? list[0].focus() : self.clients.openWindow('./')));
});
