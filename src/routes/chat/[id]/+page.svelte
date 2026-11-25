<script lang="ts">
	import ChatWindow from '#lib/components/chat/ChatWindow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.header.title} · Chat · Fotocomp</title></svelte:head>

<!-- Pro Chat ein neues Fenster (eigener Verlauf und Zustand) -->
{#key data.chat.id}
	<ChatWindow
		chat={data.chat}
		header={data.header}
		people={data.people}
		initial={data.messages}
		more={data.more}
		lastRead={data.lastRead}
		write={data.write}
		muted={data.muted}
		retention={data.retention}
		me={data.me}
	/>
{/key}
