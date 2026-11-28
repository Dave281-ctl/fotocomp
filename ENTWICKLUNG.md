# Mitentwickeln an Fotocomp

Diese Anleitung ist für alle, die an Fotocomp mitarbeiten – auch ohne grosse
git-Erfahrung. Wir arbeiten mit **Visual Studio Code** und **Claude Code**. Claude kennt
unsere Regeln aus der Datei [CLAUDE.md](CLAUDE.md) und hilft bei jedem git-Schritt.

**Inhalt**

1. [Das Prinzip in einem Bild](#1-das-prinzip-in-einem-bild)
2. [Einmalig einrichten](#2-einmalig-einrichten)
3. [Der tägliche Ablauf](#3-der-tägliche-ablauf)
4. [Wann ein neuer Branch?](#4-wann-ein-neuer-branch)
5. [Zusammenführen mit einem Pull Request](#5-zusammenführen-mit-einem-pull-request)
6. [Beta testen](#6-beta-testen)
7. [Stabile Version veröffentlichen](#7-stabile-version-veröffentlichen)
8. [Beta-Instanz auf dem NAS einrichten](#8-beta-instanz-auf-dem-nas-einrichten)
9. [GitHub einrichten (für den Besitzer des Repositorys)](#9-github-einrichten-für-den-besitzer-des-repositorys)
10. [Wenn etwas schiefgeht](#10-wenn-etwas-schiefgeht)

---

## 1. Das Prinzip in einem Bild

```
feature/chat-bilder ──┐
feature/kalender ─────┼── Pull Request + Prüfung ──► main ──► Beta-Version ──► stabile Version
fix/sterne-handy ─────┘                                        v0.9.0-beta.1     v0.9.0
                                                               ↓                 ↓
                                                        Beta-Instanz       alle Freunde
                                                        (zum Testen)       (Plattform)
```

- **`main`** ist der gemeinsame Stand. Niemand ändert ihn direkt.
- Jede Person arbeitet in einem eigenen **Branch** (eine Kopie zum Ausprobieren).
- Fertiges kommt per **Pull Request** in `main` – die andere Person schaut kurz drüber.
- Aus `main` entsteht zuerst eine **Beta-Version**. Sie läuft nur auf der Beta-Instanz.
- Ist die Beta gut, wird daraus eine **stabile Version** für alle.

Begriffe:

| Begriff               | Bedeutung                                                             |
| --------------------- | --------------------------------------------------------------------- |
| **Commit**            | Ein gespeicherter Zwischenstand mit kurzer Beschreibung               |
| **Branch**            | Eine eigene Arbeitslinie, getrennt von `main`                         |
| **Push / Pull**       | Hochladen auf GitHub / Herunterladen von GitHub                       |
| **Pull Request (PR)** | Antrag, einen Branch in `main` zu übernehmen – mit Prüfung            |
| **Merge**             | Zusammenführen zweier Stände                                          |
| **Konflikt**          | Beide haben dieselbe Stelle geändert – git fragt, welche Version gilt |
| **Release**           | Eine veröffentlichte Version (Beta oder stabil)                       |

## 2. Einmalig einrichten

**Programme**

- [Visual Studio Code](https://code.visualstudio.com) mit der Erweiterung **Claude Code**
- **git**, **Node.js 22** oder neuer und **Podman** oder **Docker**
- **GitHub CLI** (`gh`), danach `gh auth login`
- Perl (für ExifTool; unter Linux und macOS meist schon vorhanden)

**Projekt holen und starten**

```bash
git clone git@github.com:Dave281-ctl/fotocomp.git
cd fotocomp
npm install
cp .env.example .env
npm run db:up          # Datenbank und Test-Mailserver (mit Docker: docker compose -f compose.dev.yml up -d)
npm run db:migrate
npm run dev            # → http://localhost:5173
```

- Registrieren auf http://localhost:5173 – die erste Person wird Admin.
- Login-Mails landen nicht im echten Postfach, sondern im Test-Mailserver:
  http://localhost:8025
- Uhrzeit simulieren (z.B. um die Bewertung um 21 Uhr zu testen):
  `FAKE_NOW=2026-11-26T21:00 npm run dev`

**Am Anfang einer Sitzung mit Claude** reicht ein Satz wie: _«Wo stehe ich gerade?»_
Claude sieht nach, auf welchem Branch du bist und ob es Neues von der anderen Person gibt.

## 3. Der tägliche Ablauf

So sieht eine typische Arbeit aus – in Klammern, was du Claude sagen kannst:

1. **Neue Aufgabe beginnen** («Ich möchte die Funktion XY bauen. Leg dafür einen Branch an.»)
   – Claude holt den neuesten Stand und legt `feature/xy` an.
2. **Arbeiten** – mit Claude wie gewohnt. Claude speichert Zwischenstände als Commits.
3. **Hochladen** («Lade meinen Stand hoch.») – damit nichts verloren geht und die andere
   Person ihn sehen kann.
4. **Neues von der anderen Person übernehmen** («Übernimm die neuen Änderungen von main.»)
   – am besten täglich, dann gibt es weniger Konflikte.
5. **Fertig?** («Die Funktion ist fertig, erstelle einen Pull Request.») – siehe
   [Abschnitt 5](#5-zusammenführen-mit-einem-pull-request).

Prüfungen, die vor jedem Pull Request grün sein müssen (Claude macht das automatisch):

| Befehl          | Zweck                                         |
| --------------- | --------------------------------------------- |
| `npm run check` | TypeScript- und Svelte-Prüfung                |
| `npm run lint`  | Formatierung (Prettier) und Regeln (ESLint)   |
| `npm test`      | Tests (Zeitlogik, Punkte, Texte, Versionen …) |
| `npm run build` | Lässt sich die App bauen?                     |

## 4. Wann ein neuer Branch?

**Für jede Änderung am Code.** `main` ist geschützt, Änderungen kommen nur über Pull Requests.

| Situation                                  | Branch                                                |
| ------------------------------------------ | ----------------------------------------------------- |
| Neue Funktion                              | `feature/<kurzname>`, z.B. `feature/wochen-statistik` |
| Fehler beheben                             | `fix/<kurzname>`, z.B. `fix/sterne-handy`             |
| Nur Texte oder Anleitungen                 | `docs/<kurzname>`                                     |
| Version für ein Release erhöhen            | `release/vX.Y.Z`                                      |
| Kleine Ergänzung zu einer offenen Funktion | im **bestehenden** Branch weiter                      |
| Zwei unabhängige Dinge                     | **zwei** Branches                                     |

Faustregeln:

- **Ein Branch = ein Thema.**
- **Kurz halten**: nach ein paar Tagen zusammenführen, nicht wochenlang offen lassen.
- **Absprechen**, wer woran arbeitet – vor allem, wenn beide dieselben Dateien oder die
  Datenbank ändern würden.

## 5. Zusammenführen mit einem Pull Request

1. Claude prüft alles, übernimmt den neuesten `main` und lädt den Branch hoch.
2. Claude erstellt den Pull Request mit Beschreibung (Vorlage: Was, Warum, Wie getestet,
   Migration ja/nein).
3. Auf GitHub laufen die Prüfungen automatisch – sie müssen grün werden (✓).
4. **Die andere Person schaut den Pull Request an** – auf GitHub unter «Pull requests»
   oder in VS Code mit Claude: _«Schau dir Pull Request 12 an.»_ (bzw. `/code-review`).
   Fragen oder Wünsche als Kommentar.
5. Ist alles gut: **«Squash and merge»** – auf GitHub per Knopf oder mit Claude
   (_«Führe den Pull Request zusammen.»_). Alle Commits werden zu einem sauberen Eintrag in
   `main`, der Branch wird gelöscht.
6. Danach: _«Wechsle zurück auf main und hol den neuesten Stand.»_

**Datenbank-Änderungen**: höchstens eine Migration pro Pull Request. Haben beide
gleichzeitig eine erzeugt, hilft Claude beim Neu-Erzeugen (siehe [CLAUDE.md](CLAUDE.md)).

## 6. Beta testen

Neue Funktionen in `main` werden zuerst auf der **Beta-Instanz** ausprobiert – mit echten
Handys, ohne dass die Freunde auf der Plattform etwas merken.

1. _«Erstelle eine Beta-Version aus dem aktuellen main.»_
   Claude fragt nach und erstellt ein **Pre-release**, z.B. `v0.9.0-beta.1`.
2. GitHub baut das Image (2–5 Minuten). Die Beta-Instanz holt es sich selbst – sofort über
   Admin → Einstellungen → Updates → «Jetzt nach Updates suchen» und «Jetzt aktualisieren».
3. Testen auf der Beta-Adresse. Die Beta-Instanz zeigt oben ein gestreiftes **«BETA»-Band**.
4. Fehler gefunden? Wie gewohnt in einem `fix/…`-Branch beheben, zusammenführen, nächste
   Beta (`v0.9.0-beta.2`).

Die stabile Plattform bekommt Beta-Versionen **nie** – sie kennt nur stabile Releases.

## 7. Stabile Version veröffentlichen

Wenn die Beta gut ist: _«Veröffentliche v0.9.0 als stabile Version.»_

Claude erhöht die Version in einem kleinen Pull Request (`release/v0.9.0`), führt ihn nach
Rückfrage zusammen und erstellt das Release. Die Plattform installiert es in der Nacht um
03:00 (oder sofort über die Update-Einstellungen). Die Beta-Instanz bekommt es auch.

**Versionsnummern**

| Änderung                                | Beispiel                                                             |
| --------------------------------------- | -------------------------------------------------------------------- |
| Fehlerbehebung                          | 0.9.0 → 0.9.1                                                        |
| Neue Funktionen                         | 0.9.x → 0.10.0                                                       |
| Etwas muss auf dem NAS angepasst werden | mittlere Zahl erhöhen und in der Release-Notiz «⚠ Manueller Schritt» |

## 8. Beta-Instanz auf dem NAS einrichten

Einmalig, auf demselben Synology NAS wie die Plattform. Die beiden Instanzen teilen
**nichts** – eigene Datenbank, eigene Fotos, eigene Benutzer.

1. **Ordner anlegen** (File Station): `docker/fotocomp-beta/photos` und `docker/fotocomp-beta/db`.
2. **Einstellungen**: [`beta.env.example`](beta.env.example) als `docker/fotocomp-beta/.env`
   speichern und ausfüllen – **andere Passwörter** und einen **anderen Update-Schlüssel**
   als bei der Plattform. Port `3026` und Adresse `https://beta.…` sind voreingestellt.
3. **Projekt erstellen**: Container Manager → Projekt → Erstellen, Name `fotocomp-beta`,
   Pfad `/volume1/docker/fotocomp-beta`, Inhalt von [`compose.beta.yaml`](compose.beta.yaml)
   unverändert einfügen.
4. **Adresse und HTTPS**: Zertifikat für die Beta-Adresse hinzufügen; im Reverse Proxy einen
   zweiten Eintrag: Quelle `https://beta.…:443` → Ziel `http://localhost:3026`.
5. **Registrieren** auf der Beta-Adresse (die erste Person wird dort Admin) und
   Testpersonen einladen.

Die Beta-Instanz hat ihren **eigenen Watchtower** mit eigenem Bereich («Scope»). Er
aktualisiert nur die Beta-App, nie die Plattform.

## 9. GitHub einrichten (für den Besitzer des Repositorys)

**Zweite Person einladen**: GitHub → Repository → Settings → Collaborators → «Add people».

**`main` schützen** (damit niemand versehentlich direkt darauf arbeitet):
GitHub → Repository → Settings → Branches → «Add branch ruleset» (oder «Add rule»):

- Name: `main schützen`, Ziel: Branch `main`
- ✅ **Require a pull request before merging**
  (für zwei Personen: 0 oder 1 «Required approvals» – 1, wenn jede Änderung angeschaut werden soll)
- ✅ **Require status checks to pass** → Prüfung **«check»** (aus der CI) hinzufügen
- ✅ **Block force pushes**
- Speichern

## 10. Wenn etwas schiefgeht

Keine Panik – fast alles lässt sich mit git wieder richten. Sag Claude einfach, was passiert
ist, z.B.:

- _«Ich habe aus Versehen auf main gearbeitet.»_ → Claude verschiebt die Änderungen in einen
  neuen Branch.
- _«Beim Übernehmen von main gibt es einen Konflikt.»_ → Claude zeigt beide Versionen,
  schlägt eine Lösung vor und fragt, bevor etwas überschrieben wird.
- _«Ich weiss nicht mehr, auf welchem Branch ich bin.»_ → _«Wo stehe ich gerade?»_
- _«Der Pull Request zeigt ein rotes ✗.»_ → _«Warum schlägt die Prüfung fehl?»_

Regeln, die immer gelten: nichts direkt auf `main`, kein `--force` auf `main`, keine
Passwörter oder `.env`-Dateien ins Repository, und **kein Release ohne ausdrückliches Ja**.
