import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WelcomeModal } from './components/welcome-modal/welcome-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WelcomeModal],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
