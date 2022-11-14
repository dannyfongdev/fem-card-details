<script>
  import CardPreview from "./components/CardPreview.svelte";
  import CardForm from "./components/CardForm.svelte";
  import CompletedMessage from "./components/CompletedMessage.svelte";

  let isComplete = false;
  const handleConfirm = () => {isComplete = true};
</script>

<main>
  <div class="dummy">
    <CardPreview />
  </div>
  <div class="dummy">
    {#if isComplete}
      <CompletedMessage />
    {:else}
      <CardForm on:confirm={handleConfirm}/>
    {/if}
  </div>
</main>

<style>
  main {
    max-width: 375px;
    margin: auto;
  }
  @media (min-width: 400px) {
    main {
      margin: 50px auto;
    }
  }
  @media (min-width: 800px) {
    main {
      max-width: 1440px;
      display: flex;
      justify-content: center;
      gap: 0;
      margin: auto;
      height: 900px;
    }
    .dummy {
      width: 720px;
      height: 900px;
      /* border: 1px solid black; */
    }
  }
</style>
