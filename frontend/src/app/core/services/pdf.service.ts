/* import { Injectable } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any)['pdfMake'].vfs; */

import { Injectable } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Configurar las fuentes de pdfMake
if (pdfFonts && (pdfFonts as any).pdfMake && (pdfFonts as any).pdfMake.vfs) {
  Object.assign(pdfMake, { vfs: (pdfFonts as any).pdfMake.vfs });
} else if ((pdfFonts as any).vfs) {
  Object.assign(pdfMake, { vfs: (pdfFonts as any).vfs });
} else {
  // Usar fuentes por defecto si no se pueden cargar las fuentes personalizadas
  console.warn('No se pudieron cargar las fuentes personalizadas, usando fuentes por defecto');
}

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  generateQuotePdf(quote: any, project: any, items: any[], roles: any[]) {
    const documentDefinition: any = {
      content: [
        { text: 'COTIZACIÓN DE SERVICIOS PROFESIONALES', style: 'header' },
        { text: `Proyecto: ${project.name}`, style: 'subheader' },
        { text: `Cliente: ${project.client_name}`, style: 'subheader' },
        { text: `Fecha: ${new Date().toLocaleDateString()}`, alignment: 'right' },
        '\n',
        { text: 'ALCANCE Y ESTIMACIÓN', style: 'sectionHeader' },
        this.buildItemsTable(items, roles),
        '\n',
        {
          columns: [
            { text: '' },
            {
              stack: [
                {
                  columns: [
                    { text: 'Costo Base:', width: '*' },
                    { text: `$${quote.total_cost.toFixed(2)}`, width: 'auto', alignment: 'right' },
                  ],
                },
                {
                  columns: [
                    { text: `Riesgo (${(quote.applied_risk * 100).toFixed(0)}%):`, width: '*' },
                    {
                      text: `$${(quote.total_cost * quote.applied_risk).toFixed(2)}`,
                      width: 'auto',
                      alignment: 'right',
                    },
                  ],
                },
                {
                  columns: [
                    { text: `Margen (${(quote.applied_margin * 100).toFixed(0)}%):`, width: '*' },
                    {
                      text: `$${(
                        quote.total_price / (1 + quote.applied_tax) -
                        quote.total_cost * (1 + quote.applied_risk)
                      ).toFixed(2)}`,
                      width: 'auto',
                      alignment: 'right',
                    },
                  ],
                },
                {
                  canvas: [{ type: 'line', x1: 0, y1: 5, x2: 200, y2: 5, lineWidth: 1 }],
                },
                {
                  columns: [
                    { text: 'Total (sin IVA):', style: 'totalLabel', width: '*' },
                    {
                      text: `$${(quote.total_price / (1 + quote.applied_tax)).toFixed(2)}`,
                      style: 'totalValue',
                      width: 'auto',
                      alignment: 'right',
                    },
                  ],
                },
                {
                  columns: [
                    { text: `IVA (${(quote.applied_tax * 100).toFixed(0)}%):`, width: '*' },
                    {
                      text: `$${(
                        quote.total_price -
                        quote.total_price / (1 + quote.applied_tax)
                      ).toFixed(2)}`,
                      width: 'auto',
                      alignment: 'right',
                    },
                  ],
                },
                {
                  columns: [
                    { text: 'TOTAL FINAL:', style: 'finalTotalLabel', width: '*' },
                    {
                      text: `$${quote.total_price.toFixed(2)}`,
                      style: 'finalTotalValue',
                      width: 'auto',
                      alignment: 'right',
                    },
                  ],
                },
              ],
              width: 200,
            },
          ],
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
          color: '#2c3e50',
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 5, 0, 5],
        },
        sectionHeader: {
          fontSize: 12,
          bold: true,
          margin: [0, 15, 0, 5],
          color: '#34495e',
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: 'white',
          fillColor: '#2c3e50',
        },
        totalLabel: {
          bold: true,
          margin: [0, 5, 0, 0],
        },
        totalValue: {
          bold: true,
          margin: [0, 5, 0, 0],
        },
        finalTotalLabel: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 0],
          color: '#2980b9',
        },
        finalTotalValue: {
          fontSize: 16,
          bold: true,
          margin: [0, 10, 0, 0],
          color: '#2980b9',
        },
      },
    };

    pdfMake
      .createPdf(documentDefinition)
      .download(`Cotizacion_${project.name.replace(/\s+/g, '_')}.pdf`);
  }

  private buildItemsTable(items: any[], roles: any[]) {
    return {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto'],
        body: [
          [
            { text: 'Rol', style: 'tableHeader' },
            { text: 'Descripción', style: 'tableHeader' },
            { text: 'Horas', style: 'tableHeader', alignment: 'right' },
            { text: 'Subtotal', style: 'tableHeader', alignment: 'right' },
          ],
          ...items.map((item) => [
            this.getRoleName(item.role_id, roles),
            item.description,
            { text: `${item.manual_hours}h`, alignment: 'right' },
            { text: `$${(item.manual_hours * item.hourly_rate).toFixed(2)}`, alignment: 'right' },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    };
  }

  private getRoleName(id: number, roles: any[]) {
    return roles.find((r) => r.id === id)?.name || 'Desconocido';
  }
}
