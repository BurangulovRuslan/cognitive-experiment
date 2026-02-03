import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperimentService, MARKER_CODES } from '../../services/experiment.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-baseline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="baseline-container">
      <div *ngIf="step === 'intro'" class="intro-screen">
        <h2>Фоновая запись активности</h2>
        <p class="instruction">
          Сейчас будет записана фоновая активность вашего мозга в состоянии спокойного бодрствования.
        </p>
        <div class="steps">
          <div class="step-item">
            <span class="step-number">1</span>
            <span class="step-text">Сядьте удобно и расслабьтесь</span>
          </div>
          <div class="step-item">
            <span class="step-number">2</span>
            <span class="step-text">Смотрите на крест в центре экрана (90 сек)</span>
          </div>
          <div class="step-item">
            <span class="step-number">3</span>
            <span class="step-text">По сигналу закройте глаза (90 сек)</span>
          </div>
        </div>
        <button class="btn-start" (click)="startBaseline()">Начать запись</button>
      </div>

      <div *ngIf="step === 'eyes-open'" class="fixation-screen">
        <div class="cross">+</div>
        <div class="timer-hidden">{{ remainingTime }}</div>
      </div>

      <div *ngIf="step === 'eyes-closed'" class="eyes-closed-screen">
        <h1 class="close-eyes-text">ЗАКРОЙТЕ ГЛАЗА</h1>
        <p class="instruction">Откройте их, когда услышите звуковой сигнал</p>
      </div>
    </div>
  `,
  styles: [`
    .baseline-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .intro-screen {
      background: white;
      padding: 50px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 600px;
      text-align: center;
    }
    h2 {
      color: #2c3e50;
      font-size: 28px;
      margin-bottom: 20px;
    }
    .instruction {
      color: #555;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .steps {
      text-align: left;
      margin: 30px 0;
    }
    .step-item {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      background: #3498db;
      color: white;
      border-radius: 50%;
      font-weight: bold;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .step-text {
      color: #2c3e50;
      font-size: 15px;
    }
    .btn-start {
      padding: 15px 40px;
      background: #27ae60;
      color: white;
      border: none;
      border-radius: 30px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
    }
    .btn-start:hover {
      background: #229954;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
    }
    .fixation-screen {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: white;
    }
    .cross {
      font-size: 120px;
      font-weight: bold;
      color: #2c3e50;
      user-select: none;
    }
    .eyes-closed-screen {
      text-align: center;
      color: white;
    }
    .close-eyes-text {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 20px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.3);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .timer-hidden {
      position: absolute;
      bottom: 20px;
      right: 20px;
      color: #bbb;
      font-size: 12px;
      opacity: 0.3;
    }
  `]
})
export class BaselineComponent implements OnInit, OnDestroy {
  phase: number = 1;
  step: 'intro' | 'eyes-open' | 'eyes-closed' = 'intro';

  duration = 90;
  remainingTime = 90;
  private timerInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expService: ExperimentService
  ) {}

  ngOnInit() {
    this.phase = Number(this.route.snapshot.queryParams['phase']) || 1;

    if (this.expService.isTestMode) {
      this.duration = 5;
      this.remainingTime = 5;
    }
  }

  startBaseline() {
    this.expService.logEvent(`BASELINE_PHASE_${this.phase}_START`);
    this.runEyesOpen();
  }

  runEyesOpen() {
    this.step = 'eyes-open';
    this.remainingTime = this.duration;

    // Отправляем маркер в зависимости от фазы
    const markerCode = this.getEyesOpenMarker();
    this.expService.logEvent('EYES_OPEN_START', { phase: this.phase }, markerCode);

    this.timerInterval = setInterval(() => {
      this.remainingTime--;
      if (this.remainingTime <= 0) {
        clearInterval(this.timerInterval);
        this.playBeep();
        this.runEyesClosed();
      }
    }, 1000);
  }

  runEyesClosed() {
    this.step = 'eyes-closed';
    this.remainingTime = this.duration;

    // Отправляем маркер в зависимости от фазы
    const markerCode = this.getEyesClosedMarker();
    this.expService.logEvent('EYES_CLOSED_START', { phase: this.phase }, markerCode);

    this.timerInterval = setInterval(() => {
      this.remainingTime--;
      if (this.remainingTime <= 0) {
        clearInterval(this.timerInterval);
        this.playBeep();
        this.finishBaseline();
      }
    }, 1000);
  }

  // Получаем код маркера для "глаза открыты" в зависимости от фазы
  getEyesOpenMarker(): number {
    switch(this.phase) {
      case 1: return MARKER_CODES.BASELINE_1_EYES_OPEN;
      case 2: return MARKER_CODES.BASELINE_2_EYES_OPEN;
      case 3: return MARKER_CODES.BASELINE_3_EYES_OPEN;
      default: return MARKER_CODES.BASELINE_1_EYES_OPEN;
    }
  }

  // Получаем код маркера для "глаза закрыты" в зависимости от фазы
  getEyesClosedMarker(): number {
    switch(this.phase) {
      case 1: return MARKER_CODES.BASELINE_1_EYES_CLOSED;
      case 2: return MARKER_CODES.BASELINE_2_EYES_CLOSED;
      case 3: return MARKER_CODES.BASELINE_3_EYES_CLOSED;
      default: return MARKER_CODES.BASELINE_1_EYES_CLOSED;
    }
  }

  playBeep() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 440;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio playback not supported:', e);
    }
  }

  finishBaseline() {
    this.expService.logEvent(`BASELINE_PHASE_${this.phase}_FINISHED`);
    this.goToNext();
  }

  goToNext() {
    if (this.phase === 1) {
      this.router.navigate(['/task'], { queryParams: { order: 1 } });
    } else if (this.phase === 2) {
      this.router.navigate(['/task'], { queryParams: { order: 2 } });
    } else {
      this.router.navigate(['/export']);
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
