/**
 * Updates: Die App entscheidet anhand der Einstellung, ob eine neue Version
 * installiert wird, und beauftragt dann Watchtower (HTTP-API, mit Token).
 * Watchtower lädt das neue Image und startet die App damit neu.
 */
import { config } from './config.ts';
import { UserError } from './errors.ts';
import { getSettings } from './settings.ts';
import { allowedByPolicy, policyRanges, versionInfo } from './version.ts';

const CHECK_INTERVAL = 60 * 60 * 1000;
/** Antwortet Watchtower so lange nicht, lädt es gerade das neue Image. */
const ANSWER_TIMEOUT = 8000;

export async function updateStatus() {
	const [version, { updatePolicy }] = await Promise.all([versionInfo(), getSettings()]);
	return {
		...version,
		policy: updatePolicy,
		ranges: policyRanges(version.installed),
		configured: !!config.updateToken,
		/** Wird die neueste Version automatisch installiert? */
		automatic: !!version.latest && allowedByPolicy(version.latest, version.installed, updatePolicy)
	};
}

/**
 * Beauftragt Watchtower mit dem Update.
 * 'started': Watchtower lädt das neue Image, die App startet gleich neu.
 * 'nothing': Watchtower hat kein neueres Image gefunden (z.B. noch im Bau).
 */
export async function triggerUpdate(): Promise<'started' | 'nothing'> {
	const token = config.updateToken;
	if (!token)
		throw new UserError('Die Update-Steuerung ist nicht eingerichtet (UPDATE_TOKEN fehlt).');
	let res: Response;
	try {
		res = await fetch(`${config.watchtowerUrl}/v1/update`, {
			method: 'POST',
			headers: { authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(ANSWER_TIMEOUT)
		});
	} catch (e) {
		if (e instanceof DOMException && e.name === 'TimeoutError') return 'started';
		console.error('Watchtower nicht erreichbar:', e);
		throw new UserError('Watchtower ist nicht erreichbar. Läuft der Container «watchtower»?', 503);
	}
	if (res.status === 401) {
		throw new UserError('Watchtower lehnt den Auftrag ab: UPDATE_TOKEN stimmt nicht überein.', 503);
	}
	if (!res.ok) throw new UserError(`Watchtower meldet einen Fehler (${res.status}).`, 503);
	const body = (await res.json().catch(() => ({}))) as { summary?: { updated?: number } };
	return (body.summary?.updated ?? 0) > 0 ? 'started' : 'nothing';
}

/** Stündlich: neue Version im erlaubten Bereich? Dann installieren. */
async function autoUpdate() {
	if (!config.updateToken) return;
	const status = await updateStatus();
	if (!status.automatic) return;
	console.log(`Automatisches Update: ${status.installed} → ${status.latest}`);
	const result = await triggerUpdate();
	if (result === 'nothing')
		console.log('Noch kein neues Image verfügbar, nächster Versuch in einer Stunde.');
}

let timer: ReturnType<typeof setInterval> | undefined;

export function startAutoUpdate() {
	if (timer) return;
	const run = () =>
		autoUpdate().catch((e) => console.error('Automatisches Update:', e.message ?? e));
	timer = setInterval(run, CHECK_INTERVAL);
	setTimeout(run, 60_000).unref();
}

export function stopAutoUpdate() {
	clearInterval(timer);
	timer = undefined;
}
