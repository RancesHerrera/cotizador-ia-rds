import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role, SystemConfig } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private http = inject(HttpClient);
    // Assuming backend runs on port 8000
    private baseUrl = 'http://localhost:8000';

    // --- Roles ---
    getRoles(): Observable<Role[]> {
        return this.http.get<Role[]>(`${this.baseUrl}/roles/`);
    }

    createRole(role: Role): Observable<Role> {
        return this.http.post<Role>(`${this.baseUrl}/roles/`, role);
    }

    updateRole(roleId: number, role: Role): Observable<Role> {
        return this.http.put<Role>(`${this.baseUrl}/roles/${roleId}`, role);
    }

    deleteRole(roleId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/roles/${roleId}`);
    }

    // --- Config ---
    getConfig(): Observable<SystemConfig[]> {
        return this.http.get<SystemConfig[]>(`${this.baseUrl}/config/`);
    }

    updateConfig(config: SystemConfig): Observable<SystemConfig> {
        return this.http.post<SystemConfig>(`${this.baseUrl}/config/`, config);
    }

    // --- Core / Quote Flow ---
    createProject(project: { name: string, client_name: string, raw_requirements?: string }): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/projects/`, project);
    }

    updateProject(projectId: number, project: { name: string, client_name: string }): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/projects/${projectId}`, project);
    }

    createQuote(quote: { project_id: number, applied_margin: number, applied_risk: number, applied_tax: number, ai_raw_input?: string }): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/quotes/`, quote);
    }

    getQuote(quoteId: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/quotes/${quoteId}`);
    }

    addQuoteItem(quoteId: number, item: { role_id: number, description: string, manual_hours: number, hourly_rate: number }): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/quotes/${quoteId}/items/`, item);
    }

    deleteQuoteItem(itemId: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/quotes/items/${itemId}`);
    }

    updateQuoteItem(itemId: number, item: any): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/quotes/items/${itemId}`, item);
    }

    finalizeProject(projectId: number): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/projects/${projectId}/finalize`, {});
    }

    // --- AI ---
    generateScope(quoteId: number, requirements: string, roleIds: number[]): Observable<any[]> {
        return this.http.post<any[]>(`${this.baseUrl}/quotes/${quoteId}/generate-scope`, {
            requirements,
            role_ids: roleIds
        });
    }
}
