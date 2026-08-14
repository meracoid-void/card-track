import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SupabaseDbService } from '../../core/db/supabase-db.service';
import { Cube, CubeDraftingSettings, DEFAULT_DRAFTING_SETTINGS } from '../../models';
import { CubeCardsComponent } from './cube-cards.component';
import { CubeParticipantsComponent } from './cube-participants.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cube-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    CubeCardsComponent,
    CubeParticipantsComponent,
  ],
  templateUrl: './cube-detail.component.html',
  styleUrls: ['./cube-detail.component.scss'],
})
export class CubeDetailComponent implements OnInit, OnDestroy {
  cube: Cube | null = null;
  loading = true;
  cubeId?: string;
  isOwner = false;
  
  // Frontend-only drafting settings
  draftingSettings: CubeDraftingSettings = { ...DEFAULT_DRAFTING_SETTINGS };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private dbService: SupabaseDbService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.snackBar.open('Invalid cube ID', '', { duration: 3000 });
      this.router.navigate(['/cubes']);
      return;
    }

    this.cubeId = id;
    this.loadCube();
  }

  async loadCube(): Promise<void> {
    if (!this.cubeId) return;

    this.loading = true;
    try {
      const cube = await this.dbService.getCubeById(this.cubeId);
      if (cube) {
        this.cube = cube;
        const user = this.dbService.getCurrentUser();
        this.isOwner = user?.id === cube.ownerId;
        
        // Load drafting settings from localStorage
        this.loadDraftingSettings();
      } else {
        this.snackBar.open('Cube not found', '', { duration: 3000 });
        this.router.navigate(['/cubes']);
      }
    } catch (error) {
      console.error('Error loading cube:', error);
      this.snackBar.open('Failed to load cube', '', { duration: 3000 });
      this.router.navigate(['/cubes']);
    } finally {
      this.loading = false;
    }
  }

  loadDraftingSettings(): void {
    if (!this.cubeId) return;
    
    const saved = localStorage.getItem(`cube-settings-${this.cubeId}`);
    if (saved) {
      try {
        this.draftingSettings = JSON.parse(saved);
      } catch (e) {
        this.draftingSettings = { ...DEFAULT_DRAFTING_SETTINGS };
      }
    } else {
      this.draftingSettings = { ...DEFAULT_DRAFTING_SETTINGS };
    }
  }

  saveDraftingSettings(): void {
    if (!this.cubeId) return;
    localStorage.setItem(`cube-settings-${this.cubeId}`, JSON.stringify(this.draftingSettings));
    this.snackBar.open('Drafting settings saved', '', { duration: 2000 });
  }

  onDraftingSettingsChange(settings: CubeDraftingSettings): void {
    this.draftingSettings = settings;
    this.saveDraftingSettings();
  }

  editCube(): void {
    if (this.cubeId) {
      this.router.navigate(['/cubes', this.cubeId, 'edit']);
    }
  }

  deleteCube(): void {
    if (this.cube && confirm(`Are you sure you want to delete ${this.cube.name}?`)) {
      this.dbService.deleteCube(this.cube.id).then(
        () => {
          this.snackBar.open('Cube deleted', '', { duration: 2000 });
          this.router.navigate(['/cubes']);
        },
        (error) => {
          this.snackBar.open('Failed to delete cube', '', { duration: 3000 });
        }
      );
    }
  }

  goBack(): void {
    this.router.navigate(['/cubes']);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}