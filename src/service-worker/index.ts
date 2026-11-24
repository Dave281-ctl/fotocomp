/**
 * Service Worker: empfängt Push-Mitteilungen und öffnet beim Antippen die
 * passende Seite. Kein Offline-Cache – Fotocomp braucht ohnehin Verbindung.
 */
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (event) => event.waitUntil(sw.clients.claim()));

sw.addEventListener('push', (event) => {
	const data = event.data?.json() ?? {};
	event.waitUntil(
		sw.registration.showNotification(data.title ?? 'Fotocomp', {
			body: data.body ?? '',
			icon: '/icons/icon-192.png',
			badge: '/icons/badge-96.png',
			tag: data.tag,
			data: { url: data.url ?? '/' }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = new URL(event.notification.data?.url ?? '/', sw.location.origin);
	event.waitUntil(
		(async () => {
			const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const open = windows.find((w) => new URL(w.url).origin === url.origin);
			if (open) {
				await open.focus();
				return open.navigate(url.href);
			}
			return sw.clients.openWindow(url.href);
		})()
	);
});
