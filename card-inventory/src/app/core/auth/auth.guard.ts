import { Injectable } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { SupabaseAuthService } from './supabase-auth.service';
import { inject } from '@angular/core';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  // Temporarily bypass authentication for testing
  return true;
  
  const authService = inject(SupabaseAuthService);
  const router = inject(Router);

  return authService.getAuthState$().pipe(
    take(1),
    map((user) => {
      if (user) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
