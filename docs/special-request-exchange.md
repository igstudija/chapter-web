# Sharing special requests with another chapter

Two chapters that know each other can show each other's special requests. A
member browsing your list sees requests from the linked chapter alongside your
own, with the contact details needed to answer them, and a filter in the header
to narrow the list to one chapter at a time.

**Time:** about ten minutes, most of it waiting for someone at the other chapter
to read your email.

**You need:** an admin account on your install, and someone with an admin
account on theirs.

---

## Before you link anything

A special request is only worth reading if you can reach the person who wrote
it. So the exchange sends the requester's **name and surname, company, phone
number, email address, profile photo and company logo** to the other chapter's
server, where they are shown to that chapter's members. The request's
registration number travels with it.

That is a transfer of personal data from one organisation to another. Both sides
are responsible for their own members' data, and neither can undo what the other
does with it once it arrives. Agree in writing with the other chapter what the
data may be used for and that neither side passes it on further, before you
create the link — not afterwards.

If you cannot get that agreement, do not link. There is no partial mode that
sends the request without the person; it would arrive as a sentence nobody can
act on.

## 1. Create the connection

In the admin, open **Special request exchange → Chapter connections → Create
new**.

Fill in **Name**. This is what *you* call the other chapter, and it is what your
members see on the filter and on each of their cards. Pick something your
members will recognise. The other chapter cannot change it.

Save. A **connection key** is generated — one long string beginning `chx_`.

## 2. Send them your key, and ask for theirs

Send your key to the other chapter's admin. It is a credential: anyone holding
it can read every shared special request on your install, with the contact
details attached. Send it the way you would send a password, and to a person you
have verified, not to an address off a website.

Ask them to do steps 1 and 2 on their install and send you theirs.

## 3. Paste their key

Open your connection record again and paste their key into **Their connection
key**. If it does not look like a key, the field says so when you save — copy
the whole string, including the `chx_` prefix.

Save. **Their key points at** now shows the chapter and address the key
carries — check that it is who you think it is before going further. The link is
live. Their requests appear in your members' list within
fifteen minutes; yours appear in theirs on their own schedule.

## The two directions are separate

Giving your key and pasting theirs are independent. Either can exist without the
other:

| What you did | What happens |
| --- | --- |
| Gave them your key, pasted nothing | They read you. You do not read them. |
| Pasted their key, gave nothing | You read them. They do not read you. |
| Both | Both. |

A one-way link is a supported arrangement, not a half-finished one. `pnpm
diagnose` reports it as *"we share with them, we do not read them"* rather than
as a problem.

## What members can choose

Every special request has **Available only to {chapter} members**. Left
unticked — the default — the request is offered to every chapter you are linked
to. Ticked, it stays home.

The member sets it when writing the request, and can change it afterwards from
their profile.

**On upgrading to this version**, requests that already existed keep whatever
their old *Public* checkbox said: one that was not public becomes chapter-only.
Nothing that a member had marked private starts travelling because you
upgraded. Requests that are closed, fulfilled or in progress are never sent —
only open ones.

## What never leaves

The order a member arranged their own requests in, and which one they featured
on your slideshow. Those mean nothing on another install and are not sent.

## Pausing, revoking, replacing a key

Open the connection record.

- **Paused** stops both directions immediately, without discarding either key.
  Use it for "stop this while we sort something out" — unpausing costs nothing,
  where re-linking costs another round of emails.
- **Delete** ends the relationship. Their key stops working the moment the
  record is gone.
- **Regenerate key** — tick it and save. This replaces your connection key: do
  it if the key was sent to the wrong person, forwarded, or pasted somewhere
  public. The old one stops working immediately, so tell the other chapter first
  — their side goes quiet until they paste the new one. The checkbox clears
  itself, so it cannot be left on by accident.

## When a partner does not answer

Nothing. Their requests are not in the list, and members are not told why. This
is deliberate: a member cannot do anything about another chapter's hosting, and
an error message about someone else's server on your members' page helps nobody.

The consequence is that you will not notice either, which is what the link
report is for:

```bash
pnpm diagnose
```

Every connection is listed with what it did — answered with a count, paused,
one-way, key unreadable, or did not answer. The connection record also carries
**Last reached at**.

If a partner has stopped answering, ask them whether their install is up before
assuming the link is broken. If they regenerated their key without telling you,
you will get *did not answer* until they send you the new one.

## Chapters on different versions

Installs upgrade at their own pace, and a newer chapter can read an older one
and the other way round. Fields the reader does not recognise are ignored, and
fields it expects but does not find are treated as empty. A link does not need
both sides to upgrade together, and it does not break when one of them does.
