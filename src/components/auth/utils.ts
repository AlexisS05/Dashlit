import { GoogleAuthProvider, signInWithCredential, signInWithPopup, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import triggerMessage from '../../components/common/SnackBar';

import { user_setting } from '../../components/data/data';
import { auth, db } from '../../firebase/firebase-config';
import { getSingleDocFromCollectionRef } from '../../firebase/functions/GenericFunctions';

const getGoogleAuthCredential = () => {
  return new Promise<ReturnType<typeof GoogleAuthProvider.credential>>((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.identity) {
      chrome.identity.getAuthToken({ interactive: true }, (token: any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
        const credential = GoogleAuthProvider.credential(null, token);
        resolve(credential);
      });
    } else {
      // Handle the case when the `chrome` object is not available
      reject(new Error('Chrome extension environment is required.'));
    }
  });
};

const addSettingsForNewGoogleUser: any = async (user: User) => {
  const docRef = doc(db, "users", user.uid);
  const docSnap: any = await getSingleDocFromCollectionRef(docRef);

  if (docSnap?.success) return;

  await setDoc(doc(db, "users", user.uid), {
    name: user.displayName,
    email: user.email,
    settings: JSON.stringify(user_setting)
  });
}

export const googleAuthHandler = async () => {
  try {
    let credential;
    // Check if running in Chrome extension environment
    if (window.location.origin.includes("chrome-extension")) {
      credential = await getGoogleAuthCredential();
    } else {
      // Use regular GoogleAuthProvider for non-extension environments
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return;
    }
    delete credential.idToken;
    const result = await signInWithCredential(auth, credential);
    await addSettingsForNewGoogleUser(result.user);
    triggerMessage("Successfully signed in with Google.", "success")
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    console.error(error);
    triggerMessage("Error signing in with Google. Please try again.", "error")
    return null;
  }
};
