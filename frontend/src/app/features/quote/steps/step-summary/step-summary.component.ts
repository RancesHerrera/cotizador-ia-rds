import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { PdfService } from '../../../../core/services/pdf.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-step-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="text-xl font-semibold mb-6 text-gray-800">3. Resumen y Cotización Final</h2>

    <div *ngIf="quote" class="bg-white border rounded-lg shadow-sm overflow-hidden mb-8">
      <!-- ... existing financial table ... -->
      <div class="bg-gray-50 px-6 py-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="space-y-1">
          <h4 class="text-xl font-bold text-gray-800">{{ quote.project_name }}</h4>
          <p class="text-sm text-gray-500 flex items-center gap-2">
            <span class="bg-gray-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Cliente</span>
            {{ quote.client_name }}
          </p>
        </div>
        <div class="flex gap-6 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <div class="text-center px-2">
              <span class="text-[10px] text-gray-400 uppercase font-bold block mb-1">Margen</span>
              <span class="font-mono font-bold text-gray-800 text-lg">{{ (quote.applied_margin * 100).toFixed(0) }}%</span>
            </div>
            <div class="border-l border-gray-100 h-10"></div>
            <div class="text-center px-2">
               <span class="text-[10px] text-gray-400 uppercase font-bold block mb-1">Riesgo</span>
               <span class="font-mono font-bold text-gray-800 text-lg">{{ (quote.applied_risk * 100).toFixed(0) }}%</span>
            </div>
        </div>
      </div>

      <div class="px-6 py-4">
          <div class="flex justify-between items-center py-2 border-b border-gray-100 font-mono text-sm">
            <span class="text-gray-600 font-sans">Costo Base Operativo</span>
            <span>\${{ quote.total_cost.toLocaleString() }}</span>
          </div>
          
          <div class="flex justify-between items-center py-2 border-b border-gray-100 text-sm text-gray-500 ml-4 font-mono">
             <span class="font-sans">+ Colchón de Riesgo ({{ (quote.applied_risk * 100).toFixed(0) }}%)</span>
             <span>\${{ (quote.total_cost * quote.applied_risk).toLocaleString() }}</span>
          </div>

          <div class="flex justify-between items-center py-2 border-b border-gray-100 font-semibold text-gray-700 bg-gray-50 -mx-6 px-10 font-mono">
            <span class="font-sans">Subtotal (Base + Riesgo)</span>
            <span>\${{ (quote.total_cost * (1 + quote.applied_risk)).toLocaleString() }}</span>
          </div>
          
          <div class="flex justify-between items-center py-2 border-b border-gray-100 mt-2 font-mono">
            <span class="text-purple-700 font-medium font-sans">Precio de Venta (Margen {{ (quote.applied_margin * 100).toFixed(0) }}%)</span>
            <span class="font-bold text-lg text-purple-700">\${{ (quote.total_price / (1 + quote.applied_tax)).toLocaleString() }}</span>
          </div>

           <div class="flex justify-between items-center py-2 border-b border-gray-100 text-sm text-gray-500 font-mono">
             <span class="font-sans">+ IVA ({{ (quote.applied_tax * 100).toFixed(0) }}%)</span>
             <span>\${{ (quote.total_price - (quote.total_price / (1 + quote.applied_tax))).toLocaleString() }}</span>
          </div>

           <div class="flex justify-between items-center py-4 bg-gray-900 text-white -mx-6 px-6 mt-4 font-mono">
             <span class="text-xl font-bold font-sans">Total Final</span>
             <span class="text-2xl font-bold font-mono">\${{ quote.total_price.toLocaleString() }}</span>
          </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-100">
      <button (click)="back.emit()" class="text-gray-500 font-bold hover:text-gray-800 transition-colors uppercase text-xs tracking-widest order-2 md:order-1">
        Atrás / Editar
      </button>
      <div class="flex gap-4 order-1 md:order-2">
          <button (click)="downloadPdf()" [disabled]="!quote" class="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg shadow transition-all flex items-center gap-2">
            📥 Descargar PDF
          </button>
          <button (click)="finalizeQuote()" [disabled]="!quote || isSaving" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg transition-all flex items-center gap-2">
            <span *ngIf="isSaving" class="animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
            {{ isSaving ? 'Guardando...' : 'Generar Cotización' }}
          </button>
      </div>
    </div>
  `
})
export class StepSummaryComponent implements OnInit {
  @Input() quoteId: number | null = null;
  @Output() back = new EventEmitter<void>();

  private api = inject(ApiService);
  private pdfService = inject(PdfService);

  quote: any = null;
  roles: any[] = [];
  isSaving = false;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    if (!this.quoteId) return;

    // Fetch quote and roles to get names
    this.api.getRoles().subscribe(roles => this.roles = roles);
    this.api.getQuote(this.quoteId).subscribe(q => {
      this.quote = q;
    });
  }

  downloadPdf() {
    if (!this.quote) return;
    const project = {
      name: this.quote.project_name || 'Proyecto',
      client_name: this.quote.client_name || 'Cliente'
    };
    this.pdfService.generateQuotePdf(this.quote, project, this.quote.items, this.roles);
  }

  finalizeQuote() {
    if (!this.quoteId || !this.quote) return;
    this.isSaving = true;

    // In a real scenario, this would update Project status to "SENT"
    this.api.finalizeProject(this.quote.project_id).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        alert('Cotización guardada exitosamente.');
        // Maybe redirect or reset wizard? 
        // For now just show success.
      },
      error: (err: any) => {
        console.error(err);
        alert('Error al guardar cotización.');
      }
    });
  }
}
