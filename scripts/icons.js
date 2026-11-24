// Erzeugt Logo und App-Icons (Blende) in static/ – nur bei Änderungen am Logo nötig:
//   node scripts/icons.js
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const BG = '#0b0b0c';
const CREAM = '#e8e3d9';
const GOLD = '#c9a96e';

/** Blende: Ring, sechs Lamellen-Kanten, goldenes Sechseck in der Mitte. */
function aperture({ ring = 44, blade = 30, color = CREAM, center = GOLD } = {}) {
	const C = 512;
	const R = 300;
	const h = 120;
	const pts = Array.from({ length: 6 }, (_, i) => {
		const a = ((90 + 60 * i) * Math.PI) / 180;
		return [C + h * Math.cos(a), C - h * Math.sin(a)];
	});
	let lines = '';
	for (let i = 0; i < 6; i++) {
		const [a, b] = [pts[i], pts[(i + 1) % 6]];
		let [dx, dy] = [a[0] - b[0], a[1] - b[1]];
		const n = Math.hypot(dx, dy);
		[dx, dy] = [dx / n, dy / n];
		const [px, py] = [b[0] - C, b[1] - C];
		const B = 2 * (px * dx + py * dy);
		const t = (-B + Math.sqrt(B * B - 4 * (px * px + py * py - R * R))) / 2;
		const e = [b[0] + t * dx, b[1] + t * dy];
		lines += `<line x1="${b[0].toFixed(1)}" y1="${b[1].toFixed(1)}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" stroke="${color}" stroke-width="${blade}" stroke-linecap="round"/>`;
	}
	const hex = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
	return `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${color}" stroke-width="${ring}"/>${lines}<polygon points="${hex}" fill="${center}"/>`;
}

const svg = (body, bg = `<rect width="1024" height="1024" fill="${BG}"/>`) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg}${body}</svg>`;

// Icon mit abgerundeten Ecken (Browser, Favicon) und randlos (Android «maskable», iOS rundet selbst)
const rounded = svg(aperture(), `<rect width="1024" height="1024" rx="230" fill="${BG}"/>`);
const fullBleed = svg(aperture());
// Für kleine Grössen kräftigere Linien
const favicon = svg(
	aperture({ ring: 70, blade: 52 }),
	`<rect width="1024" height="1024" rx="230" fill="${BG}"/>`
);
// Android-Statusleiste: einfarbig weiss auf transparent
const badge = svg(aperture({ ring: 70, blade: 52, color: '#fff', center: '#fff' }), '');
// Ohne Hintergrund für die Kopfzeile (Farben kommen aus dem CSS)
const mark = svg(aperture({ ring: 64, blade: 48, color: 'currentColor', center: GOLD }), '');

writeFileSync('static/favicon.svg', favicon);
writeFileSync('static/icons/logo.svg', rounded);
writeFileSync('src/lib/components/logo-mark.svg', mark);

const png = (src, size, file) => sharp(Buffer.from(src)).resize(size, size).png().toFile(file);
await Promise.all([
	png(rounded, 192, 'static/icons/icon-192.png'),
	png(rounded, 512, 'static/icons/icon-512.png'),
	png(fullBleed, 512, 'static/icons/maskable-512.png'),
	png(fullBleed, 180, 'static/icons/apple-touch-icon.png'),
	png(badge, 96, 'static/icons/badge-96.png')
]);
console.log('Icons erzeugt.');
