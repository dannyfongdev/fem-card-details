<script>
    import { cardStore } from "../components/CardStore";
    let cName;
    let cNumber;
    let expMonth;
    let expYear;
    let cvc;
    $: $cardStore.name = cName;
    $: $cardStore.number = cNumber;
    $: $cardStore.month = expMonth;
    $: $cardStore.year = expYear;
    $: $cardStore.cvc = cvc;

    const handleBlur = () => {
        cNumber = format(cNumber);
    }
    function format(s) {
        return s.toString().replace(/\d{4}(?=.)/g, '$& ');
    }
</script>

<form>
  <label for="c-name">Cardholder Name</label>
  <input
    type="text"
    id="c-name"
    placeholder="Jane Appleseed"
    bind:value={cName}
  />
  <label for="c-number">Card Number</label>
  <input
    on:blur={handleBlur}
    type="text"
    id="c-number"
    placeholder="1234 5678 9123 0000"
    bind:value={cNumber}
  />
  <label for="exp-month">Exp. Date</label>
  <input type="text" id="exp-month" placeholder="MM" bind:value={expMonth} />
  <input type="text" id="exp-year" placeholder="YY" bind:value={expYear} />
  <label for="cvc">CVC</label>
  <input type="text" id="cvc" placeholder="e.g. 123" bind:value={cvc} />
  <button>Confirm</button>
</form>

<style>
</style>
