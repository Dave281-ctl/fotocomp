/**
 * Push-Mitteilungen (Web Push). Die Schlüssel (VAPID) erzeugt die App beim
 * ersten Gebrauch selbst und speichert sie in der Datenbank – nichts einzurichten.
 * Der Inhalt ist verschlüsselt; Apple, Google & Co. leiten ihn nur weiter.
 */
import { and, eq, inArray } from 'drizzle-orm';
import webpush from 'web-push';
import { config } from './config.ts';
import { db } from './db.ts';
import { pushSubscriptions, settings } from './schema.ts';

export interface PushMessage {
	title: string;
	body: string;
	/** Seite, die beim Antippen geöffnet wird */
	url: string;
	/** Gleiche Tags ersetzen sich (z.B. mehrere Erinnerungen) */
	tag?: string;
}

const VAPID_KEY = 'vapid';
let vapid: { publicKey: string; privateKey: string } | undefined;

async function getVapid() {
	if (vapid) return vapid;
	const read = async () =>
		(await db.select().from(settings).where(eq(settings.key, VAPID_KEY)))[0]?.value;
	let stored = await read();
	if (!stored) {
		await db
			.insert(settings)
			.values({ key: VAPID_KEY, value: JSON.stringify(webpush.generateVAPIDKeys()) })
			.onConflictDoNothing();
		stored = await read();
	}
	vapid = JSON.parse(stored!) as { publicKey: string; privateKey: string };
	return vapid;
}

/**
 * Kontakt für die Push-Dienste: die Adresse der Plattform (nur https erlaubt),
 * sonst die Absenderadresse der Mails.
 */
function vapidSubject() {
	if (config.origin.startsWith('https://')) return config.origin;
	const mail = config.smtp.from.match(/<([^>]+)>/)?.[1] ?? config.smtp.from;
	return `mailto:${mail.trim()}`;
}

export async function vapidPublicKey() {
	return (await getVapid()).publicKey;
}

export async function saveSubscription(
	userId: number,
	sub: { endpoint: string; keys: { p256dh: string; auth: string } },
	device: string | null
) {
	const values = { userId, endpoint: sub.endpoint, ...sub.keys, device };
	await db
		.insert(pushSubscriptions)
		.values(values)
		.onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
}

export async function removeSubscription(userId: number, endpoint: string) {
	await db
		.delete(pushSubscriptions)
		.where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

/** Welche dieser Personen haben mindestens ein Gerät mit Push? */
export async function usersWithPush(userIds: number[]) {
	if (userIds.length === 0) return new Set<number>();
	const rows = await db
		.selectDistinct({ userId: pushSubscriptions.userId })
		.from(pushSubscriptions)
		.where(inArray(pushSubscriptions.userId, userIds));
	return new Set(rows.map((r) => r.userId));
}

/** Schickt eine Mitteilung an alle Geräte einer Person. Liefert die Anzahl erreichter Geräte. */
export async function sendPush(userId: number, message: PushMessage) {
	const keys = await getVapid();
	const subs = await db
		.select()
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.userId, userId));
	const payload = JSON.stringify({ ...message, url: `${config.origin}${message.url}` });
	let reached = 0;
	for (const sub of subs) {
		try {
			await webpush.sendNotification(
				{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
				payload,
				{
					vapidDetails: { subject: vapidSubject(), ...keys },
					TTL: 12 * 60 * 60,
					urgency: 'normal'
				}
			);
			reached++;
		} catch (e) {
			const status = (e as { statusCode?: number }).statusCode;
			// Gerät hat Push widerrufen oder die App gelöscht
			if (status === 404 || status === 410) {
				await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
			} else {
				console.error(`Push an ${sub.device ?? 'Gerät'} fehlgeschlagen:`, status ?? e);
			}
		}
	}
	return reached;
}
