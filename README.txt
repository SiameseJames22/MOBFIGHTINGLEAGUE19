Mob Fighting League (GitHub Pages + Firebase)

1) Open each HTML file and replace:
   - FIREBASE_CONFIG_HERE  (paste your Firebase web config object)
   - ADMIN_UID_HERE        (your UID from Firebase Auth -> Users)

2) Firebase Console setup:
   Auth -> Sign-in method:
     - Enable Google
     - Enable Email/Password

   Auth -> Settings -> Authorized domains:
     - siamesejames22.github.io

   Firestore + Storage rules:
     - Use the admin-only write rules you already set up (ADMIN_UID).

3) Upload these files to your GitHub Pages repo root:
   index.html, auth.html, live.html, clips.html, admin.html

4) Go to Admin page (after signing in as admin):
   /admin.html
   Click 'Bulk add teams' to add all 16 teams quickly.

Notes:
- Notifications show in the right panel on every page.
- Live score editing is on live.html (admin only).
- Clip uploads are on clips.html (admin only).
