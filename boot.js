/**
 * Aretoria standalone boot — landing shrine, then full portal overlay.
 * Shares localStorage keys with Captain's Log (same github.io origin).
 */
import { openAretoria } from './aretoria.js?v=14';

const landing = document.getElementById('landing');
const enterBtn = document.getElementById('enter-btn');

async function enter() {
  enterBtn.disabled = true;
  try {
    landing.hidden = true;
    await openAretoria({ returnFocus: enterBtn });
  } catch (err) {
    landing.hidden = false;
    console.error('Aretoria failed to open', err);
  } finally {
    enterBtn.disabled = false;
  }
}

enterBtn.addEventListener('click', () => { enter(); });

window.addEventListener('aretoria:closed', () => {
  landing.hidden = false;
  enterBtn.focus({ preventScroll: true });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=14').then((reg) => {
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
