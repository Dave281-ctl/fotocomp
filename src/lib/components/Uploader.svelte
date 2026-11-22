<script lang="ts">
	import { enhance } from '$app/forms';
	import { ImagePlus } from '@lucide/svelte';

	let {
		themeId,
		feedbackDefault,
		replacing = false,
		error
	}: { themeId: number; feedbackDefault: boolean; replacing?: boolean; error?: string } = $props();

	let input: HTMLInputElement;
	let preview = $state<string | null>(null);
	let busy = $state(false);
	let dragging = $state(false);

	function show(file: File | undefined) {
		if (preview) URL.revokeObjectURL(preview);
		preview = file ? URL.createObjectURL(file) : null;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const file = e.dataTransfer?.files[0];
		if (!file) return;
		const list = new DataTransfer();
		list.items.add(file);
		input.files = list.files;
		show(file);
	}
</script>

<form
	method="POST"
	action="?/upload"
	enctype="multipart/form-data"
	class="stack"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update();
			busy = false;
			show(undefined);
		};
	}}
>
	<input type="hidden" name="theme" value={themeId} />
	<label
		class="drop"
		class:dragging
		class:has-preview={preview}
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
	>
		{#if preview}
			<img src={preview} alt="Vorschau" />
		{:else}
			<ImagePlus size={36} strokeWidth={1.2} />
			<span class="title">{replacing ? 'Anderes Foto wählen' : 'Foto des Tages wählen'}</span>
			<span class="muted small">Antippen oder hierher ziehen · JPEG, PNG, WebP bis 50 MB</span>
		{/if}
		<input
			bind:this={input}
			class="visually-hidden"
			type="file"
			name="photo"
			accept="image/jpeg,image/png,image/webp"
			required
			onchange={() => show(input.files?.[0])}
		/>
	</label>

	{#if preview}
		<div class="row" style="justify-content: space-between">
			<label class="check">
				<input type="checkbox" name="feedback" checked={feedbackDefault} />
				Feedback willkommen
			</label>
			<button class="btn accent" disabled={busy}>
				{busy ? 'Wird hochgeladen …' : replacing ? 'Foto ersetzen' : 'Hochladen'}
			</button>
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</form>

<style>
	.drop {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 300px;
		border-radius: var(--radius);
		border: 1.5px dashed color-mix(in srgb, var(--muted) 45%, transparent);
		background: var(--surface);
		color: var(--text);
		cursor: pointer;
		text-align: center;
		padding: 24px;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.drop:hover,
	.drop.dragging {
		border-color: var(--accent);
	}

	.drop.has-preview {
		border: 0;
		padding: 0;
		background: var(--photo-bg);
		overflow: hidden;
	}

	.drop img {
		max-height: 70vh;
		width: 100%;
		object-fit: contain;
	}

	.title {
		font-size: 18px;
		font-weight: 500;
	}
</style>
