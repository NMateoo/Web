import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-welcome-modal',
  templateUrl: './welcome-modal.html',
  styleUrl: './welcome-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeModal {
  readonly isOpen = signal(true);

  close(): void {
    this.isOpen.set(false);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== 'Tab' || !(event.currentTarget instanceof HTMLDialogElement)) {
      return;
    }

    const dialog = event.currentTarget;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements.item(0);
    const lastElement = focusableElements.item(focusableElements.length - 1);

    const activeElement = document.activeElement;
    const focusIsOutsideDialog = !dialog.contains(activeElement);

    if (event.shiftKey && (activeElement === firstElement || focusIsOutsideDialog)) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && (activeElement === lastElement || focusIsOutsideDialog)) {
      event.preventDefault();
      firstElement?.focus();
    }
  }
}
