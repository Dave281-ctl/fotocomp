# Fotocomp

Ein schlichter, privater Foto-Wettbewerb unter Freunden.

Ein Thema, jeden Tag ein Foto. Ab 20:00 Uhr bewerten alle die Fotos der anderen, um 05:00 Uhr wird das Resultat enthüllt. Einmal pro Woche wird das Wochenfoto gekürt. Und wer möchte, bekommt freundschaftliches, konstruktives Feedback.

## So funktioniert es

| Zeit (Europe/Zurich) | Was passiert                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| 05:00 – 20:00        | Jeder lädt sein **Foto des Tages** hoch (ersetzen bis 20:00 möglich)                              |
| 20:00 – 05:00        | **Bewertung** mit 1–5 Sternen, anonym; das eigene Foto ist ausgenommen                            |
| 05:00                | **Enthüllung**: Rangliste mit Namen, danach beginnt der nächste Tag                               |
| Wochentag (z.B. So.) | **Wochenbewertung**: jeder wählt seine Top 3 der Woche, am nächsten Morgen gibt es das Wochenfoto |

- **Themen** haben einen Titel und eine Beschreibung, dazu ein Enddatum oder sie laufen wiederkehrend. Mehrere Themen können parallel laufen, jeder macht bei einem mit.
- **Feedback**: Pro Foto lässt sich festlegen, ob Feedback willkommen ist. Feedback sieht nur der Fotograf. Zusätzlich gibt es **Feedback-Runden** pro Thema, automatisch (z.B. jeden Montag 19:00) oder von Hand gestartet.
- **Login ohne Passwort**: Login-Link oder 6-stelliger Code per Mail. Auf demselben Gerät bleibt man angemeldet (30 Tage gleitend).
- **Fotos**: Die Originale werden unverändert nach Benutzer abgelegt. Für Handy, Monitor und Vollbild gibt es WebP-Thumbnails. Die Detailansicht zeigt Kamera, Objektiv, Belichtung und GPS.
- **Admin**: Der erste registrierte User ist Admin. Admins verwalten Benutzer, Fotos, Themen und Einstellungen und können weitere Admins ernennen.
- **Einladen** per Mail oder Link (Signal, WhatsApp, Matrix …) unter Profil → Freunde einladen.
- **Dunkelmodus** als Standard, auf Wunsch hell.

## Installation auf einem Synology NAS

Voraussetzung: DSM 7.2 oder neuer mit dem Paket **Container Manager**.

1. **Ordner anlegen** (File Station): `docker/fotocomp/photos` und `docker/fotocomp/db`.
2. **Projekt erstellen**: Container Manager → Projekt → Erstellen.
   - Pfad: `/volume1/docker/fotocomp`
   - Quelle: «docker-compose.yml erstellen» und den Inhalt von [`docker-compose.yml`](docker-compose.yml) einfügen.
   - Alle Werte mit `ÄNDERN` anpassen: Adresse, Datenbank-Passwort (an beiden Stellen gleich) und SMTP-Zugang deines Mail-Anbieters.
3. **HTTPS einrichten**:
   - Systemsteuerung → Sicherheit → Zertifikat: Let's-Encrypt-Zertifikat für deine Domain hinzufügen.
   - Systemsteuerung → Anmeldeportal → Erweitert → Reverse Proxy → Erstellen:
     - Quelle: `HTTPS`, Hostname `fotos.example.com`, Port `443`
     - Ziel: `HTTP`, `localhost`, Port `3000`
4. Die Adresse öffnen und **registrieren**. Der erste User wird automatisch Admin.

Im Admin-Bereich kannst du die Registrierung danach auf «nur mit Einladung» stellen.

### Automatische Updates

1. Auf GitHub ein neues **Release** erstellen (z.B. `v0.2.0`).
2. GitHub Actions baut das Docker-Image (amd64 und arm64) und lädt es nach `ghcr.io/dave281-ctl/fotocomp`.
3. **Watchtower** auf dem NAS prüft alle 30 Minuten, ob es ein neues Image gibt, und startet die App neu. Datenbank-Migrationen laufen beim Start automatisch.

> Nach dem allerersten Release muss das Paket einmalig öffentlich gemacht werden, damit das NAS es ohne Anmeldung laden kann: GitHub → Profil → Packages → `fotocomp` → Package settings → Change visibility → Public.

### Datensicherung

Alles Wichtige liegt in `/volume1/docker/fotocomp`. Am einfachsten sicherst du den Ordner mit **Hyper Backup**. Für eine konsistente Datenbanksicherung legst du zusätzlich im Aufgabenplaner eine tägliche Aufgabe an:

```bash
docker exec fotocomp-db-1 pg_dump -U fotocomp fotocomp > /volume1/docker/fotocomp/backup.sql
```

Der Container-Name kann je nach Projektname abweichen (`docker ps` zeigt ihn an).

### Ablage der Fotos

```
photos/
├─ originals/<benutzer>/<YYYY-MM-DD>_<thema>_<id>.jpg   unverändert, mit allen Metadaten
└─ thumbs/<id>/{480,1200,2400}.webp                      ohne Metadaten
```

## Entwicklung

Voraussetzungen: Node.js 22+ und Podman oder Docker.

```bash
npm install
cp .env.example .env
npm run db:up        # PostgreSQL und Mailpit (Test-Mails unter http://localhost:8025)
npm run db:migrate
npm run dev          # http://localhost:5173
```

Mit `FAKE_NOW=2026-11-18T20:30` in der `.env` lässt sich die Uhrzeit simulieren (nur im Dev-Modus), z.B. um die Bewertung zu testen.

| Befehl                | Zweck                                    |
| --------------------- | ---------------------------------------- |
| `npm run check`       | TypeScript- und Svelte-Prüfung           |
| `npm run lint`        | Prettier und ESLint                      |
| `npm test`            | Unit-Tests (Zeitlogik, Punkteberechnung) |
| `npm run db:generate` | Migration nach einer Schema-Änderung     |

### Aufbau

```
src/
├─ hooks.server.ts         Session, Hell/Dunkel, Hintergrund-Jobs
├─ lib/
│  ├─ schedule.ts          Phasen aus der Uhrzeit (getestet)
│  ├─ scoring.ts           Tages- und Wochenwertung (getestet)
│  ├─ components/          Feed, Vollbild, Sterne, Upload …
│  └─ server/              Datenbank, Auth, Fotos, Feedback, Mails
└─ routes/                 Heute, Galerie, Themen, Foto, Profil, Admin
```

### Technik

Alles ist Open Source: [SvelteKit](https://svelte.dev) (MIT), [Drizzle ORM](https://orm.drizzle.team) (Apache-2.0), [PostgreSQL](https://www.postgresql.org), [sharp](https://sharp.pixelplumbing.com) (Apache-2.0), [exifr](https://github.com/MikeKovarik/exifr) (MIT), [Nodemailer](https://nodemailer.com) (MIT-0), [date-fns](https://date-fns.org) (MIT), [Lucide](https://lucide.dev) (ISC), [Inter](https://rsms.me/inter/) (OFL), Karten von [OpenStreetMap](https://www.openstreetmap.org/copyright) und [Watchtower](https://github.com/nicholas-fedor/watchtower) (Apache-2.0).

## Lizenz

[MIT](LICENSE)
