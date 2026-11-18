import nodemailer, { type Transporter } from 'nodemailer';
import { config } from './config.ts';

let transport: Transporter | undefined;

function getTransport() {
	transport ??= nodemailer.createTransport({
		host: config.smtp.host,
		port: config.smtp.port,
		secure: config.smtp.secure,
		auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
	});
	return transport;
}

export function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}

interface MailContent {
	subject: string;
	/** Absätze als reiner Text; sie werden für HTML automatisch maskiert. */
	paragraphs: string[];
	button?: { label: string; url: string };
	/** Optional hervorgehobener Code, z.B. der Login-Code. */
	code?: string;
	footer?: string;
}

/** Schlichtes, einheitliches Mail-Layout (HTML + Text). */
function render({ subject, paragraphs, button, code, footer }: MailContent) {
	const p = (t: string) =>
		`<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#2b2b2b">${escapeHtml(t)}</p>`;
	const html = `<!doctype html><html><body style="margin:0;background:#f4f2ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:14px" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 32px">
<div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8a8478;margin-bottom:24px">Fotocomp</div>
<h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#111">${escapeHtml(subject)}</h1>
${paragraphs.map(p).join('')}
${button ? `<p style="margin:28px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-size:15px;font-weight:500">${escapeHtml(button.label)}</a></p>` : ''}
${code ? `<p style="margin:0 0 16px;font-size:14px;color:#6b665e">Oder gib diesen Code ein:</p><p style="margin:0 0 24px;font-size:30px;letter-spacing:.3em;font-weight:600;color:#111">${escapeHtml(code)}</p>` : ''}
${footer ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#8a8478">${escapeHtml(footer)}</p>` : ''}
</td></tr></table></td></tr></table></body></html>`;

	const text = [
		subject,
		'',
		...paragraphs.flatMap((t) => [t, '']),
		...(button ? [`${button.label}: ${button.url}`, ''] : []),
		...(code ? [`Code: ${code}`, ''] : []),
		...(footer ? [footer] : [])
	].join('\n');

	return { html, text };
}

export async function sendMail(to: string, content: MailContent) {
	const { html, text } = render(content);
	await getTransport().sendMail({
		from: config.smtp.from,
		to,
		subject: content.subject,
		html,
		text
	});
}

// --------------------------------------------------------------- Mailvorlagen

export function sendLoginMail(to: string, url: string, code: string, isNew: boolean) {
	return sendMail(to, {
		subject: isNew ? 'Willkommen bei Fotocomp' : 'Dein Login-Link',
		paragraphs: [
			isNew
				? 'Schön, dass du dabei bist! Bestätige deine Adresse mit einem Klick, dann geht es los.'
				: 'Klicke auf den Knopf, um dich anzumelden. Der Link ist 15 Minuten gültig.'
		],
		button: { label: isNew ? 'Registrierung bestätigen' : 'Jetzt anmelden', url },
		code,
		footer: 'Falls du das nicht angefordert hast, kannst du diese Mail einfach ignorieren.'
	});
}
