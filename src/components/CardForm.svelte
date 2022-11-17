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
    if (cNumber !== undefined) {
      cNumber = format(cNumber);
    }
  };
  function format(s) {
    // add spaces for readability
    return s.toString().replace(/\d{4}(?=.)/g, "$& ");
  }

  const handleFocus = () => {
    // take away spaces
    try {
      cNumber = cNumber.replace(/ /g, "");
    } catch {}
  };

  // Error Handling
  let isErrorName = false;
  let msgErrorName = "";

  let isErrorNum = false;
  let msgErrorNum = "";

  let isErrorMonth = false;
  let isErrorYear = false;
  let msgErrorMonthYear = "";

  let isErrorCvc = false;
  let msgErrorCvc = "";

  // only allow numbers and spaces
  const regex = new RegExp("^[0-9 ]*$");
  function IsValidNum(s) {
    return regex.test(s);
  }

  const IsValidData = () => {
    let valid = true;
    // validate name
    if (cName === undefined) {
      isErrorName = true;
      msgErrorName = "Can't be blank";
      valid = false;
    } else if (cName.length < 6) {
      isErrorName = true;
      msgErrorName = "Must be at least six characters";
      valid = false;
    } else {
      isErrorName = false;
      msgErrorName = "";
    }
    // validate credit card number
    if (!IsValidNum(cNumber)) {
      isErrorNum = true;
      msgErrorNum = "Wrong format, numbers only";
      valid = false;
    } else if (cNumber.length != 19) {
      isErrorNum = true;
      msgErrorNum = "Wrong format, less than 16 digits";
      valid = false;
    } else {
      isErrorNum = false;
      msgErrorNum = "";
    }
    // validate expiration month
    if (expMonth === undefined) {
      isErrorMonth = true;
      msgErrorMonthYear = "Can't be blank";
      valid = false;
    } else if (expMonth.length < 2) {
      isErrorMonth = true;
      msgErrorMonthYear = "Must be two digits";
      valid = false;
    } else {
      isErrorMonth = false;
      msgErrorMonthYear = "";
    }
    // validate expiration year
    if (expYear === undefined) {
      isErrorYear = true;
      msgErrorMonthYear = "Can't be blank";
      valid = false;
    } else if (expYear.length < 2) {
      isErrorYear = true;
      msgErrorMonthYear = "Must be two digits";
      valid = false;
    } else {
      isErrorYear = false;
      msgErrorMonthYear = "";
    }
    // valiate cvc
    if (cvc === undefined) {
      isErrorCvc = true;
      msgErrorCvc = "Can't be blank";
      valid = false;
    } else if (cvc.length === 0) {
      isErrorCvc = true;
      msgErrorCvc = "Can't be blank";
      valid = false;
    } else if (cvc.length < 3) {
      isErrorCvc = true;
      msgErrorCvc = "Must be three digits";
      valid = false;
    } else {
      isErrorCvc = false;
      msgErrorCvc = "";
    }
    return valid;
  };

  const handleConfirm = () => {
    if (IsValidData()) {
      dispatch("confirm", "success");
    }
  };
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
        class:outline-error={isErrorName}
      />
      {#if isErrorName}<div class="is-error">
          {msgErrorName}
        </div>{/if}
    </div>
    <div class="input-group">
      <label for="c-number">Card Number</label>
      <input
        on:blur={handleBlur}
        on:focus={handleFocus}
        type="text"
        id="c-number"
        placeholder="e.g. 1234 5678 9123 0000"
        bind:value={cNumber}
        maxlength="16"
        class:outline-error={isErrorNum}
      />
      {#if isErrorNum}<div class="is-error">
          {msgErrorNum}
        </div>{/if}
    </div>
    <div class="input-group">
      <div class="grid-group">
        <label for="exp-month" class="two-column">Exp. Date (MM/YY)</label
        ><label for="cvc">CVC</label>
        <input
          type="text"
          id="exp-month"
          placeholder="MM"
          bind:value={expMonth}
          maxlength="2"
          class:outline-error={isErrorMonth}
        />
        <input
          type="text"
          id="exp-year"
          placeholder="YY"
          bind:value={expYear}
          maxlength="2"
          class:outline-error={isErrorYear}
        />
        <input
          type="text"
          id="cvc"
          placeholder="e.g. 123"
          bind:value={cvc}
          maxlength="3"
          class:outline-error={isErrorCvc}
        />
        {#if isErrorMonth || isErrorYear || isErrorCvc}
          <div class="two-column is-error">
            {msgErrorMonthYear}
          </div>
          <div class="is-error">
            {msgErrorCvc}
          </div>
        {/if}
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
    color: var(--neutral-color-4);
    border-style: solid;
    border-color: var(--neutral-color-2); 
    border-radius: 10px;
    padding: 0.5em 0.9em;
    margin-bottom: 0;
  }
  input::placeholder {
    color: var(--neutral-color-2);
  }
  input:focus {
    outline-style: solid;
    outline-color: var(--secondary-color);
    /* border-image-source: linear-gradient(
      hsl(249, 99%, 64%),
      hsl(278, 94%, 30%)
    );
    border-width: 1px;
    border-image-slice: 1;
    border-radius: 10px; */
  }
  label {
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.1rem;
    margin-bottom: 0.5em;
    margin-top: 1rem;
    color: var(--neutral-color-4);
  }
  button {
    width: 100%;
    border-radius: 10px;
    color: white;
    background-color: var(--neutral-color-4);
    padding: 0.7rem;
    margin-top: 1.6rem;
  }
  button:hover {
    background: var(--secondary-color);
  }
  .grid-group {
    display: grid;
    grid-template-columns: 1fr 1fr 2fr;
    column-gap: 0.5rem;
  }
  .two-column {
    grid-column: 1 / 3;
  }
  .is-error {
    color: var(--error-color);
    font-size: 0.7rem;
    padding-top: 0.3rem;
  }
  .outline-error {
    outline-style: solid;
    outline-color: var(--error-color);
  }
  @media (min-width: 800px) {
    form {
      width: 430px;
      padding: 25px;
    }
  }
</style>
