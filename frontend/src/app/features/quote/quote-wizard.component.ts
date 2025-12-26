import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepProjectComponent } from './steps/step-project/step-project.component';
import { StepScopeComponent } from './steps/step-scope/step-scope.component';
import { StepSummaryComponent } from './steps/step-summary/step-summary.component';

@Component({
    selector: 'app-quote-wizard',
    standalone: true,
    imports: [CommonModule, StepProjectComponent, StepScopeComponent, StepSummaryComponent],
    templateUrl: './quote-wizard.component.html',
    styleUrls: ['./quote-wizard.component.css']
})
export class QuoteWizardComponent {
    currentStep = 1;

    // State shared across steps
    projectId: number | null = null;
    quoteId: number | null = null;
    selectedRoleIds: number[] = [];

    // Form persistence
    projectData: any = { projectName: '', clientName: '' };
    requirementsText: string = '';
    quoteData: any = null; // Stores the full quote object including items/totals

    onProjectCreated(data: { projectId: number, quoteId: number, selectedRoleIds: number[], projectForm: any }) {
        this.projectId = data.projectId;
        this.quoteId = data.quoteId;
        this.selectedRoleIds = data.selectedRoleIds;
        this.projectData = data.projectForm;
        this.nextStep();
    }

    onRequirementsChanged(text: string) {
        this.requirementsText = text;
    }

    onQuoteUpdated(quote: any) {
        this.quoteData = quote;
    }

    nextStep() {
        this.currentStep++;
    }

    prevStep() {
        this.currentStep--;
    }

    goToStep(step: number) {
        if (step < this.currentStep) {
            this.currentStep = step;
        }
    }
}
