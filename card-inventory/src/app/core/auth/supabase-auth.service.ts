import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseAuthService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );

    // If bypass auth is enabled, create a mock user
    if (environment.bypassAuth) {
      const mockUser: User = {
        id: 'bypass-user',
        email: 'dev@localhost',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        phone: undefined,
      };
      this.currentUserSubject.next(mockUser);
    } else {
      this.initializeAuth();
    }
  }

  private initializeAuth() {
    // Check if user is already logged in
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        this.currentUserSubject.next(session.user);
      }
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        this.currentUserSubject.next(session.user);
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  getAuthState$(): Observable<User | null> {
    return this.currentUser$;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  signup(email: string, password: string): Promise<{ user: User | null; error: any }> {
    return this.supabase.auth
      .signUp({ email, password })
      .then(({ data, error }) => {
        if (!error && data.user) {
          this.currentUserSubject.next(data.user);
        }
        return { user: data.user, error };
      });
  }

  login(email: string, password: string): Promise<{ user: User | null; error: any }> {
    return this.supabase.auth
      .signInWithPassword({ email, password })
      .then(({ data, error }) => {
        if (!error && data.user) {
          this.currentUserSubject.next(data.user);
        }
        return { user: data.user, error };
      });
  }

  logout(): Promise<{ error: any }> {
    return this.supabase.auth.signOut().then(() => {
      this.currentUserSubject.next(null);
      return { error: null };
    });
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}
