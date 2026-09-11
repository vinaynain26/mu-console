# MU Console: demo script

**Audience:** the stakeholder
**Length:** 12 to 15 minutes, plus questions
**One line:** take the Lovable build off GitHub, make every word, image and video on it editable by a non-developer, without touching the code.

---

## Before you walk in

- [ ] CMS running (`npm start`, port 4000) and the app running (port 3000).
- [ ] Signed in already. Do not demo the login.
- [ ] Publish or discard any leftover drafts so the toolbar reads "No changes".
- [ ] Have a CDN image URL copied and ready to paste.
- [ ] Browser zoom at 100%, one clean tab, notifications off.

---

## Beat 1: the problem, 30 seconds

Say it before you show anything.

> "Right now every copy change on this site is a developer ticket. A word, a
> number, a photo. That is days of turnaround for something that should take
> ten seconds. This is the fix."

---

## Beat 2: the site is the editor, 2 minutes

Open the page normally. Let them see it is the real site, not an admin panel.

Press **Edit**.

> "Same page. Nothing rebuilt, nothing duplicated. The editing lives on top of
> the site the visitor sees."

Point at the dotted outlines.

> "Everything outlined is content the CMS owns. Everything else is code."

Click a heading. The drawer opens on that section.

> "It knows what I clicked and takes me straight to it."

---

## Beat 3: change a word, 2 minutes

Edit a headline. Let them watch the page update as you type.

> "Draft, not live. Nothing has moved on the public site."

Point at the toolbar counter going to "1 unsaved", then press **Undo** on the field.

> "Every change is reversible, per field or all at once, until you publish."

---

## Beat 4: images and video, 2 minutes

Open the **Images** tab. Paste your CDN link into a Source field.

> "Same for pictures. Paste a URL, it is in."

Then the line that lands:

> "Paste an mp4 instead of a jpg and that slot becomes a video, with the play
> button this site already uses. No developer, no deploy."

---

## Beat 5: sections, 2 minutes

Switch to **Arrange**. Drag a section.

> "Order is content too. Reorder without a release."

Open **Items** on a collection.

> "Lists are real. Add a card, duplicate one, hide one. Structure, not just text."

---

## Beat 6: the workflow, 2 minutes

Point at Save draft, Preview, Publish.

> "Editors save drafts. Reviewers comment on any field. Only an admin publishes.
> Every publish is recorded: who, what, when."

Mention roles: viewer, commenter, editor, admin.

> "The role comes from the session, never from the browser. An editor cannot
> publish by clicking around."

---

## Beat 7: where it goes, 3 minutes

**This is the part they are buying.** Say it as roadmap, not as done.

> "Three things next.
>
> One: the whole console moves to Next.js. Today we convert the Lovable build
> into templates to make it editable. On Next.js that conversion disappears.
> The CMS reads and writes the same code the site is built from, which also
> leaves the Lovable code cleaner than we found it.
>
> Two: hand-built sections. Not just editing what exists, but adding new
> section types that our team writes once and content people reuse.
>
> Three: two-way sync. Right now Lovable flows into the CMS automatically. The
> return path is built: an approved change is committed back to the Lovable
> repo, so a designer opening Lovable sees the live copy instead of the
> placeholder text from launch day. Design and content stop drifting apart."

If asked "is that done?" answer straight: the plumbing is written, the
credentials are not wired yet, and it has not run end to end. Do not demo it.

---

## Questions they will ask

**"Can they break the site?"**
No. Everything is a draft until an admin publishes, every field reverts, and
publishes are logged. Structure and layout stay in code.

**"What if two people edit at once?"**
Drafts are per field, so two people on different fields never collide. The
review step is where a human sees the diff before anything goes live.

**"Does this slow the site down?"**
No. The editor only loads for signed-in editors. A visitor gets the same page
as before.

**"How long to put a new page under the CMS?"**
The ingest reads the built page and generates the fields. Adding a page is
dropping in a seed file, not writing code.

**"What happens to the Lovable workflow?"**
It stays. Designers keep working in Lovable. The CMS handles copy and media.
Stated ownership: CMS owns words and pictures, Lovable owns layout.

---

## Landmines: avoid these on stage

- **Do not demo the dossier or chapter carousel.** Editing inside it is still
  settling, and a repaint can jump you back to the first slide mid-sentence.
  Demo on straightforward sections.
- **Do not demo the two-way sync.** Describe it. Tokens are not set.
- **Do not press Publish** unless you have decided beforehand to publish for
  real, and remember it is not live until someone runs the deploy.
- **Do not open the Studio tab** unless you have rehearsed it.
- If something misbehaves, reload and carry on. Do not debug in front of them.

---

## Close, 30 seconds

> "Today: every word, image and video on this page is editable by someone who
> has never seen a terminal, with drafts, review and a publish trail. Next:
> Next.js, our own section library, and design and content kept in sync
> automatically. The gap between deciding to change a sentence and it being
> live goes from days to seconds."
