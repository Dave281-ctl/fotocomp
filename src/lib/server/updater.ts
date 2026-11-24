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

/**
 * Ist die Update-Steuerung eingerichtet?
 * - missing-token: UPDATE_TOKEN ist im App-Container nicht gesetzt
 * - unreachable:   Watchtower antwortet nicht (Container läuft nicht, alte compose.yaml)
 * - bad-token:     Watchtower kennt einen anderen Token
 * - ok:            alles bereit
 * Geprüft wird mit einem Update-Auftrag für ein Image, das es nicht gibt:
 * Watchtower prüft dabei den Token, aktualisiert aber nichts.
 */
export type UpdateSetup = 'missing-token' | 'unreachable' | 'bad-token' | 'ok';

export async function checkUpdateSetup(): Promise<UpdateSetup> {
	const token = config.updateToken;
	if (!token) return 'missing-token';
	try {
		const res = await fetch(`${config.watchtowerUrl}/v1/update?image=fotocomp-setup-check/none`, {
			method: 'POST',
			headers: { authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(4000)
		});
		if (res.status === 401) return 'bad-token';
		return res.ok ? 'ok' : 'unreachable';
	} catch {
		return 'unreachable';
	}
}

/** Erklärung für Protokoll und Adminbereich. */
export function describeSetup(setup: UpdateSetup) {
	switch (setup) {
		case 'missing-token':
			return 'UPDATE_TOKEN fehlt im App-Container. Prüfe die .env (eigene Zeile, nur Buchstaben und Ziffern) und erstelle das Projekt neu.';
		case 'unreachable':
			return `Watchtower ist unter ${config.watchtowerUrl} nicht erreichbar. Läuft der Container «watchtower» mit der aktuellen compose.yaml?`;
		case 'bad-token':
			return 'Watchtower lehnt den Token ab: Die App und Watchtower haben unterschiedliche Werte. Beide kommen aus UPDATE_TOKEN in der .env – Projekt neu erstellen.';
		case 'ok':
			return 'Update-Steuerung eingerichtet, Watchtower erreichbar.';
	}
}

export async function updateStatus() {
	const [version, { updatePolicy }, setup] = await Promise.all([
		versionInfo(),
		getSettings(),
		checkUpdateSetup()
	]);
	return {
		...version,
		policy: updatePolicy,
		ranges: policyRanges(version.installed),
		setup,
		configured: setup === 'ok',
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

/** Beim Start einmal ins Protokoll schreiben, ob die Update-Steuerung bereit ist. */
async function logSetup() {
	const setup = await checkUpdateSetup();
	if (setup === 'ok') console.log(describeSetup(setup));
	else console.warn(`Update-Steuerung: ${describeSetup(setup)}`);
}

export function startAutoUpdate() {
	if (timer) return;
	setTimeout(() => void logSetup(), 15_000).unref();
	const run = () =>
		autoUpdate().catch((e) => console.error('Automatisches Update:', e.message ?? e));
	timer = setInterval(run, CHECK_INTERVAL);
	setTimeout(run, 60_000).unref();
}

export function stopAutoUpdate() {
	clearInterval(timer);
	timer = undefined;
}
