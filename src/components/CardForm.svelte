<script>
    import { cardStore } from "../components/CardStore";
    let cvc;
    $: console.log(cvc);
    $: $cardStore.cvc = cvc;
</script>

<form>
  <label for="c-name">Cardholder Name</label>
  <input type="text" id="c-name" placeholder="Jane Appleseed"/>
  <label for="c-number">Card Number</label>
  <input type="text" id="c-number" placeholder="1234 5678 9123 0000"/>
  <label for="exp-month">Exp. Date</label>
  <input type="text" id="exp-month" placeholder="MM"/>
  <input type="text" id="exp-year" placeholder="YY"/>
  <label for="cvc">CVC</label>
  <input type="text" id="cvc" placeholder="e.g. 123" bind:value={cvc}/>
  <button>Confirm</button>
</form>

<style>
</style>
