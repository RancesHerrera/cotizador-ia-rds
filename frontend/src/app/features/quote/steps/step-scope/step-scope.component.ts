import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { Role } from '../../../../core/models/models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-step-scope',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <!-- Error State for Initial Load -->
    <div *ngIf="initError" class="bg-red-50 border border-red-200 p-8 rounded-2xl text-center my-6 shadow-sm">
        <div class="text-4xl mb-4">🔌</div>
        <p class="text-red-600 mb-6 font-medium">{{ initError }}</p>
        <button (click)="retryLoad()" class="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-lg font-bold shadow transition-colors">
            🔄 Reintentar
        </button>
    </div>

    <div *ngIf="!initError">
        <h2 class="text-xl font-semibold mb-2 text-gray-800">2. Definición del Alcance con IA</h2>
        <p class="text-sm text-gray-500 mb-6">Describe las funcionalidades y deja que la IA calcule el esfuerzo para los roles seleccionados.</p>

        <!-- Requirements Input Area -->
        <div class="bg-purple-50 p-6 rounded-xl border border-purple-100 mb-8 shadow-sm">
            <label class="block text-sm font-bold text-purple-900 mb-2">Requerimientos Detallados</label>
            <textarea [(ngModel)]="requirementsText" rows="6" 
                      placeholder="Ej. Necesitamos un e-commerce con login de usuarios, catálogo de productos, carrito de compras e integración con pasarela de pagos. Requiere panel administrativo para gestión de stock."
                      class="w-full rounded-lg border-purple-200 shadow-sm border p-4 text-sm focus:ring-purple-500 focus:border-purple-500 mb-4"></textarea>
            
            <div class="flex justify-end">
              <button (click)="generateWithAI()" [disabled]="!requirementsText || isGenerating"
                      class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow-md flex items-center gap-3 transition-all disabled:opacity-50">
                  <span *ngIf="!isGenerating">🪄</span>
                  <span *ngIf="isGenerating" class="animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
                  {{ isGenerating ? 'Calculando...' : 'Calcular con IA' }}
              </button>
            </div>
        </div>

        <!-- List of Items -->
        <div class="mb-6 bg-white border rounded-xl shadow-sm overflow-hidden">
          <!-- ... header ... -->
          <div class="px-6 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center bg-gray-50 gap-4">
              <h3 class="font-bold text-gray-700 uppercase text-xs tracking-wider">Desglose de Estimación</h3>
              <div class="flex items-center gap-4">
                  <div class="flex flex-col items-end">
                      <span class="text-[10px] text-gray-400 uppercase font-bold px-1">Total Horas</span>
                      <span class="text-sm font-mono font-bold text-gray-700 bg-white px-3 py-1 rounded border shadow-sm">{{ totalHours }}h</span>
                  </div>
                  <div class="flex flex-col items-end">
                      <span class="text-[10px] text-gray-400 uppercase font-bold px-1">Costo Estimado</span>
                      <span class="text-sm font-mono font-bold text-green-700 bg-white px-3 py-1 rounded border shadow-sm">\${{ totalCost.toLocaleString() }}</span>
                  </div>
                  <span class="text-xs font-medium text-gray-500 bg-gray-200/50 px-2 py-1 rounded border border-gray-300">{{ items.length }} items</span>
              </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50/50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-[15%]">Rol</th>
                  <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-[45%]">Descripción</th>
                  <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase w-[15%]">Horas</th>
                  <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase w-[15%]">Costo Est.</th>
                  <th class="px-6 py-3 text-right w-[10%]">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let item of items; let i = index" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 text-sm font-semibold text-gray-900 border-r border-gray-50">
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs whitespace-nowrap">{{ getRoleName(item.role_id) }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    <div class="italic leading-relaxed">"{{ item.description }}"</div>
                  </td>
                  <td class="px-6 py-4 text-sm text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                      <input type="number" [(ngModel)]="item.manual_hours" (change)="updateItem(item)" 
                             class="w-20 text-right font-mono font-bold border-gray-200 rounded p-1 text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50">
                      <span class="text-gray-400 text-[10px] uppercase font-bold">h</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-right font-mono text-green-600 font-bold whitespace-nowrap">
                    \${{ (item.manual_hours * item.hourly_rate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}
                  </td>
                  <td class="px-6 py-4 text-right whitespace-nowrap">
                    <div class="flex justify-end gap-2 text-gray-400">
                      <button (click)="moveItem(i, -1)" [disabled]="i === 0" title="Subir" class="hover:text-blue-500 disabled:opacity-20 transition-colors p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button (click)="moveItem(i, 1)" [disabled]="i === items.length - 1" title="Bajar" class="hover:text-blue-500 disabled:opacity-20 transition-colors p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button (click)="deleteItem(item.id)" title="Eliminar" class="hover:text-red-500 ml-2 transition-colors p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="items.length === 0">
                  <td colspan="5" class="px-6 py-12 text-center text-gray-400 italic">
                     Usa el área de arriba para ingresar requerimientos y obtener una estimación detallada.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add Item Manual (Mini form) -->
        <div class="mb-10 text-right">
           <button (click)="showManual = !showManual" class="text-indigo-600 text-xs font-bold hover:underline">
              {{ showManual ? '- Ocultar carga manual' : '+ Agregar item manual' }}
           </button>
           <div *ngIf="showManual" class="mt-4 bg-gray-50 p-4 rounded-lg border text-left animate-fade-in">
              <form [formGroup]="form" (ngSubmit)="addItem()" class="flex flex-col md:flex-row gap-4 items-end">
                <div class="flex-grow">
                  <label class="block text-xs font-bold text-gray-600 mb-1">Rol</label>
                  <select formControlName="role_id" class="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white">
                    <option *ngFor="let r of roles" [value]="r.id">{{ r.name }}</option>
                  </select>
                </div>
                <div class="flex-grow-[2]">
                  <label class="block text-xs font-bold text-gray-600 mb-1">Descripción</label>
                  <input type="text" formControlName="description" class="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm">
                </div>
                <div class="w-24">
                  <label class="block text-xs font-bold text-gray-600 mb-1">Horas</label>
                  <input type="number" formControlName="manual_hours" class="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm">
                </div>
                <button type="submit" [disabled]="form.invalid" class="bg-gray-800 text-white px-6 py-2 rounded-md font-bold text-sm shadow">
                  Agregar
                </button>
              </form>
           </div>
        </div>

        <!-- Navigation -->
        <div class="flex justify-between mt-12 pt-6 border-t border-gray-100">
          <button (click)="onBack()" class="text-gray-500 font-bold hover:text-gray-800 transition-colors uppercase text-xs tracking-widest">
            Atrás
          </button>
          <button (click)="onNext()" [disabled]="items.length === 0" 
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg transition-all disabled:opacity-50">
            VER RESUMEN FINAL
          </button>
        </div>
    </div>
  `,
  styleUrls: []
})
export class StepScopeComponent implements OnInit {
  @Input() quoteId: number | null = null;
  @Input() selectedRoleIds: number[] = [];
  @Input() initialRequirements: string = '';
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Output() requirementsChange = new EventEmitter<string>();

  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  items: any[] = [];
  roles: Role[] = [];
  form: FormGroup;
  loadingRoles = false;
  isGenerating = false;
  initError: string | null = null;
  showManual = false;
  requirementsText = '';

  get totalHours(): number {
    return this.items.reduce((acc, item) => acc + (item.manual_hours || 0), 0);
  }

  get totalCost(): number {
    return this.items.reduce((acc, item) => acc + ((item.manual_hours || 0) * (item.hourly_rate || 0)), 0);
  }

  constructor() {
    this.form = this.fb.group({
      role_id: [null, Validators.required],
      description: ['', Validators.required],
      manual_hours: [1, [Validators.required, Validators.min(0.1)]]
    });
  }

  ngOnInit() {
    this.retryLoad();
    if (this.initialRequirements) {
      this.requirementsText = this.initialRequirements;
    }
  }

  retryLoad() {
    this.loadRoles();
    if (this.quoteId) {
      this.loadItems();
    }
  }

  loadRoles() {
    this.loadingRoles = true;
    this.initError = null;
    this.api.getRoles().pipe(
      finalize(() => this.loadingRoles = false)
    ).subscribe({
      next: (roles) => {
        this.roles = roles;
      },
      error: (err) => {
        console.error('Error loading roles', err);
        this.initError = 'No se pudieron cargar los roles/items. Verifica la conexión.';
      }
    });
  }

  loadItems() {
    if (!this.quoteId) return;
    this.api.getQuote(this.quoteId).subscribe({
      next: (q) => {
        this.items = q.items || [];
      },
      error: (err) => {
        console.error('Error loading quote items', err);
        this.initError = 'Error al cargar el alcance de la cotización.';
      }
    });
  }

  addItem() {
    if (this.form.invalid || !this.quoteId) return;

    const val = this.form.value;
    const selectedRole = this.roles.find(r => r.id == val.role_id);

    const payload = {
      role_id: val.role_id,
      description: val.description,
      manual_hours: val.manual_hours,
      hourly_rate: selectedRole ? selectedRole.hourly_rate : 0,
      sequence: this.items.length
    };

    this.api.addQuoteItem(this.quoteId, payload).subscribe(() => {
      this.form.reset({ manual_hours: 1 });
      this.loadItems();
    });
  }

  deleteItem(id: number) {
    this.api.deleteQuoteItem(id).subscribe(() => {
      this.loadItems();
    });
  }

  updateItem(item: any) {
    this.api.updateQuoteItem(item.id, item).subscribe({
      next: () => {
        // Updated items from backend to ensure consistency
        // But to avoid flickering we can just trust the local state for totals
      },
      error: (err) => console.error('Error updating item', err)
    });
  }

  moveItem(index: number, direction: number) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.items.length) return;

    // Swap items in local array for immediate feedback
    const temp = this.items[index];
    this.items[index] = this.items[newIndex];
    this.items[newIndex] = temp;

    // Update sequences in backend
    // We update both items
    this.items.forEach((item, idx) => {
      item.sequence = idx;
    });

    // Save changes (ideally we should have a bulk update but let's do two calls)
    this.updateItem(this.items[index]);
    this.updateItem(this.items[newIndex]);
  }

  generateWithAI() {
    if (!this.quoteId || !this.requirementsText) return;
    this.isGenerating = true;
    this.requirementsChange.emit(this.requirementsText);

    this.api.generateScope(this.quoteId, this.requirementsText, this.selectedRoleIds).pipe(
      finalize(() => this.isGenerating = false)
    ).subscribe({
      next: () => {
        this.loadItems();
      },
      error: (err) => {
        console.error('AI Error', err);
        alert("Error generando alcance con IA.");
      }
    });
  }

  onBack() {
    this.requirementsChange.emit(this.requirementsText);
    this.back.emit();
  }

  onNext() {
    this.requirementsChange.emit(this.requirementsText);
    this.next.emit();
  }

  getRoleName(id: number) {
    return this.roles.find(r => r.id === id)?.name || 'Desconocido';
  }
}
