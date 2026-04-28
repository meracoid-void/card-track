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
  selector: 'app-signup',
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
    <div class="signup-container">
      <mat-card class="signup-card">
        <mat-card-header>
          <mat-card-title>Card Inventory - Sign Up</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="signupForm" (ngSubmit)="signup()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input matInput formControlName="confirmPassword" type="password" />
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width"
              [disabled]="loading || signupForm.invalid"
            >
              <span *ngIf="!loading">Sign Up</span>
              <mat-spinner *ngIf="loading" diameter="24"></mat-spinner>
            </button>
          </form>

          <p class="login-link">
            Already have an account? <a routerLink="/login">Login here</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .signup-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .signup-card {
      width: 100%;
      max-width: 400px;
      padding: 20px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .login-link {
      text-align: center;
      margin-top: 16px;
    }

    .login-link a {
      color: #667eea;
      text-decoration: none;
    }

    .login-link a:hover {
      text-decoration: underline;
    }

    mat-spinner {
      display: inline-block;
      margin: 0 8px;
    }
  `],
})
export class SignupComponent {
  signupForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: SupabaseAuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.signupForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  signup(): void {
    if (this.signupForm.invalid) {
      return;
    }

    this.loading = true;
    const { email, password } = this.signupForm.value;
    this.authService.signup(email, password).then(
      ({ user, error }) => {
        if (error) {
          this.loading = false;
          this.snackBar.open('Signup failed: ' + error.message, '', { duration: 3000 });
        } else {
          this.snackBar.open('Account created successfully!', '', { duration: 2000 });
          this.router.navigate(['/search']);
        }
      }
    );
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }
}
