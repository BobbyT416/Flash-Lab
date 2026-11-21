# Flash Lab v0.2.1

Original browser light-and-sound sessions for iPhone Safari. Hosted on GitHub Pages. No accounts, uploads, analytics, recordings, or external audio assets. Not affiliated with Lumenate; no therapeutic or equivalent experiential effects are claimed.

## Use
Open the Pages site in Safari. Select a pattern, duration and sound. Acknowledge the light notice and tap Enable flash; allow rear-camera access, then tap Start session. Sound starts from this second tap, after camera setup. Start with a 30-second preview. Stop releases camera and audio. Leaving the page ends the session. Sound-only needs no camera access. Volume is adjustable during playback.

Patterns: Tide uses eight seconds of 1 Hz pulses and four seconds dark; Evening uses continuous 1 Hz pulses; Drift alternates ten seconds of 1 Hz and ten seconds of 2 Hz. All pulses use 50% on/off timing. These slow rates are compatibility-oriented, not a proven-safe range. Actual LED brightness and timing depend on the phone and browser.

Duration choices: 30 seconds, 1, 3 or 5 minutes. Sound is locally synthesized filtered noise or soft sine tones. Flash and sound run together but are not precisely synchronized. No brightness adjustment or faster sequences are included.

## Implementation and validation
No build required. Serve this directory over HTTPS; main/root is configured for GitHub Pages. Query-versioned CSS and JavaScript assets help refresh updates. No service worker.

JavaScript syntax and simulated-device checks cover consent, test mode, all three patterns through completion, permission-prompt cancellation, unsupported torch, page hiding, sound-only validation and pattern boundaries. These checks do not establish physical LED timing, medical safety, or real iPhone audio quality. User confirmed physical 1 Hz flashing in v0.1.0.

Camera tracks are released on Stop, completion, errors, page hiding and page exit. Commands run sequentially; phases are recalculated from elapsed time instead of replaying missed pulses. Commands slower than one second and scheduling interruptions over 1.5 seconds stop the session. Shorter stalls skip missed phases rather than replaying pulses. A deadline timer releases the hardware if a torch command is pending; browser suspension can delay JavaScript timers. Screen wake lock is requested where supported; if unavailable, keep the screen awake manually.

Version 0.2.1 separates camera preparation from session playback to avoid starting sound during camera setup. The original 200 ms timing cutoff was too strict for transient mobile scheduling delays. Stops now retain a visible reason in the results. This is a compatibility fix; the reported device interruption has not been reproduced on actual iPhone hardware.
