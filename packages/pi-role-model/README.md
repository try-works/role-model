# pi-role-model

Pi package for connecting Pi to an already-running Role-Model runtime.

Install it from this repository root:

```bash
pi install ./packages/pi-role-model
```

Then use these Pi commands:

```text
/role-model setup
/role-model status
/role-model doctor
/role-model ui
/role-model alias list
/role-model alias recommended
/role-model alias use <alias>
/role-model alias choose <alias>
/role-model alias refresh
```

The package registers a Pi provider named `role-model` from Role-Model's downstream OpenAI discovery endpoint at `/api/role-model/downstream/openai`.

This first release does not install, start, stop, or update the Role-Model runtime. It also does not copy or sync Pi provider credentials. Start Role-Model outside Pi, then run `/role-model setup`.

The package is currently `"private": true`; remove that before npm publication.
