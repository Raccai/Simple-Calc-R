<script>
	import Card from "./components/Card.svelte";
	import Table from "./components/Table.svelte";
	import Header from "./components/Header.svelte";
</script>

<Header />
<main>
	<Card>
		<Table />
	</Card>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
</style>