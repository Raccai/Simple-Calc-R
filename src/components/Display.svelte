<script>
    export let display = "";
    export let prevDisplay = "";
</script>

<div class="display">
    <div class="prevDisplay">
        <input type="text" disabled bind:value = {prevDisplay}>
    </div>
    <div id="display">
        <input type="text" disabled bind:value = {display}>
    </div>
</div>

<style>

</style>