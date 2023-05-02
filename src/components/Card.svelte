<div class="card">
    <slot></slot>
</div>

<style>
    .card {
        text-align: center;
        max-width: 900px;
        width: auto;
        height: auto;
        padding: 10px 40px 20px 40px;
        border-radius: 10px;
        background: #fff;
        box-shadow: 1px 3px 6px rgba(0, 34, 78, 0.3);

        display: grid;
        place-items: center;
    }
</style>