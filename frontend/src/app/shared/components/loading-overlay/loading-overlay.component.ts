import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div class="bg-white p-5 rounded-lg shadow-lg flex flex-col items-center gap-3">
        <!-- Spinner -->
        <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        <span class="text-gray-700 font-medium text-sm">{{ message }}</span>
      </div>
    </div>
  `,
  styles: []
})
export class LoadingOverlayComponent {
  @Input() message: string = 'Cargando...';
}
