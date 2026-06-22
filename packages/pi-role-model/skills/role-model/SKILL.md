---
name: role-model
description: Use when Pi should route model requests through a locally running Role-Model runtime, inspect Role-Model aliases, or diagnose Role-Model provider setup.
---

# Role-Model For Pi

Use this skill when the user wants Pi to use Role-Model as the routing provider.

First check `/role-model status`. If setup has not completed, run `/role-model setup`, then use `/role-model doctor` to verify the endpoint and downstream discovery contract.

For model selection, use `/role-model alias list` to inspect available aliases, `/role-model alias recommended` to show the runtime recommendation, and `/role-model alias use <alias>` or `/role-model alias choose <alias>` to select the alias Pi should use. Use `/role-model alias refresh` after the Role-Model runtime catalog changes.

Do not start or install the Role-Model runtime from this package. The runtime must already be installed and running outside Pi.
