/**
 * Push und Installation im Browser: Erkennen, ob Fotocomp als App läuft,
 * auf welchem Gerät, und Push für dieses Gerät ein- oder ausschalten.
 */

export type Platform = 'ios' | 'android' | 'other';

export function platform(): Platform {
	const ua = navigator.userAgent;
	// iPadOS meldet sich als Mac, hat aber Touch
	if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
		return 'ios';
	if (/Android/.test(ua)) return 'android';
	return 'other';
}

/** Läuft Fotocomp als installierte App (vom Home-Bildschirm)? */
export function isStandalone() {
	return (
		matchMedia('(display-mode: standalone)').matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

export function pushSupported() {
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function deviceName() {
	const p = platform();
	if (p === 'ios') return /iPad/.test(navigator.userAgent) ? 'iPad' : 'iPhone';
	if (p === 'android') return 'Android';
	return 'Computer';
}

export async function currentSubscription() {
	if (!pushSupported()) return null;
	const reg = await navigator.serviceWorker.getRegistration();
	return (await reg?.pushManager.getSubscription()) ?? null;
}

const toKey = (base64: string) => {
	const raw = atob(
		(base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
	);
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function post(body: unknown) {
	const res = await fetch('/api/push', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`Server antwortet mit ${res.status}`);
	return res.json();
}

/**
 * Push einschalten. Muss direkt aus einem Antippen heraus aufgerufen werden:
 * iOS fragt nur dann nach der Erlaubnis.
 */
export async function enablePush(publicKey: string): Promise<'granted' | 'denied' | 'default'> {
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return permission;
	const reg = await navigator.serviceWorker.ready;
	const sub =
		(await reg.pushManager.getSubscription()) ??
		(await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: toKey(publicKey)
		}));
	await post({ action: 'subscribe', subscription: sub.toJSON(), device: deviceName() });
	return 'granted';
}

/** Erlaubnis besteht schon (z.B. nach Neuinstallation)? Dann still neu anmelden. */
export async function refreshPush(publicKey: string) {
	if (!pushSupported() || Notification.permission !== 'granted') return false;
	await enablePush(publicKey);
	return true;
}

export async function disablePush() {
	const sub = await currentSubscription();
	if (!sub) return;
	await post({ action: 'unsubscribe', endpoint: sub.endpoint });
	await sub.unsubscribe();
}

export const testPush = (): Promise<{ reached: number }> => post({ action: 'test' });

// Einmal-Hinweis pro Gerät
const PROMPTED = 'fotocomp-push-prompted';
export function wasPrompted() {
	try {
		return localStorage.getItem(PROMPTED) === '1';
	} catch {
		return true; // kein Speicher: lieber nicht jedes Mal fragen
	}
}
export function markPrompted() {
	try {
		localStorage.setItem(PROMPTED, '1');
	} catch {
		// egal
	}
}
