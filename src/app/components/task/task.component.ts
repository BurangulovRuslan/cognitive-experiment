import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperimentService, ConditionType } from '../../services/experiment.service';
import { Question } from '../../data/questions';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="instruction-screen" *ngIf="showInstruction">
      <div class="instruction-card">
        <h1 class="condition-title">{{ conditionTitle }}</h1>
        <div class="instruction-content">
          <p *ngIf="conditionType === 'LLM'" class="main-instruction">
            Используйте <strong>ChatGPT</strong> в отдельном окне браузера для поиска ответов.
          </p>
          <p *ngIf="conditionType === 'SEARCH'" class="main-instruction">
            Используйте <strong>Google Search</strong> в отдельном окне браузера для поиска ответов.
          </p>

          <div class="task-description">
            <h3>Ваша задача:</h3>
            <ul>
              <li>На экране будут появляться изображения с вопросами</li>
              <li>Найдите правильный ответ, используя указанный инструмент</li>
              <li>Введите ответ в текстовое поле (одно слово, словосочетание или число)</li>
              <li>Нажмите "Далее" для перехода к следующему вопросу</li>
            </ul>
          </div>

          <div class="tips">
            <p><strong>💡 Важно:</strong></p>
            <ul>
              <li>Не копируйте текст с изображения — формулируйте запросы самостоятельно</li>
              <li>Используйте любые стратегии поиска, которые считаете эффективными</li>
              <li>Нам важен процесс поиска, а не количество правильных ответов</li>
            </ul>
          </div>
        </div>

        <button class="btn-start-task" (click)="startTask()">
          Начать ({{ taskDurationText }})
        </button>
      </div>
    </div>

    <div class="task-screen" *ngIf="!showInstruction">
      <div class="task-content" *ngIf="currentQuestion && !timeExpired">
        <div class="question-container">
          <div class="question-number">
            Вопрос {{ currentIndex + 1 }}
          </div>

          <div class="image-wrapper">
            <img 
              [src]="'/cognitive-experiment/images/' + currentQuestion.img" 
              [alt]="'Question ' + currentQuestion.id"
              class="question-image"
              (contextmenu)="$event.preventDefault()">
          </div>

          <div class="answer-section">
            <input 
              type="text"
              [(ngModel)]="currentAnswer" 
              (keyup.enter)="nextQuestion()"
              placeholder="Введите ваш ответ здесь..."
              class="answer-input"
              [disabled]="timeExpired"
              #answerInput>

            <button 
              class="btn-next" 
              (click)="nextQuestion()"
              [disabled]="!currentAnswer.trim() || timeExpired">
              Далее →
            </button>
          </div>
        </div>
      </div>

      <div class="waiting-screen" *ngIf="!currentQuestion && !timeExpired">
        <div class="waiting-card">
          <div class="check-icon">✓</div>
          <h2>Вы ответили на все вопросы!</h2>
          <p class="waiting-message">
            Пожалуйста, оставайтесь на месте и ожидайте окончания времени.
          </p>
        </div>
      </div>

      <div class="timeout-screen" *ngIf="timeExpired">
        <div class="timeout-card">
          <div class="timeout-icon">⏱</div>
          <h2>Время истекло</h2>
          <p class="timeout-message">
            Переход к опроснику...
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .instruction-screen {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .instruction-card {
      background: white;
      padding: 50px;
      border-radius: 20px;
      max-width: 800px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .condition-title {
      color: #2c3e50;
      font-size: 32px;
      text-align: center;
      margin-bottom: 30px;
    }
    .instruction-content {
      color: #555;
      line-height: 1.8;
    }
    .main-instruction {
      font-size: 18px;
      text-align: center;
      margin-bottom: 30px;
    }
    .task-description h3, .tips p strong {
      color: #2c3e50;
      margin-bottom: 15px;
    }
    .task-description ul, .tips ul {
      margin-left: 25px;
      margin-bottom: 25px;
    }
    .task-description li, .tips li {
      margin-bottom: 10px;
    }
    .tips {
      background: #fff9e6;
      padding: 20px;
      border-left: 4px solid #f39c12;
      border-radius: 4px;
      margin-top: 20px;
    }
    .btn-start-task {
      display: block;
      width: 100%;
      padding: 18px;
      margin-top: 30px;
      background: #27ae60;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 20px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-start-task:hover {
      background: #229954;
      transform: translateY(-2px);
    }

    .task-screen {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f5f6fa;
      padding: 20px;
    }
    .task-content {
      width: 100%;
      max-width: 1000px;
    }
    .question-container {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 5px 30px rgba(0,0,0,0.1);
    }
    .question-number {
      text-align: center;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .image-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 30px;
    }
    .question-image {
      max-width: 100%;
      max-height: 60vh;
      border-radius: 10px;
      box-shadow: 0 3px 15px rgba(0,0,0,0.1);
      user-select: none;
      pointer-events: none;
    }
    .answer-section {
      display: flex;
      gap: 15px;
      align-items: stretch;
    }
    .answer-input {
      flex: 1;
      padding: 15px 20px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    .answer-input:focus {
      outline: none;
      border-color: #3498db;
    }
    .answer-input:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }
    .btn-next {
      padding: 15px 40px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
    }
    .btn-next:hover:not(:disabled) {
      background: #2980b9;
    }
    .btn-next:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    .waiting-screen, .timeout-screen {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .waiting-card, .timeout-card {
      background: white;
      padding: 60px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .check-icon {
      font-size: 80px;
      color: #27ae60;
      margin-bottom: 20px;
    }
    .timeout-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    h2 {
      color: #2c3e50;
      font-size: 28px;
      margin-bottom: 15px;
    }
    .waiting-message, .timeout-message {
      color: #555;
      font-size: 18px;
      line-height: 1.6;
    }
  `]
})
export class TaskComponent implements OnInit, OnDestroy {
  order: number = 1;
  conditionType: ConditionType = 'LLM';
  conditionTitle: string = '';
  questions: Question[] = [];
  currentIndex = 0;

  showInstruction = true;
  currentAnswer = '';
  timeExpired = false;

  private timerRef: any;
  private taskDuration = 20 * 60;
  taskDurationText = '20 минут';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expService: ExperimentService
  ) {}

  ngOnInit() {
    this.order = Number(this.route.snapshot.queryParams['order']) || 1;
    const config = this.expService.getConfig();

    if (this.order === 1) {
      this.conditionType = config.first;
      this.questions = [...config.set1];
    } else {
      this.conditionType = config.second;
      this.questions = [...config.set2];
    }

    this.conditionTitle = this.conditionType === 'LLM' 
      ? 'Этап 1: Большая языковая модель (ChatGPT)'
      : 'Этап 2: Поисковая система (Google)';

    if (this.expService.isTestMode) {
      this.taskDuration = 20;
      this.taskDurationText = '20 секунд (тестовый режим)';
    }
  }

  startTask() {
    this.showInstruction = false;
    this.expService.logEvent(`TASK_${this.conditionType}_START`, { 
      order: this.order,
      questionsCount: this.questions.length 
    });

    if (this.currentQuestion) {
      this.expService.markQuestionShown(this.currentQuestion.id);
    }

    this.timerRef = setTimeout(() => {
      this.finishTask();
    }, this.taskDuration * 1000);
  }

  get currentQuestion(): Question | undefined {
    return this.questions[this.currentIndex];
  }

  nextQuestion() {
    if (!this.currentQuestion || !this.currentAnswer.trim() || this.timeExpired) {
      return;
    }

    this.expService.submitAnswer(
      this.conditionType, 
      this.currentQuestion, 
      this.currentAnswer
    );

    this.currentAnswer = '';
    this.currentIndex++;

    if (this.currentQuestion) {
      this.expService.markQuestionShown(this.currentQuestion.id);
    } else {
      this.expService.logEvent('ALL_QUESTIONS_COMPLETED_WAITING');
    }
  }

  finishTask() {
    if (this.timerRef) {
      clearTimeout(this.timerRef);
    }

    this.timeExpired = true;
    this.expService.logEvent(`TASK_${this.conditionType}_TIMEOUT`);

    setTimeout(() => {
      this.goToNext();
    }, 2000);
  }

  goToNext() {
    // После выполнения задания переходим к NASA-TLX
    this.router.navigate(['/nasa-tlx'], { queryParams: { order: this.order } });
  }

  ngOnDestroy() {
    if (this.timerRef) {
      clearTimeout(this.timerRef);
    }
  }
}