<script>
  import { cardStore } from "../components/CardStore";
  console.log($cardStore);
  $: console.log("preview" + $cardStore.cvc);
</script>

<div class="card-preview">
  <div class="top">
    <img
      class="card-back"
      src="/images/bg-card-back.png"
      alt="back of credit card"
    />
    <p class="cvc">{$cardStore.cvc}</p>
    <img
      class="card-front"
      src="/images/bg-card-front.png"
      alt="front of credit card"
    />
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
    /* z-index: 4; */
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
  .cvc {
    position: relative;
    top: -140px;
    right: 46px;
    z-index: 5;
    font-size: 0.8rem;
    color: white;
    text-align: right;
  }
</style>
