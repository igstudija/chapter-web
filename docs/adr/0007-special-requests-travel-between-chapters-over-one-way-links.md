# Special requests travel between chapters over one-way links

A special request is an ask — *"I am looking for a logistics partner"* — and its
value is entirely in reaching the person who can answer it. Inside one chapter
that works, because everyone in the directory can see everyone else. Between two
chapters that know each other and would happily trade leads, it does not work at
all: there is no wire between two installs.

So **an install can read another install's special requests over HTTP, using a
key the other install generated and handed over.**

Everything below follows from one deliberate choice about what crosses.

## The requester crosses, not just the request

The list at `/members/special-requests` is not a list of requests. It groups by
person and renders a contact card — photo, company, phone, email, WhatsApp —
with the request as the headline on it (`SpecialRequestsGrid`,
`specialRequestsGrouping.ts`). A request without the person attached is inert:
you can read it, and then there is nothing to do.

The payload therefore carries the requester's name, company, phone, email and
photo URL. That is personal data leaving one operator's server for another's,
and it makes every Self-hoster who enables this a controller transferring data
to a second controller. It is a legal act, not only an HTTP request. Anyone
running an exchange needs an agreement with the chapter on the other end, and
the deployment docs say so rather than leaving it implied.

Nothing else crosses. `sortOrder` and `showOnSlide` are one chapter's private
arrangement of its own list and mean nothing on the other side, and only
requests with `status: open` are offered — a stranger's fulfilled request is
noise nobody can act on.

## Consent lives on the request

Each request carries `chapterOnly`. Ticked, it stays home; unticked — the
default — it is offered to partner chapters. The member decides per request,
when writing it, which is the moment they are actually thinking about who
should see it.

This replaces `isPublic` on this collection, which is deleted. It was dead: no
query anywhere filtered special requests by it, so for as long as it has existed
members have been ticking a box labelled *"Show this request publicly to other
members"* that did nothing. Leaving it in place beside a second, nearly
identical checkbox would have been a trap built on purpose — and `isPublic` in
this codebase already means something else everywhere it is honoured
(`Events`, `SuccessStories`, the homepage: *visible to a logged-out visitor*).

**Requests that already exist when this ships keep whatever they said.** The
rule was going to be uniform — no tick, therefore shared — on the belief that
`isPublic` held nothing worth carrying across. It does. In this install 109 of
219 requests have it set to `false`, spread over 35 members.

Most of those look like an older system's default rather than a decision: in
the earlier of the two eras in the data, `false` outnumbers `true` 96 to 8,
while in the later era, under the current default of `true`, it is 13 to 102.
The thirteen are members who went and unticked a box labelled *"Show this
request publicly to other members"*. Nothing in the row distinguishes the two.

So existing rows migrate as `chapterOnly = NOT isPublic`. Reading the old field
as a decision costs reach — ninety-odd requests stay home that their authors may
not have minded sharing. Reading it as noise costs consent, for thirteen people
who said no in the only way the interface offered. Those are not comparable, and
the cheap side is the one to be wrong on.

An upgrade still moves personal data to another server the first time a link is
made, so it is called out in the release notes, and the docs give an operator a
step to run beforehand.

## Links are one-way, and each one is separate

A connection record holds one partner: their name, their key, the key we
generated for them, whether it is paused, and when we last reached them
successfully. The secret we generate is what they present to read us; the
secret they gave us is what we present to read them. Two independent channels
that happen to share a record.

Nothing enforces reciprocity. A chapter may share without receiving, or receive
without sharing. Because the secret we hand out is generated from a record we
own, the list of who can read us is always answerable: it is the list of
connection records.

A key is a connection string — the origin, the secret and the chapter's name in
one opaque token — so there is one field to paste rather than three to
mistype, and no support thread about a trailing slash. The admin renders the
decoded origin and name beneath the field, because a token nobody can read is a
token nobody can check.

The name shown in the list's filter comes from **our** record and is editable by
us, never from the partner's response. A partner cannot rename itself inside our
list.

Connections can be deleted, paused, or have their key regenerated. Deleting ends
both directions at once. Pausing exists so that "stop this for a week while we
sort something out" does not cost a fresh handshake between two humans, and
regeneration exists because keys get forwarded to the wrong person.

## Read live, cached, never stored

A partner returns its whole shareable set in one response. A chapter is tens to
a couple of hundred requests, so pagination across installs would be machinery
built for a scale that does not exist — and it could not be built correctly
anyway without changing the list, which paginates *members* ranked by their most
recent activity across all of their requests. Fetching everything and merging
server-side leaves `SpecialRequestsGrid` untouched: same search, same paging,
same grouping, for local and partner rows alike.

Responses are cached for 10–15 minutes. Errors are not cached, so a partner's
bad minute does not become our quarter hour. No partner data is written to our
database: revoking a link or deleting a request removes it from the other
chapter within one cache window, with nothing to clean up afterwards. The cache
is still storage, and the docs say so plainly instead of claiming we keep
nothing.

Member photos are hotlinked from the partner's own storage; the API returns
absolute URLs. `next/image` runs unoptimized here (see `next.config.mjs`), so
this costs nothing and adds no host allow-listing. The trade is real and
accepted: our members' IP addresses reach the partner's server, and if they
close their bucket the avatars break while the page keeps working.

## A partner that does not answer is not mentioned

An unreachable partner is dropped from the merge in silence. No banner, no error,
no gap in the page — the list is simply shorter, and a member cannot tell.

The cost is a member concluding that nobody in the other chapter does logistics
when the truth is that the other chapter was down. That is accepted for the
member-facing page; it is not accepted for the operator, so each connection
records the last time it was reached and `pnpm diagnose` reports every link.
Silence toward members is a UI decision, not an excuse to make the failure
undiscoverable.

## The response shape is a public contract

Installs upgrade at their own pace, so a v1.4 chapter will talk to a v1.0
chapter, in both directions, indefinitely. The response carries a version, and
readers degrade rather than fail: unknown fields are ignored, missing fields
read as empty.

Fields may be **added**. They may not be removed, renamed, or given a new
meaning. This is a published contract with servers we do not control, not an
internal API, and the discipline is permanent — a badly named field stays badly
named.

The route is `/api/special-request-exchange/v1`. It says what it carries. If
some later feature wants to trade events or directory entries, that is a second
endpoint and a second handshake rather than a rename that cuts off every working
partner.

## Consequences

Authentication is a bearer secret compared in constant time; a bad key gets an
empty 401 that distinguishes nothing.

The exchange is proven against a fake partner rather than two live installs: the
serving side is tested for a valid key, a bad key, and the `chapterOnly` and
`status` filters; the reading side is fed malformed, empty, slow and absent
responses. What this does not prove is that two real installs find each other —
the handshake itself is exercised by hand, and that is a known hole in a project
whose CI otherwise proves its install path (ADR 0003).

Federation puts this outside the tiers in ADR 0001 in one respect: our behaviour
is guaranteed, the other end's is not. A partner running a fork, an old version,
or a slow host is not a bug in this repository.
