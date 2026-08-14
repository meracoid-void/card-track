import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JustTCGService } from '../../services/justtcg.service';
import { JustTCGCard } from '../../models';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SupabaseDbService } from '../../core/db/supabase-db.service';

export interface CubeCardSearchData {
  cubeId: string;
}

@Component({
  selector: 'app-cube-card-search',
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
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './cube-card-search.component.html',
  styleUrls: ['./cube-card-search.component.scss'],
})
export class CubeCardSearchComponent {
  searchForm: FormGroup;
  results: JustTCGCard[] = [];
  loading = false;
  searched = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CubeCardSearchComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CubeCardSearchData,
    private justTcgService: JustTCGService,
    private dbService: SupabaseDbService,
    private snackBar: MatSnackBar
  ) {
    this.searchForm = this.fb.group({
      cardName: [''],
    });

    this.searchForm
      .get('cardName')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        if (this.searched) {
          this.search();
        }
      });
  }

  search(): void {
    const cardName = this.searchForm.value.cardName;
    if (!cardName || cardName.trim().length < 2) {
      this.results = [];
      this.searched = false;
      return;
    }

    this.loading = true;
    this.searched = true;

    // Search specifically for Yu-Gi-Oh cards
    this.justTcgService.searchCards(cardName, 'yugioh').subscribe(
      (cards) => {
        this.results = cards;
        this.loading = false;
      },
      (error) => {
        console.error('Error searching cards:', error);
        this.snackBar.open('Failed to search cards', '', { duration: 3000 });
        this.loading = false;
      }
    );
  }

  getCardImage(card: JustTCGCard): string {
    return card.imageUrl || '';
  }

  getCardName(card: JustTCGCard): string {
    return card.name || 'Unknown Card';
  }

  getSetName(card: JustTCGCard): string {
    return card.set_name || '';
  }

  async addCardToCube(card: JustTCGCard): Promise<void> {
    try {
      await this.dbService.addCardToCube(this.data.cubeId, {
        cardId: card.id,
        cardName: card.name,
        imageUrl: card.imageUrl,
        setName: card.set_name,
        cardNumber: card.cardNumber,
      });
      this.snackBar.open('Card added to cube!', '', { duration: 2000 });
    } catch (error) {
      console.error('Error adding card to cube:', error);
      this.snackBar.open('Failed to add card to cube', '', { duration: 3000 });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}