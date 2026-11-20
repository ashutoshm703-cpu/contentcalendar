# Content calendar

What NPrep marketing is shipping, campaign by campaign. One shared plan the
whole team sees live.

- **Campaign** → **activity** (the thing that ships) → **subtasks**, up to three
  levels deep, with groups that roll up their progress.
- Activities carry format, topic, CTA, platforms, end date and time, owner,
  keywords and a script. Subtasks carry their own platform, type, owner and date.
- Five views: **Today**, **Next 7 days**, **Week**, **Month**, **Campaigns**.

No build step. Static files, Firestore for data, Firebase Auth for sign-in.

## Workspace experience

- **Next 7 days** opens first. Select a day to focus its activities; choose
  **Show all 7 days** to return to the week ahead. Week and Month use an agenda
  on narrow screens.
- The account avatar is at the far right of the workspace header. Open it for
  account details and an explicit **Sign out** action.
- Create a campaign with its name and dates, then add the first activity in the
  expanded campaign. Goal, owner and status are available under Campaign details.
- Activities start with a title, campaign and due date. Content details, a
  SOP suggestions and a script are available in expandable sections.
- Activity details use **Save changes**. Status and checklist edits save
  immediately. Closing a changed form offers **Keep editing** or **Discard
  changes**; refreshing the page also warns about an unfinished form.
- Search covers campaign names, content titles, formats, topics, notes and
  keywords, plus nested subtask names and descriptions. Campaign filters apply to campaign status and owner; calendar
  filters apply to activities. Empty results offer a clear reset action.
- Checklist removal asks for confirmation. Clearing an item's title does not
  delete it. Campaign and activity deletion also require an explicit choice.
- Select a subtask name or its **pencil icon** to edit its name, description, owner,
  due date, platform and type. **Save subtask** stores the details in Firestore.
  Nested subtasks and groups support descriptions too. Opening subtask details
  from an activity preserves the unfinished activity form underneath.
- Every displayed subtask shows its deadline, or **Set deadline** when no date
  has been assigned. Select the deadline to edit it; overdue deadlines are
  highlighted until the item is complete.
- **SOP library** is the single place to create and reuse checklists. Every SOP
  has a unique name, platform, content format, optional topic/category, and an
  editable checklist with up to three levels. Add steps directly, use suggested
  steps, or start from an existing activity checklist. The source list shows the
  activity's date and campaign so repeated activities are distinguishable.
- In **New SOP** or **Edit SOP**, drag a step by its **⋮⋮ handle** to change
  order within its group. A line marks a drop above/below a sibling; dragging
  never changes grouping. Groups move with their nested steps and
  can collapse. Each compact row has one **⋯** menu for Move up/down, nesting,
  adding a nested step, and removing a step. Menus stay within the viewport on
  mobile. When the drag handle is focused, **↑ / ↓** reorder siblings and
  **← / →** change nesting. Moves preserve step details, prevent loops,
  and respect the three-level limit. **Undo move** reverses the last move.
  Typing/adding a step clears undo so it cannot discard later edits.
  Save SOP offers a separate choice about updating unfinished work.
- Add SOP items directly in **Add a step…** or **Add a subtask…** beneath an
  expanded group. Press **Enter** or choose **Add** to insert the item and keep
  typing the next one. **+ Add step** in the checklist heading focuses the
  top-level add field. Enter on an existing step opens the add field immediately
  after that step at the same level. A typed item is included by **Save SOP**
  even if Enter hasn't been pressed; empty add fields don't block saving. To
  start a new group from a leaf, choose **⋯ → Add subtask** and type beneath it.
- Names are compared without case differences, Unicode presentation differences,
  or repeated/leading/trailing spaces. Saves reserve the normalized name in a
  Firestore transaction so concurrent saves cannot claim the same name. Renaming
  or deleting releases the old name. Existing duplicate groups remain visible as
  **duplicate 1**, **duplicate 2**, etc., with a warning and checklist preview;
  editing requires a unique name. Existing groups are configured in place as SOPs.
- Matching a platform → format → topic offers **Found an SOP for these
  conditions — Add N subtasks**. Adding is opt-in. No steps are inserted merely
  by choosing a format or saving an activity. Topic-specific matches appear first.
  The nudge's count excludes steps already present. Selected steps are added
  when the activity/subtask is saved. Quick Add supports the same choice.
- New inline subtasks inherit conditions from their parent and offer matching
  SOPs immediately. **Subtask details → SOP conditions** lets you override
  platform, content format and topic. Work type (Script, Thumbnail, Edit, etc.)
  is a separate field. Nudges respect the three-level nesting limit.
- **Browse SOPs** manually inserts a checklist even when its conditions do not
  match. Owners and instructions are retained, deadlines shift relative to the
  destination date, progress resets, and existing steps/completion are preserved.
  Each SOP is applied at most once per target. When editing an SOP used in
  unfinished activities, **Save SOP** offers **SOP only** or **Update unfinished
  tasks**, with a list of affected activities. Updates preserve completed work,
  owners, local field edits and custom steps. Unchanged removed SOP steps are
  removed; old untracked steps are never deleted. Nested uses that exceed three
  levels are skipped and reported. Published activities are excluded. Concurrent
  SOP edits require reopening the latest version. Library deletion archives the
  definition and keeps existing tasks.
- **Duplicate** on a campaign copies all its activities and nested subtasks.
  Activity details offer **Duplicate activity**, and every subtask's **⋯** menu
  offers **Duplicate**, including groups and the deepest nested items. Copies
  have independent IDs, keep owners and content, reset progress, and clear
  activity output assets. Choose a new start/due date to shift all deadlines
  together. Campaign copies start in Planning; activity copies in Not started.
- New activity forms offer **Repeat activity** with daily, weekly or monthly
  scheduling and 2–52 total occurrences. Existing activity details offer
  **Repeat activity** to create a new series from saved details. Occurrences
  are created together immediately and can be edited or deleted independently;
  this is a finite series, with no background scheduler or series-wide edits.
  Monthly repeats preserve the original day where possible and use the last
  day in shorter months. Campaign duplication is atomic, with up to 499 activities.
- Each campaign offers **AI plan**: enter the goal and audience, optionally
  add an offer and constraints, then draft with Gemini. Review the rationale,
  success measure, dates and execution steps. Edit titles/dates and select which
  activities to add. Drafting changes no tasks. Existing titles/status inform
  each new draft. Planning runs on demand; it does not monitor in the background.
- Form labels, dialog focus, view-tab keyboard navigation and visible focus
  indicators support keyboard use. Optional fields are identified in the forms.

```
index.html           markup and script tags
styles.css           the whole visual system
app.js               the app
firebase-config.js   your Firebase web config  ← the one file you fill in
firestore.rules      paste into the Firebase console
```

## Setting it up

### 1. Firebase

1. [console.firebase.google.com](https://console.firebase.google.com/) → **Add project**.
2. **Build → Firestore Database → Create database → Production mode**, pick a
   region close to the team (`asia-south1` for India).
3. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
4. **Project settings → Your apps → Web (`</>`)** → register the app → copy the
   `firebaseConfig` object.
5. Paste those values into `firebase-config.js` and commit. Vercel redeploys by
   itself.
6. **Firestore → Rules** → paste all of `firestore.rules` → **Publish**.
7. **Authentication → Settings → Authorized domains** → add the Vercel domain
   and `contentcalendar.nprep.in`.

The config in step 5 is **not a secret**. Firebase web config ships in every
client app and is public by design. `firestore.rules` is what actually protects
the data: only a signed-in Google account with a verified `@nprep.in` address
can read or write anything.

### 2. Who gets in

Google sign-in, restricted to `@nprep.in`, enforced in two places: the sign-in
button asks Google for that domain, and the Firestore rules refuse everyone else
even if they reach the database directly.

To change the domain, edit `ALLOWED_DOMAIN` at the top of the data section in
`app.js` **and** the `nprep()` function in `firestore.rules`. Both, or the two
disagree.

### 3. The domain

The Vercel project serves on its own `*.vercel.app` URL immediately. For
`contentcalendar.nprep.in`, add the domain in **Vercel → project → Settings →
Domains**, then create the DNS record it shows you wherever `nprep.in` is
hosted — it is not on this Vercel account, so the record has to be added there.

## Data

Collections:

- `campaigns/{id}` — name, goal, startDate, endDate, owner, status, colour
- `activities/{id}` — campaignId, title, type, angle, cta, platforms[],
  dueDate, dueTime, owner, status, description, keywords[], script,
  subtasks[] (nested, each with platform, kind, owner, due, children[])
- `users/{uid}` — written on sign-in so owner pickers show real names
- `subtaskTemplates/{id}` — legacy saved groups. They appear in the SOP library;
  editing one writes an SOP and stores its ID in `sopId`. New group creation is
  disabled by the rules. Existing data remains readable.
- `sopRules/{id}` — name, nameKey, platform, format, angle, enabled, nodes[],
  anchorDate, createdAt, optional archived. A starter YouTube + Long form SOP is
  offered until it is configured or paused. It follows the same opt-in behavior.
- `sopNameClaims/{nameKey}` — atomic name reservations, storing sopId and name.
  The key is a prefixed URI-encoded normalized SOP name. New/renamed SOP writes
  must include a matching reservation in the same transaction, enforced through
  getAfter in Firestore rules. Publish the updated rules before the UI deployment.

SOP definitions retain stable node IDs and a `version`. Applied steps record
`sopSource` with ruleId, stepId and a field baseline for safe updates. Individual
subtask copies detach from the parent SOP; whole-activity copies retain tracking
and shift date baselines.

Activities and individual subtask nodes record `appliedSopRules[]`. Activity
metadata and explicitly selected SOP steps are saved in a transaction. Repeated
activities keep the selected checklists and their application history.

Repeated activities also carry `repeat` metadata with a series ID, frequency,
occurrence index and count. Duplicating an activity starts an independent copy.

Subtasks live inside their activity rather than in their own collection: one
document per activity keeps the checklist in one read and makes deleting an
activity delete its whole breakdown.

## Running it locally

Any static server will do — Firebase Auth needs a real origin, not `file://`:

```bash
npx serve .
```

Then add `http://localhost:3000` to Firebase's authorized domains.

## Checking changes

`node --check app.js` checks syntax. `node tests/reuse.test.cjs` checks copy
independence, progress resets, date shifts and recurrence boundaries. With
`playwright` installed or available on `NODE_PATH`, `node tests/reuse-ui.cjs`
checks the browser flows in Chrome, including mobile layout and failed-write
recovery. The browser test uses an in-memory database and never contacts Firebase.

## Gemini campaign planning setup

1. Create a key in [Google AI Studio](https://aistudio.google.com/api-keys).
2. In Vercel → contentcalendar → Settings → Environment Variables, add
   `GEMINI_API_KEY` for Production, then redeploy. Never commit the key or put it
   in `firebase-config.js`, browser storage, or chat. `GEMINI_MODEL` optionally
   overrides the default `gemini-3.8-flash`; there is no automatic fallback.
3. Open a campaign → **AI plan** to check setup and draft a plan.

The `/api/campaign-plan` Node function verifies the Firebase ID token through
Firebase Auth, requires a verified @nprep.in account, and calls Gemini server
side with structured JSON output. It shares the entered brief, campaign
name/dates, up to 100 activity titles/status/formats/dates and up to 30 SOP
names/conditions. Owner details, scripts and task descriptions are excluded.
The app explains Google's free-tier data-use terms before generation. Free-tier
availability and quotas depend on Google; a billing-enabled project can incur
charges. The integration does not enable billing or switch to another model.
Burst protection is per warm function instance, not a durable global quota;
configure project limits in Google AI Studio for shared deployment.

Planning requires valid campaign dates, a goal and audience. Invalid/duplicate
steps and out-of-range dates are rejected. Adding selected suggestions is
transactional and uses stable draft IDs so retries cannot reset existing work.
Campaigns store `aiBrief` for future planning; accepted activities record `aiPlanId`.

`node tests/campaign-plan.test.cjs` checks authentication, key isolation,
request/output validation, quota and failure states using mocked upstreams.
The browser fixture also mocks Gemini; check a real generation after configuring
the production key. For local API testing use `vercel dev`; a plain static
server only serves the non-AI app.
