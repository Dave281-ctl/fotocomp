# Fotocomp – Anleitung für Claude

Diese Datei liest jede Claude-Sitzung in diesem Repository. Sie gilt für alle, die hier
mitarbeiten. Die ausführliche Anleitung für Menschen steht in [ENTWICKLUNG.md](ENTWICKLUNG.md).

## Projekt in Kürze

- Privater Foto-Wettbewerb unter Freunden. SvelteKit 3 (Svelte 5, TypeScript), Drizzle ORM,
  PostgreSQL 17, sharp; läuft als Docker-Container auf einem Synology NAS.
- Zeitzone Europe/Zurich. Die Spiellogik ist reine Zeitrechnung in `src/lib/schedule.ts`.
- Prüfen vor jedem Commit: `npm run check`, `npm run lint`, `npm test` (alle grün).
- Lokal: `npm run db:up` (Postgres + Mailpit), `npm run db:migrate`, `npm run dev`.
  Uhrzeit simulieren mit `FAKE_NOW=2026-11-26T21:00 npm run dev`.

## Sprache und Stil

- Mit den Menschen **Deutsch (Schweiz)** sprechen und schreiben: «ss» statt «ß».
- Texte in der App, Kommentare, Commit-Messages, Pull Requests und Release-Notizen auf Deutsch.
- Einfach halten: schlichter Code, schlichte Oberfläche, Fokus auf die Fotos.
- Nur kostenlose Open-Source-Bausteine.
- Bei grösseren Vorhaben zuerst einen kurzen Plan zeigen und auf Zustimmung warten.

## Deine Rolle bei git: beraten, nicht nur ausführen

Die beiden Personen, die hier arbeiten, kennen sich mit git **nicht sehr gut** aus.
Sei deshalb aktiv beratend:

- **Zu Beginn jeder Sitzung** `git status` und den aktuellen Branch ansehen und kurz sagen,
  wo man steht («Du bist auf `feature/chat-bilder`, 2 Commits noch nicht hochgeladen»).
  Steht man auf `main` und will etwas ändern: einen Branch vorschlagen (siehe unten).
- Holt `main` auf GitHub neue Änderungen der anderen Person (`git fetch`, dann
  `git log --oneline HEAD..origin/main`), darauf hinweisen und anbieten, sie zu übernehmen.
- Jeden git-Schritt **in einem Satz erklären**, bevor du ihn ausführst – ohne Fachchinesisch
  («Ich lade deine Änderungen auf GitHub hoch, damit … sie sehen kann»).
- **Vor allem, was etwas löscht oder überschreibt, fragen**: `reset --hard`, `push --force`,
  Branch löschen, `rebase`, Konflikte «mit meiner Version» auflösen, Release löschen.
- Nie direkt auf `main` committen oder pushen. Nie `--force` auf `main`.
- Keine Geheimnisse committen (`.env`, Passwörter, Tokens).
- Läuft etwas schief (Konflikt, falscher Branch, versehentlicher Commit): ruhig erklären,
  was passiert ist, und den sichersten Weg vorschlagen.

## Wann ein neuer Branch sinnvoll ist

**Jede Änderung am Code bekommt einen eigenen Branch** – `main` ist geschützt und wird nur
über Pull Requests geändert. Faustregeln:

| Situation                                                       | Vorgehen                                 |
| --------------------------------------------------------------- | ---------------------------------------- |
| Neue Funktion (z.B. Bilder im Chat)                             | neuer Branch `feature/<kurzname>`        |
| Fehler beheben                                                  | neuer Branch `fix/<kurzname>`            |
| Nur Texte, README, Anleitungen                                  | neuer Branch `docs/<kurzname>`           |
| Version für ein stabiles Release erhöhen                        | neuer Branch `release/vX.Y.Z`            |
| Kleine Ergänzung zu einer Funktion, deren Branch noch offen ist | im **bestehenden** Branch weiterarbeiten |
| Zwei unabhängige Dinge gleichzeitig                             | **zwei** Branches – nicht alles in einen |

- Ein Branch = **ein Thema**. Lieber klein und nach ein paar Tagen zusammengeführt als
  wochenlang offen (sonst wird das Zusammenführen schwierig).
- Namen: Kleinbuchstaben, Bindestriche, kurz: `feature/wochen-statistik`, `fix/sterne-handy`.
- Vor dem Anlegen immer vom neuesten `main` ausgehen:
  ```bash
  git switch main
  git pull
  git switch -c feature/<kurzname>
  ```
- Weist die Person an, «einfach schnell» etwas auf `main` zu ändern: freundlich erklären,
  warum ein Branch besser ist, und ihn gleich anlegen.

## Während der Arbeit

- In kleinen, verständlichen Schritten committen (deutsche Commit-Message: was und warum).
- Regelmässig hochladen, damit nichts verloren geht und die andere Person es sehen kann:
  `git push -u origin <branch>` (beim ersten Mal), danach `git push`.
- **Neue Änderungen von `main` übernehmen** (wenn die andere Person etwas zusammengeführt hat):
  ```bash
  git fetch
  git merge origin/main
  ```
  Wir verwenden **merge, nicht rebase** – das ist für Einsteiger sicherer (keine
  umgeschriebene Geschichte, kein Force-Push nötig).
- **Konflikte**: Erklären, welche Datei betroffen ist und was beide Seiten wollten. Einen
  Vorschlag machen, der beide Änderungen erhält, und vor dem Abschliessen zeigen. Danach
  prüfen (`npm run check`, `npm test`) und committen.

## Datenbank-Migrationen (wichtig bei zwei Personen)

- Höchstens **eine Migration pro Branch** (`npx drizzle-kit generate --name <kurzname>`).
- Haben beide Personen gleichzeitig eine Migration erzeugt, kollidieren die Nummern.
  Lösung: Nach `git merge origin/main` die **eigene** Migration löschen (SQL-Datei, Eintrag
  in `drizzle/meta/_journal.json` und Snapshot) und neu erzeugen. Vorher erklären!
- Migrationen nie nachträglich ändern, wenn sie schon auf `main` sind.
- Migrationen laufen beim Start automatisch; vorher sichert die App die Datenbank.

## Zusammenführen: Pull Request

Wenn eine Funktion fertig ist:

1. Prüfen: `npm run check`, `npm run lint`, `npm test`, `npm run build` – alles grün.
2. `main` übernehmen (siehe oben), erneut prüfen, hochladen.
3. Pull Request erstellen:
   ```bash
   gh pr create --base main --title "<Was, auf Deutsch>" --fill
   ```
   Die Beschreibung folgt der Vorlage (`.github/pull_request_template.md`): Was, warum, wie
   getestet, Migration ja/nein.
4. Die **andere Person** schaut den Pull Request an (auf GitHub oder mit `/code-review`).
   Auf GitHub laufen die Prüfungen automatisch (CI) – sie müssen grün sein.
5. Zusammenführen mit **«Squash and merge»** (alle Commits des Branches werden zu einem
   sauberen Commit auf `main`):
   ```bash
   gh pr merge --squash --delete-branch
   ```
   Nur nach Zustimmung der Person, die den Pull Request erstellt hat.
6. Aufräumen: `git switch main && git pull` – und den alten Branch lokal löschen lassen
   (`git branch -d <branch>`).

Bietet an, diese Schritte zu übernehmen, und erkläre jeweils kurz, was passiert.

## Beta testen und veröffentlichen

Es gibt zwei Instanzen auf dem NAS: die **stabile** Plattform (alle Freunde, Image `:latest`)
und die **Beta-Instanz** (zum Testen, Image `:beta`, gestreiftes «BETA»-Band).

- **Beta-Version** (aus dem aktuellen `main`, nichts muss erhöht werden):
  ```bash
  git switch main && git pull
  HEAD=$(git rev-parse HEAD)
  gh release create v0.9.0-beta.1 --prerelease --target "$HEAD" --title "v0.9.0-beta.1" --notes "…"
  ```
  → Nur die Beta-Instanz bekommt sie. Die nächste Beta derselben Version heisst `-beta.2` usw.
- **Stabile Version**, wenn die Beta gut ist:
  1. Branch `release/v0.9.0`, darin `npm version 0.9.0 --no-git-tag-version`, Pull Request,
     zusammenführen (siehe oben).
  2. Prüfen, dass `main` auf GitHub den neuen Stand hat
     (`git ls-remote origin refs/heads/main` = `git rev-parse HEAD`), dann:
     ```bash
     gh release create v0.9.0 --target "$(git rev-parse HEAD)" --title "v0.9.0" --notes "…"
     ```
  → Die stabile Plattform installiert sie in der Nacht um 03:00 (oder sofort über
  Admin → Einstellungen → Updates).
- **Versionsnummern**: Fehlerbehebung → letzte Zahl (0.9.0 → 0.9.1). Neue Funktionen →
  mittlere Zahl (0.9.x → 0.10.0), vor allem wenn auf dem NAS etwas angepasst werden muss
  (dann «⚠ Manueller Schritt» in die Release-Notiz).

**Regeln für Releases**

- **Vor jedem Release (Beta oder stabil) ausdrücklich fragen** und auf ein Ja warten. Ein Ja
  gilt nur für dieses eine Release.
- Den Push **nie durch eine Pipe** schicken (`git push … | tail`) – sonst geht ein Fehler
  verloren. Erst pushen, dann mit `git ls-remote` prüfen, dann das Release mit `--target`.
- Nach dem Release die GitHub-Workflows **nicht** beobachten, ausser die Person bittet darum.
- Release-Notizen auf Deutsch, für die Benutzer verständlich.

## Wo was liegt

- `src/routes/` Seiten, `src/lib/server/` Server-Logik, `src/lib/components/` Bausteine
- `src/lib/schedule.ts` Zeitlogik, `src/lib/scoring.ts` Wertung, `src/lib/mail-texts.ts` Texte
- `drizzle/` Migrationen, `scripts/` Start, Sicherung, Versionen
- `compose.yaml` stabile Instanz, `compose.beta.yaml` Beta-Instanz, `*.env.example` Vorlagen
- `.github/workflows/` CI (Prüfungen) und Release (Docker-Image)
