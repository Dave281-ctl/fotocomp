<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';

	/** Zurück-Knopf im Stil von «‹ Themen»: deutlich sichtbar, grosse Tippfläche. */
	let { href, label }: { href: string; label: string } = $props();
</script>

<a class="back" {href} data-back-link><ChevronLeft size={22} strokeWidth={2.2} />{label}</a>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		width: fit-content;
		min-height: 44px;
		margin-left: -8px;
		padding: 0 10px 0 2px;
		border-radius: 999px;
		color: var(--text);
		font-size: 16px;
		font-weight: 700;
		transition: background 0.15s;
	}

	.back:hover {
		background: var(--surface);
	}
</style>
