# Flash Lab v0.1.0

An original, dependency-free hardware prototype for iPhone Safari. Not affiliated with Lumenate. No meditation or therapeutic effects are claimed.

## Publish on GitHub Pages
1. Create a repository named `Flash-Lab`.
2. Upload `index.html`, `style.css`, `app.js`, and `.nojekyll` to its root.
3. In Settings → Pages, choose **Deploy from a branch**, then **main / (root)** and Save.
4. Open the HTTPS Pages URL in iPhone Safari (not a downloaded file or an in-app preview).
5. Acknowledge the notice, enable the camera, then try steady light first. Reconnect and run the five-second pulse test. Copy results back to the chat and say whether the physical flash worked.

No build, server, account, recordings, analytics, or external dependencies. Camera stays local. Screen locking, leaving Safari, overheating, battery state, hardware and browser limitations can interrupt the test.

## Scope
Steady light for three seconds and slow pulses at 1 or 2 Hz for five seconds. These rates are compatibility tests, not a proven-safe range or a reproduction of Lumenate's sequences. Flash brightness is not adjustable in this prototype. Browser API completion timing does not measure actual LED timing. Precise, faster sequences need separate hardware measurement before implementation.

STOP releases all camera tracks. Hiding or leaving the page and revoking the notice also release the camera. An open permission prompt must still be dismissed through Safari.
