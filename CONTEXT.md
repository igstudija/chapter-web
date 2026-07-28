# ChapterOS

A self-hostable member portal for a single professional networking organisation.
This glossary fixes the words the project uses, so that code, issues and docs
say the same thing. It is a glossary, not a spec.

## Language

### The people

**Self-hoster**:
The person who clones the repository and runs their own install. Not a member of
the organisation and not necessarily its administrator — they are whoever holds
the server.
_Avoid_: user, operator, admin

**User**:
A login account. Carries `role` and `status`, and is what authentication is
performed against.
_Avoid_: account, login

**Member**:
A person in the organisation's directory, with a profile, company and photo. A
Member is a directory entry; a User is credentials. They are related but not the
same record, and a change to one is not a change to the other.
_Avoid_: user, profile, contact

### Installing

**Install path**:
The sequence a Self-hoster runs between cloning and a working site. Its
correctness is the project's headline promise; anything that breaks it outranks
a feature.

**Preflight**:
The instant, network-free check that required configuration is present and
plausibly shaped. Chained into the `dev` and `start` scripts, so it cannot be
skipped by forgetting it. Reports every problem at once, never one at a time.
_Avoid_: validation, env check

**Doctor**:
The explicit, network-touching diagnosis — database reachable, schema applied,
storage bucket present and public, mail accepted. Run by hand, never
automatically, because it is slow and fails without a network.
_Avoid_: healthcheck (that is the container's HTTP probe, a different thing)

**Supported tier**:
How far the project's promise extends for a given piece of infrastructure. Tier
1 is guaranteed and proven by CI; tier 2 is documented and best-effort; tier 3
is a documented seam with no promise attached. A bug report is answered
according to its tier.
_Avoid_: supported/unsupported as a binary

---

The member-facing vocabulary — Top 40, power group, special request, chapter —
is not captured here yet. Add terms as they are resolved, not in a batch.
