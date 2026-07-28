# Infrastructure support is tiered, not binary

The README offered Supabase, any other Postgres, and any other object storage as
though they were equal choices, but only the Supabase path is ever exercised. A
promise nobody tests becomes a bug report nobody can reproduce. We now declare
three Supported tiers: **tier 1** Supabase + Vercel, guaranteed and proven by
CI; **tier 2** any Postgres on Docker or bare Node, documented and best-effort;
**tier 3** any other object storage, a documented seam with no promise attached.

## Consequences

Preflight and Doctor may assume Supabase — checking that the storage bucket
exists and is public is legitimate, because that is the default path rather than
one option among peers. Issues are answered according to the tier they arrive
from, and a tier 3 report is a request for a patch, not for a fix.
