<script>
  import { cardStore } from "../components/CardStore";

  // If undefined, set default values
  $: cName = typeof ($cardStore.name) === "undefined" ? "Jane Appleseed" : $cardStore.name;
  $: cNumber = typeof ($cardStore.number) === "undefined" ? "0000 0000 0000 0000" : $cardStore.number;
  $: cvc = typeof ($cardStore.cvc) === "undefined" ? "000" : $cardStore.cvc;
  $: expDate = (typeof ($cardStore.month) === "undefined" ? "00" :  $cardStore.month) + "/" + (typeof ($cardStore.year) === "undefined" ? "00" :  $cardStore.year);
</script>

<div class="card-preview">
  <div class="top">
    <img
      class="card-back"
      src="/images/bg-card-back.png"
      alt="back of credit card"
    />
    <p class="cvc">{cvc}</p>
    <img
      class="card-front"
      src="/images/bg-card-front.png"
      alt="front of credit card"
    />
    <p class="card-num">{cNumber}</p>
    <p class="card-name">{cName}</p>
    <p class="exp-date">{expDate}</p>
  </div>
</div>

<style>
  /* Mobile design 375 x 700 */
  .card-preview {
    position: relative;
    max-width: 375px;
    padding: 0;
  }
  .top {
    height: 240px;
    width: 375px;
    background: url("/images/bg-main-mobile.png");
    margin-bottom: 90px;
  }
  .card-front,
  .card-back {
    position: absolute;
    width: 290px;
  }
  .card-back {
    top: 30px;
    left: 70px;
    height: 160px;
  }
  .card-front {
    top: 120px;
    left: 15px;
    height: 160px;
  }
  .card-num {
    position: relative;
    top: 190px;
    left: 40px;
    z-index: 5;
    font-size: 1rem;
    letter-spacing: 0.1em;
    color: white;
    text-align: left;
    margin-bottom: 18px;
  }
  .card-name {
    position: relative;
    top: 190px;
    left: 40px;
    font-size: 0.6rem;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .exp-date {
    position: relative;
    top: 178px;
    right: 90px;
    font-size: 0.6rem;
    color: white;
    letter-spacing: 0.1em;
    text-align: right;
  }
  .cvc {
    position: relative;
    top: 100px;
    right: 46px;
    z-index: 5;
    font-size: 0.8rem;
    color: white;
    text-align: right;
  }
</style>
