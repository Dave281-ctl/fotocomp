<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, children }: { title: string; children: Snippet } = $props();
</script>

<div class="wrap">
	<div class="inner stack" style="--gap: 28px">
		<div class="eyebrow">Fotocomp</div>
		<h1>{title}</h1>
		{@render children()}
	</div>
</div>

<style>
	.wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 32px var(--gutter);
	}

	.inner {
		width: 100%;
		max-width: 380px;
	}
</style>
