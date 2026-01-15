import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private router = inject(Router);

  navigateToPreguntas(): void {
    this.router.navigate(['/preguntas']);
  }

  navigateToMapa(): void {
    this.router.navigate(['/mapa']);
  }
}
