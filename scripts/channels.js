// Für den Release-Workflow: Welche Image-Tags bekommt diese Version?
//   node scripts/channels.js v0.9.0-beta.1 < liste-aller-release-tags.txt
// Ausgabe (für $GITHUB_OUTPUT):
//   latest=true|false  – stabile Plattform (nur die neueste stabile Version)
//   beta=true|false    – Beta-Instanz (die neueste Version überhaupt, auch stabil)
import { readFileSync } from 'node:fs';
import { isPrerelease, newestVersion } from './semver.js';

const version = process.argv[2];
const all = [...new Set([version, ...readFileSync(0, 'utf8').split(/\s+/).filter(Boolean)])];
const latest = !isPrerelease(version) && newestVersion(all, { stableOnly: true }) === version;
const beta = newestVersion(all) === version;
console.log(`latest=${latest}`);
console.log(`beta=${beta}`);
