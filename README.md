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

Hat bis 20:00 Uhr im Thema niemand ein Foto hochgeladen, gibt es nichts zu bewerten. Dann ist der Upload für den nächsten Tag sofort offen (ausser vor dem Wochenbewertungstag und am letzten Tag eines Themas).

- **Themen** haben einen Titel und eine Beschreibung, dazu ein Enddatum oder sie laufen wiederkehrend. Mehrere Themen können parallel laufen, und jeder kann bei mehreren mitmachen. Auf der Startseite wechselt man oben per Reiter zwischen den eigenen Themen; ein Punkt zeigt, wo noch etwas zu tun ist.
- **Feedback**: Pro Foto lässt sich festlegen, ob Feedback willkommen ist. Feedback sieht nur der Fotograf. Zusätzlich gibt es **Feedback-Runden** pro Thema, automatisch (z.B. jeden Montag 19:00) oder von Hand gestartet.
- **Galerie**: Standardmässig die Tagessieger und Wochenfotos aller Themen, mit Badge. Auf Wunsch alle Fotos, gefiltert nach Thema und/oder Person.
- **Erinnerungen per Mail**: Pro Zeitpunkt höchstens eine Mail, auch bei mehreren Themen, und nie mehr als eine pro 30 Minuten. Oben steht eine persönliche Zeile, etwa neues Feedback, ein eigener Tagessieg oder eine Serie. Die Texte stehen in [`src/lib/mail-texts.ts`](src/lib/mail-texts.ts). Abschalten lassen sich die Erinnerungen im Profil.
- **Login ohne Passwort**: Login-Link oder 6-stelliger Code per Mail. Auf demselben Gerät bleibt man angemeldet (30 Tage gleitend).
- **Fotos**: JPEG, **HEIC** (iPhone), PNG, WebP, AVIF, TIFF und **RAW** (DNG inkl. iPhone ProRAW, CR2/CR3, NEF, ARW, RAF, ORF, RW2, PEF …) bis 200 MB. Bei RAW-Dateien wird die eingebettete Kamera-Vorschau verwendet, so sieht das Foto aus wie auf der Kamera; fehlt sie, wird das RAW mit LibRaw entwickelt. Die Originale werden unverändert nach Benutzer abgelegt. Für Handy, Monitor und Vollbild gibt es WebP-Thumbnails. Die Detailansicht zeigt Kamera, Objektiv, Belichtung, GPS und das Format des Originals.
- **Admin**: Der erste registrierte User ist Admin. Admins verwalten Benutzer, Fotos, Themen und Einstellungen und können weitere Admins ernennen. Die Admin-Übersicht zeigt die installierte Version.
- **Einladen** per Mail oder Link (Signal, WhatsApp, Matrix …) unter Profil → Freunde einladen.
- **Dunkelmodus** als Standard, auf Wunsch hell.

## Installation auf einem Synology NAS

Voraussetzung: DSM 7.2 oder neuer mit dem Paket **Container Manager**.

1. **Ordner anlegen** (File Station): `docker/fotocomp/photos` und `docker/fotocomp/db`.
2. **Einstellungen anlegen:** Die Vorlage [`nas.env.example`](nas.env.example) als `docker/fotocomp/.env` speichern und die Werte anpassen:
   - **Datenbank:** `DB_PASSWORD` als langes Zufallspasswort, nur aus Buchstaben und Ziffern. Zeichen wie `$` oder `#` verfälschen das Passwort. `DB_USERNAME` und `DB_DATABASE_NAME` können so bleiben.
   - **Adresse:** `ORIGIN` und `APP_PORT` (Port auf dem NAS, Standard 3000).
   - **Mail:** den SMTP-Zugang deines Mail-Anbieters. Port 587 oder 465, die Verschlüsselung wird passend gewählt.
3. **Projekt erstellen:** Container Manager → Projekt → Erstellen.
   - Pfad: `/volume1/docker/fotocomp`
   - Quelle: «compose.yaml erstellen» und den Inhalt von [`compose.yaml`](compose.yaml) unverändert einfügen. Die Werte kommen alle aus der `.env`.
4. **HTTPS einrichten:**
   - Systemsteuerung → Sicherheit → Zertifikat: Let's-Encrypt-Zertifikat für deine Domain hinzufügen.
   - Systemsteuerung → Anmeldeportal → Erweitert → Reverse Proxy → Erstellen:
     - Quelle: `HTTPS`, Hostname `fotos.example.com`, Port `443`
     - Ziel: `HTTP`, `localhost`, Port wie `APP_PORT` (z.B. `3000`)
5. Die Adresse öffnen und **registrieren**. Der erste User wird automatisch Admin.

Nach einer Änderung an der `.env` das Projekt im Container Manager stoppen und wieder starten («Erstellen» übernimmt die neuen Werte).

Im Admin-Bereich kannst du die Registrierung danach auf «nur mit Einladung» stellen.

### Automatische Updates

1. Auf GitHub ein neues **Release** erstellen (z.B. `v0.2.0`).
2. GitHub Actions baut das Docker-Image (amd64 und arm64) und lädt es nach `ghcr.io/dave281-ctl/fotocomp`.
3. **Watchtower** auf dem NAS prüft alle 30 Minuten, ob es ein neues Image gibt, und startet die App neu. Datenbank-Migrationen laufen beim Start automatisch.
4. Ob das Update angekommen ist, zeigt die Version unten in der Admin-Übersicht.

> Nach dem allerersten Release muss das Paket einmalig öffentlich gemacht werden, damit das NAS es ohne Anmeldung laden kann: GitHub → Profil → Packages → `fotocomp` → Package settings → Change visibility → Public.

### Datensicherung

Alles Wichtige liegt in `/volume1/docker/fotocomp`. Am einfachsten sicherst du den Ordner mit **Hyper Backup**. Für eine konsistente Datenbanksicherung legst du zusätzlich im Aufgabenplaner eine tägliche Aufgabe an:

```bash
docker exec fotocomp-db-1 pg_dump -U fotocomp fotocomp > /volume1/docker/fotocomp/backup.sql
```

Der Container-Name kann je nach Projektname abweichen (`docker ps` zeigt ihn an).

### Fehlerbehebung

**Die App startet und stoppt sofort, im Log steht `password authentication failed`.**
Postgres übernimmt `DB_USERNAME`, `DB_PASSWORD` und `DB_DATABASE_NAME` nur beim allerersten Start, also wenn der `db`-Ordner leer ist. Wurden die Werte in der `.env` danach geändert, passen sie nicht mehr zur bestehenden Datenbank. Es gibt zwei Lösungen:

- **Neu anfangen** (solange noch keine Daten drin sind): Projekt stoppen, den Inhalt von `docker/fotocomp/db` löschen, Projekt wieder starten.
- **Passwort in der Datenbank anpassen**: Container Manager → Container `…-db-1` → Terminal → Erstellen → `bash`, dann:
  ```bash
  psql -U fotocomp -d fotocomp -c "ALTER USER fotocomp PASSWORD 'dein-DB_PASSWORD-aus-der-env';"
  ```
  `fotocomp` steht hier für deinen `DB_USERNAME` bzw. `DB_DATABASE_NAME`. Danach das Projekt neu starten.

**Grosse Fotos (z.B. RAW) lassen sich nicht hochladen, die App meldet «zu gross für den Server».**
Dann begrenzt der Reverse Proxy die Grösse von Uploads. Die App selbst nimmt bis 200 MB an. Die Grenze der App lässt sich mit `MAX_UPLOAD_MB` in der `.env` ändern; für mehr als 200 MB zusätzlich `BODY_SIZE_LIMIT` (z.B. `310M`) setzen.

**Login-Mails kommen nicht an.**
Die App zeigt dann «Die Mail konnte nicht verschickt werden». Gleich nach dem Start schreibt sie ins Log, ob der Mailserver erreichbar ist (`Mailserver … erreichbar` oder `… nicht nutzbar` mit Grund, z.B. `EAUTH` für falsche Zugangsdaten oder `ETIMEDOUT` für einen falschen Host oder Port). Häufig passen Port und Verschlüsselung nicht zusammen: Port 465 nutzt TLS, Port 587 STARTTLS. Ein `SMTP_SECURE` wie in älteren Vorlagen ist nicht mehr nötig und sollte aus der `.env` entfernt werden.

### Ablage der Fotos

```
photos/
├─ originals/<benutzer>/<YYYY-MM-DD>_<thema>_<id>.<jpg|heic|dng|…>   unverändert, mit allen Metadaten
└─ thumbs/<id>/{480,1200,2400}.webp                      ohne Metadaten
```

## Entwicklung

Voraussetzungen: Node.js 22+, Perl (für ExifTool, unter Linux meist vorhanden) und Podman oder Docker. Für RAW-Dateien ohne eingebettete Vorschau optional LibRaw (`dcraw_emu`).

```bash
npm install
cp .env.example .env
npm run db:up        # PostgreSQL und Mailpit (Test-Mails unter http://localhost:8025)
npm run db:migrate
npm run dev          # http://localhost:5173
```

Mit `FAKE_NOW=2026-11-18T20:30` in der `.env` lässt sich die Uhrzeit simulieren (nur im Dev-Modus), z.B. um die Bewertung zu testen.

| Befehl                | Zweck                                     |
| --------------------- | ----------------------------------------- |
| `npm run check`       | TypeScript- und Svelte-Prüfung            |
| `npm run lint`        | Prettier und ESLint                       |
| `npm test`            | Unit-Tests (Zeitlogik, Punkte, Mailtexte) |
| `npm run db:generate` | Migration nach einer Schema-Änderung      |

### Aufbau

```
src/
├─ hooks.server.ts         Session, Hell/Dunkel, Hintergrund-Jobs
├─ lib/
│  ├─ schedule.ts          Phasen aus der Uhrzeit (getestet)
│  ├─ scoring.ts           Tages- und Wochenwertung (getestet)
│  ├─ mail-texts.ts        Texte der Erinnerungsmails (getestet)
│  ├─ components/          Feed, Vollbild, Sterne, Upload …
│  └─ server/              Datenbank, Auth, Fotos, Feedback, Mails
└─ routes/                 Heute, Galerie, Themen, Foto, Profil, Admin
```

### Technik

Alles ist Open Source: [SvelteKit](https://svelte.dev) (MIT), [Drizzle ORM](https://orm.drizzle.team) (Apache-2.0), [PostgreSQL](https://www.postgresql.org), [sharp](https://sharp.pixelplumbing.com) (Apache-2.0), [ExifTool](https://exiftool.org) über [exiftool-vendored](https://github.com/photostructure/exiftool-vendored.js) (MIT), [libheif](https://github.com/strukturag/libheif) über [heic-decode](https://github.com/catdad-experiments/heic-decode) (LGPL-3.0 / ISC), [LibRaw](https://www.libraw.org) (LGPL-2.1), [Nodemailer](https://nodemailer.com) (MIT-0), [date-fns](https://date-fns.org) (MIT), [Lucide](https://lucide.dev) (ISC), [Inter](https://rsms.me/inter/) (OFL), Karten von [OpenStreetMap](https://www.openstreetmap.org/copyright) und [Watchtower](https://github.com/nicholas-fedor/watchtower) (Apache-2.0).

## Lizenz

[MIT](LICENSE)
