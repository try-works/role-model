<script lang="ts">
import LogPanel from "../components/LogPanel.svelte";
import ModelsPanel from "../components/ModelsPanel.svelte";
import ResizablePanels from "../components/ResizablePanels.svelte";
import { upstreamLogs } from "../stores/api";
import { isNarrow } from "../stores/theme";

// biome-ignore lint/style/useConst: Svelte $derived bindings remain reactive over time.
let direction = $derived<"horizontal" | "vertical">($isNarrow ? "vertical" : "horizontal");
</script>

<ResizablePanels {direction} storageKey="models-panel-group">
  {#snippet leftPanel()}
    <ModelsPanel />
  {/snippet}
  {#snippet rightPanel()}
    <LogPanel id="modelsupstream" title="Upstream Logs" logData={$upstreamLogs} />
  {/snippet}
</ResizablePanels>
