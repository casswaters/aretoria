# Aretoria — Roadmap

Repo-only planning file. It is excluded from GitHub Pages and never ships to the live site.
Deploy = push to main; `.github/workflows/pages.yml` publishes main to gh-pages without this file. Do not push main to gh-pages by hand.
Captain's Log (casswaters/modern-era-calendar) no longer carries its own copy of Aretoria; it links to this standalone site. Aretoria changes ship here only.

**Last updated:** 2026-10-07, 5:15 PM MT

## House rules
- One palette for the whole world: ivory, gold and cosmic night. No realm color-coding.
- Rough art drafts go to Cassidy for approval before anything is published.
- Irishnu is Cassidy (he/him): armor, not robes.
- 81 virtues, each housed once in the six great temples (14/14/14/13/13/13); none on the axis or in Shadow.
- Guardians are warriors who protect their realms (they may offer advice now and then); the virtues are the advisors.
- Realms, temples and Guardians are always listed in the order the temples sit in the Axial hub art, left to right: Courage, Justice, Humanity, Temperance, Wisdom, Transcendence (REALM_ORDER in aretoria-data.js). Shadow comes after the six (its gate is front-centre, below the plaza).
- No em dashes or tildes in served copy, except the author's closing line "Thus, I stand—a testament…".
- Aretoria ships from this repo only (Captain's Log links here). Bump the SW on every release.
- No hard-coded visitor name anywhere served: the visitor is {name}/{Name} (fallback "traveler"), the guide is {guide} (default Irishnu, config in GUIDE_NAME_DEFAULT / GUIDE_ART).

## Now
- Confirm the hub painting fix from SW aretoria-v35 (Aretoria v60) on a real iPhone: the painting must come back after the Axial arrival pull-back.
- Settle the open wording and lore decisions below.

## Next
- Lock Version 1 scope: the six virtue realms plus Shadow, complete and consistent (Guardians, advisors, Hall of Virtues, Creed).
- Redraw the drawn fallback Irishnu figure in armor (it is still hooded/robed). Rough draft to Cassidy first.
- Apply the landing "Seven Realms" wording once decided (landing, meta, manifest).

## Later
- Guide creator (the reflection guide), approved plan 2026-10-07. There is ONE guide: the role Irishnu fills. Each visitor makes their own version of that one guide, and it takes Irishnu's spot (arrival, hub card, dialogue avatar). Goal: enough variety that each family member's guide feels personal, so Cassidy can share Aretoria for family show and tell.
  - Runs inside the setup sequence, after the visitor's own first name prompt ("What should Aretoria call you?", unchanged). No AI connection, server or API key needed; it all runs on the page.
  - Setup order, exact wording:
    1. Tap one of the 12 armor sets. A simple grid of thumbnails: 6 female (F1 to F6) and 6 male (M1 to M6) full-figure guides, each a distinct complete look. One tap selects a set and the guide updates at once. No parts layering, mix-and-match, customizing or extra steps. Every set uses the same pose and framing so any set drops straight into Irishnu's spot in the art, and each set has a noted face oval for the photo.
    2. Upload a face portrait, auto-fitted. On-device face detection finds the face (the browser FaceDetector API where available, otherwise a small open-source in-browser model such as MediaPipe Face Detection or face-api.js running locally, no server), then scales, centers and levels it into the set's face oval, with a soft blend so it does not look pasted on (color tone matched to the art palette, feathered edge, optional painterly filter). Manual drag and zoom stay available only as an optional "Adjust" fallback. If no face is found, it says so and offers Adjust. The photo stays on the device only and is never uploaded to a server. It stays optional (off by default, the set's painted face is used without it) with a clear "Remove photo" button later.
    3. Preview of their guide asking "How does it look?" with two choices: keep it, or try again (re-upload or Adjust). Do not use the wording "Yes, that's me".
    4. Then ask "What do you want to name your guide?" (the guide's name, asked after the look is settled). Lines stay scripted, with this name inserted through the existing {guide} token.
  - Saved in localStorage on their device only, like the username. Change or reset it later from the Hall of Virtues.
  - No realm-specific armor, emblems or crests. One guide, one shared palette (ivory, marble, gold, cosmic night; sapphire accents allowed). The set choice is cosmetic and changes nothing else.
  - Irishnu's exact set stays the owner default and is not offered as a preset; all 12 sets must clearly differ from his ivory and sapphire armor. No jesters.
  - No uniqueness checks or "already taken" nudges: guides live on each person's own device and are never seen by others.
  - First step: rough sheet of the 12 sets for Cassidy's approval before anything is published (draft in qa/aretoria/guide-creator-draft/).
  - Groundwork shipped in v62: the guide name is the {guide} token (GUIDE_NAME_DEFAULT) and all guide art paths live in GUIDE_ART.
  - Later optional upgrade: an AI-generated painted portrait (including a fully repainted face in the art style from the uploaded photo) or a guide who answers in free conversation. Both need a backend or an API key and cost money per use.
- 3D animated companion: the visitor's reflection guide (Irishnu for Cassidy) as a 3D animated character who hangs around the user's Captain's Log in various moods and character phases. Builds on the reflection-guide feature above (custom fantasy name + costume); cross-referenced in the Captain's Log roadmap.
- Optional color quests inside realms, only if Cassidy approves. Realms themselves stay on the shared palette.

## Ideas
- A light link with Captain's Log entries (for example, the virtue you reflected on today).
- Short guided walk for first-time visitors (portal → hub → one realm → Hall).

## Open decisions (waiting on Cassidy)
- v62 personal lines (flagged, unchanged; list in qa/aretoria/username-v37/flagged-lines.md): keep, generalise or make optional for visitors? Ritual days (Sunday self-audit with 1–10 scorecard, 1st/3rd Saturday relationship reflection, monthly review), "your Creed" / "Read my Creed" (the Creed is Cassidy's own), the Hall lead "The virtues I seek to compound within myself", Irishnu's "Who are you, really?" answer ("the self you send ahead…, in ivory and sapphire"): restored in v65; it fits once each visitor has their own reflection guide.
- Sophia's line "since before the axis had a name": keep, reword or cut? (Kept for now.)
- Landing "The Seven Realms": six realms plus Shadow, or six plus a shared realm?
- The drawn fallback Irishnu is still hooded/robed: approve a redraw in armor?
- The v35 hub painting fix: confirmed on your iPhone?
- Optional color quests inside realms later: yes or no?
- Version 1 = six virtue realms plus Shadow: confirm.

## Shipped (newest first, times MT)
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
