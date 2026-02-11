import { Routes } from '@angular/router';
import { Countdown } from './components/countdown/countdown';
import { Home } from './components/home/home';

export const APP_ROUTES: Routes = [
  {
    path: '',
    component: Countdown,
  },
  {
    path: 'home',
    component: Home,
  },
  {
    path: 'mapa',
    loadComponent: () => import('./components/mapa/mapa').then(m => m.Mapa),
  },
];