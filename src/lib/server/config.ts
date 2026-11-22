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
	get origin() {
		return env('ORIGIN', 'http://localhost:5173');
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
