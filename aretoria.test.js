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
  assert('Irishnu (Cassidy) avatar exists; stills only (no hub video)', existsSync(new URL(IRISHNU_AVATAR, import.meta.url)) && !/<video|IRISHNU_CLIP|irishnu\.(mp4|webm)/.test(readFileSync(new URL('./aretoria.js', import.meta.url), 'utf8')));
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
  assert('boot imports openAretoria and registers SW', /openAretoria/.test(boot) && /sw\.js\?v=35/.test(boot));
  assert('SW is aretoria-v35', /aretoria-v35/.test(sw) && !/aretoria-v17/.test(sw) && !/mec-v/.test(sw) && !/captains-log/.test(sw));
  assert('SW precaches Aretoria code + shell', ['aretoria.js', 'aretoria-data.js', 'aretoria-art.js', 'aretoria.css', 'boot.js', 'shell.css'].every((f) => sw.includes(`./${f}`)));
  assert('SW does not precache portraits/guardians/realms', !/assets\/aretoria\/[^']*\.jpg/.test(noComments(sw)) && !/guardians\//.test(noComments(sw)) && !/realms\//.test(noComments(sw)));
  assert('aretoria.js VERSION = 35 and imports data/art ?v=35; boot imports aretoria.js?v=35', /const VERSION = 35;/.test(src('./aretoria.js')) && /aretoria-data\.js\?v=35'/.test(src('./aretoria.js')) && /aretoria-art\.js\?v=35'/.test(src('./aretoria.js')) && /aretoria\.js\?v=35'/.test(src('./boot.js')));
  assert('asset queries: shell.css ?v=18, boot.js + sw.js ?v=35', /shell\.css\?v=18/.test(html) && /boot\.js\?v=35/.test(html) && /sw\.js\?v=35/.test(boot) && !/\?v=27/.test(src('./aretoria.js')));
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
  assert('arrival greeting is its own first line, opened only by the arrival', GUIDE.dialogue.arrivalStart === 'arrive' && !!N.arrive && GUIDE.dialogue.start === 'greet' && /opts\.arrival && sp\.tree\.arrivalStart && sp\.tree\.nodes\[sp\.tree\.arrivalStart\] \? sp\.tree\.arrivalStart : sp\.tree\.start/.test(aj));
  assert('both entry points validate (arrive + greet reachable, all choices resolve)', validateTree(GUIDE.dialogue).length === 0);
  assert('arrive greets the visitor who came through the central portal of the Axial Realm', /portal/.test(N.arrive.text) && /Axial Realm/.test(N.arrive.text) && /center/.test(N.arrive.text));
  assert('he wears ivory-and-sapphire armor now: no robe in his lines', !/\brobes?\b/i.test(all) && /ivory and sapphire/.test(N.who.text) && /armor/.test(N.who.text) && GUIDE.look === 'ivory-and-sapphire armor');
  assert('he is Cassidy\'s in-game self: "the self you send ahead"', /the self you send ahead/.test(N.who.text) && /Cassidy/.test(N.who.text));
  assert('the Axial Realm is "the shared realm of existence" (HUB.sub)', HUB.sub === 'The shared realm of existence' && /shared realm of existence/.test(N.greet.text) && /shared realm of existence/.test(N.arrive.text));
  assert('81 virtues, all housed in the six realms; the five axis virtues are real advisors there', VIRTUES.length === 81 && /Eighty-one virtues live in the six rooms of light, every one with a home/.test(N.realms.text) && HUB.virtues.every((v) => N.realms.text.includes(v) && VIRTUES.some((x) => x.name === v && x.realm !== 'axial')));
  assert('names every realm Guardian from the app data, and calls them advisors', REALMS.every((r) => N.realms.text.includes(r.guardian.name)) && /first advisor/.test(N.realms.text) && !/kettle/.test(N.realms.text));
  const sh = REALMS.find((r) => r.id === 'shadow');
  assert('Shadow lies across its own bridge (not "below the axis"); its far bridges match the realm data', !/Below the axis/i.test(all) && /Across its own bridge/.test(N.shadow.text) && ['Courage', 'Humanity', 'Temperance'].every((x) => sh.landscape.includes(x) && N.shadow.text.includes(x)) && N.shadow.text.includes(sh.temple));
  assert('every realm named in his lines is a real realm', ['Wisdom', 'Courage', 'Humanity', 'Justice', 'Temperance', 'Transcendence'].every((x) => REALMS.some((r) => r.name === x) && N.realms.text.includes(x)));
  assert('his voice and rules survive: one whole, Eirena, real circumstances, he/him, never a jester', /one whole/.test(all) && /Eirena/.test(all) && /real circumstances/.test(all) && !/\b(she|her|herself)\b/i.test(JSON.stringify(GUIDE)) && !/jester|clown|fool|motley|harlequin|trickster|keeper|chakra/i.test(JSON.stringify(GUIDE)));
  const html = src('./index.html');
  assert('landing copy: portal arrival, no "shrine fly-through"', /Step through the portal/.test(html) && !/shrine fly-through|Enter the shrine/i.test(html) && /Irishnu the Guide meets you/.test(html));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
