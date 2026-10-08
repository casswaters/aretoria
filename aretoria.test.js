/**
 * Aretoria standalone — data integrity + shell/SW checks (no MEC UI).
 */
import { readFileSync, existsSync, statSync } from 'fs';
import {
  REALMS, REALM_IDS, GUIDE, HUB, CREED, OPENING, CLOSING, VIRTUES,
  reflectionKey, ritualFor, tokenContext, fillTokens, validateAll, validateTree,
  advisorsFor, advisorDialogue, advisorKey, slugify, PORTRAIT_DIR, SHRINE_IMAGE,
  GP, GPm, GUARDIAN_DIR, RP, RPm, REALM_DIR, IRISHNU_PORTRAIT, IRISHNU_AVATAR,
  SHRINE_IMAGE_MOBILE, ART_MOBILE_MQ, mobileArtPath, pickArtPath,
  guardianRole, guardianLine, guardianPortraitPath, irishnuPortraitPath, realmBackdropPath, HUB_ART,
  readMs, READ_BASE_MS, READ_PER_CHAR_MS, ARRIVAL, arrivalWindow
} from './aretoria-data.js';

let passed = 0, failed = 0;
function assert(name, cond, detail = '') {
  if (cond) { passed++; console.log('  PASS ', name); }
  else { failed++; console.log('  FAIL ', name, detail ? '— ' + detail : ''); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
const src = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

{
  console.log('\n--- Aretoria: realms, advisors, dialogue integrity ---');
  assert('seven realms incl. Shadow', REALMS.length === 7 && REALM_IDS.includes('shadow'));
  assert('realm ids match legacy portal ids', eq([...REALM_IDS].sort(), ['courage', 'humanity', 'justice', 'shadow', 'temperance', 'transcendence', 'wisdom']));
  assert('every realm has a guardian with name + source', REALMS.every((r) => r.guardian && r.guardian.name && ['notes', 'neutral'].includes(r.guardian.source)));
  assert('realm colours are hex', REALMS.every((r) => /^#[0-9a-f]{6}$/.test(r.color)));
  const allErr = validateAll();
  assert('all dialogue trees valid', allErr.length === 0, allErr.slice(0, 5).join('; '));
  for (const r of REALMS) {
    const n = Object.keys(r.dialogue.nodes).length;
    assert(`${r.id}: 3–6 dialogue nodes`, n >= 3 && n <= 6, String(n));
    assert(`${r.id}: has a saving reflection node`, Object.values(r.dialogue.nodes).some((x) => x.input && x.choices.some((c) => c.save)));
  }
  assert('Irishnu tree valid', validateTree(GUIDE.dialogue).length === 0);
  assert('legacy reflection key format', reflectionKey('2026-10-05', 'wisdom') === 'mec-realm:2026-10-05:wisdom');
  assert('ritual: Monday → daily (Wisdom)', ritualFor(new Date(2026, 9, 5)).realm === 'wisdom');
  const ctx = tokenContext(new Date(2026, 9, 4));
  const texts = [GUIDE, ...REALMS].flatMap((x) => Object.values(x.dialogue.nodes).flatMap((n) => [n.text, ...n.choices.map((c) => c.label + ' ' + c.next)]));
  assert('no unresolved {tokens} in dialogue', texts.every((t) => !/\{\w+\}/.test(fillTokens(t, ctx))));
}

{
  console.log('\n--- Aretoria: Hall of Virtues + Creed ---');
  assert('81 virtues', VIRTUES.length === 81, String(VIRTUES.length));
  assert('virtue slugs unique', new Set(VIRTUES.map((v) => v.slug)).size === VIRTUES.length && VIRTUES.every((v) => /^[a-z]+$/.test(v.slug) && v.slug === slugify(v.name)));
  const withArt = VIRTUES.filter((v) => v.portrait);
  assert('portrait paths point into assets/aretoria/portraits', withArt.every((v) => v.portrait === `${PORTRAIT_DIR}${v.slug}.jpg`));
  assert('every portrait file exists', withArt.every((v) => existsSync(new URL(v.portrait, import.meta.url))), withArt.filter((v) => !existsSync(new URL(v.portrait, import.meta.url))).map((v) => v.slug).join(','));
  assert('shrine image exists', existsSync(new URL(SHRINE_IMAGE, import.meta.url)));
  assert('all 81 virtues have a portrait', withArt.length === 81);
  assert('every realm but Shadow offers an advisor', REALMS.filter((r) => r.id !== 'shadow').every((r) => advisorsFor(r.id).length > 0));
  assert('advisor dialogues valid', withArt.every((v) => validateTree(advisorDialogue(v)).length === 0));
  assert('advisor key extends legacy key', advisorKey('2026-10-05', withArt[0]) === `mec-realm:2026-10-05:${withArt[0].realm}:${withArt[0].slug}`);
  assert('creed closing affirmation', eq(CREED.affirmation, ['This is the nature of reality.', 'This is who we are.', 'I am part of this.']));
  assert('opening + closing lines', OPENING.startsWith('Within me blooms Aretoria') && CLOSING.startsWith('Thus, I stand'));
}

{
  console.log('\n--- Lore rules: Irishnu the Guide, warrior Guardians, Version 1 ---');
  assert('Irishnu is titled the Guide', GUIDE.name === 'Irishnu' && GUIDE.title === 'the Guide');
  const guideText = JSON.stringify(GUIDE);
  assert('guide avatar exists; stills only (no hub video)', existsSync(new URL(IRISHNU_AVATAR, import.meta.url)) && !/<video|IRISHNU_CLIP|irishnu\.(mp4|webm)/.test(readFileSync(new URL('./aretoria.js', import.meta.url), 'utf8')));
  assert('Irishnu is he/him: no she/her in his lines', !/\b(she|her|herself)\b/i.test(guideText));
  assert('Irishnu is never labelled a jester/fool/clown', !/jester|clown|fool|motley|harlequin|trickster/i.test(guideText));
  {
    // v-voices: virtues are the advisors; no obsolete advisor names, no shared closing formula.
    const OLD = /\b(Endura|Auriel|Rectus|Valoris|Creda|Verax|Mercy the|Coris|Symphona|Concord the|Tempora|Seren the|Regula|Absolva|Paxara|Elowen|Orion|Calyx|Lumora|Thankara|Gleam|Esthara|Sanctus|Lumen)\b/;
    const all = (t) => Object.values(t.nodes).map((n) => n.text).join(' ');
    assert('no obsolete advisor names in guardian dialogue', REALMS.every((r) => !OLD.test(all(r.dialogue))));
    assert('only Irishnu asks the real-circumstances question', REALMS.every((r) => !/real circumstances/.test(all(r.dialogue))) && VIRTUES.every((v) => !/real circumstances/.test(all(advisorDialogue(v)))));
    assert('no "tomorrow" closing formula in advisor questions', VIRTUES.every((v) => !/in your day tomorrow/.test(advisorDialogue(v).nodes.reflect.text)));
    const closes = REALMS.map((r) => r.dialogue.nodes.reflect.text);
    assert('every guardian has a distinct reflective prompt', new Set(closes).size === closes.length);
    const asks = VIRTUES.map((v) => advisorDialogue(v).nodes.reflect.text);
    assert('every virtue advisor asks its own question', new Set(asks).size === asks.length);
    assert('guardian lines stay phone-sized (<= 300 chars)', REALMS.every((r) => Object.values(r.dialogue.nodes).every((n) => n.text.length <= 300)));
  }
  assert('Irishnu keeps lore: axis, one whole, Shadow, real circumstances', /one whole/.test(guideText) && /Shadow/.test(guideText) && /real circumstances/.test(guideText));
  assert('every realm host is a Guardian with a warrior type', REALMS.every((r) => r.guardian.warrior && guardianRole(r).startsWith('Guardian of')));
  assert('guardianLine reads naturally', guardianLine(REALMS.find((r) => r.id === 'courage')) === 'Valorix the Stormheart, Guardian of Courage, a storm-forged champion');
  assert('no keeper in Aretoria text', !/keeper/i.test(guideText + JSON.stringify(REALMS) + noComments(src('./aretoria.js')) + src('./boot.js') + src('./index.html')));
  assert('no Version 2 / chakra realms', !/chakra|version 2/i.test(guideText + noComments(src('./aretoria.js')) + src('./index.html')));
  assert('Version 1 only: six virtue realms + Shadow', eq(REALMS.filter((r) => r.id !== 'shadow').map((r) => r.id).sort(), ['courage', 'humanity', 'justice', 'temperance', 'transcendence', 'wisdom']));
}

{
  console.log('\n--- Painted art + Axial hub ---');
  const GUARDIAN_SLUG = { courage: 'valorix', justice: 'justar', humanity: 'amara', temperance: 'moder', wisdom: 'sophia', transcendence: 'auria', shadow: 'shadow' };
  assert('every realm has painted guardianPortrait', REALMS.every((r) => r.guardianPortrait === GP(GUARDIAN_SLUG[r.id])));
  assert('all 7 guardian portraits exist', REALMS.every((r) => existsSync(new URL(r.guardianPortrait, import.meta.url))));
  assert('Irishnu portrait set and exists', IRISHNU_PORTRAIT === GP('irishnu') && GUIDE.portrait === IRISHNU_PORTRAIT && existsSync(new URL(IRISHNU_PORTRAIT, import.meta.url)));
  assert('every realm has painted realmBackdrop', REALMS.every((r) => r.realmBackdrop === RP(r.id)));
  assert('HUB.realmBackdrop is RP(axial)', HUB.realmBackdrop === RP('axial') && existsSync(new URL(HUB.realmBackdrop, import.meta.url)));
  assert('axial backdrop web-sized (<200 KB)', statSync(new URL(HUB.realmBackdrop, import.meta.url)).size < 200000);
  const aj = noComments(src('./aretoria.js'));
  assert('hub prefers painted axial; shrine fallback via resolveArt', /realmBackdropPath\(HUB\)/.test(aj) && /SCENES\.axial\(shrine\)/.test(aj) && /resolveArt\(SHRINE_IMAGE\)/.test(aj));
  assert('entry cinematic uses resolveArt(SHRINE_IMAGE)', /resolveArt\(SHRINE_IMAGE\)/.test(aj) && /url\('\$\{shrine\}'\)/.test(aj));
  assert('readMs holds narration', readMs(OPENING) >= 4000 + 60 * OPENING.length && READ_BASE_MS >= 4000 && READ_PER_CHAR_MS >= 60);
  assert('GP / RP dirs', GP('valorix') === 'assets/aretoria/guardians/valorix.jpg' && GUARDIAN_DIR === 'assets/aretoria/guardians/' && REALM_DIR === 'assets/aretoria/realms/');
  assert('irishnuPortraitPath / guardianPortraitPath / realmBackdropPath', irishnuPortraitPath() === IRISHNU_PORTRAIT && guardianPortraitPath({ guardianPortrait: null }) === null && realmBackdropPath(HUB) === RP('axial'));
}

{
  console.log('\n--- Responsive mobile portrait art (v28) ---');
  const GUARDIAN_SLUG = { courage: 'valorix', justice: 'justar', humanity: 'amara', temperance: 'moder', wisdom: 'sophia', transcendence: 'auria', shadow: 'shadow' };
  assert('ART_MOBILE_MQ is max-width 699px', ART_MOBILE_MQ === '(max-width: 699px)');
  assert('GPm / RPm scheme', GPm('valorix') === 'assets/aretoria/guardians/mobile/valorix.jpg' && RPm('courage') === 'assets/aretoria/realms/mobile/courage.jpg');
  assert('mobileArtPath inserts /mobile/', mobileArtPath(RP('courage')) === RPm('courage') && mobileArtPath(GP('valorix')) === GPm('valorix'));
  assert('mobileArtPath shrine → mobile/shrine', mobileArtPath(SHRINE_IMAGE) === SHRINE_IMAGE_MOBILE && SHRINE_IMAGE_MOBILE === 'assets/aretoria/mobile/shrine.jpg');
  assert('pickArtPath desktop vs mobile', pickArtPath(RP('axial'), false) === RP('axial') && pickArtPath(RP('axial'), true) === RPm('axial'));
  assert('all 8 realm mobile backdrops exist (7 + axial)', ['axial', ...REALMS.map((r) => r.id)].every((id) => existsSync(new URL(RPm(id), import.meta.url))));
  assert('all 8 guardian mobile portraits exist (7 + irishnu)', [...Object.values(GUARDIAN_SLUG), 'irishnu'].every((s) => existsSync(new URL(GPm(s), import.meta.url))));
  assert('mobile shrine exists', existsSync(new URL(SHRINE_IMAGE_MOBILE, import.meta.url)));
  assert('mobile files are portrait-ish web JPEGs (<220 KB)', [...['axial', ...REALMS.map((r) => r.id)].map(RPm), ...[...Object.values(GUARDIAN_SLUG), 'irishnu'].map(GPm), SHRINE_IMAGE_MOBILE].every((p) => statSync(new URL(p, import.meta.url)).size < 220000));
  const aj = noComments(src('./aretoria.js'));
  assert('picker uses ART_MOBILE_MQ + resolveArt + refresh on resize/orientation', /ART_MOBILE_MQ/.test(aj) && /resolveArt/.test(aj) && /refreshArtIfBreakpointChanged/.test(aj) && /artMQ\.addEventListener|artMQ\.addListener/.test(aj));
  assert('virtue advisor thumbs stay shared (no mobile/ in portrait paths)', VIRTUES.filter((v) => v.portrait).every((v) => !v.portrait.includes('/mobile/')));
}

{
  console.log('\n--- Standalone shell + SW aretoria-v19 ---');
  const html = src('./index.html');
  const sw = src('./sw.js');
  const boot = src('./boot.js');
  assert('page title is Aretoria', /<title>Aretoria<\/title>/.test(html));
  assert('apple-mobile-web-app-title is Aretoria', /apple-mobile-web-app-title" content="Aretoria"/.test(html));
  assert('no MEC calendar / CaptainLog UI on page', !/month-grid|captains-log|panel-calendar|Modern Era Calendar/.test(html));
  assert('Irishnu mentioned as the Guide on landing', /Irishnu the Guide/.test(html));
  assert('boot imports openAretoria and registers SW', /openAretoria/.test(boot) && /sw\.js\?v=45/.test(boot));
  assert('SW is aretoria-v45', /aretoria-v45/.test(sw) && !/aretoria-v17/.test(sw) && !/mec-v/.test(sw) && !/captains-log/.test(sw));
  assert('SW precaches Aretoria code + shell', ['aretoria.js', 'aretoria-data.js', 'aretoria-art.js', 'aretoria.css', 'boot.js', 'shell.css'].every((f) => sw.includes(`./${f}`)));
  assert('SW does not precache portraits/guardians/realms', !/assets\/aretoria\/[^']*\.jpg/.test(noComments(sw)) && !/guardians\//.test(noComments(sw)) && !/realms\//.test(noComments(sw)));
  assert('aretoria.js VERSION = 45 and imports data/art ?v=45; boot imports aretoria.js?v=45', /const VERSION = 45;/.test(src('./aretoria.js')) && /aretoria-data\.js\?v=45'/.test(src('./aretoria.js')) && /aretoria-art\.js\?v=45'/.test(src('./aretoria.js')) && /aretoria\.js\?v=45'/.test(src('./boot.js')));
  assert('asset queries: shell.css ?v=18, boot.js + sw.js ?v=45', /shell\.css\?v=18/.test(html) && /boot\.js\?v=45/.test(html) && /sw\.js\?v=45/.test(boot) && !/\?v=27/.test(src('./aretoria.js')));
  assert('manifest name Aretoria, scope /aretoria/', /"name": "Aretoria"/.test(src('./manifest.webmanifest')) && /"scope": "\/aretoria\/"/.test(src('./manifest.webmanifest')));
  assert('link back to Captain’s Log present', /modern-era-calendar/.test(html));
}

{
  console.log('\n--- No realm colour coding (shared ivory/gold palette) ---');
  const ajNC = noComments(src('./aretoria.js'));
  const cssNC = src('./aretoria.css');
  assert('aretoria.js never reads r.color (no per-realm colour coding)', !/\br\.color\b/.test(ajNC) && /SHARED_ACCENT/.test(ajNC));
  assert('gates/filters/cards carry no inline --c realm colour', !/style="--c:/.test(ajNC));
  assert('CSS pins --c to one shared gold', /\.ar-gate, \.ar-filter, \.ar-vcard \{ --c: #f1d58e; \}/.test(cssNC));
  assert('hub orb ring + hub particles are gold, not rainbow', !/rgba\(158,240,200/.test(cssNC) && !/'#9ef0c8', '#7fb8ff'/.test(ajNC));
  assert('Shadow gate is deep bronze/marble, not violet', !/#b9a6e8/.test(cssNC));
}

{
  console.log('\n--- Axial hub v13: desktop ellipse arc on the bridges, phone grid above the painting ---');
  const ajA = noComments(src('./aretoria.js'));
  const ids = ['courage', 'justice', 'humanity', 'temperance', 'wisdom', 'transcendence', 'shadow'];
  const D = HUB_ART.desk.gates;
  assert('HUB_ART.desk has an arch point for all 7 gates', ids.every((id) => Array.isArray(D[id]) && D[id].length === 2));
  assert('HUB_ART art sizes match the shipped JPEGs (1280×720 / 576×1248)', HUB_ART.desk.w === 1280 && HUB_ART.desk.h === 720 && HUB_ART.mob.w === 576 && HUB_ART.mob.h === 1248);
  assert('desktop gates run left→right Courage…Transcendence', ids.slice(0, 6).every((id, i, a) => i === 0 || D[id][0] > D[a[i - 1]][0]));
  const pairs = [['courage', 'transcendence'], ['justice', 'wisdom'], ['humanity', 'temperance']];
  // v3 repaint: the art is not mirror-symmetric, so each gate sits on its own temple's bridge (hand-placed anchors)
  assert('desktop arc sweeps: outer pair lowest, inner pair highest', D.courage[1] > D.justice[1] && D.justice[1] > D.humanity[1]);
  assert('desktop gates sit on the bridges between plaza and temples (x 220–1060, y 280–400)', ids.slice(0, 6).every((id) => D[id][0] >= 220 && D[id][0] <= 1060 && D[id][1] >= 280 && D[id][1] <= 400));
  assert('Shadow centred on the front bridge, orb on the rune', D.shadow[0] === 640 && D.shadow[1] > HUB_ART.desk.rune[1] + 100 && HUB_ART.desk.rune[0] === 640);
  assert('mobile hub is a grid with a painting band rect', HUB_ART.mob.layout === 'grid' && Array.isArray(HUB_ART.mob.band) && HUB_ART.mob.band.length === 4 && HUB_ART.mob.band[3] > HUB_ART.mob.rune[1] && HUB_ART.mob.band[1] < HUB_ART.mob.rune[1]);
  assert('phone grid order is the six realms left→right; Shadow the centred 7th tile', /const HUB_GRID_ORDER = REALM_ORDER;/.test(src('./aretoria.js')) && /id === 'shadow' \? 2 : Math\.floor\(k \/ 3\)/.test(ajA) && /id === 'shadow' \? 1 : k % 3/.test(ajA));
  assert('grid sits between the header and the painting band top', /\.ar-top'\)/.test(ajA) && /toScreen\(\[0, art\.band\[1\]\]\)/.test(ajA) && /classList\.toggle\('ar-hubgrid', mobile\)/.test(ajA));
  assert('layoutHub maps desktop gates by realm name, Shadow on x = cx, orb on the rune', /art\.gates\[id\]/.test(ajA) && /id === 'shadow'\) x = w \/ 2/.test(ajA) && /toScreen\(art\.rune\)/.test(ajA));
  const cssG = noComments(src('./aretoria.css'));
  assert('phone grid tiles: ≥ 44px tap target, no bob, guardian names hidden ≤ 380px', /\.ar-hubgrid \.ar-gate \{ width: min\(31vw, 116px\); animation: none;/.test(cssG) && /@media \(max-width: 380px\), \(max-width: 699px\) and \(max-height: 720px\) \{[\s\S]*?\.ar-hubgrid \.ar-gate-sub \{ display: none; \}/.test(cssG));
  assert('no gold centre thread element in the hub', !/ar-thread|gold-thread|center-thread/.test(ajA + src('./aretoria.css')));
  const mobAx = new URL('./assets/aretoria/realms/mobile/axial.jpg', import.meta.url);
  assert('mobile axial backdrop exists and is < 200 KB', existsSync(mobAx) && statSync(mobAx).size < 200000);
}

{
  console.log('\n--- Hall of Virtues: uniform cards (v14) ---');
  const cssH = noComments(src('./aretoria.css')); const jsH = noComments(src('./aretoria.js'));
  const rule = (sel) => { const m = cssH.match(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m ? m[1] : ''; };
  assert('grid rows are uniform (grid-auto-rows: 1fr)', /grid-auto-rows: 1fr/.test(rule('.ar-vgrid')));
  assert('art frame is a fixed 3:4 box that clips (aspect-ratio, overflow hidden, flex: none)', /aspect-ratio: 3 \/ 4/.test(rule('.ar-vart')) && /overflow: hidden/.test(rule('.ar-vart')) && /flex: none/.test(rule('.ar-vart')));
  assert('portrait is absolutely placed + object-fit: cover (its own aspect cannot grow the frame)', /position: absolute/.test(rule('.ar-vart img')) && /object-fit: cover/.test(rule('.ar-vart img')) && /height: calc\(100% - 2 \* var\(--vp\)\)/.test(rule('.ar-vart img')));
  assert('names are one fixed-height line (nowrap + ellipsis), realm line nowrap', /white-space: nowrap/.test(rule('.ar-vname')) && /text-overflow: ellipsis/.test(rule('.ar-vname')) && /height: 1\.3em/.test(rule('.ar-vname')) && /white-space: nowrap/.test(rule('.ar-vrealm')));
  assert('essence is an overlay inside the art frame (never grows the card)', /position: absolute/.test(rule('.ar-vess')) && /<span class="ar-vart\$\{[^}]*\}">\$\{art\}<span class="ar-vess">/.test(jsH));
  assert('long names are scaled to fit (fitHallNames on render, open and resize)', /function fitHallNames\(\)/.test(jsH) && (jsH.match(/fitHallNames\(\);/g) || []).length >= 2 && /layoutHub\(\); fitHallNames\(\);/.test(jsH));
  assert('no hyphenated wrapping of names on phones', !/\.ar-vname \{[^}]*hyphens/.test(cssH));
}

{
  console.log('\n--- v34 Axial arrival (first hub entry per session) + Irishnu card bottom-right ---');
  const aj = noComments(src('./aretoria.js')), css = src('./aretoria.css');
  const f = (u) => new URL(u, import.meta.url);
  assert('arrival art + Irishnu layer + wisp overlays exist', [ARRIVAL.image, ARRIVAL.irishnu.src, ARRIVAL.wisps.desk, ARRIVAL.wisps.phone].every((u) => existsSync(f(u))));
  assert('arrival art is web-sized (<320 KB) and the overlays small (<120 KB)', statSync(f(ARRIVAL.image)).size < 320000 && [ARRIVAL.irishnu.src, ARRIVAL.wisps.desk, ARRIVAL.wisps.phone].every((u) => statSync(f(u)).size < 120000));
  assert('frame bottom at source y 590: the swirl centre (y 652) is never in view', ARRIVAL.h === 590 && ARRIVAL.w === 1280);
  const d = arrivalWindow(1024, 576);
  assert('desktop 16:9 window = approved v10-b590 crop (x 115.6–1164.4, full height, no pan)', !d.pan && Math.abs(d.x0 - 115.56) < 0.1 && Math.abs(d.w - 1048.9) < 0.1 && d.h === 590 && d.y0 === 0 && d.x1 === d.x0);
  const p = arrivalWindow(576, 1024);
  assert('phone 9:16 pan: 331.9 px window, x0 130 → x1 535.9 (Irishnu at 60%)', p.pan && Math.abs(p.w - 331.875) < 0.01 && p.x0 === 130 && Math.abs(p.x1 - 535.875) < 0.01 && Math.abs((ARRIVAL.irishnu.feet[0] - p.x1) / p.w - 0.6) < 1e-9);
  const q = arrivalWindow(390, 844);
  assert('pan end is computed from the real aspect (390×844 → x1 571.4)', Math.abs(q.x1 - (735 - 0.6 * 590 * 390 / 844)) < 1e-6);
  const wide = arrivalWindow(2560, 900);
  assert('ultra-wide screens keep the bottom edge at 590 (crop from the top)', !wide.pan && wide.w === 1280 && Math.abs(wide.y0 + wide.h - 590) < 1e-9);
  assert('phone pan timing: 0.6 s hold, 4.5 s sine ease-in-out', ARRIVAL.phone.holdMs === 600 && ARRIVAL.phone.panMs === 4500 && /0\.37, 0, 0\.63, 1/.test(ARRIVAL.phone.ease));
  assert('pull-back 1.6–2 s; reduced motion is a 300 ms cross-fade', ARRIVAL.pullMs >= 1600 && ARRIVAL.pullMs <= 2000 && ARRIVAL.fadeMs === 300 && /if \(reduced\(\)\) \{\s*root\.classList\.remove\('ar-arriving'\)/.test(aj));
  assert('reduced motion: no pan (camera placed at the end framing)', /const still = reduced\(\);\s*placeArrival\(still\);/.test(aj) && /W\.pan && !still/.test(aj));
  assert('plays on the first hub entry per session only (sessionStorage), never for realm deep links', /sessionStorage\.getItem\(ARRIVAL\.sessionKey\)/.test(aj) && /sessionStorage\.setItem\(ARRIVAL\.sessionKey/.test(aj) && /if \(t && realmById\(t\)\) \{ showView\(t\); return; \}\s*if \(arrivalDue\(\)\) \{ startArrival\(\); return; \}/.test(aj));
  assert('greeting reuses Irishnu\'s guide dialogue, without the stage portrait (he stands in the scene)', /openDialogue\(\{ kind: 'guide', arrival: true \}\)/.test(aj) && /sp\.stage && !opts\.arrival/.test(aj));
  assert('closing the greeting pulls back; a tap skips; Irishnu flies into his card', /if \(wasOpen && S\.arrival && S\.arrival\.phase === 'frame'\) endArrival\(!silent\);/.test(aj) && /addEventListener\('click', \(\) => skipArrival\(\)\)/.test(aj) && /ar-arrive-fly/.test(aj) && /\$\('\.ar-guide'\)/.test(aj));
  assert('no flash: the arrival layer is opaque night and sits above the hub, under the dialogue', /\.ar-arrive \{[^}]*z-index: 20;[^}]*background: #05040e/.test(css) && /\.ar-arriving \.ar-hubui/.test(css));
  assert('camera sized in dvh (vh fallback)', /CSS\.supports\('height', '100dvh'\)\) \? 'dvh' : 'vh'/.test(aj));
  assert('no extra people: the arrival uses only the Irishnu layer', (aj.match(/<img class="ar-arrive-irs"/g) || []).length === 1);
  const rule = (sel) => { const m = css.match(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m ? m[1] : ''; };
  const card = rule('.ar-guide.ar-host-photo');
  assert('Irishnu card is bottom-RIGHT on desktop (right set, left auto) and clears the safe area', /right: max\(1\.5vw, 32px\)/.test(card) && /left: auto/.test(card) && /env\(safe-area-inset-bottom\)/.test(card));
  assert('Irishnu card is bottom-right on phones too (incl. short phones), above the Hall/Creed bar', /aspect-ratio: 9 \/ 16; right: 2vw; left: auto;[^}]*bottom: calc\(58px \+ max\(12px, env\(safe-area-inset-bottom\)\)\)/.test(css) && !/\.ar-guide\.ar-host-photo \{[^}]*left: (1\.5|2)vw/.test(css));
}

{
  console.log('\n--- v35 iOS hub fix: the painting always returns after the arrival pull-back ---');
  const aj = noComments(src('./aretoria.js')), css = src('./aretoria.css');
  const fn = (name) => { const i = aj.indexOf(`function ${name}(`); return i < 0 ? '' : aj.slice(i, aj.indexOf('\n}\n', i) + 2); };
  const fin = fn('finishArrival'), reset = fn('resetArrivalStage'), refresh = fn('refreshHubArt'), end = fn('endArrival'), par = fn('applyParallax');
  assert('finishArrival sets the final state itself (reset + hub art refresh), not via animation/transition events', /resetArrivalStage\(\);/.test(fin) && /refreshHubArt\(\);/.test(fin) && !/animationend|transitionend/.test(aj));
  assert('reset cancels every arrival animation and clears world transform, origin and opacity', /world\.style\.transform = ''/.test(reset) && /world\.style\.transformOrigin = ''/.test(reset) && /world\.style\.opacity = ''/.test(reset) && /\.cancel\(\)/.test(reset));
  assert('reset hides the arrival layer, drops its classes and frees the big arrival painting', /el\.hidden = true/.test(reset) && /classList\.remove\('ar-arriving', 'ar-pulling'\)/.test(reset) && /\.ar-arrive-img'\)\.style\.backgroundImage = ''/.test(reset) && /\.ar-arrive-fly'\)\.forEach\(\(f\) => f\.remove\(\)\)/.test(reset));
  assert('hub UI opacity is reset too (gates, title, hint never stuck faded)', /\[\$\('\.ar-hubui'\), \$\('\.ar-title'\), \$\('\.ar-hint'\)\]/.test(reset) && /u\.style\.opacity = ''/.test(reset));
  assert('refreshHubArt swaps the painted layers for fresh copies once the image decodes', /replaceWith\(l\.cloneNode\(true\)\)/.test(refresh) && /im\.decode\(\)\.then\(done, done\)/.test(refresh) && /S\.view !== 'axial'/.test(refresh));
  assert('pull-back is settled by a timer, the WAAPI promises and a late watchdog (whichever first)', /setTimeout\(finishArrival, T \+ 30\)/.test(end) && /Promise\.all\(A\.anims\.map\(\(a\) => a\.finished\)\)/.test(end) && /T \+ 1500/.test(end));
  assert('during the pull-back the painting layers are 2D (not separate GPU layers) and lose will-change', /const flat = !!\(S\.arrival && S\.arrival\.phase === 'pull'\)/.test(par) && /flat \? `translate\(/.test(par) && /\.ar-pulling \.ar-layer \{ will-change: auto; \}/.test(css) && /layoutHub\(\); applyParallax\(true\);/.test(end));
  assert('no CSS filter on the world while arriving / pulling back', /\.ar-arriving \.ar-world, \.ar-pulling \.ar-world \{ filter: none; transition: none; \}/.test(css));
  assert('outside the pull-back nothing can leave the world scaled, and the arrival layer stays hidden', /\.ar:not\(\.ar-pulling\) \.ar-world \{ transform: none !important; \}/.test(css) && /\.ar:not\(\.ar-arriving\):not\(\.ar-pulling\) \.ar-arrive \{ display: none !important; \}/.test(css));
  assert('reduced motion keeps .ar-pulling through its 300 ms cross-fade (so the guard does not cut it)', /if \(reduced\(\)\) \{\s*root\.classList\.remove\('ar-arriving'\); root\.classList\.add\('ar-pulling'\);/.test(end));
  assert('interrupted intro: hiding the page / pagehide finishes the pull-back; pageshow (bfcache) and returning to the tab repaint the hub', /document\.hidden\) \{ cancelAnimationFrame\(S\.raf\); if \(S\.arrival && S\.arrival\.phase === 'pull'\) finishArrival\(\); \}/.test(aj) && /addEventListener\('pagehide'/.test(aj) && /addEventListener\('pageshow', \(e\) => \{ if \(S\.open && e\.persisted\) \{ finishArrival\(\); refreshHubArt\(\); \} \}\)/.test(aj) && /if \(!S\.arrival\) refreshHubArt\(\);/.test(aj));
  assert('leaving the hub mid-arrival (e.g. "Take me to Wisdom") settles the arrival first', /function showView\(id\) \{\s*if \(S\.arrival && id !== 'axial'\) finishArrival\(\);/.test(aj));
  assert('closing Aretoria mid-arrival still cleans up', /closeDialogue\(true\); closePanels\(\); finishArrival\(\);/.test(aj));
}

{
  console.log('\n--- v35 Irishnu lore pass (all of his lines) ---');
  const N = GUIDE.dialogue.nodes, all = Object.values(N).map((n) => n.text).join(' '), aj = noComments(src('./aretoria.js'));
  assert('arrival greeting is its own first line, opened only by the arrival', GUIDE.dialogue.arrivalStart === 'arrive' && !!N.arrive && GUIDE.dialogue.start === 'greet' && /\(opts\.arrival && \(fv \? pick\('firstArrivalStart'\) : pick\('arrivalStart'\)\)\) \|\| \(fv && pick\('firstStart'\)\) \|\| sp\.tree\.start/.test(aj));
  assert('both entry points validate (arrive + greet reachable, all choices resolve)', validateTree(GUIDE.dialogue).length === 0);
  assert('arrive greets the visitor who came through the central portal of the Axial Realm', /portal/.test(N.arrive.text) && /Axial Realm/.test(N.arrive.text) && /center/.test(N.arrive.text));
  assert('he wears ivory-and-sapphire armor now: no robe in his lines', !/\brobes?\b/i.test(all) && /ivory and sapphire/.test(N.who.text) && /armor/.test(N.who.text) && GUIDE.look === 'ivory-and-sapphire armor');
  assert('he is the visitor\'s reflection: "the self you send ahead", addressed by {name} (restored in v65)', /the self you send ahead/.test(N.who.text) && /\{name\}/.test(N.who.text));
  assert('the Axial Realm is "the shared realm of existence" (HUB.sub)', HUB.sub === 'The shared realm of existence' && /shared realm of existence/.test(N.greet.text) && /shared realm of existence/.test(N.arrive.text));
  assert('81 virtues, each in exactly one of the six great temples; none on the axis (v36)', VIRTUES.length === 81 && /The eighty-one virtues are shared among those six temples/.test(N.realms.text) && !('virtues' in HUB) && !/axis/.test(N.realms.text.split('Axial Realm')[0]));
  assert('names every realm Guardian from the app data, as protectors of their realms (v66)', REALMS.every((r) => N.realms.text.includes(r.guardian.name)) && /Guardian serves to protect that realm/.test(N.realms.text) && !/first advisor/.test(N.realms.text) && !/kettle/.test(N.realms.text));
  const sh = REALMS.find((r) => r.id === 'shadow');
  assert('Shadow lies across its own bridge (not "below the axis"); its far bridges match the realm data', !/Below the axis/i.test(all) && /Across its own bridge/.test(N.shadow.text) && ['Courage', 'Humanity', 'Temperance'].every((x) => sh.landscape.includes(x) && N.shadow.text.includes(x)) && N.shadow.text.includes(sh.temple));
  assert('every realm named in his lines is a real realm', ['Wisdom', 'Courage', 'Humanity', 'Justice', 'Temperance', 'Transcendence'].every((x) => REALMS.some((r) => r.name === x) && N.realms.text.includes(x)));
  assert('his voice and rules survive: one whole, the golden thread, real circumstances, he/him, never a jester', /one whole/.test(all) && /golden thread/.test(all) && /real circumstances/.test(all) && !/\b(she|her|herself)\b/i.test(JSON.stringify(GUIDE)) && !/jester|clown|fool|motley|harlequin|trickster|keeper|chakra/i.test(JSON.stringify(GUIDE)));
  const html = src('./index.html');
  assert('landing copy: portal arrival, no "shrine fly-through"', /Step through the portal/.test(html) && !/shrine fly-through|Enter the shrine/i.test(html) && /<span class="guide-name">Irishnu<\/span> the Guide meets you/.test(html));
}

{
  console.log('\n--- v36 lore: no Eirena, impersonal golden thread, six great temples (14/14/14/13/13/13) ---');
  const dataSrc = src('./aretoria-data.js');
  const visible = JSON.stringify({ GUIDE, REALMS, HUB, VIRTUES: VIRTUES.map((v) => advisorDialogue(v)), CREED, OPENING, CLOSING }) + noComments(src('./aretoria.js')) + src('./index.html') + src('./manifest.webmanifest') + src('./boot.js');
  assert('Eirena is gone from every text, data file and comment', !/Eirena|Weaver/i.test(visible) && !/Eirena|Eternal Weaver/.test(dataSrc));
  assert('nobody holds or weaves the golden thread', !/(holds?|holding|weaves?|weaving|weave)[^.]{0,30}golden thread|golden thread[^.]{0,20}(is held|is woven)|watch [A-Z]\w+ weave/i.test(visible));
  assert('the thread is a feature: gold light through every bridge and portal', /golden thread runs through every bridge and portal/.test(GUIDE.dialogue.nodes.greet.text) && /golden thread runs through every bridge and portal/.test(GUIDE.dialogue.nodes.arrive.text) && /every bridge and portal/.test(HUB.thread));
  const all = REALMS.flatMap((r) => Object.values(r.dialogue.nodes).map((n) => n.text)).join(' ');
  assert('guardian lines keep their images without a being: warmest at Amara\'s hearth, seven colors in the Prism, bridges catching light, dimmed never cut', /golden thread runs warmest here/.test(all) && /golden thread passes through my Prism and comes out as seven colors/.test(all) && /watch the golden thread shine as the bridges catch the light/.test(all) && /Even the golden thread passes through, dimmed, never cut/.test(all));
  const count = {}; VIRTUES.forEach((v) => { count[v.realm] = (count[v.realm] || 0) + 1; });
  const sizes = REALMS.filter((r) => r.id !== 'shadow').map((r) => count[r.id] || 0).sort();
  assert('81 virtues, each exactly once, all in the six great temples (none on the axis or in Shadow)', VIRTUES.length === 81 && new Set(VIRTUES.map((v) => v.slug)).size === 81 && VIRTUES.every((v) => REALM_IDS.includes(v.realm) && v.realm !== 'shadow' && v.realm !== 'axial') && !('virtues' in HUB));
  assert('balanced: three temples hold 14, three hold 13', eq(sizes, [13, 13, 13, 14, 14, 14]), JSON.stringify(count));
  assert('exact v36 counts: Humanity 14, Justice 14, Temperance 14, Courage 13, Wisdom 13, Transcendence 13', count.humanity === 14 && count.justice === 14 && count.temperance === 14 && count.courage === 13 && count.wisdom === 13 && count.transcendence === 13);
  assert('realm tag lists = exactly the virtues housed there (one source of truth)', REALMS.every((r) => eq([...r.virtues].sort(), VIRTUES.filter((v) => v.realm === r.id).map((v) => v.name).sort())));
  assert('each realm\'s great virtue leads its list where it is one of the 81', ['wisdom', 'courage', 'justice', 'temperance'].every((id) => { const r = REALMS.find((x) => x.id === id); return r.virtues[0] === r.name; }));
  const home = (n) => (VIRTUES.find((v) => v.name === n) || {}).realm;
  assert('the five former axis virtues each have one home: Beauty, Graciousness → Transcendence; Integrity → Justice; Purposefulness, Wonder → Wisdom', home('Beauty') === 'transcendence' && home('Graciousness') === 'transcendence' && home('Integrity') === 'justice' && home('Purposefulness') === 'wisdom' && home('Wonder') === 'wisdom');
  assert('the eight minimal moves are marked fit: balanced', eq(VIRTUES.filter((v) => v.fit === 'balanced').map((v) => v.name).sort(), ['Acceptance', 'Cleanliness', 'Detachment', 'Excellence', 'Graciousness', 'Harmony', 'Patience', 'Peace']));
  assert('no "axis virtues" / "belong to the axis" anywhere', !/belong to the axis|axis virtues|stay here on the axis|shared by the axis/i.test(visible + dataSrc));
  const R = GUIDE.dialogue.nodes.realms.text;
  assert('Irishnu\'s six-realms answer: six great temples each holding one great virtue, 81 shared among them, Guardians protect their realms (named), virtues are the advisors, Shadow + Veil, Axial hall + portal', /^Six great temples, \{name\}, each holding one great virtue/.test(R) && /The eighty-one virtues are shared among those six temples/.test(R) && /Every temple’s Guardian serves to protect that realm: Valorix, Justar, Amara, Moder, Sophia and Auria, in that order\./.test(R) && /The virtues housed in each temple are its advisors\./.test(R) && /Shadow Realm, watched by the Guardian of the Veil/.test(R) && /Axial Realm, the shared hall that joins them all; the portal set you down/.test(R) && !/realms of light|great virtue:? Wisdom, Courage, Humanity, Justice, Temperance and Transcendence, and/.test(R));
  assert('Guardians no longer deny being advisors ("not me", "kettle")', !/advisors, not me|counsel here, not me|kettle/.test(all + R));
  assert('advisor default line: housed in the temple the Guardian protects (v66)', /I am one of the advisors housed in the \$\{realm\.temple\}, which \$\{realm\.guardian\.name\} protects\./.test(dataSrc));
  assert('ritual line no longer invents virtue "temples"', /with Empathy and Compassion in the Hearth of Hearts/.test(dataSrc) && !/Compassion temples/.test(dataSrc));
  assert('kept as the author has not decided: Sophia\'s "before the axis had a name" and the "Seven Realms" landing', /before the axis had a name/.test(all) && /The Seven Realms/.test(src('./index.html')));
}

{
  console.log('\n--- v37: username-based (no hard-coded person), name prompt, swappable guide ---');
  const D = await import('./aretoria-data.js?v=test37');
  const { readdirSync } = await import('fs');
  const OWNER = String.fromCharCode(67, 97, 115, 115, 105, 100, 121); // built at runtime so this file stays clean too
  const served = [];
  const walk = (dir) => { for (const e of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
    if (['.git', '.github', 'node_modules'].includes(e.name) || e.name === 'ROADMAP.md') continue;
    const rel = dir + e.name; if (e.isDirectory()) walk(rel + '/'); else if (/\.(js|mjs|css|html|json|webmanifest|txt|md|svg)$/.test(e.name)) served.push(rel);
  } };
  walk('./');
  const hits = served.filter((f) => new RegExp(OWNER, 'i').test(src(f)));
  assert('no hard-coded owner name in any served file (code, data, UI, tests)', hits.length === 0, hits.join(', '));
  const texts = [];
  const tree = (t) => Object.values(t.nodes).forEach((n) => { texts.push(n.text); n.choices.forEach((c) => texts.push(c.label)); });
  tree(D.GUIDE.dialogue); D.REALMS.forEach((r) => tree(r.dialogue)); D.VIRTUES.forEach((v) => tree(D.advisorDialogue(v)));
  assert('dialogue addresses the visitor only through {name} / {Name}', texts.some((t) => /\{name\}/.test(t)) && texts.some((t) => /\{Name\}/.test(t)));
  assert('{Name} only opens a sentence; {name} never does', texts.every((t) => !/(^|[.!?…]\s+)\{name\}/.test(t) && !/[^.!?…\s]\s*\{Name\}/.test(t.replace(/^\{Name\}/, ''))));
  assert('the guide is named only through {guide} in every line (swappable)', texts.every((t) => !/Irishnu/.test(t)) && texts.some((t) => /\{guide\}/.test(t)));
  const day = new Date(2026, 9, 7);
  const fill = (t, n) => D.fillTokens(t, D.tokenContext(day, D.REALMS, n));
  const A = D.GUIDE.dialogue.nodes;
  assert('token replacement: a typed name greets the visitor', fill(A.arrive.text, 'Ada').startsWith('Ada. Steady now') && fill(A.greet.text, 'Ada').startsWith('Ah, Ada. Right on time') && fill(A.realms.text, 'Ada').startsWith('Six great temples, Ada,'));
  assert('fallback grammar: "Traveler." at a sentence start, "traveler" mid-sentence', fill(A.arrive.text, '').startsWith('Traveler. Steady now') && fill(A.greet.text, '').startsWith('Ah, traveler. Right on time') && fill(D.REALMS.find((r) => r.id === 'courage').dialogue.nodes[D.REALMS.find((r) => r.id === 'courage').dialogue.start].text, '').startsWith('Traveler! Good.'));
  const allFallback = texts.map((t) => fill(t, ''));
  assert('every line fills cleanly with the fallback (no tokens left, capitalised at sentence starts)', allFallback.every((t) => !/\{(name|Name|guide)\}/.test(t) && !/(^|[.!?…]\s+)traveler\b/.test(t) && !/,\s+Traveler\b/.test(t)));
  assert('every line fills with a typed name and the guide name', texts.map((t) => fill(t, 'Ada')).every((t) => !/\{(name|Name|guide)\}/.test(t)) && texts.some((t) => fill(t, 'Ada').includes(D.GUIDE_NAME_DEFAULT)));
  assert('lowercase typed names are raised only at a sentence start', fill(A.arrive.text, 'émile').startsWith('Émile. ') && fill(A.greet.text, 'émile').startsWith('Ah, émile.'));
  assert('name cleaning: trims, caps at 24, keeps unicode letters, spaces, hyphens, apostrophes', D.cleanName('  Ada  ') === 'Ada' && D.cleanName("Seán O’Brien-Ní") === "Seán O’Brien-Ní" && D.cleanName('张伟') === '张伟' && D.cleanName("D'Angelo") === "D'Angelo" && Array.from(D.cleanName('x'.repeat(60))).length === 24 && D.cleanName('a  b') === 'a b' && D.cleanName('123 !!!') === '');
  const evil = D.cleanName('<img src=x onerror=alert(1)>{name}&amp;"');
  assert('escaping: markup and token braces are stripped from names (no HTML or token injection)', !/[<>&"=(){}\/;]/.test(evil) && D.nameForms('<b>').name === 'b');
  assert('fallback is "traveler"; empty / letterless names fall back', D.NAME_FALLBACK === 'traveler' && D.nameForms('').name === 'traveler' && D.nameForms('').Name === 'Traveler' && D.nameForms('—').name === 'traveler');
  assert('name tokens are registered', ['name', 'Name', 'guide'].every((k) => D.TOKENS.includes(k)));
  const aj = noComments(src('./aretoria.js')), css = src('./aretoria.css');
  assert('stored in localStorage only (name + asked flag), nothing sent anywhere', /localStorage\.setItem\(NAME_KEY, n\)/.test(aj) && /localStorage\.setItem\(NAME_ASKED_KEY, '1'\)/.test(aj) && D.NAME_KEY === 'mec-aretoria:name' && !/fetch\(|XMLHttpRequest|sendBeacon/.test(aj));
  assert('the prompt is shown in the same frame as the root (no flash) and the entrance waits for it', /if \(!nameAsked\(\)\) \{ \$\('\.ar-name'\)\.hidden = false;[^\n]*\n\s*root\.hidden = false;/.test(aj) && /openNamePrompt\(\{ done: \(\) => \{ if \(S\.open\) \{ startIntro\(opts\.realm\);/.test(aj));
  assert('asked once: existing visitors without a name get it once; skip remembers', /function nameAsked\(\) \{ try \{ return !!localStorage\.getItem\(NAME_ASKED_KEY\) \|\| !!storedName\(\);/.test(aj) && /if \(!box\.classList\.contains\('edit'\)\) saveName\(''\)/.test(aj));
  assert('the prompt sits on opaque night above every layer', /\.ar-name \{ position: absolute; inset: 0; z-index: 60;[^}]*#020108/.test(css));
  assert('copy: one field, gentle first-name nudge, Continue + Skip, local-only note', /What should Aretoria call you\?/.test(aj) && /Your first name works best/.test(aj) && /maxlength="\$\{NAME_MAX\}"/.test(aj) && />Continue</.test(aj) && /Skip for now/.test(aj) && /Kept only in this browser/.test(aj));
  assert('change / clear later from the Hall of Virtues ("Aretoria calls you …" · Change · Forget my name)', /data-act="name">Change</.test(aj) && /act === 'name'\) openNamePrompt\(\{ edit: true/.test(aj) && /Forget my name/.test(aj) && /function clearName\(\) \{[^\n]*localStorage\.removeItem\(NAME_KEY\)/.test(aj));
  assert('names are rendered as text, never HTML (Hall line via textContent; dialogue via textContent; choices escaped)', /t\.textContent = n \? `Aretoria calls you \$\{n\}\.`/.test(aj) && /tEl\.textContent = text/.test(aj) && /esc\(fillTokens\(c\.label, D\.ctx\)\)/.test(aj));
  assert('dialogue context carries the visitor name', /tokenContext\(new Date\(\), undefined, visitorName\(\)\)/.test(aj));
  assert('the prompt owns the keyboard (Enter submits, Esc skips) and its clicks never reach the hub', /if \(!\$\('\.ar-name'\)\.hidden\) return;/.test(aj) && /e\.key === 'Escape'\) \{ e\.preventDefault\(\); \$\('\.ar-name-skip'\)\.click\(\); \}/.test(aj) && /box\.addEventListener\('click', \(e\) => e\.stopPropagation\(\)\)/.test(aj));
  assert('guide swappable: one name config + one art config', D.GUIDE.name === D.GUIDE_NAME_DEFAULT && D.GUIDE_NAME_DEFAULT === 'Irishnu' && D.guideName() === 'Irishnu' && D.GUIDE_ART.portrait === D.IRISHNU_PORTRAIT && D.GUIDE_ART.avatar === D.IRISHNU_AVATAR && D.ARRIVAL.irishnu.src === D.GUIDE_ART.arrival && D.GUIDE.portrait === D.GUIDE_ART.portrait);
  assert('UI names the guide through guideName() (card, aria, hint), never a literal', !/\bIrishnu\b/.test(aj) && /hubHint = \(\) => `Tap a gate to travel · tap \$\{guideName\(\)\} to talk`/.test(aj) && /esc\(GUIDE_ART\.avatar\)/.test(aj));
}

{
  console.log('\n--- v65: the guide\'s first conversation vs later visits (Who are you, really? restored) ---');
  const D = await import('./aretoria-data.js?v=test65');
  const T = D.GUIDE.dialogue, N = T.nodes, labels = (id) => N[id].choices.map((c) => c.label);
  const nexts = (id) => N[id].choices.map((c) => c.next);
  const aj = noComments(src('./aretoria.js'));
  const WHO = "Your guide, and your reflection: the self you send ahead into Aretoria, in ivory and sapphire, so that someone at the center always remembers why you came. I point at doors, and now and then at the one walking through them; you are the door that matters most and opens least. Every realm out there is one face of the same whole, {name}, and so are you. I am simply the reminder, armored so you will take me seriously.";
  assert('first visit, screen 1: "What are the realms?" then "Who are you, really?" (arrival and card)', T.firstArrivalStart === 'arriveFirst' && T.firstStart === 'greetFirst' && ['arriveFirst', 'greetFirst'].every((id) => eq(labels(id), ['What are the realms?', 'Who are you, really?']) && eq(nexts(id), ['realms', 'who'])));
  assert('"Who are you, really?" answer restored verbatim (with {name}), in both who nodes', N.who.text === WHO && N.whoAfterRealms.text === WHO);
  assert('first visit keeps the same greeting text as later visits', N.arriveFirst.text === N.arrive.text && N.greetFirst.text === N.greet.text);
  const R = N.realms.text;
  assert('the realms answer names all six temples with their virtues, the 81, the Guardians, Shadow across its bridge and the Axial hall', [['Wisdom', 'Prism of Insight'], ['Courage', 'Forge of Valor'], ['Humanity', 'Hearth of Hearts'], ['Justice', 'Scales of Equity'], ['Temperance', 'Veil of Balance'], ['Transcendence', 'Nebula of Awe']].every(([v, t]) => R.includes(`${v} in the ${t}`)) && D.REALMS.filter((r) => r.id !== 'shadow').every((r) => R.includes(r.temple)) && /eighty-one/.test(R) && /Across its own bridge lies the Shadow Realm, watched by the Guardian of the Veil/.test(R) && /Axial Realm, the shared hall/.test(R));
  assert('screen 2 after the realms: Shadow, Who are you (not yet asked), today, "Let me explore."', eq(labels('realms'), ['And the Shadow Realm?', 'Who are you, really?', 'Where should I go today?', 'Let me explore.']) && eq(nexts('realms'), ['shadow', 'whoAfterRealms', 'today', 'go']));
  assert('realms after "Who are you" already asked: Shadow, today, "Let me explore." (no repeat)', eq(labels('realmsAfterWho'), ['And the Shadow Realm?', 'Where should I go today?', 'Let me explore.']) && N.realmsAfterWho.text === N.realms.text);
  assert('after "Who are you" before the realms: realms, today, explore; never the Shadow question', eq(labels('who'), ['What are the realms?', 'Where should I go today?', 'Then remind me: let me explore.']) && eq(nexts('who'), ['realmsAfterWho', 'today', 'go']));
  assert('after "Who are you" once the realms are known: Shadow, today, explore', eq(labels('whoAfterRealms'), ['And the Shadow Realm?', 'Where should I go today?', 'Then remind me: let me explore.']) && eq(nexts('whoAfterRealms'), ['shadow', 'today', 'go']));
  // walk every first-visit path: the Shadow question never appears before a realms answer has been shown
  const bad = []; const walk = (id, sawRealms, depth) => { if (depth > 6 || !N[id]) return; const seen = sawRealms || /^realms/.test(id); N[id].choices.forEach((c) => { if (/Shadow Realm\?/.test(c.label) && !seen) bad.push(id); if (!c.next.startsWith('@')) walk(c.next, seen, depth + 1); }); };
  walk('arriveFirst', false, 0); walk('greetFirst', false, 0);
  assert('no first-visit path offers the Shadow question before the realms answer', bad.length === 0, bad.join(','));
  assert('later visits: only "Where should I go today?" and "I know the way. Let me explore."', ['arrive', 'greet'].every((id) => eq(labels(id), ['Where should I go today?', 'I know the way. Let me explore.']) && eq(nexts(id), ['today', 'go'])) && T.arrivalStart === 'arrive' && T.start === 'greet');
  assert('"I know the way" never appears on the first-visit path', ['arriveFirst', 'greetFirst', 'realms', 'realmsAfterWho', 'who', 'whoAfterRealms'].every((id) => !labels(id).some((l) => /know the way/i.test(l))));
  assert('all four entry points validate and reach every node', D.validateTree(T).length === 0 && Object.keys(N).length === 11);
  assert('first-visit-done flag lives next to the name in localStorage', D.FIRST_VISIT_KEY === 'mec-aretoria:first-visit-done' && /localStorage\.setItem\(FIRST_VISIT_KEY, '1'\)/.test(aj));
  assert('the first visit lasts its session; the flag is set when that first conversation closes', /function firstVisit\(\) \{\s*try \{ return !!sessionStorage\.getItem\(FIRST_SESSION_KEY\) \|\| !localStorage\.getItem\(FIRST_VISIT_KEY\);/.test(aj) && /if \(wasOpen && S\.dlg\.firstVisit\) markFirstVisitDone\(\);/.test(aj) && /const fv = opts\.kind === 'guide' && !!sp\.tree\.firstStart && firstVisit\(\);/.test(aj));
  assert('visitors who met the guide before v63 count as returning', /function migrateFirstVisit\(\) \{[^\n]*\n\s*try \{ if \(localStorage\.getItem\(MET_KEY\) && !localStorage\.getItem\(FIRST_VISIT_KEY\)/.test(aj) && /S\.open = true;\n\s*firstVisitParam\(\);\n\s*migrateFirstVisit\(\);/.test(aj));
}

{
  console.log('\n--- v66: "Meet the guide again" (Hall of Virtues) and ?firstvisit=1 ---');
  const aj = noComments(src('./aretoria.js')), css = src('./aretoria.css');
  assert('Hall shows "Meet <guide> again" beside the name Change control, with a status line', /data-act="name">Change<\/button>` \+\s*`<span class="ar-hall-sep" aria-hidden="true">·<\/span><button type="button" class="ar-linkbtn" data-act="meet-again">Meet \$\{esc\(guideLabel\(\)\)\} again<\/button>` \+/.test(aj) && /<p class="ar-hall-replay" role="status" aria-live="polite"><\/p>/.test(aj));
  assert('reset clears the first-visit flag, the session marker and the pre-v63 met marker; keeps the name', /function resetFirstVisit\(\) \{\s*S\.firstDoneHere = false;\s*try \{ localStorage\.removeItem\(FIRST_VISIT_KEY\); localStorage\.removeItem\(MET_KEY\); sessionStorage\.removeItem\(FIRST_SESSION_KEY\); \}/.test(aj) && !/function resetFirstVisit\(\) \{[^}]*NAME_KEY/.test(aj));
  assert('the control resets and confirms in one brief line (text, not HTML)', /act === 'meet-again'\) \{\s*resetFirstVisit\(\);\s*const n = \$\('\.ar-hall-replay'\); if \(n\) n\.textContent = `Done\. Your next talk with \$\{guideName\(\)\} starts from the beginning, as on a first visit\.`;/.test(aj));
  assert('?firstvisit=1 resets once before the migration runs, then leaves the address bar', /if \(u\.searchParams\.get\('firstvisit'\) !== '1'\) return;\s*resetFirstVisit\(\);\s*u\.searchParams\.delete\('firstvisit'\);\s*history\.replaceState/.test(aj) && /S\.open = true;\n\s*firstVisitParam\(\);\n\s*migrateFirstVisit\(\);/.test(aj));
  assert('after a reset the next guide conversation is a first visit (firstVisit reads the cleared keys)', /return !!sessionStorage\.getItem\(FIRST_SESSION_KEY\) \|\| !localStorage\.getItem\(FIRST_VISIT_KEY\);/.test(aj) && /const fv = opts\.kind === 'guide' && !!sp\.tree\.firstStart && firstVisit\(\);/.test(aj));
  assert('status line styled quietly and hidden when empty', /\.ar-hall-replay:empty \{ display: none; \}/.test(css));
}

{
  console.log('\n--- v66: Guardians are warriors who protect their realms, not advisors ---');
  const D = await import('./aretoria-data.js?v=test66');
  const ds = src('./aretoria-data.js');
  const all = JSON.stringify({ G: D.GUIDE, R: D.REALMS }) + ds;
  assert('guide: "Every temple’s Guardian serves to protect that realm: Valorix, Justar, Amara, Moder, Sophia and Auria, in that order." (hub order, v67)', D.GUIDE.dialogue.nodes.realms.text.includes('Every temple’s Guardian serves to protect that realm: Valorix, Justar, Amara, Moder, Sophia and Auria, in that order.'));
  assert('no Guardian framed as an advisor anywhere ("first advisor", "advisors too", "I counsel first", "I speak first … other virtues")', !/first advisor|advisors too|I counsel first|I speak first|other virtues of this forge|Guardians are advisors/i.test(all));
  assert('virtues remain the advisors (realm answer, Valorix, Amara, default advisor line)', /The virtues housed in each temple are its advisors\./.test(D.GUIDE.dialogue.nodes.realms.text) && /I guard the forge\. Its virtues do the counseling:/.test(ds) && /I keep watch over this hearth, dear one; the counsel comes from those around its fire:/.test(ds));
}

{
  console.log('\n--- v67: realms always in hub order (left to right in the Axial painting) ---');
  const D = await import('./aretoria-data.js?v=test67');
  const O = D.REALM_ORDER, byId = (id) => D.REALMS.find((r) => r.id === id);
  const gx = D.HUB_ART.desk.gates;
  assert('REALM_ORDER is the desktop hub gates sorted left to right (Courage, Justice, Humanity, Temperance, Wisdom, Transcendence)', eq([...O], ['courage', 'justice', 'humanity', 'temperance', 'wisdom', 'transcendence']) && eq([...O], Object.keys(gx).filter((k) => k !== 'shadow').sort((a, b) => gx[a][0] - gx[b][0])) && Object.isFrozen(O));
  assert('Shadow is not in the row: front-centre below the plaza (x = centre, lower than every temple gate), listed after the six', D.SHADOW_ID === 'shadow' && gx.shadow[0] === 640 && O.every((id) => gx.shadow[1] > gx[id][1]));
  assert('REALMS data follows REALM_ORDER then Shadow (module throws otherwise)', eq(D.REALM_IDS, [...O, 'shadow']) && /throw new Error\('REALMS must follow REALM_ORDER/.test(src('./aretoria-data.js')));
  const inOrder = (text, names) => { const pos = names.map((n) => text.indexOf(n)); return pos.every((p) => p >= 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]); };
  const names = O.map((id) => byId(id).name), temples = O.map((id) => byId(id).temple), guardians = O.map((id) => byId(id).guardian.name);
  const R = D.GUIDE.dialogue.nodes.realms.text;
  assert('guide\'s realms answer lists virtues, temples and Guardians in hub order ("From left to right around this hall", "in that order")', inOrder(R, names) && inOrder(R, temples) && inOrder(R, guardians) && /From left to right around this hall: Courage in the Forge of Valor, Justice in the Scales of Equity, Humanity in the Hearth of Hearts, Temperance in the Veil of Balance, Wisdom in the Prism of Insight, and Transcendence in the Nebula of Awe\./.test(R) && /Valorix, Justar, Amara, Moder, Sophia and Auria, in that order\./.test(R));
  assert('phone gate grid and Hall filters follow the shared order', /const HUB_GRID_ORDER = REALM_ORDER;/.test(src('./aretoria.js')) && /const realmsIn = REALMS\.filter/.test(src('./aretoria.js')));
  assert('landing lists the realms in hub order, Shadow last', /Courage, Justice, Humanity, Temperance, Wisdom, Transcendence,\s+and Shadow/.test(src('./index.html')));
  // every served string listing 3+ realms, temples or Guardians keeps the order
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
  const served = ['./index.html', './manifest.webmanifest', './aretoria-data.js', './aretoria.js', './boot.js'].map((f) => strip(src(f))).join('\n');
  const bad = [];
  for (const line of served.split('\n')) for (const list of [names, temples, guardians]) {
    const present = list.filter((n) => line.includes(n)); if (present.length < 3) continue;
    const seq = [...present].sort((a, b) => line.indexOf(a) - line.indexOf(b));
    if (seq.join() !== present.join()) bad.push(line.trim().slice(0, 80));
  }
  assert('no served line lists 3+ realms / temples / Guardians out of hub order', bad.length === 0, bad.join(' | '));
}

{
  console.log('\n--- v67: hub Guide card (A13 short iPhones, A14 drift after a realm) ---');
  const css = src('./aretoria.css'), aj = noComments(src('./aretoria.js'));
  assert('phones: the photo card keeps a 9:16 portrait ratio (height from the ratio, beats the 18vh / 34vw rules)', /@media \(max-width: 699px\) \{\s*\.ar \.ar-host\.ar-guide\.ar-host-photo \{ aspect-ratio: 9 \/ 16; width: min\(30vw, 118px\); height: auto; \}/.test(css) && /@media \(max-width: 699px\) and \(max-height: 720px\) \{\s*\.ar \.ar-host\.ar-guide\.ar-host-photo \{ width: min\(26vw, 100px\); \}/.test(css));
  assert('a finger tap never drives the parallax (mouse only)', /if \(e\.pointerType && e\.pointerType !== 'mouse'\) return;/.test(aj));
  assert('the Guide card drifts at most 8px sideways on desktop and not at all on phones', /const gx = el\.classList\.contains\('ar-guide'\) \? \(narrow \? 0 : 8\) : 30;/.test(aj) && /right: max\(1\.5vw, 32px\)/.test(css));
}

{
  console.log('\n--- v67: no em dashes or tildes in served copy (one deliberate exception) ---');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
  const KEEP = 'Thus, I stand—a testament to the power of a life lived with intention and grace.';
  assert('the closing line keeps its em dash exactly (the author\'s deliberate exception)', CLOSING === KEEP);
  const files = ['./index.html', './manifest.webmanifest', './aretoria-data.js', './aretoria.js', './aretoria-art.js', './boot.js'];
  const hits = files.flatMap((f) => strip(src(f)).replace(KEEP, '').split('\n').filter((l) => /[—~]/.test(l)).map((l) => `${f}: ${l.trim().slice(0, 60)}`));
  const cssContent = ['./aretoria.css', './shell.css'].flatMap((f) => (src(f).match(/content:\s*"[^"]*"/g) || []).filter((c) => /[—~]/.test(c)));
  assert('served copy (HTML, manifest, data, UI strings, CSS content) has no em dashes or tildes', hits.length === 0 && cssContent.length === 0, hits.concat(cssContent).join(' | '));
  const texts = [OPENING, ...CREED.paragraphs, ...CREED.affirmation, JSON.stringify(GUIDE), JSON.stringify(REALMS), JSON.stringify(VIRTUES), JSON.stringify(HUB)].join(' ');
  assert('dialogue, creed and Hall data carry no em dashes or tildes', !/[—~]/.test(texts));
  assert('creed lines now: "…and distinction, the fundamental pattern…" and "…toward godhood: to become joint-heirs…"', CREED.paragraphs.some((p) => p.includes('in perfect unity, love, and distinction, the fundamental pattern of consciousness and relationship.')) && CREED.paragraphs.some((p) => p.includes('Our purpose is to progress toward godhood: to become joint-heirs and co-creators')));
}

{
  console.log('\n--- v67: test and dev files never ship to Pages ---');
  const wf = src('./.github/workflows/pages.yml');
  assert('Publish Pages excludes ROADMAP.md, aretoria.test.js, *.test.js and package.json', /exclude_assets: '\.github,ROADMAP\.md,aretoria\.test\.js,\*\.test\.js,package\.json'/.test(wf));
  assert('the service worker never precaches the test file', !/test\.js/.test(src('./sw.js')));
}

{
  console.log('\n--- v68: family guides by link (?guide=<slug>), remembered per browser, default stays Irishnu ---');
  const D = await import('./aretoria-data.js?v=test68');
  const R = D.resolveGuide;
  assert('no param + nothing saved = Irishnu (the default link never changes)', R('', null).id === 'irishnu' && R('', null).save === null && D.GUIDE_ID === 'irishnu' && D.GUIDE_DEFAULT_ID === 'irishnu' && D.GUIDE_KEY === 'mec-aretoria:guide');
  assert('?guide=default / ?guide=irishnu forget the saved guide', R('?guide=default', 'x').id === 'irishnu' && R('?guide=default', 'x').save === 'clear' && R('?guide=IRISHNU', null).save === 'clear');
  assert('unknown slugs are ignored (keep the saved guide or Irishnu)', R('?guide=nobody', null).id === 'irishnu' && R('?guide=nobody', null).save === null && R('?guide=__proto__', null).id === 'irishnu' && R('?guide=toString', null).id === 'irishnu');
  assert('a saved slug that no longer exists falls back to Irishnu', R('', 'gone').id === 'irishnu');
  assert('every registered guide has a name, an armor phrase and all three art paths', Object.entries(D.GUIDES).every(([id, g]) => /^[a-z]+$/.test(id) && D.cleanName(g.name) === g.name && /^in /.test(g.look) && ['portrait', 'avatar', 'arrival'].every((k) => typeof g.art[k] === 'string' && g.art[k].startsWith('assets/aretoria/'))));
  assert('family guide art lives in assets/aretoria/guides/<slug>/ with a phone card sibling', Object.entries(D.GUIDES).filter(([id]) => id !== 'irishnu').every(([id, g]) => g.art.portrait === `assets/aretoria/guides/${id}/card.jpg` && D.mobileArtPath(g.art.portrait) === `assets/aretoria/guides/${id}/mobile/card.jpg` && existsSync(new URL('./' + g.art.portrait, import.meta.url)) && existsSync(new URL('./' + D.mobileArtPath(g.art.portrait), import.meta.url)) && existsSync(new URL('./' + g.art.avatar, import.meta.url)) && existsSync(new URL('./' + g.art.arrival, import.meta.url))));
  assert('a family guide is resolved from its link and saved; the saved guide is kept on later visits', Object.keys(D.GUIDES).filter((id) => id !== 'irishnu').every((id) => R(`?guide=${id}`, null).id === id && R(`?guide=${id}`, null).save === 'set' && R(`?guide=${id.toUpperCase()}`, id).save === null && R('', id).id === id));
  assert('default "Who are you, really?" still says ivory and sapphire', /Aretoria, in ivory and sapphire, so that/.test(D.GUIDE.dialogue.nodes.who.text));
  const fam = Object.entries(D.GUIDES).filter(([id]) => id !== 'irishnu');
  assert('each family guide speaks its own reflection: own name via {guide}, own armor, the visitor via {name}; none of Irishnu\'s lore', fam.every(([, g]) => typeof g.who === 'string' && /^I am \{guide\}, your guide and your reflection/.test(g.who) && g.who.includes(g.look) && /\{name\}/.test(g.who) && !/Irishnu|ivory|sapphire|take me seriously|the reminder/i.test(g.who) && typeof g.whoGo === 'string' && !/remind/i.test(g.whoGo)));
  assert('family guide copy has no em dashes or tildes and no leftover tokens beyond {guide} / {name}', fam.every(([, g]) => ![g.who, g.whoGo, g.look, g.name].some((t) => /[\u2014~]/.test(t)) && (g.who.match(/\{(\w+)\}/g) || []).every((t) => t === '{guide}' || t === '{name}')));
  assert('Irishnu keeps his exact self-description and closing choice', D.GUIDES.irishnu.who === undefined && /^Your guide, and your reflection: the self you send ahead into Aretoria, in ivory and sapphire, so that someone at the center always remembers why you came\./.test(D.GUIDE.dialogue.nodes.who.text) && D.GUIDE.dialogue.nodes.who.choices[2].label === 'Then remind me: let me explore.');
  assert('a long label is used where the guide is labeled; dialogue uses the short name', D.guideLabel() === 'Irishnu' && D.GUIDE.label === 'Irishnu' && Object.values(D.GUIDES).every((g) => !g.label || (g.label.startsWith(g.name + ' ') && !/[\u2014~]/.test(g.label) && !g.who.includes(g.label))));
  const dj = noComments(src('./aretoria-data.js')), aj = noComments(src('./aretoria.js')), bj = src('./boot.js');
  assert('the visitor name is prefilled only from a link and only when none is saved', /if \(r\.fromLink && v && !cleanName\(localStorage\.getItem\(NAME_KEY\) \|\| ''\)\)/.test(dj));
  assert('Hall offers "Use the default guide" only for a family guide; it forgets the guide and reloads the plain link', /isFamilyGuide\(\) \? `<span class="ar-hall-sep" aria-hidden="true">·<\/span><button type="button" class="ar-linkbtn" data-act="guide-default">Use the default guide<\/button>` : ''/.test(aj) && /act === 'guide-default'\) \{[\s\S]{0,200}?localStorage\.removeItem\(GUIDE_KEY\)[\s\S]{0,80}?location\.replace\(location\.pathname\)/.test(aj));
  assert('labels (card, aria, Hall, name plate, stage) use guideLabel(); long labels wrap on the card', /ar-host-name\$\{guideLabel\(\)\.length > 24 \? ' ar-host-name-long' : ''\}">\$\{esc\(guideLabel\(\)\)\}/.test(aj) && /aria-label="Speak with \$\{esc\(guideLabel\(\)\)\}/.test(aj) && /name: GUIDE\.label, title: GUIDE\.title/.test(aj) && /label: `\$\{GUIDE\.label\} \$\{GUIDE\.title\}`/.test(aj) && /\.ar-host-name\.ar-host-name-long \{ white-space: normal;/.test(src('./aretoria.css')) && !/ar-host-name-long[^}]*overflow-wrap: anywhere/.test(src('./aretoria.css')));
  assert('the landing names the active guide', /querySelectorAll\('\.guide-name'\)\.forEach\(\(el\) => \{ el\.textContent = guideLabel\(\); \}\)/.test(bj) && /aretoria-data\.js\?v=45'/.test(bj));

  console.log('\n--- v70: personal lines. Default link unchanged; family links get gentle invitations and the Creed of Aretoria ---');
  const sun = new Date(2026, 9, 4), sat1 = new Date(2026, 9, 3), last = new Date(2026, 9, 31), mon = new Date(2026, 9, 5);
  assert('default ritual lines are exactly as before', D.ritualFor(sun).line === 'It is Sunday: the evening of your weekly self-audit and 1–10 scorecard.' && /your relationship reflection/.test(D.ritualFor(sat1).line) && /your monthly review/.test(D.ritualFor(last).line) && D.ritualFor(mon).line === 'Today is a day for your daily reflection.');
  assert('gentle ritual lines keep the same days and realms but never say "your self-audit / relationship reflection / monthly review"', [sun, sat1, last, mon].every((d) => D.ritualFor(d, true).realm === D.ritualFor(d).realm && D.ritualFor(d, true).id === D.ritualFor(d).id && !/self-audit|scorecard|your relationship reflection|your monthly review|your daily reflection|[\u2014~]/.test(D.ritualFor(d, true).line + D.ritualFor(d, true).name)));
  assert('default link keeps "your Creed", "Read my Creed", the first-person Hall lead and no Creed frame', /and your Creed waits beside it/.test(D.GUIDE.dialogue.nodes.go.text) && D.GUIDE.dialogue.nodes.go.choices.some((c) => c.label === 'Read my Creed') && D.HALL_LEAD === 'The virtues I seek to compound within myself:' && D.CREED_FRAME === '');
  const jus = D.REALMS.find((r) => r.id === 'justice'), hum = D.REALMS.find((r) => r.id === 'humanity'), tem = D.REALMS.find((r) => r.id === 'temperance');
  assert('default Guardians keep their routine lines (Justar, Amara, Moder)', JSON.stringify(jus.dialogue).includes('Weigh as your Sunday self-audit does') && JSON.stringify(hum.dialogue).includes('This is your relationship reflection, first and third Saturdays') && JSON.stringify(tem.dialogue).includes('Let your monthly review begin'));
  assert('family variants exist for the routine lines, the Creed and the Hall lead (no em dashes)', /FAMILY_GENTLE \? "Weigh the way a quiet look back/.test(dj) && /FAMILY_GENTLE \? "Here is a gentle invitation/.test(dj) && /FAMILY_GENTLE \? "Let any look back/.test(dj) && /'the Creed of Aretoria' : 'your Creed'/.test(dj) && /'Read the Creed of Aretoria' : 'Read my Creed'/.test(dj) && /'The virtues to compound within yourself:'/.test(dj) && !/FAMILY_GENTLE \? "[^"]*\u2014/.test(dj));
  assert('tokenContext uses the gentle rituals only on a family link; opening and closing narration unchanged', /ritualFor\(date, isFamilyGuide\(\)\)/.test(dj) && D.CLOSING.startsWith('Thus, I stand\u2014') && D.OPENING.startsWith('Within me blooms Aretoria'));
  assert('Hall lead and Creed frame come from data; phone realm card starts below the header', /ar-hall-lead">\$\{esc\(HALL_LEAD\)\}/.test(aj) && /CREED_FRAME \? `<div class="ar-creed-frame">/.test(aj) && /--ar-top-h/.test(src('./aretoria.css')) && /function markTopHeight\(\)/.test(aj));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
