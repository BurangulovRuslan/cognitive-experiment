import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { BaselineComponent } from './components/baseline/baseline.component';
import { TaskComponent } from './components/task/task.component';
import { NasaTlxComponent } from './components/nasa-tlx/nasa-tlx.component';
import { ExportComponent } from './components/export/export.component';

export const routes: Routes = [
  { path: '', redirectTo: '/admin', pathMatch: 'full' },
  { path: 'admin', component: AdminComponent },
  { path: 'baseline', component: BaselineComponent },
  { path: 'task', component: TaskComponent },
  { path: 'nasa-tlx', component: NasaTlxComponent },
  { path: 'export', component: ExportComponent }
];