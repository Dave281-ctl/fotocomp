import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { userRetentionOptions } from '#lib/chat-rules.ts';
import { applyUserRetention, retentionFor } from '#lib/server/chat.ts';
import { db } from '#lib/server/db.ts';
import { getPerson } from '#lib/server/person.ts';
import { users } from '#lib/server/schema.ts';
import { now } from '#lib/server/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const u = locals.user!;
	const { adminDays, ownDays } = await retentionFor(u);
	// Eigene Bilanz wie auf «Meine Seite»: nur enthüllte Fotos
	const me = await getPerson(u.id, u.id, now());
	return {
		stats: me?.stats ?? { photos: 0, dayWins: 0, weekWins: 0 },
		cameras: me?.cameras.cameras.slice(0, 3) ?? [],
		highlights: me?.highlights.slice(0, 3).map((p) => ({ id: p.id, badge: p.badge })) ?? [],
		since: u.createdAt,
		chat: { options: userRetentionOptions(adminDays), ownDays },
		isAdmin: u.role === 'admin',
		profile: {
			id: u.id,
			name: u.name,
			email: u.email,
			feedbackDefault: u.feedbackDefault,
			showGps: u.showGps
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (name.length < 2 || name.length > 40) {
			return fail(400, { error: 'Bitte einen Namen mit 2–40 Zeichen.' });
		}
		const user = locals.user!;
		const { adminDays, ownDays } = await retentionFor(user);
		const chosen = Number(form.get('chatRetentionDays'));
		const days = userRetentionOptions(adminDays).includes(chosen as never) ? chosen : adminDays;
		await db
			.update(users)
			.set({
				name,
				feedbackDefault: form.get('feedbackDefault') === 'on',
				showGps: form.get('showGps') === 'on',
				// Gleich wie die Vorgabe: nichts speichern, damit eine spätere Änderung des Admins gilt
				chatRetentionDays: days < adminDays ? days : null
			})
			.where(eq(users.id, user.id));
		if (days < ownDays) await applyUserRetention(user.id, days);
		return { saved: true };
	}
};
