import { fail } from '@sveltejs/kit';
import { UserError } from '#lib/server/errors.ts';
import { getSettings, setSetting } from '#lib/server/settings.ts';
import { describeSetup, triggerUpdate, updateStatus } from '#lib/server/updater.ts';
import { UPDATE_POLICIES, type UpdatePolicy } from '#lib/server/version.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const update = await updateStatus();
	return { settings: await getSettings(), update, setupText: describeSetup(update.setup) };
};

export const actions: Actions = {
	general: async ({ request }) => {
		const form = await request.formData();
		await setSetting('registration', form.get('registration') === 'invite' ? 'invite' : 'open');
		await setSetting('themeCreation', form.get('themeCreation') === 'all' ? 'all' : 'admins');
		return { saved: 'general' };
	},

	policy: async ({ request }) => {
		const policy = String((await request.formData()).get('updatePolicy')) as UpdatePolicy;
		if (!UPDATE_POLICIES.includes(policy)) return fail(400);
		await setSetting('updatePolicy', policy);
		return { saved: 'policy' };
	},

	update: async () => {
		try {
			return { update: await triggerUpdate() };
		} catch (e) {
			if (e instanceof UserError) return fail(e.status, { updateError: e.message });
			throw e;
		}
	}
};
