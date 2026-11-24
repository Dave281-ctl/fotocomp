import { error, json } from '@sveltejs/kit';
import { removeSubscription, saveSubscription, sendPush } from '#lib/server/push.ts';
import type { RequestHandler } from './$types';

/**
 * Push für dieses Gerät verwalten:
 * { action: 'subscribe', subscription, device } · { action: 'unsubscribe', endpoint } · { action: 'test' }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user!;
	const body = await request.json().catch(() => null);
	switch (body?.action) {
		case 'subscribe': {
			const sub = body.subscription;
			if (
				typeof sub?.endpoint !== 'string' ||
				!sub.endpoint.startsWith('https://') ||
				typeof sub.keys?.p256dh !== 'string' ||
				typeof sub.keys?.auth !== 'string'
			) {
				error(400, 'Ungültige Anmeldung');
			}
			const device = typeof body.device === 'string' ? body.device.slice(0, 40) : null;
			await saveSubscription(user.id, sub, device);
			return json({ ok: true });
		}
		case 'unsubscribe':
			if (typeof body.endpoint === 'string') await removeSubscription(user.id, body.endpoint);
			return json({ ok: true });
		case 'test': {
			const reached = await sendPush(user.id, {
				title: 'Fotocomp',
				body: 'So sehen deine Mitteilungen aus. Alles bereit! 📸',
				url: '/profil/mitteilungen',
				tag: 'test'
			});
			return json({ reached });
		}
		default:
			error(400);
	}
};
