import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseDbService } from '../../core/db/supabase-db.service';
import { Cube } from '../../models';

@Component({
  selector: 'app-cube-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './cube-form.component.html',
  styleUrls: ['./cube-form.component.scss'],
})
export class CubeFormComponent implements OnInit {
  cubeForm: FormGroup;
  isEditMode = false;
  cubeId?: string;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private dbService: SupabaseDbService,
    private snackBar: MatSnackBar
  ) {
    this.cubeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode = true;
      this.cubeId = id;
      this.loadCube(id);
    }
  }

  async loadCube(id: string): Promise<void> {
    this.loading = true;
    try {
      const cube = await this.dbService.getCubeById(id);
      if (cube) {
        this.cubeForm.patchValue({
          name: cube.name,
          description: cube.description || '',
        });
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

  async onSubmit(): Promise<void> {
    if (this.cubeForm.invalid) {
      return;
    }

    this.loading = true;
    const { name, description } = this.cubeForm.value;

    try {
      if (this.isEditMode && this.cubeId) {
        await this.dbService.updateCube(this.cubeId, { name, description });
        this.snackBar.open('Cube updated successfully', '', { duration: 2000 });
      } else {
        const newCube = await this.dbService.createCube(name, description);
        this.snackBar.open('Cube created successfully', '', { duration: 2000 });
        this.router.navigate(['/cubes', newCube.id]);
      }
    } catch (error) {
      console.error('Error saving cube:', error);
      this.snackBar.open('Failed to save cube', '', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  cancel(): void {
    if (this.isEditMode && this.cubeId) {
      this.router.navigate(['/cubes', this.cubeId]);
    } else {
      this.router.navigate(['/cubes']);
    }
  }
}