import { Injectable } from '@angular/core';
import { Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, UserCredential } from '@angular/fire/auth';
import { Firestore, collection, doc, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  authState$: Observable<any>;

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    this.authState$ = authState(this.auth);
  }

  signup(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password).then((credential) => {
      // Create user document in Firestore
      const userRef = doc(this.firestore, 'users', credential.user.uid);
      const userData: User = {
        uid: credential.user.uid,
        email: credential.user.email || '',
        createdAt: new Date(),
      };
      return setDoc(userRef, userData).then(() => credential);
    });
  }

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  getAuthState$(): Observable<any> {
    return this.authState$;
  }
}
