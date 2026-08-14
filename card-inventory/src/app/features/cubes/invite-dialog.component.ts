import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseDbService } from '../../core/db/supabase-db.service';

export interface InviteDialogData {
  cubeId: string;
}

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './invite-dialog.component.html',
  styleUrls: ['./invite-dialog.component.scss'],
})
export class InviteDialogComponent {
  inviteForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InviteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InviteDialogData,
    private dbService: SupabaseDbService,
    private snackBar: MatSnackBar
  ) {
    this.inviteForm = this.fb.group({
      userId: ['', [Validators.required, Validators.minLength(1)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.inviteForm.invalid) {
      return;
    }

    this.loading = true;
    const { userId } = this.inviteForm.value;

    try {
      await this.dbService.inviteParticipant(this.data.cubeId, userId);
      this.snackBar.open('Invitation sent successfully', '', { duration: 2000 });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error inviting participant:', error);
      this.snackBar.open('Failed to send invitation', '', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}