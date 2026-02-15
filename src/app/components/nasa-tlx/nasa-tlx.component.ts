import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ExperimentService, ConditionType, MARKER_CODES } from '../../services/experiment.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Scale {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
}

@Component({
  selector: 'app-nasa-tlx',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="nasa-tlx-container">
      <div class="nasa-tlx-card">
        <h1>{{ conditionTitle }}</h1>
        <p class="intro">Пожалуйста, оцените вашу когнитивную нагрузку по каждому из параметров.</p>

        <div class="scales-container">
          <div class="scale-item" *ngFor="let scale of scales">
            <label class="scale-label">{{ scale.label }}</label>
            <div class="scale-row">
              <span class="scale-endpoint">{{ scale.leftLabel }}</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                [(ngModel)]="scale.value"
                class="scale-slider">
              <span class="scale-endpoint">{{ scale.rightLabel }}</span>
            </div>
            <div class="scale-value">{{ scale.value }}</div>
          </div>
        </div>

        <div class="additional-questions">
          <div class="question-block">
            <label class="question-label">Насколько вы уверены в правильности ваших ответов?</label>
            <div class="confidence-options">
              <label *ngFor="let opt of [1,2,3,4,5]">
                <input type="radio" name="confidence" [value]="opt" [(ngModel)]="confidence">
                {{ opt === 1 ? 'Совсем не уверен' : opt === 5 ? 'Очень уверен' : opt }}
              </label>
            </div>
          </div>

          <div class="question-block">
            <label class="question-label">Опишите вашу стратегию поиска информации:</label>
            <textarea 
              [(ngModel)]="strategy"
              placeholder="Опишите, как вы искали ответы на вопросы..."
              rows="4"
              class="strategy-input"></textarea>
          </div>
        </div>

        <button class="btn-submit" (click)="submit()" [disabled]="!isComplete()">
          Продолжить
        </button>
      </div>
    </div>
  `,
  styles: [`
    .nasa-tlx-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
    }
    .nasa-tlx-card {
      background: white;
      padding: 50px;
      border-radius: 20px;
      max-width: 900px;
      width: 100%;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 {
      color: #2c3e50;
      font-size: 32px;
      text-align: center;
      margin-bottom: 15px;
    }
    .intro {
      text-align: center;
      color: #555;
      font-size: 16px;
      margin-bottom: 40px;
    }
    .scales-container {
      margin-bottom: 40px;
    }
    .scale-item {
      margin-bottom: 35px;
    }
    .scale-label {
      display: block;
      color: #2c3e50;
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 15px;
    }
    .scale-row {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .scale-endpoint {
      color: #7f8c8d;
      font-size: 13px;
      min-width: 100px;
      text-align: center;
    }
    .scale-slider {
      flex: 1;
      height: 8px;
      border-radius: 5px;
      outline: none;
      -webkit-appearance: none;
      background: linear-gradient(to right, #3498db, #e74c3c);
    }
    .scale-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 3px solid #3498db;
      cursor: pointer;
    }
    .scale-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 3px solid #3498db;
      cursor: pointer;
    }
    .scale-value {
      text-align: center;
      color: #2c3e50;
      font-weight: 600;
      font-size: 18px;
      margin-top: 8px;
    }
    .additional-questions {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .question-block {
      margin-bottom: 25px;
    }
    .question-block:last-child {
      margin-bottom: 0;
    }
    .question-label {
      display: block;
      color: #2c3e50;
      font-weight: 600;
      margin-bottom: 15px;
    }
    .confidence-options {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }
    .confidence-options label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 10px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.3s;
    }
    .confidence-options label:hover {
      border-color: #3498db;
      background: #ecf7ff;
    }
    .confidence-options input[type="radio"] {
      cursor: pointer;
    }
    .strategy-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      font-family: inherit;
      resize: vertical;
      transition: border-color 0.3s;
    }
    .strategy-input:focus {
      outline: none;
      border-color: #3498db;
    }
    .btn-submit {
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
    }
    .btn-submit:hover:not(:disabled) {
      background: #229954;
      transform: translateY(-2px);
    }
    .btn-submit:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }
  `]
})
export class NasaTlxComponent implements OnInit {
  order: number = 1;
  conditionType: ConditionType = 'LLM';
  conditionTitle: string = '';
  confidence: number = 3;
  strategy: string = '';

  scales: Scale[] = [
    {
      id: 'mental',
      label: 'Умственная нагрузка',
      leftLabel: 'Очень низкая',
      rightLabel: 'Очень высокая',
      value: 50
    },
    {
      id: 'physical',
      label: 'Физическая нагрузка',
      leftLabel: 'Очень низкая',
      rightLabel: 'Очень высокая',
      value: 50
    },
    {
      id: 'temporal',
      label: 'Временное давление',
      leftLabel: 'Очень низкое',
      rightLabel: 'Очень высокое',
      value: 50
    },
    {
      id: 'performance',
      label: 'Успешность выполнения',
      leftLabel: 'Идеально',
      rightLabel: 'Провально',
      value: 50
    },
    {
      id: 'effort',
      label: 'Усилия',
      leftLabel: 'Очень мало',
      rightLabel: 'Очень много',
      value: 50
    },
    {
      id: 'frustration',
      label: 'Разочарование',
      leftLabel: 'Очень низкое',
      rightLabel: 'Очень высокое',
      value: 50
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private expService: ExperimentService
  ) {}

  async ngOnInit() {
    this.order = Number(this.route.snapshot.queryParams['order']) || 1;
    const config = this.expService.getConfig();

    this.conditionType = this.order === 1 ? config.first : config.second;
    this.conditionTitle = this.conditionType === 'LLM' 
      ? 'Условие 1: Большая языковая модель (ChatGPT)'
      : 'Условие 2: Поисковая система (Google)';

    const startMarker = this.order === 1 
      ? MARKER_CODES.NASA_TLX_1_START 
      : MARKER_CODES.NASA_TLX_2_START;

    await this.expService.logEvent(`NASA_TLX_START`, { 
      condition: this.conditionType, 
      order: this.order 
    }, startMarker);
  }

  isComplete(): boolean {
    return this.confidence > 0 && this.strategy.trim().length > 0;
  }

  async submit() {
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

    const endMarker = this.order === 1 
      ? MARKER_CODES.NASA_TLX_1_END 
      : MARKER_CODES.NASA_TLX_2_END;

    await this.expService.logEvent('NASA_TLX_SUBMITTED', tlxData, endMarker);

    setTimeout(() => {
      if (this.order === 1) {
        this.router.navigate(['/baseline'], { queryParams: { phase: 2 } });
      } else {
        this.router.navigate(['/baseline'], { queryParams: { phase: 3 } });
      }
    }, 100);
  }
}
