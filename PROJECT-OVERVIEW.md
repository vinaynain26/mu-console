# MU Console: project overview

Written 14 September 2026. Companion to the demo script; this is the version for
someone who needs the shape of the project, where it stands, and where it goes next.

---

## In one paragraph

MU Console is the content system for the Masters' Union websites. It lets a
marketing or content person change words, images, videos, links and button labels
on the live site, directly on the page they are looking at, without a developer and
without a release. Everything starts as a draft, reviewers can comment on any
field, and only an admin can publish. The site's design and animation are left
exactly as they shipped: the editor sits on top of the page the visitor sees, it
does not replace it.

## The problem it solves

Before this, every copy change on the site was a developer ticket. A word, a
number, a photograph: days of turnaround for something that should take seconds.

The launch site was built in Lovable by a non-technical colleague. That made the
situation worse, not better. The only way to change a sentence was to go back
through Lovable and hope the rest of the page survived, and nobody could touch an
image at all. The brief became:

- make every word, image and video on the site editable by someone who has never
  opened a terminal;
- keep the design and motion exactly as built, with proof;
- keep a clear line between what content people own and what the code owns;
- make it safe: drafts, review, a publish trail, and no way to break the layout.

---

## What it does today

### The site is the editor

Sign in, press Edit, and every piece of content the console owns is outlined on
the real page. Click a heading and the drawer opens on that section. Type, and the
page updates as you type. A counter in the toolbar shows how many fields are
unsaved, and each one can be undone on its own or all at once.

Browse mode behaves exactly like the visitor's page. A visitor never loads the
editor at all; they get the same page they always got.

### The studio

A separate console lists every page as a shelf you can scan and search, opens any
page in a form view, and manages people and roles. Each page carries an "Edit on
page" link that jumps to the inline editor. First-time users get a short guided
tour.

### Drafts, review, publish

Every change is a draft until it is published. Drafts are per field, so two people
working on different fields never collide. Reviewers leave comments on individual
fields and resolve them. An editor can send a page for review; publishing itself is
an admin action, and every publish is recorded with who, what and when. Publishing
also keeps a revision of what was replaced.

### Roles

| Role | Read | Comment | Edit | AI writer | Publish | Reorder | Manage people |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Viewer | yes | | | | | | |
| Commenter | yes | yes | | | | | |
| Editor | yes | yes | yes | yes | | | |
| Admin | yes | yes | yes | yes | yes | yes | yes |

The role is decided by the server from the signed-in session, never from anything
the browser sends. Nobody can promote themselves by clicking around.

### Structure, not just text

Sections can be reordered by dragging, per page and per tab, and reset to the
original order at any time. Collections are real content: cards, slides, chapters,
stats, footer links. An editor can add an item, duplicate one, hide one, reorder or
delete, and see the result on the page as they click. Order is content too and
needs no release.

### Media, links and buttons

Images and videos are fields like any other. Paste a URL into an image slot and it
is in. Paste a video where an image was and the slot becomes a video, with the play
control the site already uses. Link targets and button labels and states are
editable in the same drawer.

### The AI writer

A per-field and per-section writer drafts copy in the house voice. The voice is a
style guide derived from the site's own published copy rather than a description
someone wrote, and it is refreshed from the site as the copy evolves, so the model
follows what the site actually does rather than what someone remembers it doing.
Three modes: rewrite one field, offer variants, or rewrite a whole section in one
coherent pass.

AI output always lands as a draft. It cannot write to the live site. Several AI
providers are supported, including free tiers and a fully local option, and the
choice is configuration rather than code.

### Bringing pages in

Pages arrive in the console through a pipeline, not by hand. The launch site came
in as several thousand editable fields, around a hundred of them collections, with
roughly 98 percent of the home page's visible text editable. Each step was checked
against an untouched build of the same page to confirm the layout and animation
were unchanged.

A scheduled job watches the designer's Lovable project on a read-only credential
and brings new or changed routes in automatically. Add a page in Lovable and it
turns up in the console, ready to edit.

### Two-way sync with the designer's tool (lab)

The return path. A published change is committed back into the Lovable project as
real source, so a designer opening Lovable sees the live copy instead of the
placeholder text from launch day. Changes made in Lovable flow into the console
within a short poll interval. If a designer changes a sentence that an editor is
drafting on, the console shows both versions side by side as a conflict, with a
choice to keep the designer's or re-apply the editor's, instead of silently losing
either. A Sync panel in the studio shows the connected project, the last sync in
each direction, a log, and any open conflicts.

This lives on its own branch with its own database so it can be exercised without
touching real content.

---

## Principles the work follows

- **Never convert the site.** The design and its animation ship as built. The
  editor attaches to the page; it does not rebuild it. Every phase is compared with
  a control build of the same page.
- **Nothing is live until an admin publishes it.** Drafts, comments and AI output
  all stay on the draft side.
- **Ownership is stated.** The console owns words and pictures. The code owns
  layout and behaviour. The designer's tool owns design.
- **Permissions live on the server.** The browser is never trusted for a role.
- **Fields keep their identity** when the page changes around them, so live edits
  survive rebuilds and redesigns rather than being stranded.
- **Retire, never delete.** A field the page no longer shows stops being offered
  for editing, but its wording is kept.
- **Only add commits.** On the sync path the console never rewrites the designer's
  history.
- **Content, credentials and the database travel outside the code repository.**
- **Verify in a real browser, scrolled.** Much of the site renders after load;
  reading the server's output alone has misled the work more than once.

---

## How the pieces fit

1. **Content store.** One record per field with its live value and its draft, plus
   comments, revisions, publish history and section order. Self-hosted, a single
   service, no third-party CMS licence.
2. **Studio.** Pages, fields, people, sync.
3. **Inline editor.** Loaded only for signed-in users, on the visitor's own page.
4. **AI writer.** House-voice drafting behind the edit permission.
5. **Pipelines.** Inbound: designer's project to console. Outbound (lab): console
   to designer's project, with conflict detection.

Public traffic goes through one domain; the console is hosted separately behind
it, and the browser never sees the difference. Deploying is a deliberate manual
step by the maintainer, not something a merge triggers.

---

## Timeline

| When | Milestone |
|---|---|
| 19 Aug 2026 | First version: inline CMS with roles, AI writer and drag-to-reorder, on the hand-built page. |
| 20 Aug | Lovable pipeline brought in on a read-only credential. Every route the designer declares becomes a page. Rich text. Editing moves into a right-hand sidebar. Media, link targets and button states editable. |
| 21 to 22 Aug | Editing lands on the launch site itself: the site is the editor. Images get an image editor. Coverage audit written. |
| 24 Aug | The total-control upgrade: collections an editor can reshape, per-slide media, typed fields, near-complete coverage of visible text. Baselines captured before instrumenting anything. |
| 29 Aug | Deployed. Site, editing and studio all behind one public domain. |
| 31 Aug to 1 Sep | Design pass: Masters' Union skin on both surfaces, dark chrome, one vivid blue, glass where things float, the drawer follows the reader, an eight-step tour for first-time users. |
| 7 to 8 Sep | Send-for-review flow. Undo made to survive the drawer rebuilding. |
| 10 to 11 Sep | Editing inside the chapter carousel. Demo script written. |
| 14 Sep | Two-way sync lab: design, plan, working modules, automated test suite green, first inbound sync from the real designer project. |

---

## Where it stands, 14 September 2026

**In production and demonstrable:** on-page editing, the studio, drafts and undo,
comments, roles, publish trail, section reordering, collections, media and video
slots, the AI writer, the inbound Lovable pipeline.

**On the main line, deployment pending:** the review flow and the undo fix.
Deploying is manual, so the live site can lag the repository; check before
assuming.

**In the lab:** two-way sync. The inbound direction has run against the real
designer project. The outbound direction is written and covered by an automated
suite (34 tests, all passing) but has not yet pushed to a real project, and the
production credential is not wired. Do not demo it; describe it.

**Known limits:**

- Sections filled from the records API at runtime (curriculum tables, rosters)
  are records, not content, and are not editable here.
- Text inside shared partials on the older hand-built page has no field yet.
- Image upload is paste-a-URL only; there is no asset library.
- An editor cannot yet blank a field: empty means "unset", not "empty on purpose".
- Editing inside the chapter carousel is still settling; a repaint can jump back
  to the first slide.
- Some sections are scroll-driven and assume their original order. Reordering
  them wants a look in the browser before publishing.
- Logo walls read as covered in the audit but are one field per wall, not one per
  logo.

---

## Roadmap

### Now: finish the editor

- Type-aware controls in the drawer: colour picker, number slider, toggles, dates.
- Image upload and an asset library, replacing paste-a-URL.
- Blank versus unset, so an editor can empty a field on purpose.
- Friendlier names for shared copy (navbar, footer) so the sidebar reads like the
  page.
- A calmer sidebar: fewer things on screen, plainer language.

### Next: give content people the dials

- Style tokens: per-slide and per-section colours as content.
- Animation tunables: the handful of motion values worth exposing, with sane gates.
- Section visibility toggles, including one for the hero intro lock.

### Then: prove it, and write it down

- Coverage audit extended to collections, with a report artifact.
- Drift checks that understand collections.
- A full stability pass on a fully customised home page, every collection reshaped.
- Editor documentation for content people.

### Two-way sync: lab to real

- Run the four proof beats against the real designer project and record timings:
  publish and see it in Lovable; change in Lovable and see it in the console;
  produce a conflict on purpose and resolve it both ways; add and delete a card in
  Lovable and watch fields appear and retire.
- Phase two: media, links, nested lists, collection changes, section order, the
  on-page editor and the review gate on the sync path.
- Deploy with the credential held out of band.

### Platform

- Move the console onto Next.js so the conversion step disappears and the console
  reads and writes the same code the site is built from. This also leaves the
  Lovable code cleaner than it was found.
- A library of hand-built section types: written once by the team, reused by
  content people without a developer.

### Housekeeping

- Per-logo fields on logo walls.
- Editor UI for nested collections inside items the console created.
- Scheduled backup of the content database.
- Credential rotation on a calendar.

---

## Risks and open items

- **Lost notification.** The designer's tool picks up commits by notification. A
  missed one cannot be detected from our side; it is recorded when it happens.
- **Manual deploys.** The live site can lag the repository. Someone has to run
  the deploy and say so.
- **The content database lives outside version control** by design. It must be
  backed up and moved deliberately; a fresh checkout boots with seed content only.
- **Two people on one field** is resolved by the review step, not by locking.
- **A publish and a designer's change crossing in flight** is retried once from
  a fresh state, then reported. No partial state is ever written.

---

## Glossary

- **Field.** One editable value: a heading, a paragraph, an image, a link, a
  button label, a colour.
- **Draft.** A field's working value. What editors see and change. Not live.
- **Publish.** Copy drafts to live. Admin only. Recorded.
- **Revision.** The value a publish replaced.
- **Retire.** Stop offering a field for editing without deleting its wording.
- **Section.** A block of the page that can be reordered.
- **Collection.** A list of items an editor can add to, reorder, hide, duplicate
  or delete.
- **Shared copy.** Content that appears on every page, such as the navbar and
  footer.
- **Conflict.** The designer and an editor changed the same text; the console
  shows both and asks.
- **Pull / Push.** Sync from the designer's project into the console, and from the
  console back into the designer's project.
