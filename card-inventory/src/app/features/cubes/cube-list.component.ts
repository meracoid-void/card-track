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
import { Cube } from '../../models';

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

  constructor(
    private dbService: SupabaseDbService,
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