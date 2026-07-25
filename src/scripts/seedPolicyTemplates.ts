import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * Seed starter policy templates.
 *
 * IMPORTANT — these are SKELETONS, not legal documents.
 *
 * This project deliberately ships no ready-made Terms, Privacy or Cookie
 * policy. Those documents are jurisdiction-specific: they must name the right
 * supervisory authority, cite the right statutes, and describe what YOUR
 * install actually does with data. A prewritten policy carried over from
 * another country is worse than none, because it looks authoritative while
 * naming the wrong regulator.
 *
 * What ships instead is the structure — the sections a policy of each type
 * normally has — with every substantive claim left as a `[bracketed]` prompt.
 * Fill them in, then have a lawyer in your jurisdiction review the result
 * before publishing.
 *
 * Placeholders substituted at render time (see `lib/policyUtils.ts`):
 *   {site-name}     organisation display name
 *   {site-email}    contact email
 *   {site-domain}   primary domain
 *   {current-date}  today's date
 *   {last-updated}  when the template was last edited
 *
 * Run with: pnpm seed:policies
 */

const DRAFT_BANNER = `<p><strong>⚠ Draft — not yet reviewed.</strong> This document is a
starting skeleton generated at install time. Replace every [bracketed] prompt with
text describing what {site-name} actually does, and have it reviewed by a lawyer
in your jurisdiction before publishing.</p>`

const policyData = [
  {
    type: 'terms' as const,
    locale: 'en' as const,
    title: 'Terms and Conditions',
    content: `${DRAFT_BANNER}

<h2>1. Introduction</h2>
<p>These terms govern use of the {site-name} website at {site-domain}. By using the site you agree to them.</p>

<h2>2. Who we are</h2>
<p>[Describe your organisation: legal name, registration number, registered address, and what the site is for.]</p>

<h2>3. Accounts and membership</h2>
<p>[State who may hold an account, how accounts are created, and what happens when membership ends. This platform creates accounts by administrator invitation — adjust if that is not how you operate.]</p>

<h2>4. Acceptable use</h2>
<p>When using the site you agree to:</p>
<ul>
<li>provide accurate information;</li>
<li>not use the site for unlawful purposes;</li>
<li>respect other members' rights and privacy;</li>
<li>not upload harmful or malicious content.</li>
</ul>

<h2>5. Member-contributed content</h2>
<p>[State who owns content members submit — profiles, referrals, requests, success stories — and what licence you need in order to display it.]</p>

<h2>6. Intellectual property</h2>
<p>[State what you own and what members may do with it.]</p>

<h2>7. Limitation of liability</h2>
<p>[State the limits of your liability, to the extent your jurisdiction permits limiting it.]</p>

<h2>8. Changes to these terms</h2>
<p>[State how you will notify members of changes and when changes take effect.]</p>

<h2>9. Governing law</h2>
<p>[Name the governing law and the courts that have jurisdiction.]</p>

<h2>10. Contact</h2>
<p>Questions about these terms: {site-email}</p>

<p><em>Last updated: {last-updated}</em></p>`,
  },

  {
    type: 'privacy' as const,
    locale: 'en' as const,
    title: 'Privacy Policy',
    content: `${DRAFT_BANNER}

<h2>1. Who controls your data</h2>
<p>[Name the data controller: legal entity, registration number, address, and a contact for privacy questions. If you have appointed a data protection officer, name them here.]</p>

<h2>2. What we collect</h2>
<p>This platform stores, at minimum:</p>
<ul>
<li>account details — name, email address, password hash;</li>
<li>profile details members choose to publish — photo, company, role, contact details, business description;</li>
<li>activity records — referrals, meetings, requests, success stories and any business figures attached to them;</li>
<li>technical data — server logs and session cookies.</li>
</ul>
<p>[Add anything else your install collects, and remove anything you have disabled.]</p>

<h2>3. Why we process it, and on what basis</h2>
<p>[For each category above, state the purpose and your lawful basis. Under the GDPR that means one of: consent, contract, legal obligation, vital interests, public task, or legitimate interests — and if legitimate interests, say what they are.]</p>

<h2>4. Who can see it</h2>
<p>[State which data is visible to other members, which is public to site visitors, and which is administrator-only. Be specific: on this platform members can generally see each other's profiles and activity.]</p>

<h2>5. Processors and third parties</h2>
<p>[List every service that handles member data on your behalf — hosting, database, object storage, email delivery, and any AI provider if you have enabled the assistant — and where each is located.]</p>

<h2>6. International transfers</h2>
<p>[If any processor is outside your jurisdiction, state that and the safeguard you rely on.]</p>

<h2>7. How long we keep it</h2>
<p>[State retention periods per category, and what happens to a member's data when their membership ends.]</p>

<h2>8. Your rights</h2>
<p>[List the rights data subjects have where you operate — under the GDPR: access, rectification, erasure, restriction, portability, objection, and withdrawal of consent — and how to exercise them.]</p>

<h2>9. Complaints</h2>
<p>[Name your supervisory authority and give its contact details. This differs by country — do not copy another install's.]</p>

<h2>10. Security</h2>
<p>[Describe your security measures and how you handle breaches.]</p>

<h2>11. Contact</h2>
<p>Privacy questions: {site-email}</p>

<p><em>Last updated: {last-updated}</em></p>`,
  },

  {
    type: 'cookies' as const,
    locale: 'en' as const,
    title: 'Cookie Policy',
    content: `${DRAFT_BANNER}

<h2>1. What cookies are</h2>
<p>Cookies are small files a site stores in your browser. {site-name} uses them at {site-domain} as described below.</p>

<h2>2. Cookies this site sets</h2>
<table>
<thead><tr><th>Name</th><th>Purpose</th><th>Duration</th><th>Type</th></tr></thead>
<tbody>
<tr><td>payload-token</td><td>Keeps you signed in</td><td>2 hours</td><td>Strictly necessary</td></tr>
<tr><td>[name]</td><td>[purpose]</td><td>[duration]</td><td>[type]</td></tr>
</tbody>
</table>
<p>[Complete this table against what your install actually sets — analytics, embedded video and any third-party widget you enable will add entries.]</p>

<h2>3. Consent</h2>
<p>[State which cookies are strictly necessary (and so exempt from consent where you operate), which require consent, and how visitors give or withdraw it.]</p>

<h2>4. Managing cookies</h2>
<p>Most browsers let you block or delete cookies in their settings. Blocking strictly necessary cookies will prevent you from signing in.</p>

<h2>5. Contact</h2>
<p>Questions about cookies: {site-email}</p>

<p><em>Last updated: {last-updated}</em></p>`,
  },
]

async function seedPolicyTemplates() {
  const payload = await getPayload({ config })

  for (const policy of policyData) {
    try {
      // Never overwrite. Once an operator has written a real policy, re-running
      // the seed must not silently replace it with the skeleton again.
      const existing = await payload.find({
        collection: 'policy-templates',
        where: {
          and: [{ type: { equals: policy.type } }, { locale: { equals: policy.locale } }],
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        console.log(`Policy ${policy.type} (${policy.locale}) already exists, skipping.`)
        continue
      }

      await payload.create({
        collection: 'policy-templates',
        data: {
          ...policy,
          lastUpdated: new Date().toISOString(),
        },
      })

      console.log(`Created policy skeleton: ${policy.title}`)
    } catch (error) {
      console.error(`Error creating policy ${policy.type} (${policy.locale}):`, error)
    }
  }

  console.log('\nPolicy skeletons seeded. They are NOT publishable as-is —')
  console.log('edit them under Policy Templates in the admin panel, then have')
  console.log('them reviewed by a lawyer in your jurisdiction.')
  process.exit(0)
}

seedPolicyTemplates().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
