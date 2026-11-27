# Content calendar

What NPrep marketing is shipping, campaign by campaign. One shared plan the
whole team sees live.

- **Campaign** → **activity** (the thing that ships) → **subtasks**, up to three
  levels deep, with groups that roll up their progress.
- Activities carry format, topic, CTA, platforms, end date and time, owner,
  keywords and a script. Subtasks carry their own platform, type, owner and date.
- Five views: **Today**, **Weekly**, **Month**, **Planner**, **Campaigns**.

Static UI, Firestore for shared data and Firebase Auth for sign-in. A small build
bundles the private file-upload client; server functions handle AI and file access.

## Workspace experience

- **Testimonial portal** at `/testimonials/` uses the same verified NPrep sign-in
  and shared workspace. Each field has its own spreadsheet-style column: student
  name, exam, rank, city, state, college, interview status, interview date/time,
  faculty, meeting link, recording link and invitation delivery. Click a cell to
  edit it; the student name stays visible while scrolling sideways on mobile.
  **Scheduled** opens the interview form and requires a date, time (IST), faculty
  name, email, Teams account and meeting link. **Recorded** requires a recording
  link. The existing campaign resource still opens its filtered student roster;
  campaign/coordinator/deadline fields are hidden and managed in the background.
  Student edits preserve existing campaign titles, production subtasks and progress.
  A bottom **Add a topper** row saves name, exam, rank and plan with Enter;
  **More details** carries that draft into the full profile. Failed saves retain
  the entry. The roster sorts by saved last-edit time, falling back to creation
  time for older records, and shows ten toppers per page with Previous/Next.
  Search and stage filters reset to page one; counts reflect all matching records.
  Ashutosh's verified owner account can use the row **⋯ → Delete testimonial**
  or the same action in the profile editor. A confirmation names the student and
  exam; deletion moves the record to **Trash**, with **Undo** and **Restore**.
  Campaign tasks, checklist progress, resources and recordings remain intact.
  Deletion and restoration change only the profile's audit fields and revision;
  stale editors cannot resurrect entries or overwrite newer edits. There is no
  permanent-delete action or automatic purge. Teams lifecycle notices target an
  existing confirmed thread only; a missing thread or sender connection is reported
  separately and does not prevent moving the entry to Trash. Trashed entries are
  excluded from the active roster and cannot send interview invitations or task
  handoff notifications. The owner restriction is enforced by Firestore rules.
  Gmail and Teams invitations have independent persisted delivery states. The
  authenticated `/api/testimonial-invite` endpoint reads the saved schedule, sends
  only student/exam/scheduling details (never private notes), and claims each
  channel before sending. Repeated saves do not resend the same schedule; changed
  schedules get a new revision. Timeouts are marked unconfirmed and are not
  automatically retried. An HTTP 202 is shown as queued, never as confirmed sent.
  Teams uses the server-only `FACULTY_TEAMS_WEBHOOK_URL` Power Automate endpoint.
  Direct Gmail requires `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` and
  `GMAIL_REFRESH_TOKEN` with authorized Gmail send access. These credentials stay
  in Vercel; the browser receives only delivery statuses. A separate
  `FACULTY_EMAIL_WEBHOOK_URL` may alternatively handle email. Missing connections
  show **Connection required** rather than a sent confirmation. A Power Automate
  flow returns `{delivered:true,idempotencyKey:...}` only after its message action
  succeeds; other successful responses remain queued.
- **Testimonial Teams handoffs** use `/api/testimonial-thread`, restricted to verified
  NPrep accounts. New profiles, interview-stage changes, task edits and completion
  changes notify the configured channel. The next step is scheduling, the selected
  faculty's interview, then the first unfinished production subtask in checklist
  order, inheriting its nearest parent's owner. A missing owner falls back to the
  activity coordinator or profile creator. Private notes are excluded.
  `TESTIMONIAL_TEAMS_WEBHOOK_URL` stays in Vercel. In the confirmed-response mode,
  the flow must return `{delivered:true,idempotencyKey,threadId,threadUrl}` after
  posting; the server preserves that root ID for replies. For standard-connector
  flows, `TESTIMONIAL_TEAMS_THREAD_MODE=flow` delegates root-ID mapping and event
  deduplication to a durable SharePoint list, with flow concurrency set to one.
  HTTP 202 means queued, not delivered. Enable that mode only after the flow's
  create/reply branches and mapping persistence have been tested. Ambiguous
  timeouts block automatic retries to avoid duplicate topper threads.
- Each campaign card shows attached file/link names below its owner/date details,
  even when activities are collapsed. Click a link to open it or a file name to
  download it. A link/paperclip icon identifies each attachment; the first two names
  appear as quiet text links. **+ N more** expands additional names. Long names
  truncate visually with the full name available in a tooltip. **⋯ → Add or manage
  resources** in the campaign header opens shared resources, including
  when a campaign has no attachments.
  **Edit → Manage
  campaign resources** provides the same access while preserving unsaved campaign
  details. **Add link** accepts Google Docs, Sheets, Slides, Drive and other web
  URLs with an optional name; Drive permissions remain unchanged. **Upload files**
  accepts up to ten files at once, 25 MB each, with progress, retry and cancel.
  Files live in private Vercel Blob storage and download through the authenticated
  NPrep endpoint. Campaign metadata stores references, never file bytes or storage
  credentials. A resource appears after its upload and metadata save both succeed.
  Failed metadata saves retry without uploading another copy. Campaigns support
  up to 100 resources; duplicate links are blocked. Removing a resource asks for
  confirmation. Duplicated campaigns share resource references; unlinking a file
  preserves copies still referenced by other campaigns. Physical cleanup runs only
  for its uploader or Ashutosh and only when no campaign references the file.
- Campaign cards prioritize the name and publishing progress, with quiet status,
  date and owner details. **⋯** groups Edit, Duplicate and resource management in
  a keyboard-accessible menu. A visible circular chevron beside each name shows
  whether its activities are expanded. Click it, the title or **Show activities**
  to open the original task hierarchy inside the same card, without moving it to
  another grid position. Folding retains keyboard focus and the page position;
  collapsing a long card brings its heading back into view when needed. Task and
  group chevrons keep the nested hierarchy clear. Compact checklist rows keep the
  checkbox beside the name, with dates and metadata underneath. The pencil opens
  details. A visible **Actions ▾** button beside each task and subtask provides
  **Duplicate** and **Delete** directly in Today, Weekly, Month and Campaigns.
  Task deletion stays restricted to Ashutosh's verified owner account. Subtask
  menus also include AI, SOPs and, in campaign checklists, adding nested subtasks
  or placements. Delete asks for confirmation and explains when a group's full
  checklist will be removed. Failed deletions retain the confirmation for retry;
  these subtask Duplicate/Delete actions read the latest activity in a transaction
  so other checklist changes are preserved. Menus open above the page without shifting
  the list, support keyboard navigation, and return focus on Escape. Folding
  doesn't reorder or change work.
- **Planner** is a reusable weekly content blueprint, independent of campaigns,
  activity dates, owners and completion. Switch between **Instagram → Shorts/Reels,
  Carousel, Stories** and **YouTube → Shorts, Long Form, Live, Exam**. Each platform
  has Monday–Sunday rows plus a separate **As and When** row, seeded with the
  supplied content mix. “Academic - 3” is retained as written, without generating
  three activities or assuming a quantity. **Edit list** opens one cell; use one
  content item per line and Ctrl/Cmd+Enter or **Save list** to save for the team.
  Empty lists are allowed, and each cell holds up to 20 items (240 characters each).
  Saves preserve changes to other cells; a concurrent edit to the same cell asks
  you to reopen the latest list. Failed saves retain the draft. Mobile has
  collapsible weekdays and Expand/Collapse all days. The Planner works before any
  campaign exists and does not write campaigns, tasks, deadlines or progress.
  Actual work stays in Today, Weekly, Month and Campaigns. Planner access is shared
  with the team, so task ownership filters do not apply to this blueprint.
- **My work** is the default visibility, with **Team work** available in every
  work view. My work includes subtasks assigned to you inside another owner's activity.
  Blank subtask owners inherit the nearest parent owner. New activities default
  to their creator; existing unassigned work remains available in Team work.
- Use the arrows to **collapse or expand campaigns, tasks and subtask groups**
  in calendar views. **Collapse all** and **Expand all** apply to the hierarchy.
  Opening a parent preserves each child's previous state. Choices are remembered
  per signed-in account on the current browser, survive live updates and view
  changes, and keep completion checkboxes separate from expansion controls.
- **Team members** in the top bar (**Team** on mobile) opens the shared directory.
  Add a name with an optional role and email, then assign them from any Owner
  field before they sign in. Owner pickers also offer **+ Add team member** and
  select the newly created person without discarding the parent form. Names and
  emails are reserved transactionally to prevent duplicate entries. Editing a
  person preserves their assignment ID. An allowed account signing in with the
  same email resolves earlier assignments to My work without rewriting tasks.
  Adding a person does not send an invitation or grant access to the app.
- **Weekly** opens first, using the grouped checklist layout from the former
  Next 7 days view. It shows Monday–Sunday, including completed and unfinished
  work in saved order. **Previous week / Next week** browse history and future
  dates; **This week** returns to the current week. **Jump to date** opens a
  specific day in its containing week. Select a day to focus its work and choose
  **Show full week** to return to all seven days. Day tiles and the heading show
  unfinished/completed counts. The separate Week grid tab is hidden. Month uses
  an agenda on narrow screens.
- Today and the same selected date in Weekly share the same work list.
  Work keeps its hierarchy: **Campaign → video/activity → task group → subtask**.
  Every selected subtask stays nested under its video and original groups, in
  saved order. Its ancestors stay visible even when their dates or owners differ;
  context parents are not counted as work due on the selected date. Weekly, Month,
  and earlier-deadline views keep the same grouping, with campaign names
  above each video when there is no shared campaign heading. Month overflow
  reveals additional whole video groups rather than splitting their checklists.
  Activities appear on their own deadline; subtasks appear on their
  effective deadline. Blank deadlines
  dynamically inherit the nearest parent's deadline. Explicit dates stay independent.
  Earlier deadlines have their own collapsed section. Completed work stays in
  its original checklist position with a checked box and strikethrough; completion
  and reopening never reorder or move items into another section. **Show full
  checklist** reveals the scoped hierarchy, including other dates and completed steps.
- Task and subtask checkboxes work in all work views and save to the same campaign
  checklist. Completing a group confirms before marking its descendants complete.
  Completing an activity marks it Published, with a warning if its checklist is
  unfinished; subtasks keep their own progress. Every checkbox supports reopening.
  Completion uses a transaction against the latest saved activity and reports failures.
- The account avatar is at the far right of the workspace header. Open it for
  account details and an explicit **Sign out** action.
- Create a campaign with its name and dates, then add the first activity in the
  expanded campaign. Goal, owner and status are available under Campaign details.
- Activities start with a title, campaign and due date. Content details, a
  SOP suggestions and a script are available in expandable sections.
- **Content options** beside My work / Team work (also in the account menu)
  manages shared **Platform → Format → Topic/category** dropdown choices.
  Select a platform to add or rename its formats, then select a format to manage
  its topics. Add fields stay at the top of each column; type a name and click
  **Add** or press Enter. Each row has **Remove**, with **Undo** for the latest
  change. Removed choices stay hidden; **Show removed options → Restore** brings
  them back. **Save options** makes these choices available to the whole team in
  task/subtask forms, SOP conditions, Quick Add and filters. Changing a parent
  clears incompatible choices below it. Duplicate names within a list are blocked.
  Remove/restore hides or restores choices without changing saved tasks or SOP
  conditions; renaming keeps stable IDs. Concurrent edits require reopening the
  latest list. Formats shared across platforms have a shared name.
- **NASHTA/PreBoard** identifies a test/assessment, available after choosing a
  platform. AI planning retains assessment behavior even if its name is edited.
- Owners appear as compact badges with initials and a name; long names truncate
  visually and remain available in the badge's accessible label and tooltip.
- Activity details use **Save changes**. Status and checklist edits save
  immediately. Closing a changed form offers **Keep editing** or **Discard
  changes**; refreshing the page also warns about an unfinished form.
- Search covers campaign names, content titles, formats, topics, notes and
  keywords, plus nested subtask names and descriptions. Campaign filters apply to campaign status and owner; calendar
  filters apply to activities. Empty results offer a clear reset action.
- Checklist removal asks for confirmation. Clearing an item's title does not
  delete it. Campaign and activity deletion also require an explicit choice.
- Only Ashutosh Mishra's verified account can delete activities/tasks or campaigns.
  Delete controls are hidden for other teammates, and Firestore enforces the same
  rule using the owner's immutable account ID and email. The restriction applies
  from every view, including Today. Teammates retain creation, editing and completion.
- Select a subtask name or its **pencil icon** to edit its name, description, owner,
  due date, platform and type. **Save subtask** stores the details in Firestore.
  Nested subtasks and groups support descriptions too. Opening subtask details
  from an activity preserves the unfinished activity form underneath.
- Saving a task/subtask deadline closes its popup and keeps the page position,
  expanded groups and parent editor position. Live data updates preserve scroll
  and return focus to the matching control after the list redraws.
- Checklist rows show the due date, including a date inherited from a parent,
  without an “Inherited” label. Use the subtask name, date or pencil to edit the
  deadline; clearing a separate date restores inheritance. A missing parent date
  still offers **Set deadline**. Overdue dates are highlighted until completion.
- Tasks, groups and nested subtasks support an optional **Due time**. Set it in
  task/subtask details or the activity checklist's inline Due time field. Set
  times stay visible in the row/header when collapsed and in Today, Weekly,
  Week, Month and Campaigns. Times are independent at each level; blank times
  stay unspecified. Duplicating or repeating work retains its set times, and
  completing work preserves its saved checklist sequence.
- **SOP library** is the single place to create and reuse checklists. Every SOP
  has a unique name, one shared checklist and up to 20 alternative conditions.
  Each condition has a platform, content format and optional topic/category.
  Matching any complete condition offers the SOP once; fields within a condition
  must all match. Use **+ Add another condition** for a second platform/format,
  and **Remove** to remove an alternative. Duplicate or incomplete conditions
  block saving. Existing single-condition SOPs open as Condition 1. The SOP has an
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
- A campaign contains videos/activities. AI planning belongs to each activity's
  checklist: **Suggest tasks with AI** drafts phases and missing execution tasks
  for that activity only. Enter its goal/audience and optional constraints, review
  editable phases/tasks/deadlines, and choose what to add. Existing phases are
  reused, duplicate task titles skipped, and completed/custom work preserved.
  Drafting changes no data. AI never creates campaign-level activities. Published
  activities must be reopened before adding production tasks.
- AI drafts support phase → task → subtask breakdowns. A subtask's **⋯ → Break
  down with AI** adds a focused breakdown inside that existing task, respecting
  the remaining nesting depth. Nested selections preserve their parent, and
  optional new ideas remain unchecked. Blank AI dates inherit their parent deadline.
- **How AI should think** exposes the editable system prompt. Its recommended
  direction covers scene timing/shots/dialogue, production, Instagram/YouTube
  packaging, distribution and measurement. The goal is prefilled from the video;
  **Save as my default** reuses your direction and audience across videos on your
  account. **Copy prompt** exports it; **Use recommended prompt** restores the
  recommended text for the current draft. **Direction & draft copy** under each
  suggested task lets you edit scene instructions and copy before adding.
- **Using your saved work** selects up to three similar saved video checklists
  and three matching/applied SOPs, alongside the current checklist. Similarity
  uses platform, format, category, campaign and title; change the selected
  examples when needed. Saved instructions and completion are read afresh for
  each draft. Untouched unfinished AI-generated steps are excluded from examples
  until someone edits or completes them. Source IDs/reasons appear on suggestions;
  new ideas are optional and start unchecked. No-gap results are valid and do not
  create tasks. This retrieves saved work at request time; it does not retrain
  Gemini or infer results from a published status.
- Form labels, dialog focus, view-tab keyboard navigation and visible focus
  indicators support keyboard use. Optional fields are identified in the forms.
- **Enter** saves task/subtask edits from single-line fields. **Ctrl+Enter** or
  **⌘+Enter** saves from notes, descriptions and scripts, where plain Enter keeps
  creating new lines. The same shortcuts work in campaign, team-member, duplicate
  and SOP editors. Enter selects a teammate from an open owner search before saving.
  Inline checklist fields commit their own changes with Enter; add fields keep
  adding items. Shortcut-saving an activity includes pending typed checklist items.
  Nested editors save independently; validation, in-flight saves and text-input
  composition are respected. The footer shows the shortcut for the current editor.

```
index.html           markup and script tags
styles.css           the whole visual system
app.js               the app
firebase-config.js   your Firebase web config  ← the one file you fill in
firestore.rules      paste into the Firebase console
firebase.json        Firebase CLI rules deployment configuration
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

- `campaigns/{id}` — name, goal, startDate, endDate, owner, status, colour,
  resources[] (named web links or private file metadata) and resourcePaths[]
  (file-reference index used to protect attachments shared by duplicated campaigns)
- `activities/{id}` — campaignId, title, type, angle, cta, platforms[],
  dueDate, dueTime, owner, status, description, keywords[], script,
  subtasks[] (nested, each with platform, kind, owner, due, dueTime, children[])
- `users/{uid}` — written on sign-in so owner pickers show real names
- `workspaceSettings/contentOptions` — versioned shared platforms with nested
  formats and topics. Each option has a stable ID, label and archived flag.
  Authenticated team members can read/save; version increments prevent overwrites.
- `workspaceSettings/weeklyPlanner` — a versioned map of 56 weekday/format cells
  for the shared content blueprint. Items have stable IDs and titles. A missing
  document displays the supplied starting plan; the first save stores it. Updates
  compare the edited cell and merge into the latest document atomically. Verified
  team members can read/create/update; deletion is denied.
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
Run `npm ci` and `npm run build` to create the public UI and upload client in
`public/`. Only the UI files are packaged there. For resource uploads
and downloads use `vercel dev` with a private Blob store connected to the project;
`BLOB_READ_WRITE_TOKEN` stays server-side. Production is connected to the private
`campaign-resources` store. A plain static server supports links but cannot serve
the file endpoint. No Firebase Storage billing upgrade is needed.

## Checking changes

`node --check app.js` checks syntax. `node tests/reuse.test.cjs` checks copy
independence, progress resets, date shifts and recurrence boundaries. With
`playwright` installed or available on `NODE_PATH`, `node tests/reuse-ui.cjs`
checks the browser flows in Chrome, including mobile layout and failed-write
recovery. The browser test uses an in-memory database and never contacts Firebase.
`node tests/planner.test.cjs` checks the exact starting content mix, validation,
stable edits, shared persistence and concurrent-change protection.
`node tests/reuse-ui.cjs --planner-only` checks the standalone Planner, per-cell
editing, failure recovery, conflicts and mobile layouts without changing real work.
`node tests/weekly.test.cjs` checks calendar-week boundaries, historical completion
states and navigation without data changes. `node tests/reuse-ui.cjs --weekly-only`
checks past/future navigation, day focus, date jumps and historical task editing.
`node tests/resources.test.cjs` checks safe links and atomic resource persistence.
`node tests/campaign-files.test.cjs` checks identity, private upload token limits,
streamed downloads, cleanup and credential isolation. `node tests/reuse-ui.cjs
--resources-only` exercises resource links/files, retries, cancellation, duplicate
campaigns, nested campaign drafts, read-only access and desktop/mobile layouts.

## Gemini video task planning setup

1. Create a key in [Google AI Studio](https://aistudio.google.com/api-keys).
2. In Vercel → contentcalendar → Settings → Environment Variables, add
   `GEMINI_API_KEY` for Production, then redeploy. Never commit the key or put it
   in `firebase-config.js`, browser storage, or chat. `GEMINI_MODEL` optionally
   overrides the default `gemini-3.5-flash-lite`; there is no automatic fallback.
3. Open a video/activity → **Checklist → Suggest tasks with AI**.

The `/api/activity-plan` Node function verifies the Firebase ID token through
Firebase Auth, requires a verified @nprep.in account, and calls Gemini server
side with structured JSON output through `generateContent`. It shares the
selected video's metadata/notes and campaign goal, the entered brief and AI
direction, up to 100 current checklist steps, up to three selected video examples
(30 steps each), and up to three SOPs (40 steps each). Steps include phase paths,
instructions, completion and deadlines. Per-source character budgets bound the
excerpts; instructions are capped at 400 characters each. Scripts and owner
details are excluded. The request body is capped at 256 KB before sanitisation.
The app explains Google's free-tier data-use terms before generation. Free-tier
availability and quotas depend on Google; a billing-enabled project can incur
charges. The integration does not enable billing or switch to another model.
Burst protection is per warm function instance, not a durable global quota;
configure project limits in Google AI Studio for shared deployment.

Planning requires a valid video deadline, goal and audience. Invalid/repeated
phases and invalid task dates are rejected. Adding selected tasks reads the latest
activity in a transaction and retains an applied draft ID so retries cannot reset
work. Activity `aiBrief` stores planning context; `appliedAiPlans` prevents replay;
accepted groups/tasks record `aiPlanId`. Tasks also keep `aiBasis` (source IDs,
labels and the reason) and `aiOriginal` (the original proposed text), so later
human edits can become reference material. Campaign data is unchanged.

The recommended prompt is defined in `lib/ai-direction.cjs` and served by the
authenticated configuration endpoint. Custom direction is limited to 6,000
characters and cannot override the server's output/date/evidence requirements.
Saved account defaults live at `users/{uid}.aiPlanning` under the existing rule
that only the user can write their own profile. Task instructions preserve up to
2,200 characters, with a maximum of 20 suggested tasks per draft. The model has
no live trends or analytics access; outputs remain reviewable suggestions.
Every returned task must cite a supplied primary source ID or use an empty
source ID to mark a new idea. Unknown source IDs are rejected. Provenance identifies the provided
context; it is not an independent guarantee of model reasoning or task quality.

Provider failures distinguish invalid keys, access restrictions, unavailable
models, exhausted quotas and rejected request settings. Server logs contain only
provider status/code/reason; keys and prompts are never logged. The app never
silently switches models or enables billing.

`node tests/activity-plan.test.cjs` checks authentication, key isolation,
request/output validation, quota and provider failure states using mocked upstreams.
The browser fixture also mocks Gemini; check a real generation after configuring
the production key. For local API testing use `vercel dev`; a plain static
server only serves the non-AI app.
