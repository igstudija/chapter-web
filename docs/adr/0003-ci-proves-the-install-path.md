# CI runs a real Postgres to prove the install path

This project's own database has its schema maintained by Payload's dev push, not
by the migration files — so `pnpm migrate` against an empty database, the very
first thing the README asks a Self-hoster to do, is a code path no one here ever
executes. A broken migration chain would be invisible to us and fatal to them.
CI therefore starts a real Postgres, runs `pnpm migrate`, runs `pnpm bootstrap`
non-interactively, and drives a browser at the result.

## Consequences

CI is slower and carries a service container, which is the price of the only
place the Install path is exercised at all. The smoke test is deliberately thin
— the home page and the admin panel render — because its job is to prove the
install produced a working site, not to test features; feature coverage belongs
in tests that do not pay for a database.

Green CI is necessary but not sufficient. CI runs commands we wrote, while the
README is prose a human interprets, and install bugs live in the gap between
them. A clean-room rehearsal — fresh clone, throwaway Supabase project, README
followed literally — remains part of calling this done.
