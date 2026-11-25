import { subscribe } from '#lib/server/chat-live.ts';
import type { RequestHandler } from './$types';

/**
 * Echtzeit-Verbindung (Server-Sent Events). `?offen=<chatId>`: dieser Chat ist
 * gerade offen – dafür gibt es dann keine Push-Mitteilung.
 * Heartbeat alle 25 s, damit Reverse Proxys die Verbindung nicht schliessen.
 */
export const GET: RequestHandler = ({ locals, url, request }) => {
	const user = locals.user!;
	const open = Number(url.searchParams.get('offen')) || null;
	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream({
		start(controller) {
			const write = (text: string) => {
				try {
					controller.enqueue(encoder.encode(text));
				} catch {
					cleanup();
				}
			};
			write('retry: 3000\n\n');
			const unsubscribe = subscribe(user.id, {
				openChat: open,
				send: (event) => write(`data: ${JSON.stringify(event)}\n\n`)
			});
			const ping = setInterval(() => write(': ping\n\n'), 25_000);
			cleanup = () => {
				clearInterval(ping);
				unsubscribe();
			};
			request.signal.addEventListener('abort', () => {
				cleanup();
				try {
					controller.close();
				} catch {
					// schon zu
				}
			});
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream; charset=utf-8',
			'cache-control': 'no-cache, no-transform',
			'x-accel-buffering': 'no',
			connection: 'keep-alive'
		}
	});
};
