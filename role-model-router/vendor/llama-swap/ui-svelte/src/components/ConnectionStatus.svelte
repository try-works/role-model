<script lang="ts">
import { versionInfo } from "../stores/api";
import { connectionState } from "../stores/theme";

const eventStatusColor = $derived.by(() => {
  switch ($connectionState) {
    case "connected":
      return "bg-emerald-500";
    case "connecting":
      return "bg-amber-500";
    default:
      return "bg-red-500";
  }
});

const tooltipText = $derived(
  `Event Stream: ${$connectionState ?? "unknown"}\nAPI Version: ${$versionInfo?.version ?? "unknown"}\nCommit Hash: ${$versionInfo?.commit?.substring(0, 7) ?? "unknown"}\nBuild Date: ${$versionInfo?.build_date ?? "unknown"}`,
);
</script>

<div class="flex items-center" title={tooltipText}>
  <span class="inline-block w-3 h-3 rounded-full {eventStatusColor} mr-2"></span>
</div>
