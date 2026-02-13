import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Mapa } from './components/mapa/mapa';
import { Preguntas } from './components/preguntas/preguntas';

export const APP_ROUTES: Routes = [
  {
    path: '',
    component: Home,
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