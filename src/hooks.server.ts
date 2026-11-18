import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { SESSION_COOKIE, setSessionCookie, validateSession } from '#lib/server/auth.ts';
import { startJobs } from '#lib/server/jobs.ts';

/** Startet die Erinnerungsmails im Hintergrund. */
export const init: ServerInit = () => {
	if (!building) startJobs();
};

/** Seiten, die ohne Anmeldung erreichbar sind. */
const PUBLIC_PATHS = ['/login', '/registrieren', '/auth/'];

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
