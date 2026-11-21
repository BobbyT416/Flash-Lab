'use strict';
const $ = id => document.getElementById(id);
let token = 0, busy = false, stream, track, audio, wake, frame;
const wait = ms => new Promise(r => setTimeout(r, ms));
const descriptions = {tide:'Eight seconds of 1 Hz pulses, then four seconds of darkness. Repeats throughout the session.',steady:'Even, half-on / half-off pulses at 1 Hz.',rise:'Ten seconds at 1 Hz, then ten seconds at 2 Hz. Repeats without increasing beyond 2 Hz.',audio:'Ambient sound with the camera and flash off.'};
const stamp = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,'0')}`;
function setup() { $('description').textContent = descriptions[$('pattern').value]; if (!busy) $('timer').textContent = stamp(Number($('duration').value)); }
function controls() { ['start','test','pattern','duration','sound'].forEach(id => $(id).disabled = busy); $('stop').disabled = !busy; }
function status(text) { $('status').textContent = text; }
function stop(message = 'Session stopped. Camera and sound released.') {
  token++; busy = false;
  cancelAnimationFrame(frame);
  stream?.getTracks().forEach(t => t.stop()); stream = undefined; track = undefined;
  const oldAudio = audio; audio = undefined; if (oldAudio) oldAudio.close().catch(() => {});
  const oldWake = wake; wake = undefined; oldWake?.release().catch(() => {});
  controls(); status(message);
}
// Phase-based patterns avoid bursts of catch-up commands after a delayed frame.
function phase(ms, name) {
  if (name === 'tide' && ms % 12000 >= 8000) return {on:false,next:12000 - ms % 12000};
  const hz = name === 'rise' && ms % 20000 >= 10000 ? 2 : 1;
  const half = 500 / hz;
  return {on:Math.floor(ms / half) % 2 === 0,next:half - ms % half};
}
async function ambient(kind, mine) {
  if (kind === 'none') return;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error('Audio is unavailable. Choose Silent to use light only.');
  const context = new Context(); audio = context;
  const gain = context.createGain(); gain.gain.value = 0; gain.connect(context.destination);
  context.sessionGain = gain;
  if (kind === 'ocean') {
    const buffer = context.createBuffer(1,context.sampleRate * 4,context.sampleRate), values = buffer.getChannelData(0);
    let last = 0;
    for (let i=0;i<values.length;i++) { last = (last + (Math.random()*2-1)*0.02)/1.02; values[i] = last*3.5; }
    const source = context.createBufferSource(); source.buffer=buffer; source.loop=true;
    const filter=context.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=650; source.connect(filter); filter.connect(gain); source.start();
  } else {
    [130.81,196].forEach(frequency => { const oscillator=context.createOscillator(); oscillator.frequency.value=frequency; const quiet=context.createGain(); quiet.gain.value=0.13; oscillator.connect(quiet); quiet.connect(gain); oscillator.start(); });
  }
  await context.resume();
  if (mine !== token) { await context.close().catch(()=>{}); return; }
  gain.gain.setTargetAtTime(Number($('volume').value)/100, context.currentTime,0.6);
}
async function connect(mine) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Open the HTTPS app address in Safari to access the flash.');
  const candidate = await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
  if (mine !== token || document.hidden) { candidate.getTracks().forEach(t=>t.stop()); return false; }
  stream=candidate; track=stream.getVideoTracks()[0];
  if (!track?.getCapabilities?.().torch) throw new Error('This camera does not report flash control. Try Safari or choose Sound only.');
  track.addEventListener('ended',()=>{if(mine===token) stop('Camera access ended. Session stopped.');});
  return true;
}
async function run(test = false) {
  if (busy) return;
  const pattern=$('pattern').value, sound=$('sound').value;
  if ((test || pattern !== 'audio') && !$('consent').checked) { status('Please acknowledge the flashing-light notice first.'); return; }
  if (!test && pattern === 'audio' && sound === 'none') { status('Choose an ambient sound for a sound-only session.'); return; }
  const mine=++token; busy=true; controls(); $('progress').value=0;
  const seconds=test?3:Number($('duration').value), samples=[];
  let watchdog, completed=false;
  try {
    // Start audio from the tap gesture, before waiting for camera permission.
    if (!test) await ambient(sound,mine);
    if (mine!==token) return;
    if (test || pattern!=='audio') { status('Connecting to rear flash…'); if (!await connect(mine)) return; }
    if (mine!==token || document.hidden) return;
    if (navigator.wakeLock) { try { const lock=await navigator.wakeLock.request('screen'); if(mine!==token) { await lock.release(); return; } wake=lock; } catch {} }
    if (mine!==token) return;
    const target=track, start=performance.now(), end=start+seconds*1000;
    status(test?'Steady-light test running…':'Session running.');
    function draw() { if(mine!==token)return; const elapsed=performance.now()-start; $('timer').textContent=stamp(Math.max(0,Math.ceil((end-performance.now())/1000))); $('progress').value=Math.min(1,elapsed/(seconds*1000)); frame=requestAnimationFrame(draw); }
    draw();
    // This releases hardware even if an awaited torch command hangs.
    watchdog=setTimeout(()=>{ if(mine===token) stop('Session time reached. Camera and sound released.'); },seconds*1000+1500);
    let previous=false;
    while(mine===token && performance.now()<end) {
      const elapsed=performance.now()-start, state=test?{on:true,next:100}:phase(elapsed,pattern);
      if(target && state.on!==previous) {
        const began=performance.now();
        await target.applyConstraints({advanced:[{torch:state.on}]});
        if(mine!==token)return;
        const response=performance.now()-began; samples.push(response); previous=state.on;
        if(response>200) throw new Error('Flash command was too slow to maintain the pattern.');
      }
      const before=performance.now(), delay=Math.max(8,Math.min(state.next-(before-start-elapsed),end-before,100));
      await wait(delay);
      if(mine===token && performance.now()-before-delay>200) throw new Error('Session timing was interrupted.');
    }
    if(mine!==token)return;
    // Releasing all tracks switches the light off, including at the session deadline.
    $('progress').value=1; $('timer').textContent='0:00';
    const mean=samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:0;
    $('result').textContent=`${test?'Hardware test':descriptions[pattern]}\nRequested duration: ${seconds} seconds\nFlash commands completed: ${samples.length}\nAverage browser response: ${mean.toFixed(1)} ms\nSlowest browser response: ${samples.length?Math.max(...samples).toFixed(1):'0'} ms\nActual LED timing is not measured.\nFlash Lab v0.2.0`;
    completed=true; stop(test?'Test complete. Camera released.':'Session complete. Take a moment before continuing.');
  } catch(error) { if(mine===token) { $('result').textContent='Interrupted: '+error.message; stop(error.name==='NotAllowedError'?'Camera permission denied. Allow it in Safari’s website settings, then try again.':error.message); } }
  finally { clearTimeout(watchdog); if(mine===token && !completed) stop('Session interrupted. Camera and sound released.'); }
}
$('start').onclick=()=>run(); $('test').onclick=()=>run(true); $('stop').onclick=()=>stop();
$('pattern').onchange=setup; $('duration').onchange=setup;
$('volume').oninput=()=>{ $('volumeLabel').textContent=$('volume').value+'%'; if(audio?.state==='running') audio.sessionGain.gain.setTargetAtTime(Number($('volume').value)/100,audio.currentTime,0.1); };
$('consent').onchange=()=>{if(!$('consent').checked && busy)stop();};
document.addEventListener('visibilitychange',()=>{if(document.hidden && busy)stop('Page hidden. Session ended.');});
window.addEventListener('pagehide',()=>stop());
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('result').textContent);if(!busy)status('Results copied.');}catch{if(!busy)status('Select the results text to copy it.');}};
setup(); controls();
