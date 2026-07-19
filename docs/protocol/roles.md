# Roles

`RoleDefinition` is a first-class protocol entity.

Taxonomy V1 example roles include:

- `coder`: implementation, code review, debugging, migration, and code explanation work.
- `security`: security audit, threat modeling, incident review, privacy review, and safe prompt review work.
- `researcher`: web research, source comparison, fact checking, literature review, and current documentation lookup.
- `product`: product requirements, user stories, acceptance criteria, workflow review, and launch readiness.
- `support`: ticket triage, customer replies, escalation, runbook updates, and status communication.
- `health`: general health information, safety framing, appointment preparation, and wellness planning.

Each role defines supported task families, required/preferred/forbidden capabilities, tool policy,
routing overrides, and output contracts.

The router interprets roles as executable policy, not just labels. A role definition must be rich
enough to answer:

- which task types the role may serve,
- which capabilities are mandatory, preferred, or forbidden,
- whether tools are disabled, limited, or allowed,
- which routing-policy fields should be overridden for requests using that role.

Runtime attachment happens through `RoleBinding`. A binding ties one role to one endpoint and carries
`effective_capabilities` plus `effective_task_types` after local policy or operator restrictions are
applied. Binding status is part of the routing contract:

- `active`: the binding may be considered during routing,
- `inactive`: the binding is known but excluded from routing,
- `disabled`: the binding is explicitly blocked and must surface a distinct exclusion reason.
