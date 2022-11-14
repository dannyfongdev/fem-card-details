<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

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
  };
  function format(s) {
    return s.toString().replace(/\d{4}(?=.)/g, "$& ");
  }

  const handleConfirm = () => {
    dispatch("confirm", "success");
  }
</script>

<div class="container">
  <form>
    <div class="input-group">
      <label for="c-name">Cardholder Name</label>
      <input
        type="text"
        id="c-name"
        placeholder="e.g. Jane Appleseed"
        bind:value={cName}
      />
    </div>
    <div class="input-group">
      <label for="c-number">Card Number</label>
      <input
        on:blur={handleBlur}
        type="text"
        id="c-number"
        placeholder="e.g. 1234 5678 9123 0000"
        bind:value={cNumber}
      />
    </div>
    <div class="input-group">
      <div class="flex-group">
        <label for="exp-month" class="expire-padding-right"
          >Exp. Date (MM/YY)</label
        ><label for="cvc">CVC</label>
      </div>
      <div class="grid-group">
        <input
          type="text"
          id="exp-month"
          placeholder="MM"
          bind:value={expMonth}
        />
        <input
          type="text"
          id="exp-year"
          placeholder="YY"
          bind:value={expYear}
        />
        <input type="text" id="cvc" placeholder="e.g. 123" bind:value={cvc} />
      </div>
    </div>
    <button on:click|preventDefault={handleConfirm}>Confirm</button>
  </form>
</div>

<style>
  .container {
    max-width: 720px;
    min-width: 500px;
    padding-top: 250px;
  }
  form {
    width: 375px;
    padding: 25px;
    margin: auto;
  }
  input {
    width: 100%;
    color: #aaa; /* fix color */
    /* outline-style: solid; */
    outline-color: #aaa;
    border-radius: 10px;
    padding: 0.5em 0.9em;
    margin-bottom: 1rem;
  }
  label {
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.1rem;
    margin-bottom: 0.5em;
  }
  button {
    width: 100%;
    border-radius: 10px;
    color: white;
    background-color: purple; /* fix color */
    padding: 0.7rem;
  }
  .flex-group {
    display: flex;
  }
  .grid-group {
    display: grid;
    grid-template-columns: 1fr 1fr 2fr;
    gap: 0.5rem;
  }
  .expire-padding-right {
    padding-right: 1.6rem;
  }
  @media (min-width: 800px) {
    form {
      width: 430px;
      padding: 25px;
    }
  }
</style>
