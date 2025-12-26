import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { Role } from '../../../../core/models/models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-step-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div *ngIf="initError" class="bg-red-50 border border-red-200 p-6 rounded-xl text-center mb-6">
        <p class="text-red-600 mb-4 font-medium">{{ initError }}</p>
        <button (click)="loadInitialData()" class="bg-red-600 text-white px-4 py-2 rounded font-bold shadow-sm">
            Reintentar
        </button>
    </div>

    <div *ngIf="!initError">
        <h2 class="text-xl font-semibold mb-6 text-gray-800">1. Información del Proyecto</h2>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- ... existing form fields ... -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label class="block text-sm font-medium text-gray-700">Nombre del Proyecto</label>
              <input type="text" formControlName="projectName" placeholder="Ej. E-commerce App"
                     class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Cliente</label>
              <input type="text" formControlName="clientName" placeholder="Ej. Cliente S.A."
                     class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
            </div>
          </div>

          <h3 class="text-lg font-medium mb-4 text-gray-700 border-b pb-2">Selección de Roles para la Estimación</h3>
          <p class="text-sm text-gray-500 mb-4">Selecciona los perfiles que participarán en este proyecto. La IA generará el detalle para cada uno.</p>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
            <label *ngFor="let role of availableRoles" class="flex items-center space-x-3 cursor-pointer p-3 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-200 hover:shadow-sm">
              <input type="checkbox" [checked]="isSelected(role.id!)" (change)="toggleRole(role.id!)"
                     class="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <span class="text-gray-700 font-medium text-sm">{{ role.name }}</span>
            </label>
          </div>

          <div class="flex justify-end">
            <button type="submit" [disabled]="form.invalid || loading || selectedRoleIds.length === 0" 
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all disabled:opacity-50">
              {{ loading ? 'Creando...' : 'Continuar al Alcance' }}
            </button>
          </div>
        </form>
    </div>
  `
})
export class StepProjectComponent implements OnInit {
  @Input() initialData: { projectName: string, clientName: string } = { projectName: '', clientName: '' };
  @Input() initialSelectedRoleIds: number[] = [];
  @Input() projectId: number | null = null;
  @Input() quoteId: number | null = null;
  @Output() projectCreated = new EventEmitter<{ projectId: number, quoteId: number, selectedRoleIds: number[], projectForm: any }>();

  private fb = inject(FormBuilder);
  private api = inject(ApiService);

  form: FormGroup;
  loading = false;
  initError: string | null = null;
  availableRoles: Role[] = [];
  selectedRoleIds: number[] = [];

  constructor() {
    this.form = this.fb.group({
      projectName: ['', Validators.required],
      clientName: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadInitialData();
    if (this.initialData) {
      this.form.patchValue(this.initialData);
    }
    if (this.initialSelectedRoleIds) {
      this.selectedRoleIds = [...this.initialSelectedRoleIds];
    }
  }

  loadInitialData() {
    this.loading = true;
    this.initError = null;
    this.api.getRoles().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (roles) => {
        this.availableRoles = roles;
      },
      error: (err) => {
        console.error('Error loading roles', err);
        this.initError = 'Error al cargar roles del servidor.';
      }
    });
  }

  isSelected(roleId: number): boolean {
    return this.selectedRoleIds.includes(roleId);
  }

  toggleRole(roleId: number) {
    if (this.isSelected(roleId)) {
      this.selectedRoleIds = this.selectedRoleIds.filter(id => id !== roleId);
    } else {
      this.selectedRoleIds.push(roleId);
    }
  }

  onSubmit() {
    if (this.form.invalid || this.selectedRoleIds.length === 0) return;
    this.loading = true;
    const val = this.form.value;

    if (this.projectId && this.quoteId) {
      // Update existing project
      this.api.updateProject(this.projectId, {
        name: val.projectName,
        client_name: val.clientName
      }).subscribe({
        next: (project) => {
          this.projectCreated.emit({
            projectId: project.id,
            quoteId: this.quoteId!,
            selectedRoleIds: [...this.selectedRoleIds],
            projectForm: { ...val }
          });
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
          alert('Error actualizando proyecto');
        }
      });
    } else {
      // Create new
      this.api.createProject({
        name: val.projectName,
        client_name: val.clientName
      }).subscribe({
        next: (project) => {
          this.api.createQuote({
            project_id: project.id,
            applied_margin: 0.2, // Default
            applied_risk: 0.1,   // Default
            applied_tax: 0.16    // Default
          }).pipe(
            finalize(() => this.loading = false)
          ).subscribe({
            next: (quote) => {
              this.projectCreated.emit({
                projectId: project.id,
                quoteId: quote.id,
                selectedRoleIds: [...this.selectedRoleIds],
                projectForm: { ...val }
              });
            },
            error: (err) => {
              console.error(err);
              alert('Error creando cotización');
            }
          });
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
          alert('Error creando proyecto');
        }
      });
    }
  }
}
