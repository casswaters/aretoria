/**
 * Aretoria standalone — data integrity + shell/SW checks (no MEC UI).
 */
import { readFileSync, existsSync, statSync } from 'fs';
import {
  REALMS, REALM_IDS, GUIDE, HUB, CREED, OPENING, CLOSING, VIRTUES,
  reflectionKey, ritualFor, tokenContext, fillTokens, validateAll, validateTree,
  advisorsFor, advisorDialogue, advisorKey, slugify, PORTRAIT_DIR, SHRINE_IMAGE,
  GP, GPm, GUARDIAN_DIR, RP, RPm, REALM_DIR, IRISHNU_PORTRAIT,
  SHRINE_IMAGE_MOBILE, ART_MOBILE_MQ, mobileArtPath, pickArtPath,
  guardianRole, guardianLine, guardianPortraitPath, irishnuPortraitPath, realmBackdropPath, HUB_ART,
  readMs, READ_BASE_MS, READ_PER_CHAR_MS
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
  assert('boot imports openAretoria and registers SW', /openAretoria/.test(boot) && /sw\.js\?v=18/.test(boot));
  assert('SW is aretoria-v24', /aretoria-v24/.test(sw) && !/aretoria-v17/.test(sw) && !/mec-v/.test(sw) && !/captains-log/.test(sw));
  assert('SW precaches Aretoria code + shell', ['aretoria.js', 'aretoria-data.js', 'aretoria-art.js', 'aretoria.css', 'boot.js', 'shell.css'].every((f) => sw.includes(`./${f}`)));
  assert('SW does not precache portraits/guardians/realms', !/assets\/aretoria\/[^']*\.jpg/.test(noComments(sw)) && !/guardians\//.test(noComments(sw)) && !/realms\//.test(noComments(sw)));
  assert('aretoria.js VERSION = 19', /const VERSION = 19;/.test(src('./aretoria.js')));
  assert('asset queries use ?v=18', /\?v=18/.test(html) && /\?v=18/.test(boot) && !/\?v=27/.test(src('./aretoria.js')));
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
  assert('desktop arc is mirrored about the centre (x pairs sum to 1280, equal y)', pairs.every(([l, r]) => Math.abs(D[l][0] + D[r][0] - 1280) <= 2 && Math.abs(D[l][1] - D[r][1]) <= 2));
  assert('desktop arc sweeps: outer pair lowest, inner pair highest', D.courage[1] > D.justice[1] && D.justice[1] > D.humanity[1]);
  // all six on one ellipse centred on the plaza (cx 640): fit a, b from the outer + inner pair, the middle pair must lie on it
  const e = (() => { const [x1, y1] = [D.humanity[0] - 640, D.humanity[1]], [x3, y3] = [D.courage[0] - 640, D.courage[1]]; const cy = 372;
    const A1 = x1 * x1, B1 = (cy - y1) ** 2, A3 = x3 * x3, B3 = (cy - y3) ** 2; const v = (A3 - A1) / (A3 * B1 - A1 * B3), u = (1 - B1 * v) / A1; return { u, v, cy }; })();
  const onE = ([x, y]) => (x - 640) ** 2 * e.u + (e.cy - y) ** 2 * e.v;
  assert('justice/wisdom lie on the same plaza ellipse (±6%)', Math.abs(onE(D.justice) - 1) < 0.06 && Math.abs(onE(D.wisdom) - 1) < 0.06);
  assert('gates slid back toward the plaza (not at the archways): Courage x ≥ 280, Transcendence x ≤ 1000, inner pair y ≥ 250', D.courage[0] >= 280 && D.transcendence[0] <= 1000 && D.humanity[1] >= 250 && D.temperance[1] >= 250);
  assert('Shadow centred on the front bridge, orb on the rune', D.shadow[0] === 640 && D.shadow[1] > HUB_ART.desk.rune[1] + 100 && HUB_ART.desk.rune[0] === 640);
  assert('mobile hub is a grid with a painting band rect', HUB_ART.mob.layout === 'grid' && Array.isArray(HUB_ART.mob.band) && HUB_ART.mob.band.length === 4 && HUB_ART.mob.band[3] > HUB_ART.mob.rune[1] && HUB_ART.mob.band[1] < HUB_ART.mob.rune[1]);
  assert('phone grid order is the six realms left→right; Shadow the centred 7th tile', /const HUB_GRID_ORDER = \['courage', 'justice', 'humanity', 'temperance', 'wisdom', 'transcendence'\]/.test(src('./aretoria.js')) && /id === 'shadow' \? 2 : Math\.floor\(k \/ 3\)/.test(ajA) && /id === 'shadow' \? 1 : k % 3/.test(ajA));
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

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
