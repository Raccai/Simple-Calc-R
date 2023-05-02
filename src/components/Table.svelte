<script>
    import Display from "./Display.svelte";

    let display = "";
    let prevDisplay = "";

    const doMath = (type) => {
        if (type == "clear") {
            display = "";
            prevDisplay = "";
        } else if (type == "delete") {
            let displayText = display;
            display = displayText.substring(0, displayText.length - 1);
        } else if (display != "" && type == "equate") {
            prevDisplay = display;
            display = eval(display);
        } else if (display == "" && type == "equate") {
            display = "Empty: Nothing to Equate";
            setTimeout(() => (display = ""), 2000);
        } else {
            display += type;
        }

        console.log(display);
    }
</script>

<Display {display} {prevDisplay} />
<table>
    <tr>
        <td><button class="btn-operation" on:click={() => doMath("clear")}>C</button></td>
        <td><button class="btn-operation" on:click={() => doMath("*")}>&times</button></td>
        <td><button class="btn-operation" on:click={() => doMath("/")}>&divide</button></td>
        <td><button class="btn-operation" on:click={() => doMath("delete")}>Del</button></td>
    </tr>
    <tr>
        <td><button class="btn-number" on:click={() => doMath("7")}>7</button></td>
        <td><button class="btn-number" on:click={() => doMath("8")}>8</button></td>
        <td><button class="btn-number" on:click={() => doMath("9")}>9</button></td>
        <td><button class="btn-operation" on:click={() => doMath("+")}>+</button></td>
    </tr>
    <tr>
        <td><button class="btn-number" on:click={() => doMath("4")}>4</button></td>
        <td><button class="btn-number" on:click={() => doMath("5")}>5</button></td>
        <td><button class="btn-number" on:click={() => doMath("6")}>6</button></td>
        <td><button class="btn-operation" on:click={() => doMath("-")}>-</button></td>
    </tr>
    <tr>
        <td><button class="btn-number" on:click={() => doMath("1")}>1</button></td>
        <td><button class="btn-number" on:click={() => doMath("2")}>2</button></td>
        <td><button class="btn-number" on:click={() => doMath("3")}>3</button></td>
        <td><button class="btn-operation" on:click={() => doMath(".")}>.</button></td>
    </tr>
    <tr>
        <td><button class="btn-number" on:click={() => doMath("0")}>0</button></td>
        <td><button class="btn-operation" on:click={() => doMath("(")}>(</button></td>
        <td><button class="btn-operation" on:click={() => doMath(")")}>)</button></td>
        <td><button class="btn-operation" on:click={() => doMath("equate")}>=</button></td>
    </tr>
</table>

<style>
    button {
        height: 50px;
        width: 50px;
        border-radius: 50px;
        font-size: 18px;
        cursor: pointer;
        border: 0;
        margin: 3px;
        transition: all 0.2s ease;
    }

    button:hover {
        transform: scale(1.09);
    }

    button:focus {
        border: 2px solid #17B169;
    }
</style>