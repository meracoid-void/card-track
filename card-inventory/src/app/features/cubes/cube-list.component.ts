import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupabaseDbService } from '../../core/db/supabase-db.service';
import { SupabaseAuthService } from '../../core/auth/supabase-auth.service';
import { Cube, PendingInvitation } from '../../models';

@Component({
  selector: 'app-cube-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './cube-list.component.html',
  styleUrls: ['./cube-list.component.scss'],
})
export class CubeListComponent implements OnInit {
  cubes: Cube[] = [];
  loading = true;
  pendingInvitations: PendingInvitation[] = [];
  loadingInvitations = true;

  constructor(
    private dbService: SupabaseDbService,
    private authService: SupabaseAuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.dbService.getUserCubes$().subscribe(
      (cubes) => {
        this.cubes = cubes;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading cubes:', error);
        this.snackBar.open('Failed to load cubes', '', { duration: 3000 });
        this.loading = false;
      }
    );
    this.loadPendingInvitations();
  }

  async loadPendingInvitations(): Promise<void> {
    this.loadingInvitations = true;
    try {
      // Get all pending invitations for the current user's email
      const user = this.authService.getCurrentUser();
      if (user && user.email) {
        const { data, error } = await this.authService.getSupabaseClient()
          .from('pending_invitations')
          .select('*')
          .eq('email', user.email.toLowerCase())
          .eq('status', 'pending');
        
        if (!error && data) {
          this.pendingInvitations = data.map((row: any) => ({
            id: row.id,
            cubeId: row.cube_id,
            email: row.email,
            status: row.status,
            createdAt: row.created_at,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    } finally {
      this.loadingInvitations = false;
    }
  }

  async acceptInvitation(invitation: PendingInvitation): Promise<void> {
    try {
      await this.dbService.acceptEmailInvitation(invitation.cubeId, invitation.email);
      this.snackBar.open('Invitation accepted!', '', { duration: 2000 });
      // Remove from pending and reload cubes
      this.pendingInvitations = this.pendingInvitations.filter(i => i.id !== invitation.id);
      // Reload cubes to show the newly joined cube
      this.dbService.getUserCubes$().subscribe(
        (cubes) => {
          this.cubes = cubes;
        },
        (error) => {
          console.error('Error reloading cubes:', error);
        }
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      this.snackBar.open('Failed to accept invitation', '', { duration: 3000 });
    }
  }

  async declineInvitation(invitation: PendingInvitation): Promise<void> {
    try {
      await this.dbService.deletePendingInvitation(invitation.id);
      this.snackBar.open('Invitation declined', '', { duration: 2000 });
      this.pendingInvitations = this.pendingInvitations.filter(i => i.id !== invitation.id);
    } catch (error) {
      console.error('Error declining invitation:', error);
      this.snackBar.open('Failed to decline invitation', '', { duration: 3000 });
    }
  }

  navigateToCube(cubeId: string): void {
    this.router.navigate(['/cubes', cubeId]);
  }

  createNewCube(): void {
    this.router.navigate(['/cubes', 'new']);
  }

  deleteCube(cube: Cube): void {
    if (confirm(`Are you sure you want to delete ${cube.name}?`)) {
      this.dbService.deleteCube(cube.id).then(
        () => {
          this.snackBar.open('Cube deleted', '', { duration: 2000 });
        },
        (error) => {
          this.snackBar.open('Failed to delete cube', '', { duration: 3000 });
        }
      );
    }
  }

  editCube(cube: Cube): void {
    this.router.navigate(['/cubes', cube.id, 'edit']);
  }
}