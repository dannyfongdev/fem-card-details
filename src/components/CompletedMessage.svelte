<script>
</script>

<div class="container">
  <img src="/images/icon-complete.svg" alt="check mark" />
  <h2>Thank You!</h2>
  <p>We've added your card details</p>
  <a href="/" class="btn">Continue</a>
</div>

<style>
  .container {
    max-width: 600px;
    text-align: center;
    padding: 0 25px;
    margin: auto;
  }
  img {
    margin-bottom: 40px;
  }
  h2 {
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 0.2rem;
    color: var(--neutral-color-4);
  }
  p {
    margin-bottom: 40px;
    color: var(--neutral-color-3);
  }
  .btn {
    display: block;
    text-decoration: none;
    width: 100%;
    padding: 0.7rem;
    border-radius: 10px;
    background: var(--neutral-color-4);
    color: var(--neutral-color-1);
  }
  .btn:hover {
    background: var(--secondary-color);
  }
  @media (min-width: 800px) {
    .container {
      padding: 320px 25px 0 25px;
      width: 430px;
      margin-left: 50px;
    }
  }
</style>
