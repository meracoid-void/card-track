import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupabaseAuthService } from '../../core/auth/supabase-auth.service';
import { SupabaseDbService } from '../../core/db/supabase-db.service';
import { InventoryCard } from '../../models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
})
export class InventoryComponent implements OnInit {
  cards: InventoryCard[] = [];
  loading = true;
  displayedColumns = [
    'image',
    'name',
    'game',
    'quantity',
    'purchasePrice',
    'currentPrice',
    'totalValue',
    'profitLoss',
    'actions',
  ];

  constructor(
    private authService: SupabaseAuthService,
    private dbService: SupabaseDbService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.dbService.getInventory$().subscribe(
      (cards) => {
        this.cards = cards;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading inventory:', error);
        this.snackBar.open('Failed to load inventory', '', { duration: 3000 });
        this.loading = false;
      }
    );
  }

  deleteCard(card: InventoryCard): void {
    if (confirm(`Are you sure you want to delete ${card.cardName}?`)) {
      this.dbService.deleteCard(card.cardId).then(
        () => {
          this.snackBar.open('Card deleted', '', { duration: 2000 });
        },
        (error) => {
          this.snackBar.open('Failed to delete card', '', { duration: 3000 });
        }
      );
    }
  }

  getProfitLoss(card: InventoryCard): number {
    return (card.currentPrice - card.purchasePrice) * card.quantity;
  }

  getTotalInvested(): number {
    return this.cards.reduce((sum, card) => sum + card.purchasePrice * card.quantity, 0);
  }

  getTotalCurrentValue(): number {
    return this.cards.reduce((sum, card) => sum + card.currentPrice * card.quantity, 0);
  }

  getTotalProfitLoss(): number {
    return this.getTotalCurrentValue() - this.getTotalInvested();
  }

  getGameDisplayName(game: string): string {
    const gameMap: { [key: string]: string } = {
      'mtg': 'Magic: The Gathering',
      'pokemon': 'Pokémon',
      'magic-the-gathering': 'Magic: The Gathering',
      'yugioh': 'Yu-Gi-Oh!'
    };
    return gameMap[game] || game;
  }
}
