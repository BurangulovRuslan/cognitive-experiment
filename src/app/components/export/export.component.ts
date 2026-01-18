import { Component, OnInit } from '@angular/core';
import { ExperimentService } from '../../services/experiment.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="export-container">
      <div class="export-card">
        <div class="success-icon">🎉</div>
        <h1>Эксперимент завершён!</h1>
        <p class="thank-you">Спасибо за участие в исследовании</p>
        
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">{{ stats.totalAnswers }}</span>
            <span class="stat-label">Всего ответов</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.correctAnswers }}</span>
            <span class="stat-label">Правильных</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.averageResponseTime }}</span>
            <span class="stat-label">Среднее время (мс)</span>
          </div>
        </div>

        <button class="btn-download" (click)="downloadData()">
          📥 Скачать результаты (XLSX)
        </button>

        <div class="info-note">
          <p><strong>Для экспериментатора:</strong></p>
          <p>Файл содержит 3 листа: Summary, Answers и EventLog с временными метками для синхронизации с ЭЭГ/айтрекером.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .export-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .export-card {
      background: white;
      padding: 60px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 600px;
    }
    .success-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    h1 {
      color: #2c3e50;
      font-size: 32px;
      margin-bottom: 15px;
    }
    .thank-you {
      color: #555;
      font-size: 18px;
      margin-bottom: 40px;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #3498db;
    }
    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 5px;
    }
    .btn-download {
      width: 100%;
      padding: 18px;
      background: #27ae60;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 20px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 20px;
    }
    .btn-download:hover {
      background: #229954;
      transform: translateY(-2px);
    }
    .info-note {
      margin-top: 30px;
      padding: 15px;
      background: #e8f4f8;
      border-left: 4px solid #3498db;
      border-radius: 4px;
      text-align: left;
      font-size: 13px;
    }
  `]
})
export class ExportComponent implements OnInit {
  stats = { totalAnswers: 0, correctAnswers: 0, averageResponseTime: 0 };

  constructor(private expService: ExperimentService) {}

  ngOnInit() {
    this.stats = this.expService.getStats();
    this.expService.logEvent('EXPERIMENT_COMPLETED');
  }

  downloadData() {
    this.expService.exportData();
  }
}
