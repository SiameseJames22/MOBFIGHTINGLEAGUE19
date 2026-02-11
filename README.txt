MOBFIGHTINGLEAGUE19 (Multi-page version) ✅

FILES
- index.html   (League Table)
- live.html    (Live matches + admin score controls)
- clips.html   (Clips browser + admin upload)
- auth.html    (Login + signup)
- admin.html   (Bulk add teams)

JS
- js/config.js        <-- EDIT THIS ONCE (Firebase config + ADMIN_UID)
- js/app.js           shared Firebase + UI + helpers
- js/pages/*.js       page logic

SETUP
1) Open js/config.js and replace:
   - FIREBASE_CONFIG_HERE  (paste your Firebase config object)
   - ADMIN_UID_HERE        (your UID from Firebase Auth -> Users)

2) Firebase Console:
   Auth -> Sign-in method:
     - Enable Google
     - Enable Email/Password
   Auth -> Settings -> Authorized domains:
     - siamesejames22.github.io

3) Put ALL files in your repo root (keep the js folder).
   Your repo should look like:
   /index.html
   /live.html
   /clips.html
   /auth.html
   /admin.html
   /js/config.js
   /js/app.js
   /js/pages/...

4) Go to:
   https://siamesejames22.github.io/MOBFIGHTINGLEAGUE19/

NOTES
- If every page looks the same, it usually means the page module didn't load.
  Make sure the /js folder exists in your repo and isn't nested in another folder.
