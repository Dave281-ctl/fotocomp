<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="page">
	<p class="eyebrow">Heute</p>
	<h1>Hallo {data.user?.name}</h1>
</div>
