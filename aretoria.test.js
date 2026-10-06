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
  guardianRole, guardianLine, guardianPortraitPath, irishnuPortraitPath, realmBackdropPath,
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
    assert(`${r.id}: 3–5 dialogue nodes`, n >= 3 && n <= 5, String(n));
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
  console.log('\n--- Standalone shell + SW aretoria-v10 ---');
  const html = src('./index.html');
  const sw = src('./sw.js');
  const boot = src('./boot.js');
  assert('page title is Aretoria', /<title>Aretoria<\/title>/.test(html));
  assert('apple-mobile-web-app-title is Aretoria', /apple-mobile-web-app-title" content="Aretoria"/.test(html));
  assert('no MEC calendar / CaptainLog UI on page', !/month-grid|captains-log|panel-calendar|Modern Era Calendar/.test(html));
  assert('Irishnu mentioned as the Guide on landing', /Irishnu the Guide/.test(html));
  assert('boot imports openAretoria and registers SW', /openAretoria/.test(boot) && /sw\.js\?v=10/.test(boot));
  assert('SW is aretoria-v10', /aretoria-v10/.test(sw) && !/aretoria-v3/.test(sw) && !/mec-v/.test(sw) && !/captains-log/.test(sw));
  assert('SW precaches Aretoria code + shell', ['aretoria.js', 'aretoria-data.js', 'aretoria-art.js', 'aretoria.css', 'boot.js', 'shell.css'].every((f) => sw.includes(`./${f}`)));
  assert('SW does not precache portraits/guardians/realms', !/assets\/aretoria\/[^']*\.jpg/.test(noComments(sw)) && !/guardians\//.test(noComments(sw)) && !/realms\//.test(noComments(sw)));
  assert('aretoria.js VERSION = 10', /const VERSION = 10;/.test(src('./aretoria.js')));
  assert('asset queries use ?v=10', /\?v=10/.test(html) && /\?v=10/.test(boot) && !/\?v=27/.test(src('./aretoria.js')));
  assert('manifest name Aretoria, scope /aretoria/', /"name": "Aretoria"/.test(src('./manifest.webmanifest')) && /"scope": "\/aretoria\/"/.test(src('./manifest.webmanifest')));
  assert('link back to Captain’s Log present', /modern-era-calendar/.test(html));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
