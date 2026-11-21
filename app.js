'use strict';
const el = id => document.getElementById(id);
let stream, track, busy = false, generation = 0, connecting = false;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const status = text => { el('status').textContent = text; };
function controls() {
  el('connect').disabled = connecting || busy || !!track;
  el('steady').disabled = !track || busy;
  el('pulse').disabled = !track || busy;
  el('rate').disabled = busy;
  el('stop').disabled = !track && !connecting;
}
// Never overlap constraints on a track. A generation token cancels queued work.
let queue = Promise.resolve();
function light(target, on, token, samples) {
  const operation = queue.catch(() => {}).then(async () => {
    if (token !== generation || target.readyState === 'ended') return;
    const start = performance.now();
    await target.applyConstraints({advanced:[{torch:on}]});
    if (samples) samples.push(performance.now() - start);
  });
  queue = operation;
  return operation;
}
function release(message = 'Stopped. Camera released.') {
  generation++;
  const old = track;
  track = undefined;
  if (stream) stream.getTracks().forEach(t => t.stop());
  // Stopping the camera track also releases the torch, even if a constraint is pending.
  if (old && old.readyState !== 'ended') old.stop();
  stream = undefined;
  busy = false;
  status(message);
  controls();
}
el('connect').onclick = async () => {
  if (!el('consent').checked) { status('Please acknowledge the flashing-light notice first.'); return; }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { status('Camera access requires HTTPS and a supported browser. Open the GitHub Pages address in Safari.'); return; }
  const token = ++generation;
  connecting = true; controls(); status('Waiting for camera permission…');
  let candidate;
  try {
    candidate = await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
    if (token !== generation || document.hidden) { candidate.getTracks().forEach(t => t.stop()); return; }
    stream = candidate; track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities?.() || {};
    if (!caps.torch) { release('This camera does not report flash control. Try Safari and the rear camera on your iPhone.'); return; }
    await light(track, false, token);
    if (token !== generation) return;
    track.addEventListener('ended', () => { if (token === generation) release('Camera access ended. Reconnect to continue.'); });
    status('Flash control reported. Ready for a hardware test.');
  } catch (error) {
    if (token === generation) release(error.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access in Safari’s website settings, then reconnect.' : 'Could not connect: ' + error.message);
    else candidate?.getTracks().forEach(t => t.stop());
  } finally { connecting = false; controls(); }
};
async function run(pulsed) {
  if (!track || busy) return;
  busy = true; controls();
  const token = generation, target = track, samples = [];
  const hz = Number(el('rate').value), half = 500 / hz;
  status(pulsed ? 'Pulse test running…' : 'Steady light running…');
  try {
    if (pulsed) {
      const start = performance.now(), end = start + 5000;
      for (let i = 0; performance.now() < end && token === generation; i++) {
        const due = start + i * half;
        await sleep(Math.max(0, due - performance.now()));
        if (token !== generation || performance.now() >= end) break;
        // Stop if commands cannot keep pace; never send a burst to catch up.
        if (performance.now() - due > half) throw new Error('Flash commands could not maintain this rate.');
        await light(target, i % 2 === 0, token, samples);
      }
    } else {
      await light(target, true, token, samples);
      await sleep(3000);
    }
    if (token !== generation) return;
    await light(target, false, token, samples);
    if (token !== generation) return;
    const average = samples.reduce((a,b) => a+b,0) / samples.length;
    el('result').textContent = `${pulsed ? 'Pulse test: ' + hz + ' Hz requested for 5 seconds' : 'Steady-light test: 3 seconds requested'}\n${samples.length} commands completed\nAverage command response: ${average.toFixed(1)} ms\nSlowest command response: ${Math.max(...samples).toFixed(1)} ms\nPhysical flashing must be confirmed by you.\nBrowser: ${navigator.userAgent}`;
    release('Test finished. Camera released. Reconnect for another test.');
  } catch (error) { if (token === generation) { el('result').textContent = 'Test interrupted: ' + error.message; release('Test stopped. Camera released.'); } }
  finally { if (token === generation) { busy = false; controls(); } }
}
el('steady').onclick = () => run(false);
el('pulse').onclick = () => run(true);
el('stop').onclick = () => release();
document.addEventListener('visibilitychange', () => { if (document.hidden) release('Page hidden. Camera released.'); });
window.addEventListener('pagehide', () => release());
el('consent').onchange = () => { if (!el('consent').checked) release(); };
el('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(el('result').textContent); status('Results copied.'); }
  catch { status('Copy unavailable. Select the test results to copy them.'); }
};
controls();
