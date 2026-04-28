import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseAuthService } from '../../core/auth/supabase-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Card Inventory - Login</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="login()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password" />
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width"
              [disabled]="loading || loginForm.invalid"
            >
              <span *ngIf="!loading">Login</span>
              <mat-spinner *ngIf="loading" diameter="24"></mat-spinner>
            </button>
          </form>

          <p class="signup-link">
            Don't have an account? <a routerLink="/signup">Sign up here</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      background: white;
    }

    .login-card mat-card-header {
      padding-bottom: 24px;
      margin-bottom: 24px;
      border-bottom: 2px solid #f5f5f5;
    }

    .login-card mat-card-title {
      font-size: 24px;
      font-weight: 600;
      color: #667eea;
      text-align: center;
    }

    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;

      .mat-mdc-text-field-wrapper {
        background-color: #f5f5f5 !important;
        border-radius: 8px;
      }

      .mdc-text-field {
        background-color: #f5f5f5 !important;
      }

      .mat-mdc-input-element {
        padding: 12px 16px;
        font-size: 14px;
      }

      &.mat-focused {
        .mdc-notched-outline {
          border-color: #667eea;
        }

        .mdc-text-field {
          background-color: #f9f9ff !important;
        }
      }

      &:hover:not(.mat-focused) {
        .mdc-text-field {
          background-color: #efefef !important;
        }
      }
    }

    button[mat-raised-button] {
      height: 48px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;

      &:hover:not([disabled]) {
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        transform: translateY(-2px);
      }

      &[disabled] {
        opacity: 0.6;
      }
    }

    .signup-link {
      text-align: center;
      margin-top: 24px;
      font-size: 14px;
      color: #666;
    }

    .signup-link a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .signup-link a:hover {
      text-decoration: underline;
    }

    mat-spinner {
      display: inline-block;
      margin: 0 8px;
    }
  `],
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: SupabaseAuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  login(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).then(
      ({ user, error }) => {
        if (error) {
          this.loading = false;
          this.snackBar.open('Login failed: ' + error.message, '', { duration: 3000 });
        } else {
          this.snackBar.open('Login successful!', '', { duration: 2000 });
          this.router.navigate(['/search']);
        }
      }
    );
  }
}
