import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar';

@Component({
  selector: 'mt-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    @if (!isReaderRoute()) {
      <mt-navbar />
    }
    <main [class.main-content]="!isReaderRoute()">
      <router-outlet />
    </main>
  `,
  styles: `
    .main-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      min-height: calc(100vh - 60px);
    }
  `,
})
export class App {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(map(() => this.router.url)),
    { initialValue: this.router.url }
  );

  isReaderRoute = computed(() => this.url().startsWith('/reader'));
}
