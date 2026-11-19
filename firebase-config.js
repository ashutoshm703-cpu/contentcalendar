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
  apiKey: "AIzaSyAlE7Olc49cSQoJG3AzscE84yn9ZYnhxVk",
  authDomain: "nprep-content-calendar.firebaseapp.com",
  projectId: "nprep-content-calendar",
  storageBucket: "nprep-content-calendar.firebasestorage.app",
  messagingSenderId: "111640002481",
  appId: "1:111640002481:web:7f2637f55915d69ee38790"
};
