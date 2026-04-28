import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SupabaseAuthService } from './core/auth/supabase-auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'card-inventory';
  showHeader = false;

  constructor(
    private authService: SupabaseAuthService,
    private router: Router
  ) {
    this.authService.getAuthState$().subscribe((user) => {
      this.showHeader = !!user;
    });
  }
}
