import { json } from '@sveltejs/kit';
import { UserError } from './errors.ts';

/** Führt eine API-Aktion aus; UserError wird zur JSON-Fehlermeldung mit passendem Status. */
export async function apiCall<T>(fn: () => Promise<T>) {
	try {
		return json(await fn());
	} catch (e) {
		if (e instanceof UserError) return json({ error: e.message }, { status: e.status });
		throw e;
	}
}
