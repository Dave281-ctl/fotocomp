import { eq } from 'drizzle-orm';
import { NOTIFY_KINDS, resolvePrefs, type NotifyPrefs } from '#lib/notify.ts';
import { db } from '#lib/server/db.ts';
import { pushSubscriptions, users } from '#lib/server/schema.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const u = locals.user!;
	const devices = await db
		.select({ endpoint: pushSubscriptions.endpoint, device: pushSubscriptions.device })
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.userId, u.id));
	return { prefs: resolvePrefs(u.notify, u.emailNotifications), devices };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const prefs = {} as NotifyPrefs;
		for (const { key } of NOTIFY_KINDS) {
			prefs[key] = { push: form.has(`${key}.push`), mail: form.has(`${key}.mail`) };
		}
		await db.update(users).set({ notify: prefs }).where(eq(users.id, locals.user!.id));
		return { saved: true };
	}
};
