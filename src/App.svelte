<script>
  import CardPreview from "./components/CardPreview.svelte";
  import CardForm from "./components/CardForm.svelte";
</script>

<main>
  <div>
    <CardPreview />
  </div>
  <div>
    <CardForm />
  </div>
</main>

<style>
  main {
    max-width: 375px;
    margin: 20px auto;
  }
</style>
