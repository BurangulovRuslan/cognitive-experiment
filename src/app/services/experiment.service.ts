import { Injectable } from '@angular/core';
import { DATA_SET_A, DATA_SET_B, Question, checkAnswer } from '../data/questions';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export type ConditionType = 'LLM' | 'SEARCH';

export interface EventLog {
  eventId: number;            // стабильный порядок
  timestamp: number;
  readableTime: string;
  event: string;
  details: string;
  markerCode?: number;
  markerSent?: boolean;
}

export interface AnswerLog {
  participantId: string;
  stage: ConditionType;
  questionId: string;
  questionText: string;
  inputRaw: string;
  isCorrect: boolean;
  timestampShown: number;
  timestampSubmitted: number;
  responseTimeMs: number;
  markerShown?: number;
  markerSubmitted?: number;
  shownEventId?: number;
  submittedEventId?: number;
}

export const MARKER_CODES = {
  SESSION_START: 1,
  SESSION_END: 999,

  BASELINE_1_EYES_OPEN: 10,
  BASELINE_1_EYES_CLOSED: 11,
  BASELINE_2_EYES_OPEN: 12,
  BASELINE_2_EYES_CLOSED: 13,
  BASELINE_3_EYES_OPEN: 14,
  BASELINE_3_EYES_CLOSED: 15,

  // конец сегмента "eyes closed" (сигнал открыть глаза)
  EYES_CLOSED_END: 16,

  TASK_LLM_START: 20,
  TASK_LLM_END: 21,
  TASK_SEARCH_START: 30,
  TASK_SEARCH_END: 31,

  // базы (смещение будет зависеть от stage)
  QUESTION_SHOWN_BASE: 100,
  ANSWER_SUBMITTED_BASE: 200,

  // оффсет для SEARCH чтобы не было коллизий с LLM
  SEARCH_OFFSET: 20,

  NASA_TLX_1_START: 500,
  NASA_TLX_1_END: 501,
  NASA_TLX_2_START: 510,
  NASA_TLX_2_END: 511,

  EXPORT_START: 900
};

@Injectable({ providedIn: 'root' })
export class ExperimentService {
  participantId: string = '';
  group: number = 1;
  isTestMode: boolean = false;

  eventLog: EventLog[] = [];
  answersLog: AnswerLog[] = [];

  private nic2ServerUrl = 'http://localhost:3000';
  private nic2Enabled = true;

  // показ по каждому вопросу отдельно
  private shownAtByQuestionId = new Map<string, number>();
  private shownEventIdByQuestionId = new Map<string, number>();

  private nextEventId = 1;

  constructor() {
    this.setupEmergencyStop();
  }

  startSession(pid: string, group: number, isTest: boolean) {
    this.participantId = pid;
    this.group = group;
    this.isTestMode = isTest;

    this.eventLog = [];
    this.answersLog = [];
    this.shownAtByQuestionId.clear();
    this.shownEventIdByQuestionId.clear();
    this.nextEventId = 1;

    void this.logEvent('SESSION_START', {
      pid,
      group,
      isTest,
      systemTime: new Date().toISOString()
    }, MARKER_CODES.SESSION_START);
  }

  /**
   * ВАЖНО: eventLog пишем сразу (порядок UI),
   * отправка в NIC2 после (не ломает последовательность в Excel).
   */
  async logEvent(name: string, details: any = {}, markerCode?: number): Promise<number> {
    const timestamp = Date.now();
    const eventId = this.nextEventId++;

    const event: EventLog = {
      eventId,
      timestamp,
      readableTime: new Date(timestamp).toISOString(),
      event: name,
      details: JSON.stringify(details),
      markerCode
    };

    this.eventLog.push(event);

    if (typeof markerCode === 'number' && markerCode > 0 && this.nic2Enabled) {
      const success = await this.sendMarkerToNIC2(markerCode, name, details);
      event.markerSent = success;
    }

    return eventId;
  }

  private async sendMarkerToNIC2(code: number, name: string, details: any = {}): Promise<boolean> {
    try {
      const response = await fetch(`${this.nic2ServerUrl}/send-marker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, details })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✓ NIC2 маркер отправлен: ${code} (${name})`);
        return true;
      } else {
        console.warn(`✗ NIC2 маркер НЕ отправлен: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.warn(`✗ Ошибка отправки маркера в NIC2:`, error);
      console.warn(`  Убедитесь, что сервер запущен: npm run server`);
      return false;
    }
  }

  /** Единый расчёт маркеров вопросов (LLM vs SEARCH) */
  private getQuestionMarkerShown(stage: ConditionType, questionId: string): number {
    const qn = this.extractQuestionNumber(questionId); // 1..15
    const offset = (stage === 'SEARCH') ? MARKER_CODES.SEARCH_OFFSET : 0;
    return MARKER_CODES.QUESTION_SHOWN_BASE + offset + qn; // LLM:101.. / SEARCH:121..
  }

  private getQuestionMarkerSubmitted(stage: ConditionType, questionId: string): number {
    const qn = this.extractQuestionNumber(questionId);
    const offset = (stage === 'SEARCH') ? MARKER_CODES.SEARCH_OFFSET : 0;
    return MARKER_CODES.ANSWER_SUBMITTED_BASE + offset + qn; // LLM:201.. / SEARCH:221..
  }

  markQuestionShown(stage: ConditionType, questionId: string) {
    const shownAt = Date.now();
    this.shownAtByQuestionId.set(questionId, shownAt);

    const markerCode = this.getQuestionMarkerShown(stage, questionId);

    void this.logEvent('QUESTION_SHOWN', {
      stage,
      questionId,
      timestamp: shownAt
    }, markerCode).then((eventId) => {
      this.shownEventIdByQuestionId.set(questionId, eventId);
    });
  }

  submitAnswer(stage: ConditionType, question: Question, input: string) {
    const submittedTime = Date.now();

    const shownTime = this.shownAtByQuestionId.get(question.id) ?? submittedTime;
    const responseTime = submittedTime - shownTime;

    const isCorrect = checkAnswer(question, input);

    const markerShown = this.getQuestionMarkerShown(stage, question.id);
    const markerSubmitted = this.getQuestionMarkerSubmitted(stage, question.id);

    const shownEventId = this.shownEventIdByQuestionId.get(question.id);

    // сначала пушим answersLog, затем допишем submittedEventId когда придёт Promise
    this.answersLog.push({
      participantId: this.participantId,
      stage,
      questionId: question.id,
      questionText: question.text,
      inputRaw: input,
      isCorrect,
      timestampShown: shownTime,
      timestampSubmitted: submittedTime,
      responseTimeMs: responseTime,
      markerShown,
      markerSubmitted,
      shownEventId
    });

    void this.logEvent('ANSWER_SUBMITTED', {
      stage,
      questionId: question.id,
      correct: isCorrect,
      responseTimeMs: responseTime
    }, markerSubmitted).then((submittedEventId) => {
      const last = this.answersLog[this.answersLog.length - 1];
      if (last && last.questionId === question.id && last.timestampSubmitted === submittedTime) {
        last.submittedEventId = submittedEventId;
      }
    });

    return isCorrect;
  }

  private extractQuestionNumber(questionId: string): number {
    const match = questionId.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  getConfig() {
    const configs = {
      1: { first: 'LLM' as ConditionType, second: 'SEARCH' as ConditionType, set1: DATA_SET_A, set2: DATA_SET_B },
      2: { first: 'LLM' as ConditionType, second: 'SEARCH' as ConditionType, set1: DATA_SET_B, set2: DATA_SET_A },
      3: { first: 'SEARCH' as ConditionType, second: 'LLM' as ConditionType, set1: DATA_SET_A, set2: DATA_SET_B },
      4: { first: 'SEARCH' as ConditionType, second: 'LLM' as ConditionType, set1: DATA_SET_B, set2: DATA_SET_A },
    };
    return configs[this.group as keyof typeof configs];
  }

  exportData() {
    void this.logEvent('EXPORT_INITIATED', {}, MARKER_CODES.EXPORT_START);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    const summaryData = [{
      ParticipantID: this.participantId,
      Group: this.group,
      Date: new Date().toLocaleDateString(),
      TotalQuestions: this.answersLog.length,
      CorrectAnswers: this.answersLog.filter(a => a.isCorrect).length,
      TestMode: this.isTestMode ? 'Yes' : 'No',
      ExportTime: new Date().toISOString()
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');

    const answersData = this.answersLog.map(a => ({
      ParticipantID: a.participantId,
      Stage: a.stage,
      QuestionID: a.questionId,
      QuestionText: a.questionText.substring(0, 100) + '...',
      AnswerText: a.inputRaw,
      IsCorrect: a.isCorrect ? 'TRUE' : 'FALSE',
      ResponseTime_ms: a.responseTimeMs,
      MarkerShown: a.markerShown,
      MarkerSubmitted: a.markerSubmitted,
      TimestampShown: a.timestampShown,
      TimestampShown_Readable: new Date(a.timestampShown).toISOString(),
      TimestampSubmitted: a.timestampSubmitted,
      TimestampSubmitted_Readable: new Date(a.timestampSubmitted).toISOString(),
      ShownEventId: a.shownEventId ?? '',
      SubmittedEventId: a.submittedEventId ?? ''
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(answersData), 'Answers');

    const eventsData = this.eventLog.map(e => ({
      EventId: e.eventId,
      Timestamp: e.timestamp,
      ReadableTime: e.readableTime,
      Event: e.event,
      MarkerCode: e.markerCode || '',
      MarkerSent: e.markerSent === true ? 'YES' : e.markerSent === false ? 'NO' : '',
      Details: e.details
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eventsData), 'EventLog');

    const markerCodesData = Object.entries(MARKER_CODES).map(([name, code]) => ({
      Code: code,
      EventName: name,
      Description: this.getMarkerDescription(name)
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(markerCodesData), 'MarkerCodes');

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const fileName = `Participant_${this.participantId}_${Date.now()}.xlsx`;
    saveAs(data, fileName);

    void this.logEvent('EXPORT_COMPLETED', { fileName });
  }

  private getMarkerDescription(name: string): string {
    const descriptions: { [key: string]: string } = {
      'SESSION_START': 'Начало экспериментальной сессии',
      'SESSION_END': 'Завершение сессии',

      'BASELINE_1_EYES_OPEN': 'Baseline 1: глаза открыты',
      'BASELINE_1_EYES_CLOSED': 'Baseline 1: глаза закрыты',
      'BASELINE_2_EYES_OPEN': 'Baseline 2: глаза открыты',
      'BASELINE_2_EYES_CLOSED': 'Baseline 2: глаза закрыты',
      'BASELINE_3_EYES_OPEN': 'Baseline 3: глаза открыты',
      'BASELINE_3_EYES_CLOSED': 'Baseline 3: глаза закрыты',
      'EYES_CLOSED_END': 'Конец закрытых глаз (сигнал открыть глаза)',

      'TASK_LLM_START': 'Начало задания LLM',
      'TASK_LLM_END': 'Окончание задания LLM',
      'TASK_SEARCH_START': 'Начало задания SEARCH',
      'TASK_SEARCH_END': 'Окончание задания SEARCH',

      'QUESTION_SHOWN_BASE': 'Показ вопроса (LLM: 100+N, SEARCH: 120+N)',
      'ANSWER_SUBMITTED_BASE': 'Ответ (LLM: 200+N, SEARCH: 220+N)',
      'SEARCH_OFFSET': 'Смещение для SEARCH (+20)',

      'NASA_TLX_1_START': 'Начало NASA-TLX 1',
      'NASA_TLX_1_END': 'Конец NASA-TLX 1',
      'NASA_TLX_2_START': 'Начало NASA-TLX 2',
      'NASA_TLX_2_END': 'Конец NASA-TLX 2',

      'EXPORT_START': 'Экспорт данных'
    };
    return descriptions[name] || '';
  }

  private setupEmergencyStop() {
    if (typeof window !== 'undefined') {
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
          this.emergencyStop();
        }
      });
    }
  }

  emergencyStop() {
    void this.logEvent('EMERGENCY_STOP', { reason: 'Manual stop by experimenter' }, MARKER_CODES.SESSION_END);
    alert('Эксперимент остановлен экстренно. Данные будут сохранены.');
  }

  getStats() {
    return {
      totalAnswers: this.answersLog.length,
      correctAnswers: this.answersLog.filter(a => a.isCorrect).length,
      averageResponseTime: this.answersLog.length > 0
        ? Math.round(this.answersLog.reduce((sum, a) => sum + a.responseTimeMs, 0) / this.answersLog.length)
        : 0
    };
  }
}
