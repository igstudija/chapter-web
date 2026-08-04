# Configuration is checked in two places, not one

Checking configuration divides cleanly into checks that are instant and offline
(is `PAYLOAD_SECRET` set?) and checks that need the network and can be slow or
flaky (is the storage bucket public?). Folding them together forces a choice
between delaying every `pnpm dev` by seconds and giving up on strictness, so we
split them: **Preflight** runs automatically and offline, **Doctor** runs by
hand and touches the network.

Within Preflight, missing configuration is graded by what breaks rather than by
whether it is "required". **Fatal** configuration stops the process — the app
genuinely cannot start without a secret or a database. **Degraded**
configuration only disables a feature, so it prints a warning naming the feature
that is now dead (no mail configuration means no invitations and no password
resets) and lets the app start. This resolves a contradiction the docs carried
for a while, where the README called four variables required and `.env.example`
described the mail block as required too.

## Consequences

Preflight is chained directly into the `dev` and `start` scripts rather than
living in a `predev` hook: pnpm 10 leaves `enable-pre-post-scripts` off by
default, so a `predev` script would silently never run — the exact failure mode
a preflight check exists to prevent.
