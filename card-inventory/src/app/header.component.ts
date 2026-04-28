import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { SupabaseAuthService } from './core/auth/supabase-auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <span class="app-title">
        <mat-icon class="title-icon">shopping_cart</mat-icon>
        Card Inventory
      </span>
      <div class="nav-spacer"></div>
      <a mat-button routerLink="/search" class="nav-button">
        <mat-icon>search</mat-icon>
        Search
      </a>
      <a mat-button routerLink="/inventory" class="nav-button">
        <mat-icon>inventory</mat-icon>
        Inventory
      </a>
      <button mat-icon-button [matMenuTriggerFor]="menu" class="user-menu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #menu="matMenu" class="user-menu-panel">
        <p mat-menu-item disabled>{{ userEmail }}</p>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="logout()">
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .app-toolbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 2px 12px rgba(102, 126, 234, 0.3);
      padding: 0 16px;
    }

    .app-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.3px;
      color: white;
    }

    .title-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .nav-spacer {
      flex: 1 1 auto;
    }

    .nav-button {
      display: flex;
      align-items: center;
      gap: 4px;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .user-menu {
      color: rgba(255, 255, 255, 0.9);
      transition: color 0.2s ease;

      &:hover {
        color: white;
      }
    }
  `],
})
export class HeaderComponent {
  userEmail: string | null = null;

  constructor(private authService: SupabaseAuthService, private router: Router) {
    this.authService.getAuthState$().subscribe((user: any) => {
      this.userEmail = user?.email || null;
    });
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
