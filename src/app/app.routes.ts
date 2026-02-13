import { Routes } from '@angular/router';
import { Countdown } from './components/countdown/countdown';
import { Home } from './components/home/home';
import { Mapa } from './components/mapa/mapa';

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
    component: Mapa,
  },
];