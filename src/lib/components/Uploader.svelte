<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { FileImage, ImagePlus } from '@lucide/svelte';

	let {
		themeId,
		feedbackDefault,
		maxMb,
		replacing = false,
		error
	}: {
		themeId: number;
		feedbackDefault: boolean;
		maxMb: number;
		replacing?: boolean;
		error?: string;
	} = $props();

	/** Alles, was der Server lesen kann (siehe convert.ts). */
	const ACCEPT = [
		'image/*',
		'.heic',
		'.heif',
		'.avif',
		'.tif',
		'.tiff',
		...'dng cr2 cr3 crw nef nrw arw srf sr2 raf orf ori rw2 rwl pef srw x3f 3fr iiq erf'
			.split(' ')
			.map((e) => `.${e}`)
	].join(',');

	let form: HTMLFormElement;
	let input: HTMLInputElement;
	let file = $state<File | null>(null);
	let preview = $state<string | null>(null);
	/** Der Browser kann manche Formate (HEIC in Chrome, RAW überall) nicht anzeigen. */
	let previewFailed = $state(false);
	let busy = $state(false);
	let progress = $state(0);
	let localError = $state('');

	const sizeMb = $derived(file ? file.size / 1024 / 1024 : 0);
	const tooBig = $derived(sizeMb > maxMb);

	function show(f: File | undefined | null) {
		if (preview) URL.revokeObjectURL(preview);
		file = f ?? null;
		preview = f ? URL.createObjectURL(f) : null;
		previewFailed = false;
		localError = '';
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const f = e.dataTransfer?.files[0];
		if (!f) return;
		const list = new DataTransfer();
		list.items.add(f);
		input.files = list.files;
		show(f);
	}
	let dragging = $state(false);

	/** Hochladen mit Fortschrittsanzeige (fetch kann keinen Upload-Fortschritt melden). */
	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (busy || tooBig) return;
		busy = true;
		progress = 0;
		localError = '';
		const xhr = new XMLHttpRequest();
		xhr.open('POST', form.action);
		xhr.setRequestHeader('accept', 'application/json');
		xhr.setRequestHeader('x-sveltekit-action', 'true');
		xhr.upload.onprogress = (ev) => {
			if (ev.lengthComputable) progress = ev.loaded / ev.total;
		};
		try {
			await new Promise<void>((resolve, reject) => {
				xhr.onload = () => resolve();
				xhr.onerror = () => reject(new Error('network'));
				xhr.send(new FormData(form));
			});
			if (xhr.status === 413) {
				localError = 'Die Datei ist zu gross für den Server.';
				return;
			}
			const result = deserialize(xhr.responseText);
			if (result.type === 'success') {
				form.reset();
				show(null);
				await invalidateAll();
			}
			await applyAction(result);
		} catch {
			localError =
				'Das Hochladen hat nicht geklappt. Bitte Verbindung prüfen und nochmals versuchen.';
		} finally {
			busy = false;
		}
	}
</script>

<form
	bind:this={form}
	method="POST"
	action="?/upload"
	enctype="multipart/form-data"
	class="stack"
	onsubmit={submit}
>
	<input type="hidden" name="theme" value={themeId} />
	<label
		class="drop"
		class:dragging
		class:has-preview={preview && !previewFailed}
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
	>
		{#if file && preview && !previewFailed}
			<img src={preview} alt="Vorschau" onerror={() => (previewFailed = true)} />
		{:else if file}
			<FileImage size={36} strokeWidth={1.2} />
			<span class="title">{file.name}</span>
			<span class="muted small">
				{sizeMb.toFixed(1)} MB · Die Vorschau erscheint nach dem Hochladen.
			</span>
		{:else}
			<ImagePlus size={36} strokeWidth={1.2} />
			<span class="title">{replacing ? 'Anderes Foto wählen' : 'Foto des Tages wählen'}</span>
			<span class="muted small">
				Antippen oder hierher ziehen · JPEG, HEIC, PNG, WebP oder RAW (z.B. DNG) bis {maxMb} MB
			</span>
		{/if}
		<input
			bind:this={input}
			class="visually-hidden"
			type="file"
			name="photo"
			accept={ACCEPT}
			required
			onchange={() => show(input.files?.[0])}
		/>
	</label>

	{#if busy}
		<div class="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
			<span style="width: {progress * 100}%"></span>
		</div>
	{/if}

	{#if file}
		<div class="row" style="justify-content: space-between">
			<label class="check">
				<input type="checkbox" name="feedback" checked={feedbackDefault} />
				Feedback willkommen
			</label>
			<button class="btn accent" disabled={busy || tooBig}>
				{#if busy}
					{progress < 1
						? `Wird hochgeladen … ${Math.round(progress * 100)} %`
						: 'Wird verarbeitet …'}
				{:else}
					{replacing ? 'Foto ersetzen' : 'Hochladen'}
				{/if}
			</button>
		</div>
	{/if}
	{#if tooBig}
		<p class="error">Das Foto ist grösser als {maxMb} MB.</p>
	{/if}
	{#if localError || error}<p class="error">{localError || error}</p>{/if}
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
		overflow-wrap: anywhere;
	}

	.progress {
		height: 4px;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}

	.progress span {
		display: block;
		height: 100%;
		background: var(--accent);
		transition: width 0.2s;
	}
</style>
