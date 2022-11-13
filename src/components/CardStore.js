import { writable } from "svelte/store";
export let cardStore = writable({
  name: "Jane Appleseed",
  number: "0000 0000 0000 0000",
  month: "00",
  year: "00",
  cvc: "000",
});
