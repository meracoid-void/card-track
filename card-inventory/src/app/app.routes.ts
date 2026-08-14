import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { SignupComponent } from './features/auth/signup.component';
import { SearchComponent } from './features/search/search.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { CubeListComponent } from './features/cubes/cube-list.component';
import { CubeFormComponent } from './features/cubes/cube-form.component';
import { CubeDetailComponent } from './features/cubes/cube-detail.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'search', component: SearchComponent, canActivate: [authGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: 'cubes', component: CubeListComponent, canActivate: [authGuard] },
  { path: 'cubes/new', component: CubeFormComponent, canActivate: [authGuard] },
  { path: 'cubes/:id', component: CubeDetailComponent, canActivate: [authGuard] },
  { path: 'cubes/:id/edit', component: CubeFormComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
