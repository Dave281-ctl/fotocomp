import { redirect } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import { REPO_URL } from '#lib/server/version.ts';
import type { LayoutServerLoad } from './$types';

/** Seiten, die auch vor Abschluss der Einführung erreichbar sind. */
const BEFORE_ONBOARDING = ['/willkommen', '/abmelden'];

export const load: LayoutServerLoad = ({ locals, url }) => {
	const user = locals.user;
	// Neue Benutzer sehen zuerst die Einführung.
	if (user && !user.onboardedAt && !BEFORE_ONBOARDING.some((p) => url.pathname.startsWith(p))) {
		redirect(303, '/willkommen');
	}
	return {
		user: user ? { id: user.id, name: user.name, role: user.role } : null,
		theme: locals.theme,
		version: config.version,
		repoUrl: REPO_URL
	};
};
