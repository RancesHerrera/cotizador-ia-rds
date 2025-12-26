import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Role, SystemConfig } from '../../core/models/models';
import { forkJoin, finalize } from 'rxjs';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);

    roles: Role[] = [];
    configs: SystemConfig[] = [];

    roleForm: FormGroup;
    configForm: FormGroup;

    editingRole: Role | null = null;
    loading = false;
    error: string | null = null;

    constructor() {
        this.roleForm = this.fb.group({
            name: ['', Validators.required],
            hourly_rate: [0, [Validators.required, Validators.min(0)]]
        });

        this.configForm = this.fb.group({
            // We will dynamically bind controls or just use a simple form for specific keys
            default_margin: [0.2],
            default_risk: [0.1],
            default_tax: [0.16]
        });
    }

    ngOnInit(): void {
        this.loadData();
    }

    loadData() {
        this.loading = true;
        this.error = null;

        forkJoin({
            roles: this.api.getRoles(),
            configs: this.api.getConfig()
        }).pipe(
            finalize(() => this.loading = false)
        ).subscribe({
            next: (results) => {
                this.roles = results.roles;
                this.configs = results.configs;

                // Map config to form
                const margin = this.configs.find(c => c.key === 'default_margin')?.value_float;
                const risk = this.configs.find(c => c.key === 'default_risk')?.value_float;
                const tax = this.configs.find(c => c.key === 'default_tax')?.value_float;

                this.configForm.patchValue({
                    default_margin: margin ?? 0.2,
                    default_risk: risk ?? 0.1,
                    default_tax: tax ?? 0.16
                });
            },
            error: (err) => {
                console.error('Error loading data', err);
                this.error = 'No se pudo conectar con el servidor. Por favor, verifica que el backend esté corriendo.';
            }
        });
    }

    // --- Roles Actions ---
    isSaving = false;

    // --- Roles Actions ---
    saveRole() {
        if (this.roleForm.invalid) return;

        this.isSaving = true;
        const roleData = this.roleForm.value;

        const request$ = (this.editingRole && this.editingRole.id)
            ? this.api.updateRole(this.editingRole.id, roleData)
            : this.api.createRole(roleData);

        request$.subscribe({
            next: () => {
                this.resetRoleForm();
                this.loadData();
                this.isSaving = false;
            },
            error: (err) => {
                console.error('Error saving role', err);
                alert('Error al guardar el rol. Revisa la consola.');
                this.isSaving = false;
            }
        });
    }

    editRole(role: Role) {
        this.editingRole = role;
        this.roleForm.patchValue({
            name: role.name,
            hourly_rate: role.hourly_rate
        });
        // Note: We do NOT reload data here, as per user request.
        // The table remains static until 'Save' or 'Delete' is triggered.
    }

    deleteRole(role: Role) {
        if (!role.id) return;
        if (confirm(`¿Eliminar rol ${role.name}?`)) {
            this.isSaving = true; // reusing simple loading state or we can use another
            this.api.deleteRole(role.id).subscribe({
                next: () => {
                    this.loadData();
                    this.isSaving = false;
                },
                error: (err) => {
                    console.error("Error deleting", err);
                    this.isSaving = false;
                }
            });
        }
    }

    resetRoleForm() {
        this.editingRole = null;
        this.roleForm.reset({ hourly_rate: 0 });
    }

    // --- Config Actions ---
    saveConfig() {
        const vals = this.configForm.value;

        // Save each config sequentially (simple for MVP)
        this.api.updateConfig({ key: 'default_margin', value_float: vals.default_margin }).subscribe();
        this.api.updateConfig({ key: 'default_risk', value_float: vals.default_risk }).subscribe();
        this.api.updateConfig({ key: 'default_tax', value_float: vals.default_tax }).subscribe();

        alert('Configuración guardada');
    }
}
