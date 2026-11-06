# Leave members out of this week's slides

Members who are away should not get a slide — the presentation would stop on
someone who is not in the room. The slideshow reads a skip list before every
meeting.

## In the admin panel

1. Admin panel → **Settings** → **Slideshow**.
2. Scroll to **Skip Members from Slideshow**.
3. Click the field and start typing a **first or last name**. Members are listed
   as *Name Surname (Company)*, alphabetically, and typing a company name finds
   them too.
4. Pick everyone who is absent, then **Save**.

The slideshow picks the change up the next time it is opened or reloaded.

**After the meeting, empty the list.** It is not tied to a date: whoever is on
it stays off the slides until someone takes them off.

## With Claude

If your install has [MCP connected](connect-claude-with-mcp.md) and the key has
*Slideshow Settings Collection → Find* and *Update* and *Members → Find*
ticked, you can say:

> Leave Jānis Bērziņš and Anna Ozola out of this week's slides.

> Empty the slideshow skip list.

Claude looks the members up by name and updates the list. Check the admin
panel afterwards the first few times.

## Why names, not companies

The pickers used to show each member's company, because the member record is
titled by it. An administrator marking who is absent thinks in people, and two
members can share a company. Every member picker — this one, the Speech Master
slide, contact persons on the Contacts page, a team grid — now shows the
person first. The name is kept in step automatically when a member edits it on
their profile.
