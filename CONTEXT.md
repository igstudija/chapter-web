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
automatically, because it is slow and fails without a network. Invoked as
`pnpm diagnose`, because pnpm owns the word `doctor`.
_Avoid_: healthcheck (that is the container's HTTP probe, a different thing)

**Supported tier**:
How far the project's promise extends for a given piece of infrastructure. Tier
1 is guaranteed and proven by CI; tier 2 is documented and best-effort; tier 3
is a documented seam with no promise attached. The tiers describe how far the
code is meant to hold, not a support queue — this repo has no issue tracker and
takes no contributions.
_Avoid_: supported/unsupported as a binary

### Between chapters

**Chapter**:
The organisation one install serves. One install, one chapter — the multi-site
resolution this codebase once had is gone. Where a word is needed for the
chapter the reader is logged into, it is *this chapter*.
_Avoid_: site, organisation, tenant

**Special request**:
A Member's open ask, published to the directory so that someone can answer it.
Displayed grouped by the person who wrote it, because reaching them is the whole
point of reading one.
_Avoid_: lead, enquiry, listing

**Partner chapter**:
Another install this one is linked to. Partner is a description of the link, not
of any agreement between the organisations — a link may run in one direction
only, and being someone's partner chapter does not make them yours.
_Avoid_: peer, federated chapter, remote site

**Connection key**:
The single opaque string one chapter generates and hands to another, carrying
the origin, the shared secret and the chapter's name together. Whoever holds it
can read that chapter's shared special requests, so it is a credential and is
treated like one.
_Avoid_: token, API key, invite code

---

The rest of the member-facing vocabulary — Top 40, power group — is not captured
here yet. Add terms as they are resolved, not in a batch.
