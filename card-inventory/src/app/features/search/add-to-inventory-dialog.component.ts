import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseAuthService } from '../../core/auth/supabase-auth.service';
import { SupabaseDbService } from '../../core/db/supabase-db.service';
import { JustTCGService } from '../../services/justtcg.service';
import { InventoryCard, JustTCGCard } from '../../models/index';

@Component({
  selector: 'app-add-to-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Add {{ data.card.name }} to Inventory</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Quantity</mat-label>
          <input matInput type="number" formControlName="quantity" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Purchase Price (per card)</mat-label>
          <input matInput type="number" step="0.01" formControlName="purchasePrice" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="add()" [disabled]="form.invalid">
        Add to Inventory
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    mat-dialog-actions {
      padding: 16px 0 0 0;
    }
  `],
})
export class AddToInventoryDialogComponent {
  form: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private authService: SupabaseAuthService,
    private dbService: SupabaseDbService,
    private justTcgService: JustTCGService,
    private dialogRef: MatDialogRef<AddToInventoryDialogComponent>,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1)]],
      purchasePrice: ['', [Validators.required, Validators.min(0)]],
    });
  }

  add(): void {
    if (this.form.invalid) {
      return;
    }

    const { quantity, purchasePrice } = this.form.value;
    const card: JustTCGCard = this.data.card;
    const game = this.data.game;

    const inventoryCard: InventoryCard = {
      cardId: card.id,
      game: game,
      cardName: card.name,
      quantity,
      purchasePrice,
      currentPrice: this.justTcgService.getPrice(card) || 0,
      imageUrl: card.imageUrl,
    };

    this.dbService
      .addCardToInventory(inventoryCard)
      .then(() => {
        this.dialogRef.close(true);
      })
      .catch((error) => {
        this.snackBar.open('Failed to add card: ' + error.message, '', { duration: 3000 });
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
