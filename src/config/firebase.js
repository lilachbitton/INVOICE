import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCxjWPZkdLGCyCj8RdMAqePrCVC2MKTqPg",
  authDomain: "ordermanagement-5ad17.firebaseapp.com",
  projectId: "ordermanagement-5ad17",
  storageBucket: "ordermanagement-5ad17.firebasestorage.app",
  messagingSenderId: "71637766713",
  appId: "1:71637766713:web:b9698ba79c910a0b7cf3e8",
  measurementId: "G-RH3B8YVM1T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };