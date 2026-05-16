import "./index.css";
import "highlight.js/styles/github-dark.css";
import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) {
  throw new Error("Expected #app mount target.");
}

const app = mount(App, {
  target,
});

export default app;
