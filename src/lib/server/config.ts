// Lokale .env laden (falls vorhanden). In Docker kommen die Werte direkt aus der Umgebung.
try {
	process.loadEnvFile();
} catch {
	// keine .env vorhanden
}

/** Zentrale Konfiguration aus Umgebungsvariablen (siehe .env.example). */
function env(name: string, fallback?: string): string {
	const value = process.env[name] ?? fallback;
	if (value === undefined) throw new Error(`Umgebungsvariable ${name} fehlt`);
	return value;
}

export const config = {
	/** Release-Version aus dem Docker-Image, lokal «dev». */
	get version() {
		return env('APP_VERSION', 'dev');
	},
	/** Update-Kanal: «beta» auf der Beta-Instanz (siehe compose.beta.yaml), sonst «stable». */
	get channel(): 'stable' | 'beta' {
		return process.env.APP_CHANNEL === 'beta' ? 'beta' : 'stable';
	},
	get origin() {
		return env('ORIGIN', 'http://localhost:5173');
	},
	/** Höchste Dateigrösse eines Fotos in MB (RAW-Dateien sind gross). */
	get maxUploadMb() {
		return Number(env('MAX_UPLOAD_MB', '200')) || 200;
	},
	/** Gemeinsamer Schlüssel mit Watchtower; ohne ihn kann die App keine Updates auslösen. */
	get updateToken() {
		return process.env.UPDATE_TOKEN || undefined;
	},
	get watchtowerUrl() {
		return env('WATCHTOWER_URL', 'http://watchtower:8080');
	},
	get dataDir() {
		return env('DATA_DIR', './data');
	},
	smtp: {
		get host() {
			return env('SMTP_HOST', 'localhost');
		},
		get port() {
			return Number(env('SMTP_PORT', '1025'));
		},
		/** Port 465 = direkt TLS, andere Ports (587, 25, 1025) = STARTTLS bzw. unverschlüsselt. */
		get secure() {
			return env('SMTP_SECURE', String(this.port === 465)) === 'true';
		},
		get user() {
			return process.env.SMTP_USER;
		},
		get pass() {
			return process.env.SMTP_PASS;
		},
		get from() {
			return env('MAIL_FROM', 'Fotocomp <fotocomp@localhost>');
		}
	}
};

/** Einstellungen aus der .env, in denen noch ein Platzhalter der Vorlage steht. */
export function placeholderSettings() {
	const names = [
		'ORIGIN',
		'DB_PASSWORD',
		'SMTP_HOST',
		'SMTP_USER',
		'SMTP_PASS',
		'MAIL_FROM',
		'UPDATE_TOKEN'
	];
	return names.filter((name) => {
		const value = process.env[name] ?? '';
		return value.startsWith('HIER_') || value.includes('example.com');
	});
}
