import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbgiGUR16k-E3lsHRNK_vt8gEIX-CxStc",
  authDomain: "cc-recruitment-project.firebaseapp.com",
  projectId: "cc-recruitment-project",
  storageBucket: "cc-recruitment-project.firebasestorage.app",
  messagingSenderId: "685808992166",
  appId: "1:685808992166:web:c2ebfeba7ea1f8f226d967",
  measurementId: "G-V1H80LW2NF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
