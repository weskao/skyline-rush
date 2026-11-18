import '../../src/cloud-save.ts';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';

export async function signInWave3EmulatorUser(email: string, existing: boolean): Promise<string> {
  const auth = getAuth();
  if (!auth.emulatorConfig) throw new Error('Wave 3 browser tests require the Firebase Auth Emulator');
  const signIn = existing ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
  const { user } = await signIn(auth, email, 'wave3-emulator-password');
  return user.uid;
}
