<script lang="ts">
	import { enhance } from '$app/forms';
	import { Copy, MessageCircle, Share2 } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let copied = $state(false);
	const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

	const message = $derived(
		`${data.user?.name} lädt dich zu Fotocomp ein – unserem kleinen Foto-Wettbewerb unter Freunden. Jeden Tag ein Foto zum Thema, am Abend wird bewertet. Hier kannst du mitmachen:`
	);

	async function share(link: string) {
		try {
			await navigator.share({ title: 'Einladung zu Fotocomp', text: message, url: link });
		} catch {
			// abgebrochen
		}
	}

	async function copy(link: string) {
		await navigator.clipboard.writeText(`${message} ${link}`);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	const date = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' });
	const status = (i: (typeof data.invitations)[number]) =>
		i.acceptedName
			? `Angenommen von ${i.acceptedName}`
			: i.expiresAt < new Date()
				? 'Abgelaufen'
				: `Offen bis ${date.format(i.expiresAt)}`;
</script>

<svelte:head><title>Freunde einladen · Fotocomp</title></svelte:head>

<div class="page narrow stack" style="--gap: 40px">
	<div class="stack" style="--gap: 6px">
		<a class="eyebrow" href="/profil">← Profil</a>
		<h1>Freunde einladen</h1>
		<p class="muted">
			Je mehr mitmachen, desto mehr Freude. Jede Einladung gilt 14 Tage und einmalig.
		</p>
	</div>

	<section class="stack">
		<h2>Per E-Mail</h2>
		<form method="POST" action="?/email" class="row" style="flex-wrap: nowrap" use:enhance>
			<input type="email" name="email" placeholder="freund@example.com" required />
			<button class="btn primary">Senden</button>
		</form>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		{#if form?.sent}<p class="muted small">Einladung an {form.sent} gesendet.</p>{/if}
	</section>

	<section class="stack">
		<h2>Per Signal, WhatsApp, Matrix …</h2>
		{#if form?.link}
			<div class="card stack" style="--gap: 14px">
				<code>{form.link}</code>
				<div class="row" style="--gap: 8px">
					{#if canShare}
						<button class="btn primary small" onclick={() => share(form.link!)}>
							<Share2 size={16} /> Teilen
						</button>
					{/if}
					<a
						class="btn small"
						href="https://wa.me/?text={encodeURIComponent(`${message} ${form.link}`)}"
						target="_blank"
						rel="noopener noreferrer"
					>
						<MessageCircle size={16} /> WhatsApp
					</a>
					<button class="btn small" onclick={() => copy(form.link!)}>
						<Copy size={16} />
						{copied ? 'Kopiert' : 'Link kopieren'}
					</button>
				</div>
				<p class="muted small">
					«Teilen» öffnet auf dem Handy das Teilen-Menü – dort findest du Signal, Element (Matrix),
					WhatsApp und weitere Apps.
				</p>
			</div>
		{:else}
			<form method="POST" action="?/link" use:enhance>
				<button class="btn">Einladungslink erstellen</button>
			</form>
		{/if}
	</section>

	{#if data.invitations.length}
		<section class="stack" style="--gap: 4px">
			<h2>Deine Einladungen</h2>
			{#each data.invitations as invitation (invitation.id)}
				<div class="row line">
					<span>{invitation.email ?? 'Link'}</span>
					<span class="muted small">{status(invitation)}</span>
					{#if !invitation.acceptedName}
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="id" value={invitation.id} />
							<button class="btn ghost small">Zurückziehen</button>
						</form>
					{/if}
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	code {
		font-size: 13px;
		word-break: break-all;
		color: var(--muted);
	}

	.line {
		justify-content: space-between;
		padding: 10px 0;
		border-bottom: 1px solid var(--line);
	}

	.line > span:first-child {
		flex: 1;
	}
</style>
