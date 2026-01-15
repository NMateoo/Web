import { Component, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TimeUnits {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private timeRemaining = signal<TimeUnits>({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  countdownReached = signal(false);
  passwordError = signal(false);
  attempts = signal(0);

  days = computed(() => this.timeRemaining().days);
  hours = computed(() => this.timeRemaining().hours);
  minutes = computed(() => this.timeRemaining().minutes);
  seconds = computed(() => this.timeRemaining().seconds);

  errorMessage = computed(() => {
    const att = this.attempts();
    if (att === 0) return '';
    if (att === 1) return 'Contraseña incorrecta';
    if (att === 2) return 'No es esa... 😅';
    if (att === 3) return 'Vuelve a intentar';
    if (att === 4) return 'Sigue intentandolo, estás cerca';
    if (att === 5) return 'Casi, casi...';
    if (att >= 6 && att < 10) return `Intento ${att}... ¿Aún no?`;
    if (att >= 10 && att < 40) return `Vas a tener que esperar a que acabe el contador 😘`;
    return `${att} intentos... Sigue sigue 🤣`;
  });

  ngOnInit(): void {
    this.updateCountdown();
    setInterval(() => this.updateCountdown(), 1000);
  }

  onSubmitPassword(passwordInput: HTMLInputElement): void {
    this.attempts.update(att => att + 1);
    this.passwordError.set(true);
    passwordInput.value = '';
    passwordInput.focus();
  }

  private updateCountdown(): void {
    const targetDate = new Date('2026-02-14T00:00:00').getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      this.countdownReached.set(true);
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    this.timeRemaining.set({
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    });
  }
}
