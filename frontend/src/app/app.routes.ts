import { Routes } from '@angular/router';
import { SettingsComponent } from './features/settings/settings.component';
import { QuoteWizardComponent } from './features/quote/quote-wizard.component';
import { Home } from './features/home/home';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'home', redirectTo: '', pathMatch: 'full' },
    { path: 'settings', component: SettingsComponent },
    { path: 'quote/new', component: QuoteWizardComponent }
];
