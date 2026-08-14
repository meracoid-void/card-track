import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { SupabaseDbService } from '../../core/db/supabase-db.service';
import { CubeParticipant } from '../../models';
import { InviteDialogComponent } from './invite-dialog.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cube-participants',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatTableModule,
    MatChipsModule,
  ],
  templateUrl: './cube-participants.component.html',
  styleUrls: ['./cube-participants.component.scss'],
})
export class CubeParticipantsComponent implements OnInit, OnDestroy {
  @Input() cubeId!: string;
  @Input() isOwner = false;

  participants: CubeParticipant[] = [];
  loading = true;
  displayedColumns: string[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private dbService: SupabaseDbService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.displayedColumns = ['user', 'status', 'joinedAt'];
    if (this.isOwner) {
      this.displayedColumns.push('actions');
    }
    this.loadParticipants();
  }

  loadParticipants(): void {
    const sub = this.dbService.getCubeParticipants$(this.cubeId).subscribe(
      (participants) => {
        this.participants = participants;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading cube participants:', error);
        this.snackBar.open('Failed to load participants', '', { duration: 3000 });
        this.loading = false;
      }
    );
    this.subscriptions.push(sub);
  }

  openInviteDialog(): void {
    const dialogRef = this.dialog.open(InviteDialogComponent, {
      width: '400px',
      data: { cubeId: this.cubeId }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Invitation sent successfully', '', { duration: 2000 });
      }
    });
  }

  removeParticipant(participant: CubeParticipant): void {
    if (confirm('Remove this participant from the cube?')) {
      this.dbService.removeParticipant(this.cubeId, participant.id).then(
        () => {
          this.snackBar.open('Participant removed', '', { duration: 2000 });
        },
        (error) => {
          this.snackBar.open('Failed to remove participant', '', { duration: 3000 });
        }
      );
    }
  }

  getStatusChipClass(status: string): string {
    switch (status) {
      case 'accepted':
        return 'status-accepted';
      case 'pending':
        return 'status-pending';
      case 'declined':
        return 'status-declined';
      default:
        return '';
    }
  }

  getStatusDisplay(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'pending':
        return 'Pending';
      case 'declined':
        return 'Declined';
      default:
        return status;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}