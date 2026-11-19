/* Firebase web config.
 *
 * These values are NOT secrets — Firebase web config is public by design, and
 * every client app ships it. What protects the data is firestore.rules, which
 * only lets signed-in @nprep.in accounts read or write.
 *
 * To fill this in:
 *   1. console.firebase.google.com → add a project (name it "nprep-content-calendar")
 *   2. Build → Firestore Database → create database → production mode
 *   3. Build → Authentication → Sign-in method → enable Google
 *   4. Project settings → Your apps → add a Web app → copy the firebaseConfig object
 *   5. Paste its values below, commit, and Vercel redeploys on its own
 *   6. Authentication → Settings → Authorized domains → add your Vercel domain
 *      and contentcalendar.nprep.in
 *   7. Firestore → Rules → paste the contents of firestore.rules and publish
 */
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT",
  storageBucket: "PASTE_PROJECT.firebasestorage.app",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};
