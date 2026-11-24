import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { SESSION_COOKIE, setSessionCookie, validateSession } from '#lib/server/auth.ts';
import { config, placeholderSettings } from '#lib/server/config.ts';
import { closeExifTool } from '#lib/server/convert.ts';
import { closeDb } from '#lib/server/db.ts';
import { startJobs, stopJobs } from '#lib/server/jobs.ts';
import { checkMailServer } from '#lib/server/mail.ts';
import { startAutoUpdate, stopAutoUpdate } from '#lib/server/updater.ts';

/** Startet die Erinnerungsmails im Hintergrund. */
export const init: ServerInit = () => {
	if (building) return;
	console.log(`Fotocomp ${config.version} gestartet.`);
	const placeholders = placeholderSettings();
	if (placeholders.length) {
		console.warn(`In der .env stehen noch Platzhalter der Vorlage: ${placeholders.join(', ')}`);
	}
	startJobs();
	startAutoUpdate();
	void checkMailServer();
	// Sauber herunterfahren (z.B. bei einem Update durch Watchtower)
	process.once('sveltekit:shutdown', async () => {
		stopJobs();
		stopAutoUpdate();
		await Promise.all([closeDb(), closeExifTool()]);
	});
};

/** Seiten, die ohne Anmeldung erreichbar sind. */
const PUBLIC_PATHS = ['/login', '/registrieren', '/auth/', '/api/health'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.theme = event.cookies.get('theme') === 'light' ? 'light' : 'dark';
	event.locals.user = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const session = await validateSession(token);
		if (session) {
			event.locals.user = session.user;
			setSessionCookie(event.cookies, token, session.expiresAt);
		} else {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	const path = event.url.pathname;
	const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p));
	if (!event.locals.user && !isPublic) {
		const target = path === '/' ? '' : `?weiter=${encodeURIComponent(path + event.url.search)}`;
		redirect(303, `/login${target}`);
	}
	if (path.startsWith('/admin') && event.locals.user?.role !== 'admin') {
		redirect(303, '/');
	}

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%fotocomp.theme%', event.locals.theme)
	});
};
