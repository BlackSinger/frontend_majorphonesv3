// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAAOwqxXH0KL-SJvDV68xqcJXjh0dB-J8k",
  authDomain: "majorphonesv3.firebaseapp.com",
  projectId: "majorphonesv3",
  storageBucket: "majorphonesv3.firebasestorage.app",
  messagingSenderId: "176200387392",
  appId: "1:176200387392:web:a8350ca4ee6781763cc8a5",
  measurementId: "G-8M931KWSPB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Local QA only: `npm start` with REACT_APP_AUTH_EMULATOR_URL signs in against the Auth emulator; builds never do
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_AUTH_EMULATOR_URL) {
  connectAuthEmulator(auth, process.env.REACT_APP_AUTH_EMULATOR_URL, { disableWarnings: true });
}

export { app, analytics, auth, db };