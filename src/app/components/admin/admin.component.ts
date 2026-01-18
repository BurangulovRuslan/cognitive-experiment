import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ExperimentService } from '../../services/experiment.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="header">
        <h1>🧠 Cognitive Search Experiment</h1>
        <p class="subtitle">Настройка экспериментальной сессии</p>
      </div>

      <div class="form-card">
        <div class="form-group">
          <label for="pid">ID Участника *</label>
          <input 
            id="pid"
            [(ngModel)]="pid" 
            placeholder="Например: P-001"
            class="form-input"
            (keyup.enter)="pid && start()">
          <small class="hint">Введите уникальный идентификатор участника</small>
        </div>

        <div class="form-group">
          <label for="group">Экспериментальная группа (контрбалансировка) *</label>
          <select id="group" [(ngModel)]="group" class="form-select">
            <option [ngValue]="1">Группа 1: LLM (Набор A) → Search (Набор B)</option>
            <option [ngValue]="2">Группа 2: LLM (Набор B) → Search (Набор A)</option>
            <option [ngValue]="3">Группа 3: Search (Набор A) → LLM (Набор B)</option>
            <option [ngValue]="4">Группа 4: Search (Набор B) → LLM (Набор A)</option>
          </select>
          <small class="hint">Выберите сценарий согласно протоколу</small>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="isTest">
            <span>🚀 Тестовый режим (быстрые таймеры)</span>
          </label>
          <small class="hint">Включите для проверки работы сервиса (20 сек вместо 20 мин)</small>
        </div>

        <div class="button-group">
          <button 
            class="btn-primary" 
            (click)="start()" 
            [disabled]="!pid">
            Начать эксперимент →
          </button>
        </div>

        <div class="info-box">
          <p><strong>⚠️ Важно:</strong></p>
          <ul>
            <li>Убедитесь, что психофизиологическое оборудование готово</li>
            <li>Запишите системное время старта для синхронизации</li>
            <li>Экстренная остановка: <code>Ctrl + Shift + Q</code></li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    h1 {
      color: #2c3e50;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #7f8c8d;
      font-size: 16px;
    }
    .form-card {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 20px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 25px;
    }
    label {
      display: block;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .form-input, .form-select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
      box-sizing: border-box;
    }
    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #3498db;
    }
    .hint {
      display: block;
      color: #95a5a6;
      font-size: 12px;
      margin-top: 5px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: normal;
    }
    .checkbox-label input {
      margin-right: 10px;
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    .button-group {
      margin-top: 30px;
    }
    .btn-primary {
      width: 100%;
      padding: 15px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }
    .btn-primary:hover:not(:disabled) {
      background: #2980b9;
    }
    .btn-primary:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }
    .info-box {
      margin-top: 30px;
      padding: 15px;
      background: #fff9e6;
      border-left: 4px solid #f39c12;
      border-radius: 4px;
      font-size: 13px;
    }
    .info-box ul {
      margin: 10px 0 0 20px;
      padding: 0;
    }
    .info-box li {
      margin-bottom: 5px;
    }
    code {
      background: #34495e;
      color: #ecf0f1;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
  `]
})
export class AdminComponent {
  pid = '';
  group = 1;
  isTest = false;

  constructor(
    private expService: ExperimentService, 
    private router: Router
  ) {}

  start() {
    if (!this.pid.trim()) {
      alert('Пожалуйста, введите ID участника');
      return;
    }

    this.expService.startSession(this.pid.trim(), this.group, this.isTest);
    this.router.navigate(['/baseline'], { queryParams: { phase: 1 } });
  }
}
