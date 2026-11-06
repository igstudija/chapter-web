# Connect Claude to your site with MCP

The site runs an [MCP](https://modelcontextprotocol.io) server at
`https://your-domain.org/api/mcp`. With it, an assistant such as Claude can read
and edit the site's content on an administrator's behalf: draft next week's
event, publish a blog post, update the FAQ, or take absent members off the
slides.

It does nothing until an administrator creates a key, and a key can do nothing
until someone ticks what it may use.

## What it can and cannot reach

| Can | Collections |
| --- | --- |
| Find, create, update | Events, Blog, Success Stories, Wiki, Special Requests |
| Find, update | Members, Homepage, About Us, FAQ, Contacts Page, Companies Page, Listing Pages SEO, Slideshow Settings |
| Find only | Event and Contact Submissions, Power Groups, Top 40, Top 20, Media, Settings |

It **never** offers:

- **Users** — logins, password hashes and sign-in tokens.
- **Audit logs**, **Chapter connections** (another chapter's shared secret),
  **Policy templates**.
- **Delete**, on anything. Removing a member or an event stays a click in the
  admin panel, where it asks first.

Every call runs as the key's owner, with the same access rules as the admin
panel. A key only works while its owner is an administrator who is not
blocked: demote or block someone and their keys stop answering at once.

The list is in [`src/lib/mcp.ts`](../../src/lib/mcp.ts). Offering something
more means editing it and adding a migration — each operation is a column in
the keys table.

## 1. Create a key

1. Admin panel → **MCP** → **API Keys** → **Create New**.
2. **Label**: who or what uses it, e.g. *Anna — Claude Desktop*.
3. Click **Generate new API key** and copy the key.
4. In the sidebar, tick only what this key needs. For drafting events and
   managing the slide skip list, for example:
   - Events → Find, Create, Update
   - Members → Find
   - Slideshow Settings Collection → Find, Update
5. **Save**.

One key per person and per device. Revoking one — deleting it here — then
affects nothing else.

Only administrators can create, see or delete keys. A key is always bound to
the administrator who created it.

## 2. Connect a client

The server speaks MCP over streamable HTTP and authenticates with a bearer
token: `Authorization: Bearer <key>`.

### Claude Code

```bash
claude mcp add --transport http chapter https://your-domain.org/api/mcp \
  --header "Authorization: Bearer YOUR_KEY"
```

Then `/mcp` inside Claude Code should list `chapter` as connected.

### Claude Desktop

Claude Desktop reaches remote servers with headers through the `mcp-remote`
bridge (needs Node.js). In **Settings → Developer → Edit Config**, add:

```json
{
  "mcpServers": {
    "chapter": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-domain.org/api/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": { "AUTH_HEADER": "Bearer YOUR_KEY" }
    }
  }
}
```

Restart Claude Desktop. The header goes through `env` because some platforms
split arguments on the space in `Bearer YOUR_KEY`.

### Other clients

Anything that can send a header on an HTTP MCP connection works: URL
`https://your-domain.org/api/mcp`, header `Authorization: Bearer YOUR_KEY`.
Connectors that can only sign in with OAuth cannot use it, because the server
authenticates with keys.

## 3. Try it

> What events are coming up?

> Draft an event for next Wednesday at 7:00, online, titled "Biznesa brokastis". Leave it as a draft.

> Leave Jānis Bērziņš out of this week's slides.

Claude finds before it changes, and events, posts and wiki pages it creates can
be left as drafts for someone to publish from the admin panel. The server tells
it to write in the site's language and that dates are stored in UTC.

## Keeping it safe

- **A key is a password with an administrator's reach** — within the boxes
  ticked. Keep it in the client's config, never in a repository, a chat or an
  email.
- **Tick the least that works.** A key for drafting events needs no Members
  update.
- **Revoke** by deleting the key under MCP → API Keys. It stops working on the
  next request.
- **Turn the whole server off** with `MCP_DISABLED=1` in the environment and a
  redeploy. The keys table stays, so nothing needs migrating either way.

## When it does not work

| Symptom | Cause |
| --- | --- |
| `401 Unauthorized` | The key is wrong or deleted, the header is not exactly `Authorization: Bearer <key>`, or its owner is no longer an administrator or is blocked. |
| `Tool … not found` | That operation is not ticked on this key. |
| The client lists no tools | Nothing is ticked on the key yet. |
| `404` on `/api/mcp` | `MCP_DISABLED=1` is set, or the install predates this feature. |
| A long request is cut off | One call is limited to 60 seconds. Ask for fewer documents at a time. |
