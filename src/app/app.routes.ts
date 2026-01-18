import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { BaselineComponent } from './components/baseline/baseline.component';
import { TaskComponent } from './components/task/task.component';
import { ExportComponent } from './components/export/export.component';

export const routes: Routes = [
  { path: '', redirectTo: '/admin', pathMatch: 'full' },
  { path: 'admin', component: AdminComponent },
  { path: 'baseline', component: BaselineComponent },
  { path: 'task', component: TaskComponent },
  { path: 'export', component: ExportComponent }
];