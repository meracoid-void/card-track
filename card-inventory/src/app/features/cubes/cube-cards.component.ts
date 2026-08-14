import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SupabaseDbService } from '../../core/db/supabase-db.service';
import { CubeCard } from '../../models';
import { CubeCardSearchComponent } from './cube-card-search.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cube-cards',
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
  ],
  templateUrl: './cube-cards.component.html',
  styleUrls: ['./cube-cards.component.scss'],
})
export class CubeCardsComponent implements OnInit, OnDestroy {
  @Input() cubeId!: string;
  @Input() isOwner = false;

  cards: CubeCard[] = [];
  loading = true;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private dbService: SupabaseDbService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCards();
  }

  loadCards(): void {
    const sub = this.dbService.getCubeCards$(this.cubeId).subscribe(
      (cards) => {
        this.cards = cards;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading cube cards:', error);
        this.snackBar.open('Failed to load cube cards', '', { duration: 3000 });
        this.loading = false;
      }
    );
    this.subscriptions.push(sub);
  }

  openAddCardDialog(): void {
    const dialogRef = this.dialog.open(CubeCardSearchComponent, {
      width: '800px',
      data: { cubeId: this.cubeId }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Dialog was closed successfully
      }
    });
  }

  removeCard(card: CubeCard): void {
    if (confirm(`Remove one copy of ${card.cardName} from this cube?`)) {
      this.dbService.removeCardFromCubeById(card.id).then(
        () => {
          this.snackBar.open('Card copy removed from cube', '', { duration: 2000 });
        },
        (error) => {
          this.snackBar.open('Failed to remove card', '', { duration: 3000 });
        }
      );
    }
  }

  getCardCount(cardId: string): number {
    return this.cards.filter(card => card.cardId === cardId).length;
  }

  getUniqueCards(): CubeCard[] {
    const uniqueCardIds = [...new Set(this.cards.map(card => card.cardId))];
    return uniqueCardIds.map(cardId => 
      this.cards.find(card => card.cardId === cardId)!
    );
  }

  getCardImage(card: CubeCard): string {
    return card.imageUrl || '';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}