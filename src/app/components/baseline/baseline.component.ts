import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ExperimentService, MARKER_CODES } from '../../services/experiment.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-baseline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="baseline-container">
      <div class="baseline-card" *ngIf="step === 'instruction'">
        <h1>{{ phaseTitle }}</h1>
        <div class="instruction-text">
          <p>Сейчас будет проведена фоновая запись ЭЭГ.</p>
          <p><strong>Инструкция:</strong></p>
          <ul>
            <li>Сядьте удобно, расслабьтесь</li>
            <li>Когда прозвучит звуковой сигнал — откройте глаза и смотрите в центр экрана</li>
            <li>Через несколько секунд прозвучит второй сигнал — закройте глаза</li>
            <li>После третьего сигнала — откройте глаза, запись завершена</li>
          </ul>
          <p class="duration-info">Длительность: {{ displayDuration }} секунд</p>
        </div>
        <button class="btn-start" (click)="startRecording()">Начать запись</button>
      </div>

      <div class="baseline-card recording-card" *ngIf="step === 'eyes-open'">
        <div class="recording-indicator">🔴</div>
        <h2>Глаза открыты</h2>
        <p class="instruction">Смотрите в центр экрана</p>
        <div class="fixation-cross">+</div>
        <div class="timer">{{ remainingTime }}с</div>
      </div>

      <div class="baseline-card recording-card" *ngIf="step === 'eyes-closed'">
        <div class="recording-indicator">🔴</div>
        <h2>Глаза закрыты</h2>
        <p class="instruction">Держите глаза закрытыми</p>
        <div class="timer">{{ remainingTime }}с</div>
      </div>
    </div>
  `,
  styles: [`
    .baseline-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .baseline-card {
      background: white;
      padding: 50px;
      border-radius: 20px;
      max-width: 700px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
    }
    h1 {
      color: #2c3e50;
      font-size: 32px;
      margin-bottom: 30px;
    }
    .instruction-text {
      text-align: left;
      color: #555;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .instruction-text ul {
      margin: 20px 0;
      padding-left: 25px;
    }
    .instruction-text li {
      margin-bottom: 10px;
    }
    .duration-info {
      background: #e8f4f8;
      padding: 15px;
      border-left: 4px solid #3498db;
      border-radius: 4px;
      margin-top: 20px;
    }
    .btn-start {
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
    .btn-start:hover {
      background: #229954;
      transform: translateY(-2px);
    }
    .recording-card {
      background: #1a1a1a;
      color: white;
      min-height: 400px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .recording-indicator {
      font-size: 40px;
      margin-bottom: 20px;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    h2 {
      font-size: 36px;
      margin-bottom: 20px;
    }
    .instruction {
      font-size: 20px;
      color: #bbb;
      margin-bottom: 40px;
    }
    .fixation-cross {
      font-size: 80px;
      color: white;
      margin: 30px 0;
      font-weight: 300;
    }
    .timer {
      font-size: 48px;
      font-weight: 600;
      color: #3498db;
      margin-top: 20px;
    }
  `]
})
export class BaselineComponent implements OnInit, OnDestroy {
  phase: number = 1;
  phaseTitle: string = '';
  step: 'instruction' | 'eyes-open' | 'eyes-closed' = 'instruction';
  duration: number = 60;
  displayDuration: number = 120;
  remainingTime: number = 0;
  timerInterval: any;
  audioContext: AudioContext | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private expService: ExperimentService
  ) {}

  ngOnInit() {
    this.phase = Number(this.route.snapshot.queryParams['phase']) || 1;
    this.phaseTitle = `Фоновая запись ${this.phase}`;

    if (this.expService.isTestMode) {
      this.duration = 5;
      this.displayDuration = 10;
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.expService.logEvent(`BASELINE_PHASE_${this.phase}_START`);
  }

  startRecording() {
    this.playBeep();
    this.runEyesOpen();
  }

  async runEyesOpen() {
    this.step = 'eyes-open';
    this.remainingTime = this.duration;

    const markerCode = this.getEyesOpenMarker();
    await this.expService.logEvent('EYES_OPEN_START', { phase: this.phase }, markerCode);

    this.timerInterval = setInterval(() => {
      this.remainingTime--;
      if (this.remainingTime <= 0) {
        clearInterval(this.timerInterval);
        this.playBeep();
        this.runEyesClosed();
      }
    }, 1000);
  }

  async runEyesClosed() {
    this.step = 'eyes-closed';
    this.remainingTime = this.duration;

    const markerCode = this.getEyesClosedMarker();
    await this.expService.logEvent('EYES_CLOSED_START', { phase: this.phase }, markerCode);

    this.timerInterval = setInterval(() => {
      this.remainingTime--;
      if (this.remainingTime <= 0) {
        clearInterval(this.timerInterval);
        this.playBeep();
        this.finishBaseline();
      }
    }, 1000);
  }

  finishBaseline() {
    this.expService.logEvent(`BASELINE_PHASE_${this.phase}_FINISHED`);

    setTimeout(() => {
      if (this.phase === 1) {
        this.router.navigate(['/task'], { queryParams: { order: 1 } });
      } else if (this.phase === 2) {
        this.router.navigate(['/task'], { queryParams: { order: 2 } });
      } else if (this.phase === 3) {
        this.router.navigate(['/complete']);
      }
    }, 1000);
  }

  getEyesOpenMarker(): number {
    if (this.phase === 1) return MARKER_CODES.BASELINE_1_EYES_OPEN;
    if (this.phase === 2) return MARKER_CODES.BASELINE_2_EYES_OPEN;
    if (this.phase === 3) return MARKER_CODES.BASELINE_3_EYES_OPEN;
    return 0;
  }

  getEyesClosedMarker(): number {
    if (this.phase === 1) return MARKER_CODES.BASELINE_1_EYES_CLOSED;
    if (this.phase === 2) return MARKER_CODES.BASELINE_2_EYES_CLOSED;
    if (this.phase === 3) return MARKER_CODES.BASELINE_3_EYES_CLOSED;
    return 0;
  }

  playBeep() {
    if (!this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
