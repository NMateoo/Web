import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home').then((m) => m.Home),
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'mapa',
    loadComponent: () => import('./components/mapa/mapa').then((m) => m.Mapa),
  },
  {
    path: 'preguntas',
    loadComponent: () => import('./components/preguntas/preguntas').then((m) => m.Preguntas),
  },
];