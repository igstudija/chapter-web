# Scripts avoid names pnpm already owns

First-run setup was called `setup`, and `pnpm setup` is one of pnpm's own
commands. pnpm ran its own — which configures the user's shell for pnpm — and
printed "No changes to the environment were made. Everything is already up to
date." A Self-hoster following the README got no organisation, no administrator
account, no error, and a sentence that reads like success. The script had never
run for anyone. It is now `bootstrap`, a name pnpm does not claim.

The same trap was waiting for the Doctor command: `pnpm doctor` is also a
built-in, so that command is named `diagnose`.

## Consequences

`pnpm run setup` would also have worked, and was rejected: it puts the burden on
every reader to remember a word whose absence fails silently rather than
loudly. Script names are chosen so that the obvious invocation is the correct
one.

Before adding a script, check the name is not a pnpm command. An unknown command
exits 254, while a built-in exits 0 — so `pnpm <name>` in a project without that
script tells you which you have.

This is why the Doctor concept in CONTEXT.md is invoked as `pnpm diagnose`
rather than the name the glossary would otherwise suggest, and why neither
should be "corrected" back.
