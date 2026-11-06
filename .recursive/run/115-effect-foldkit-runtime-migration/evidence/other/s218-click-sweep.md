# S218 A click sweep over every route - and the proof it catches the crash it was written for

S217 ended with "the rest of the port's write surfaces have no journey at all". This closes the
crash-detection half of that gap.

## The check

`audit-rendered-ui.mjs --click-sweep` navigates every route, clicks up to 12 visible enabled buttons
one at a time (250ms apart), and fails on the Foldkit crash banner, naming the buttons it clicked.

    PASS click sweep /:            clicked 5
    PASS click sweep /studio:      clicked 7
    PASS click sweep /control/controller: clicked 3
    ... 20 routes, 0 crashes

## Falsifiability

Reintroducing the S217 defect (`targetId` referenced without destructuring it) and rebuilding:

    FAIL click sweep /control/providers: crash after: Toggle theme | Reconnect provider
         :: Application Crash ... targetId is not defined

Restored: passes. So the sweep detects exactly the class it was built for, and the failure names
which clicks led to it.

## State after the fix, on the packaged client

    PASS control action: message:Providers action failed: HTTP 400
    PASS studio run: clicked -> raw:success
    {"routes":20,"failures":0,"focus":true}   gate exit=0
    operator :3456 -> 200

Wired into the gate and the CI audit step alongside `--studio-run`, `--control-action`, `--theme light`.

## An environment fact worth recording

Packaging failed twice with `EPERM: unlink role-model-dev.exe`. The cause: a candidate process from an
earlier round was still running and holding the executable. Identification matters - four
`role-model*` processes were alive, and only one was ours:

    29148 role-model-launcher.exe   operator launcher
    44804 role-model.exe            operator, :3456  (DO NOT TOUCH)
    69628 role-model.exe            manual staging on :5994
    53116 role-model-dev.exe        our candidate, holding the exe

Killing 53116 allowed the package to complete. The operator process was never touched.