import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { users } from '#lib/server/schema.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const u = locals.user!;
	return {
		profile: {
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
		await db
			.update(users)
			.set({
				name,
				feedbackDefault: form.get('feedbackDefault') === 'on',
				showGps: form.get('showGps') === 'on'
			})
			.where(eq(users.id, locals.user!.id));
		return { saved: true };
	}
};
