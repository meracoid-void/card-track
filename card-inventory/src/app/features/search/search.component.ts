import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { JustTCGService } from '../../services/justtcg.service';
import { JustTCGCard } from '../../models';
import { AddToInventoryDialogComponent } from './add-to-inventory-dialog.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit {
  searchForm: FormGroup;
  results: JustTCGCard[] = [];
  loading = false;
  error = '';
  searched = false;

  supportedGames = [
    {display: 'Pokemon', value: 'pokemon'},
    {display: 'Magic: The Gathering', value: 'magic-the-gathering'},
    {display: 'Yu-Gi-Oh', value: 'yugioh'}
  ];

  constructor(
    private fb: FormBuilder,
    private justTcgService: JustTCGService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.searchForm = this.fb.group({
      game: ['Pokemon', Validators.required],
      cardName: ['', Validators.required],
    });
  }

  ngOnInit(): void {
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
    if (this.searchForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.searched = true;
    const { game, cardName } = this.searchForm.value;

    this.justTcgService.searchCards(cardName, game).subscribe(
      (cards) => {
        this.results = cards;
        this.loading = false;
      },
      (error) => {
        this.error = `Failed to fetch ${game} cards`;
        this.loading = false;
      }
    );
  }

  getCardName(card: JustTCGCard): string {
    return card.name || 'Unknown Card';
  }

  getCardImage(card: JustTCGCard): string {
    return card.imageUrl || '';
  }

  getPrice(card: JustTCGCard): number {
    return this.justTcgService.getPrice(card) || 0;
  }

  getPriceDisplay(card: JustTCGCard): string {
    const price = this.getPrice(card);
    return price > 0 ? `$${price.toFixed(2)}` : 'N/A';
  }

  openAddDialog(card: JustTCGCard): void {
    const dialogRef = this.dialog.open(AddToInventoryDialogComponent, {
      width: '400px',
      data: { card, game: this.searchForm.value.game },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Card added to inventory!', '', { duration: 2000 });
      }
    });
  }
}
