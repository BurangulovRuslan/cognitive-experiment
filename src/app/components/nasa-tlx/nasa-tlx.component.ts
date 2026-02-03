import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperimentService, ConditionType, MARKER_CODES } from '../../services/experiment.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface NASATLXScale {
  id: string;
  question: string;
  lowLabel: string;
  highLabel: string;
  value: number;
}

@Component({
  selector: 'app-nasa-tlx',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="nasa-tlx-container">
      <div class="nasa-tlx-card">
        <h1>Оценка когнитивной нагрузки</h1>
        <p class="subtitle">{{ conditionTitle }}</p>

        <div class="instruction">
          <p>Оцените вашу субъективную нагрузку при выполнении задания по каждому из показателей ниже.</p>
          <p>Переместите ползунок на шкале от "Очень низкая" до "Очень высокая".</p>
        </div>

        <div class="scales-container">
          <div class="scale-item" *ngFor="let scale of scales">
            <div class="scale-header">
              <h3>{{ scale.question }}</h3>
            </div>

            <div class="scale-body">
              <div class="scale-labels">
                <span class="label-low">{{ scale.lowLabel }}</span>
                <span class="label-high">{{ scale.highLabel }}</span>
              </div>

              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                [(ngModel)]="scale.value"
                class="slider">

              <div class="scale-value">
                Значение: <strong>{{ scale.value }}</strong> / 100
              </div>
            </div>
          </div>
        </div>

        <div class="confidence-section">
          <h3>Уверенность в ответах</h3>
          <p>Насколько вы уверены в правильности найденных ответов?</p>

          <div class="confidence-options">
            <label *ngFor="let option of confidenceOptions" class="confidence-option">
              <input 
                type="radio" 
                name="confidence" 
                [value]="option.value"
                [(ngModel)]="confidence">
              <span>{{ option.label }}</span>
            </label>
          </div>
        </div>

        <div class="strategy-section">
          <h3>Стратегия поиска</h3>
          <p>Опишите кратко, какие стратегии вы использовали для поиска информации:</p>
          <textarea 
            [(ngModel)]="strategy"
            placeholder="Например: формулировал короткие запросы, уточнял по ключевым словам..."
            rows="4"
            class="strategy-textarea"></textarea>
        </div>

        <button 
          class="btn-continue" 
          (click)="submit()"
          [disabled]="!isComplete()">
          Продолжить →
        </button>

        <div class="progress-info">
          {{ order === 1 ? 'Первое условие завершено. Далее: второе условие' : 'Второе условие завершено. Далее: завершение эксперимента' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nasa-tlx-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .nasa-tlx-card {
      background: white;
      padding: 50px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 900px;
      width: 100%;
    }

    h1 {
      color: #2c3e50;
      font-size: 32px;
      margin-bottom: 10px;
      text-align: center;
    }

    .subtitle {
      text-align: center;
      color: #7f8c8d;
      font-size: 18px;
      margin-bottom: 30px;
    }

    .instruction {
      background: #e8f4f8;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
      border-left: 4px solid #3498db;
    }

    .instruction p {
      margin: 5px 0;
      color: #2c3e50;
      line-height: 1.6;
    }

    .scales-container {
      margin: 30px 0;
    }

    .scale-item {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 2px solid #e0e0e0;
      transition: border-color 0.3s;
    }

    .scale-item:hover {
      border-color: #3498db;
    }

    .scale-header h3 {
      color: #2c3e50;
      font-size: 18px;
      margin-bottom: 15px;
    }

    .scale-body {
      margin-top: 15px;
    }

    .scale-labels {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
      color: #555;
    }

    .label-low {
      color: #27ae60;
    }

    .label-high {
      color: #e74c3c;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 5px;
      background: linear-gradient(to right, #27ae60 0%, #f39c12 50%, #e74c3c 100%);
      outline: none;
      cursor: pointer;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3498db;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .slider::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3498db;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .scale-value {
      text-align: center;
      margin-top: 10px;
      font-size: 14px;
      color: #555;
    }

    .scale-value strong {
      color: #3498db;
      font-size: 18px;
    }

    .confidence-section, .strategy-section {
      background: #fff9e6;
      padding: 25px;
      border-radius: 12px;
      margin: 30px 0;
      border-left: 4px solid #f39c12;
    }

    .confidence-section h3, .strategy-section h3 {
      color: #2c3e50;
      font-size: 18px;
      margin-bottom: 10px;
    }

    .confidence-section p, .strategy-section p {
      color: #555;
      margin-bottom: 15px;
    }

    .confidence-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .confidence-option {
      display: flex;
      align-items: center;
      padding: 12px;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .confidence-option:hover {
      background: #f0f0f0;
    }

    .confidence-option input {
      margin-right: 10px;
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .confidence-option span {
      color: #2c3e50;
      font-size: 16px;
    }

    .strategy-textarea {
      width: 100%;
      padding: 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      font-family: inherit;
      resize: vertical;
      min-height: 100px;
      box-sizing: border-box;
    }

    .strategy-textarea:focus {
      outline: none;
      border-color: #3498db;
    }

    .btn-continue {
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
      margin-top: 30px;
    }

    .btn-continue:hover:not(:disabled) {
      background: #229954;
      transform: translateY(-2px);
    }

    .btn-continue:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    .progress-info {
      text-align: center;
      color: #7f8c8d;
      margin-top: 20px;
      font-size: 14px;
    }
  `]
})
export class NasaTlxComponent implements OnInit {
  order: number = 1;
  conditionType: ConditionType = 'LLM';
  conditionTitle: string = '';

  confidence: number = 3;
  strategy: string = '';

  scales: NASATLXScale[] = [
    {
      id: 'mental',
      question: 'Умственная нагрузка',
      lowLabel: 'Очень низкая',
      highLabel: 'Очень высокая',
      value: 50
    },
    {
      id: 'physical',
      question: 'Физическая нагрузка',
      lowLabel: 'Очень низкая',
      highLabel: 'Очень высокая',
      value: 50
    },
    {
      id: 'temporal',
      question: 'Временная нагрузка (спешка, дефицит времени)',
      lowLabel: 'Очень низкая',
      highLabel: 'Очень высокая',
      value: 50
    },
    {
      id: 'performance',
      question: 'Успешность выполнения',
      lowLabel: 'Отлично',
      highLabel: 'Провал',
      value: 50
    },
    {
      id: 'effort',
      question: 'Усилия (насколько тяжело пришлось работать)',
      lowLabel: 'Очень низкие',
      highLabel: 'Очень высокие',
      value: 50
    },
    {
      id: 'frustration',
      question: 'Фрустрация (раздражение, стресс, неуверенность)',
      lowLabel: 'Очень низкая',
      highLabel: 'Очень высокая',
      value: 50
    }
  ];

  confidenceOptions = [
    { value: 1, label: 'Совершенно не уверен' },
    { value: 2, label: 'Скорее не уверен' },
    { value: 3, label: 'Нейтрально' },
    { value: 4, label: 'Скорее уверен' },
    { value: 5, label: 'Абсолютно уверен' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expService: ExperimentService
  ) {}

  ngOnInit() {
    this.order = Number(this.route.snapshot.queryParams['order']) || 1;
    const config = this.expService.getConfig();

    this.conditionType = this.order === 1 ? config.first : config.second;
    this.conditionTitle = this.conditionType === 'LLM' 
      ? 'Условие 1: Большая языковая модель (ChatGPT)'
      : 'Условие 2: Поисковая система (Google)';

    // Отправляем маркер начала NASA-TLX
    const startMarker = this.order === 1 
      ? MARKER_CODES.NASA_TLX_1_START 
      : MARKER_CODES.NASA_TLX_2_START;

    this.expService.logEvent(`NASA_TLX_START`, { 
      condition: this.conditionType, 
      order: this.order 
    }, startMarker);
  }

  isComplete(): boolean {
    return this.strategy.trim().length > 0;
  }

  submit() {
    if (!this.isComplete()) {
      alert('Пожалуйста, опишите вашу стратегию поиска');
      return;
    }

    const tlxData = {
      condition: this.conditionType,
      order: this.order,
      scales: this.scales.reduce((acc, scale) => {
        acc[scale.id] = scale.value;
        return acc;
      }, {} as any),
      confidence: this.confidence,
      strategy: this.strategy,
      timestamp: Date.now()
    };

    // Отправляем маркер окончания NASA-TLX
    const endMarker = this.order === 1 
      ? MARKER_CODES.NASA_TLX_1_END 
      : MARKER_CODES.NASA_TLX_2_END;

    this.expService.logEvent('NASA_TLX_SUBMITTED', tlxData, endMarker);

    // Переход к следующему этапу
    if (this.order === 1) {
      // После первого условия → фоновая активность → второе условие
      this.router.navigate(['/baseline'], { queryParams: { phase: 2 } });
    } else {
      // После второго условия → финальная фоновая активность
      this.router.navigate(['/baseline'], { queryParams: { phase: 3 } });
    }
  }
}
