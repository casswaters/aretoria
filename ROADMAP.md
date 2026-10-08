# Aretoria — Roadmap

Repo-only planning file. It is excluded from GitHub Pages and never ships to the live site.
Deploy = push to main; `.github/workflows/pages.yml` publishes main to gh-pages without this file. Do not push main to gh-pages by hand.
Captain's Log (casswaters/modern-era-calendar) no longer carries its own copy of Aretoria; it links to this standalone site. Aretoria changes ship here only.

**Last updated:** 2026-10-08, 8:18 AM MT

## House rules
- One palette for the whole world: ivory, gold and cosmic night. No realm color-coding.
- Rough art drafts go to Cassidy for approval before anything is published.
- Irishnu is Cassidy (he/him): armor, not robes.
- 81 virtues, each housed once in the six great temples (14/14/14/13/13/13); none on the axis or in Shadow.
- Guardians are warriors who protect their realms (they may offer advice now and then); the virtues are the advisors.
- Personal lines (Cassidy, 2026-10-08): the default link keeps every line exactly as written. Family links soften the author's routines (Sunday self-audit, first/third Saturday relationship reflection, monthly review, and Justar's, Amara's and Moder's references to them) into gentle invitations, frame the Creed as "the Creed of Aretoria" ("Read the Creed of Aretoria"), and use a visitor-neutral Hall lead ("The virtues to compound within yourself:"). The opening and closing narration ("Within me blooms Aretoria", "Thus, I stand") stay as an epigraph on every link.
- Tagline: "The Seven Realms" stays (Cassidy, 2026-10-08).
- Version 1 = the six virtue realms plus Shadow, "The Seven Realms" (confirmed by Cassidy, 2026-10-08).
- Lore rule (Cassidy, 2026-10-07): "The guide serves as the user's reflection. The reflection is the identity the guardians and advisors work with." So guardian and advisor lines that speak of {guide} (for example Sophia's "{guide} and I have argued since before the axis had a name") hold for every visitor's guide, the default and each family guide alike, and stay as written.
- Realms, temples and Guardians are always listed in the order the temples sit in the Axial hub art, left to right: Courage, Justice, Humanity, Temperance, Wisdom, Transcendence (REALM_ORDER in aretoria-data.js). Shadow comes after the six (its gate is front-centre, below the plaza).
- No em dashes or tildes in served copy, except the author's closing line "Thus, I stand—a testament…".
- Aretoria ships from this repo only (Captain's Log links here). Bump the SW on every release.
- No hard-coded visitor name anywhere served: the visitor is {name}/{Name} (fallback "traveler"), the guide is {guide} (default Irishnu, config in GUIDE_NAME_DEFAULT / GUIDE_ART).

## Now
- Family guides by link (plan 2026-10-07, replaces the guide-creator presets). Cassidy makes each family member's guide himself (up to 5 people) and each person gets their own link where their guide replaces Irishnu: https://casswaters.github.io/aretoria/?guide=<slug>, slug = a simple lowercase first name (not secret; accepted).
  - The link loads that person's guide config: guide name, armor phrase in "Who are you, really?", art, and their visitor name prefilled (only if none is saved; still editable in the Hall of Virtues).
  - Remembered in localStorage (mec-aretoria:guide), so later visits without the param keep their guide. Way back to the default: "Use the default guide" in the Hall, or ?guide=default. The plain link (nothing saved) is always Irishnu.
  - The guide's name and art replace Irishnu everywhere: landing line, arrival intro, hub card and its label, dialogue name and avatar, "Meet <guide> again" in the Hall.
  - Owner-made avatars, same pipeline as Irishnu: local background removal (rembg birefnet-portrait + pymatting edge cleanup), then the approved "subtle" scene-integration pass (qa/aretoria/irishnu-integration/integrate.py) at Irishnu's exact spot and scale. Likeness is never repainted or beautified. Outputs per person in assets/aretoria/guides/<slug>/: card.jpg (1024x576), mobile/card.jpg (576x1024), face.jpg (256x256), arrival.webp (384x516). Build: qa/aretoria/family-guides/build/.
  - Each person's art is a draft until Cassidy approves the previews; nothing goes live before that. Live: Jill (?guide=jill, guide "Luz Liath", v68), Jaycee (?guide=jaycee, guide "Elysia Starweaver", v68), Chaz (?guide=chaz, guide "Lucid", full label "Lucid Leridian Zol Gottsbrakiyre son of Svordsythe Zol Gottsbrakiyre", v69).
  - Each family guide has its own "Who are you, really?" reflection and closing choice, and never says Irishnu. A guide may carry a longer label (plates, card, Hall, landing, meta) while speaking only its short name.
- Confirm the hub painting fix from SW aretoria-v35 (Aretoria v60) on a real iPhone: the painting must come back after the Axial arrival pull-back.
- Settle the open wording and lore decisions below.

## Next
- Keep Version 1 (confirmed 2026-10-08: the six virtue realms plus Shadow, "The Seven Realms") complete and consistent: Guardians, advisors, Hall of Virtues, Creed.

## Later
- In-browser guide creator (idea only, not planned): a visitor would build their own guide on the page (presets or photo upload). The 12-preset draft (qa/aretoria/guide-creator-draft/) was dropped on 2026-10-07 because it fell short; family links (in Now) replace it. An AI portrait or free conversation would need a backend or key and cost per use.
- 3D animated companion: the visitor's reflection guide (Irishnu for Cassidy) as a 3D animated character who hangs around the user's Captain's Log in various moods and character phases. Builds on the family guides (each person's own guide and name); cross-referenced in the Captain's Log roadmap.
- Optional color quests inside realms (open idea, no answer from Cassidy yet; nothing planned until he approves). Realms themselves stay on the shared palette.

## Ideas
- A light link with Captain's Log entries (for example, the virtue you reflected on today).
- Short guided walk for first-time visitors (portal → hub → one realm → Hall).

## Open decisions (waiting on Cassidy)
- The v35 hub painting fix: confirmed on your iPhone?

## Shipped (newest first, times MT)
- 2026-10-08 08:18: v74 (SW v49): fixed the occasional hard, jammed ping when choosing an answer (Cassidy's iPhone report). Root cause: UI bells were scheduled at exactly currentTime with a 6 ms fade in. The audio clock (currentTime) only moves once per audio buffer (much longer on iPhone), so now and then the bell started after its fade in had already passed and hit at full level with a click. Measured in Safari's and Chrome's engines: on-time taps put about 13% of their peak in the first millisecond, late ones (6 to 12 ms) put 93% there. Fix: UI sounds are scheduled 30 ms ahead, fade in over at least 8 ms from zero and stop only after their decay; one UI sound per action (gate over open over close over tap) with a 100 ms cooldown, so double touches and stacked cues never pile up; a gentle limiter on the UI bus. The sounds themselves and the room loops are unchanged. Sound stays on by default. Before and after clips: qa/aretoria/v74-ping/.
- 2026-10-08 07:54: v73 (SW v48): the exit is now a labeled "Leave Aretoria" button (Cassidy kept tapping the round ✕ by accident, taking it for a close button). An ivory and gold rounded pill with a door glyph on desktop; on phones the words sit on two short lines in the header beside the round back button and the speaker, so realm titles keep the same width and line count as before (checked at 390x844 and 393x659). The opening and closing lines use the same pill. Dialogue and Hall/Creed close buttons stay ✕ and close only their own panel. Focus no longer lands on the exit after the intro or a closed panel. Sound is now on by default (Cassidy's request): with no saved choice the room loop and UI sounds start on the first tap (browsers and iOS block audio before one); the speaker still turns it off, and a saved off is remembered and wins. Verified live 07:56 to 08:00 MT (SW aretoria-v48) on the default and Jill links at 1440x900, 390x844 and 393x659: hub, Transcendence realm and an open Guardian dialogue; no button overlaps the title, realm titles keep their line count, Leave Aretoria exits, the dialogue ✕ and the Hall ✕ close only their own panel; a fresh visit shows the speaker on and the loop starts on the first tap, and turning it off survives a reload; no console errors.
- 2026-10-08 07:27: v72 (SW v47): sound, approved by Cassidy. A small speaker toggle in the header (left of the ✕), off by default and remembered in this browser. Each room has its own calm loop generated in code: the arrival, the Axial hub, the six virtue realms, Shadow (darker but gentle) and the Hall of Virtues, all in one key with a shared gold bell, ivory halo and cosmic reverb. Loops are seamless, crossfade between rooms and play at a modest volume, with soft tap, open, gate and close sounds. No audio files: about 10 KB over the wire, and the sound module is precached so it works offline after one visit. iOS: audio starts only after a tap. Phones: the back button is now a round ‹ so realm titles keep their width; desktop still reads ‹ Axial hub. Previews: qa/aretoria/audio-preview/. Verified live 07:30 to 07:36 MT at 1440x900 and 390x844: SW aretoria-v47 with the sound module precached, speaker toggle off on a fresh visit, sound turns on, follows rooms and is remembered, round back button on phones, desktop still reads Axial hub; no console errors or failed requests.
- 2026-10-08 07:09: v71 (SW v46): the drawn fallback guide figure (shown only if the painted art fails to load) now wears ivory plate armor with sapphire gems and gold trim instead of a robe (approved by Cassidy 2026-10-08; shared by all guides, as drafted). Dialogue: a small ivory and gold "Scroll for more" hint appears under the text only while it overflows its box (short phones such as 393x659), taps to scroll, and hides once the text has been read to the end; desktop and tall phones are unchanged unless the text overflows.
- 2026-10-08 06:42: v70 (SW v45): personal lines on family links (gentle invitations instead of the author's routines, the Creed of Aretoria, visitor-neutral Hall lead; default link unchanged). From the 2026-10-08 live audit: on phones the realm Guardian card now starts below a two-line realm title (it ran into the subtitle), and a guide name wider than its hub card ("Elysia Starweaver") wraps inside the card instead of running off the right edge. Decisions closed: personal lines, tagline "The Seven Realms" kept. Verified live 06:47 MT on the default link (unchanged lines, "Read my Creed") and on Jaycee and Chaz links (gentle lines, "Read the Creed of Aretoria", visitor-neutral Hall lead) at 390x844, 393x659 and 1440x900: no console errors or failed requests.
- 2026-10-07 19:55: guardian relationship lines closed. Cassidy keeps them as is under the lore rule "The guide serves as the user's reflection. The reflection is the identity the guardians and advisors work with." (added to House rules). Guardian dialogue unchanged.
- 2026-10-07 19:51: v69 (SW v44): family guide for Chaz (?guide=chaz), approved by Cassidy as is. Label "Lucid Leridian Zol Gottsbrakiyre son of Svordsythe Zol Gottsbrakiyre" on plates, hub card, Hall, aria, landing and meta; he speaks only as "Lucid"; own black and opal reflection. Long labels wrap between words only, in a smaller face on phones.
- 2026-10-07 19:04: v68 (SW v43): family guides by link (?guide=<slug>, remembered, "Use the default guide" in the Hall, ?guide=default). First guides, approved by Cassidy: Jill (Luz Liath) and Jaycee (Elysia Starweaver), each with its own reflection answer. Default link unchanged (Irishnu).
- 2026-10-07 17:10 — v67 (SW v42): realms always listed in hub order, left to right (Courage, Justice, Humanity, Temperance, Wisdom, Transcendence; Shadow after, front-centre) via one REALM_ORDER constant; hub Guide card stays 9:16 portrait on short iPhones (393×659, 375×667) so Irishnu sits clear of his label; tap no longer drives the parallax (card no longer drifts off the right edge after a realm); em dashes out of landing/manifest/creed copy (closing line kept); tests no longer published to Pages.
- 2026-10-07 16:30 — v66 (SW v41): "Meet Irishnu again" in the Hall of Virtues (and ?firstvisit=1) replays the guide's first-visit conversation; Guardians are warriors who protect their realms, not advisors (guide's realms answer, Valorix, Amara, default advisor line); the virtues stay the advisors.
- 2026-10-07 16:21 — v65 (SW v40): "Who are you, really?" restored with its original answer. First visit: screen 1 = "What are the realms?" / "Who are you, really?"; after the realms: "And the Shadow Realm?", "Who are you, really?" (if not asked), "Where should I go today?", "Let me explore."; the Shadow question never comes before the realms answer. Later visits unchanged.
- 2026-10-07 16:15 — v64 (SW v39): Irishnu scene integration (approved "subtle" pass, compositing only; design, pose and placement unchanged) — arrival layer and both hub cards: cyan cutout outline removed, edges defringed, graded to the painting (black/white point, warmth, softer gems), warm sunset back-rim + portal-blue rim on the side facing the swirl, light wrap, ivory floor bounce, depth haze, painting-matched softness and grain, floor-tinted contact shadow under each boot, faint reflection on the polished arrival floor, hub cast shadow now falls left like the walkway posts'. Build: qa/aretoria/irishnu-integration/integrate.py.
- 2026-10-07 16:08 — v63 (SW v38): the guide's first conversation — first visit opens on "What are the realms?" only (answer names all six temples, Shadow across its bridge, the Axial hall), then the Shadow question / "Where should I go today?" / "Let me explore."; later visits get "Where should I go today?" and "I know the way. Let me explore." (first-visit-done flag next to the name). Removed: "Who are you, really?" and its answer.
- 2026-10-07 15:54 — v62 (SW v37): username-based Aretoria — first-visit name prompt ("What should Aretoria call you?", local only, skip uses "traveler"), change or forget it in the Hall of Virtues; no hard-coded name anywhere served; guide name and art swappable (default Irishnu).
- 2026-10-07 15:26 — v61 (SW v36): lore pass — Eirena removed; golden thread held by no one; six great temples share the 81 virtues 14/14/14/13/13/13; Irishnu's six-temples answer rewritten.
- 2026-10-07 14:57 — v60 (SW v35): iOS fix so the hub painting always returns after the arrival pull-back; Irishnu lore pass on all his lines.
- 2026-10-07 13:22 — v59 (SW v34): Axial arrival — first hub entry lands on the plaza, Irishnu greets, camera pulls back; his card moved bottom-right.
- 2026-10-07 10:25 — v58 (SW v33): Irishnu cards on the plaza beside the blue rune portal.
- 2026-10-07 08:53 — v57 (SW v32): blue swirl inside the Axial rune portal.
- 2026-10-07 08:42 — v56 (SW v31): Axial rune portal on the plaza sigil with the Creed orb at its heart.
- 2026-10-07 08:27 — v55 (SW v30): Axial hub repaint v3 (monumental scale, six bridged temples), phone sky extension.
- 2026-10-07 08:07 — v54 (SW v29): Wisdom realm drifting pages tiny, faint and slow.
- 2026-10-07 08:03 — v53–v53.2 (SW v28): Irishnu card stills at true scale on the Axial bridge.
- 2026-10-07 07:50 — v52 (SW v27): Irishnu stills only (hub video removed), composited into the Axial Realm.
- 2026-10-07 07:36 — v51 (SW v26): advisor/guardian stage card centered on phones.
- 2026-10-07 07:33 — v50 (SW v25): Irishnu is Cassidy (he/him), new portrait and face avatar; phone titles never overlap subtitles.
- 2026-10-07 07:16 — v49 (SW v24): guardian voices rewritten; virtues are the advisors; unique closing prompts.
- 2026-10-07 07:12 — v48 (SW v23): first paint is the entrance; sky seams blended.
- 2026-10-07 07:04 — v47 (SW v22): 44px phone tap targets.
- 2026-10-07 06:53 — v46 (SW v21): full-screen views reach the screen bottom on iOS Safari.
- 2026-10-07 06:52 — v45 (SW v20): phone hub hides the big Irishnu portrait during dialogue.
- 2026-10-06 21:19 — v44 (SW v19): creed sign-off centered on mobile.
- 2026-10-06 18:55 — v43 (SW v18): Tolerance Hall portrait.
- 2026-10-06 18:39 — v40–v42 (SW v15–v17): Quietudeness Hall portrait (and recrop).
- 2026-10-06 17:55 — v39 (SW v14): Hall of Virtues cards uniform.
- 2026-10-06 17:45 — v38 (SW v13): hub gates on a clean symmetric arc; phone 3×2 gate grid.
- 2026-10-06 17:29 — v37 (SW v12): Axial repaint on the shared ivory/gold palette (no per-realm colors).
- 2026-10-06 16:57 — v34–v36 (SW v9–v11): creed opens centered; Axial welcome subtitle; gold center thread dropped.
- 2026-10-06 16:51 — v32–v33 (SW v7–v8): shrine fills 16:9 desktop; Irishnu cleared off the gates.
- 2026-10-06 16:44 — v31 (SW v6): fountain favicon.
- 2026-10-06 16:17 — v29–v30 (SW v3–v5): smaller mobile cards; Shadow centered; shrine framing.
- 2026-10-06 11:53 — v28 (SW v2): responsive mobile portrait art.
- 2026-10-06 11:46 — Standalone v1 (SW v1): shrine entry, Axial hub, Seven Realms, Hall, Creed.
