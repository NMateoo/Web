import { Routes } from '@angular/router';
import { Countdown } from './components/countdown/countdown';
import { Home } from './components/home/home';
import { Mapa } from './components/mapa/mapa';
import { Preguntas } from './components/preguntas/preguntas';

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
  {
    path: 'preguntas',
    component: Preguntas,
  },
];