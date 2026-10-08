/**
 * Aretoria standalone boot — landing shrine, then full portal overlay.
 * Shares localStorage keys with Captain's Log (same github.io origin).
 */
import { openAretoria } from './aretoria.js?v=46';
import { guideLabel } from './aretoria-data.js?v=46';

const landing = document.getElementById('landing');
// Family links (?guide=<slug>): the landing names that person's guide (Irishnu by default).
document.querySelectorAll('.guide-name').forEach((el) => { el.textContent = guideLabel(); });
{ const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', m.getAttribute('content').replace('Irishnu', guideLabel())); }
const enterBtn = document.getElementById('enter-btn');

async function enter() {
  enterBtn.disabled = true;
  try {
    landing.hidden = true;
    await openAretoria({ returnFocus: enterBtn });
  } catch (err) {
    document.documentElement.classList.remove('ar-autoenter');
    landing.hidden = false;
    console.error('Aretoria failed to open', err);
  } finally {
    enterBtn.disabled = false;
  }
}

enterBtn.addEventListener('click', () => { enter(); });

window.addEventListener('aretoria:closed', () => {
  document.documentElement.classList.remove('ar-autoenter');
  landing.hidden = false;
  enterBtn.focus({ preventScroll: true });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=46').then((reg) => {
    reg.update().catch(() => {});
  }).catch(() => {});
}

// Auto-enter so the sacred app opens into the shrine cinematic.
// Respect ?land=1 to stay on the landing card (useful for QA / install).
const params = new URLSearchParams(location.search);
if (params.get('land') !== '1') {
  // Defer one frame so the landing paints first (avoids a blank flash).
  requestAnimationFrame(() => { enter(); });
}
