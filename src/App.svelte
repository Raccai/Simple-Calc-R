<script>
	import Card from "./components/Card.svelte";
	import Table from "./components/Table.svelte";
	import Header from "./components/Header.svelte";
</script>

<main>
	<Header />
	<Card>
		<Table />
	</Card>
</main>

<style>
	main {
		display: grid;
		grid-template-columns: 100px;
		grid-template-rows: 100px 100px;
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0px auto;
		margin-top: 100px;
	}
</style>