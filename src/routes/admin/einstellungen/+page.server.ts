import { getSettings, setSetting } from '#lib/server/settings.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ settings: await getSettings() });

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		await setSetting('registration', form.get('registration') === 'invite' ? 'invite' : 'open');
		await setSetting('themeCreation', form.get('themeCreation') === 'all' ? 'all' : 'admins');
		return { saved: true };
	}
};
