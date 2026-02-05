import { Injectable } from '@angular/core';
import { DATA_SET_A, DATA_SET_B, Question, checkAnswer } from '../data/questions';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export type ConditionType = 'LLM' | 'SEARCH';

export interface EventLog {
  timestamp: number;
  readableTime: string;
  event: string;
  details: string;
  markerCode?: number; // Код маркера для NIC2
  markerSent?: boolean; // Успешно отправлен в NIC2
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
}

// Коды маркеров для NIC2
export const MARKER_CODES = {
  // Системные события
  SESSION_START: 1,
  SESSION_END: 999,

  // Baseline (фоновая активность)
  BASELINE_1_EYES_OPEN: 10,
  BASELINE_1_EYES_CLOSED: 11,
  BASELINE_2_EYES_OPEN: 12,
  BASELINE_2_EYES_CLOSED: 13,
  BASELINE_3_EYES_OPEN: 14,
  BASELINE_3_EYES_CLOSED: 15,

  // Задания
  TASK_LLM_START: 20,
  TASK_LLM_END: 21,
  TASK_SEARCH_START: 30,
  TASK_SEARCH_END: 31,

  // Вопросы (100-199 - показ, 200-299 - ответ)
  QUESTION_SHOWN_BASE: 100,
  ANSWER_SUBMITTED_BASE: 200,

  // NASA-TLX
  NASA_TLX_1_START: 500,
  NASA_TLX_1_END: 501,
  NASA_TLX_2_START: 510,
  NASA_TLX_2_END: 511,

  // Экспорт
  EXPORT_START: 900
};

@Injectable({
  providedIn: 'root'
})
export class ExperimentService {
  participantId: string = '';
  group: number = 1;
  isTestMode: boolean = false;

  eventLog: EventLog[] = [];
  answersLog: AnswerLog[] = [];

  private questionShownTime: number = 0;
  private nic2ServerUrl = 'http://localhost:3000'; // Адрес сервера-моста
  private nic2Enabled = true; // Включить/выключить отправку маркеров

  constructor() {
    this.setupEmergencyStop();
  }

  startSession(pid: string, group: number, isTest: boolean) {
    this.participantId = pid;
    this.group = group;
    this.isTestMode = isTest;
    this.eventLog = [];
    this.answersLog = [];

    this.logEvent('SESSION_START', { 
      pid, 
      group, 
      isTest, 
      systemTime: new Date().toISOString() 
    }, MARKER_CODES.SESSION_START);
  }

  // ✅ ИСПРАВЛЕННЫЙ МЕТОД - БЕЗ async/await
  logEvent(name: string, details: any = {}, markerCode?: number) {
    const timestamp = Date.now();
    const event: EventLog = {
      timestamp: timestamp,
      readableTime: new Date().toISOString(),
      event: name,
      details: JSON.stringify(details),
      markerCode: markerCode
    };

    // Отправляем маркер в NIC2 (если указан код) - БЕЗ AWAIT!
    if (markerCode !== undefined && this.nic2Enabled) {
      this.sendMarkerToNIC2(markerCode, name, details).then(success => {
        event.markerSent = success;
      }).catch(err => {
        event.markerSent = false;
        console.warn('Маркер не отправлен в NIC2:', err);
      });
    }

    this.eventLog.push(event);
  }

  public async sendMarkerToNIC2(code: number, name: string, details: any = {}): Promise<boolean> {
    try {
      const response = await fetch(`${this.nic2ServerUrl}/send-marker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          name: name,
          details: details
        })
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

  markQuestionShown(questionId: string) {
    this.questionShownTime = Date.now();

    // Вычисляем код маркера: QUESTION_SHOWN_BASE + номер вопроса
    const questionNumber = this.extractQuestionNumber(questionId);
    const markerCode = MARKER_CODES.QUESTION_SHOWN_BASE + questionNumber;

    this.logEvent('QUESTION_SHOWN', { 
      questionId, 
      timestamp: this.questionShownTime 
    }, markerCode);
  }

  submitAnswer(stage: ConditionType, question: Question, input: string) {
    const submittedTime = Date.now();
    const responseTime = submittedTime - this.questionShownTime;
    const isCorrect = checkAnswer(question, input);

    const questionNumber = this.extractQuestionNumber(question.id);
    const markerShown = MARKER_CODES.QUESTION_SHOWN_BASE + questionNumber;
    const markerSubmitted = MARKER_CODES.ANSWER_SUBMITTED_BASE + questionNumber;

    this.answersLog.push({
      participantId: this.participantId,
      stage: stage,
      questionId: question.id,
      questionText: question.text,
      inputRaw: input,
      isCorrect: isCorrect,
      timestampShown: this.questionShownTime,
      timestampSubmitted: submittedTime,
      responseTimeMs: responseTime,
      markerShown: markerShown,
      markerSubmitted: markerSubmitted
    });

    this.logEvent('ANSWER_SUBMITTED', { 
      questionId: question.id, 
      correct: isCorrect,
      responseTimeMs: responseTime 
    }, markerSubmitted);

    return isCorrect;
  }

  // Извлекаем номер вопроса из ID (A01 -> 1, B15 -> 15)
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
    this.logEvent('EXPORT_INITIATED', {}, MARKER_CODES.EXPORT_START);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    // Summary
    const summaryData = [{
      ParticipantID: this.participantId,
      Group: this.group,
      Date: new Date().toLocaleDateString(),
      TotalQuestions: this.answersLog.length,
      CorrectAnswers: this.answersLog.filter(a => a.isCorrect).length,
      TestMode: this.isTestMode ? 'Yes' : 'No',
      ExportTime: new Date().toISOString()
    }];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Answers
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
      TimestampSubmitted_Readable: new Date(a.timestampSubmitted).toISOString()
    }));
    const wsAnswers = XLSX.utils.json_to_sheet(answersData);
    XLSX.utils.book_append_sheet(wb, wsAnswers, 'Answers');

    // EventLog с маркерами
    const eventsData = this.eventLog.map(e => ({
      Timestamp: e.timestamp,
      ReadableTime: e.readableTime,
      Event: e.event,
      MarkerCode: e.markerCode || '',
      MarkerSent: e.markerSent === true ? 'YES' : e.markerSent === false ? 'NO' : '',
      Details: e.details
    }));
    const wsEvents = XLSX.utils.json_to_sheet(eventsData);
    XLSX.utils.book_append_sheet(wb, wsEvents, 'EventLog');

    // Marker Codes Reference
    const markerCodesData = Object.entries(MARKER_CODES).map(([name, code]) => ({
      Code: code,
      EventName: name,
      Description: this.getMarkerDescription(name)
    }));
    const wsMarkerCodes = XLSX.utils.json_to_sheet(markerCodesData);
    XLSX.utils.book_append_sheet(wb, wsMarkerCodes, 'MarkerCodes');

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    const fileName = `Participant_${this.participantId}_${Date.now()}.xlsx`;
    saveAs(data, fileName);

    this.logEvent('EXPORT_COMPLETED', { fileName });
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
      'TASK_LLM_START': 'Начало задания с LLM (ChatGPT)',
      'TASK_LLM_END': 'Окончание задания с LLM',
      'TASK_SEARCH_START': 'Начало задания с поиском (Google)',
      'TASK_SEARCH_END': 'Окончание задания с поиском',
      'QUESTION_SHOWN_BASE': 'Показ вопроса (100 + номер)',
      'ANSWER_SUBMITTED_BASE': 'Ответ отправлен (200 + номер)',
      'NASA_TLX_1_START': 'Начало NASA-TLX опросника 1',
      'NASA_TLX_1_END': 'Конец NASA-TLX опросника 1',
      'NASA_TLX_2_START': 'Начало NASA-TLX опросника 2',
      'NASA_TLX_2_END': 'Конец NASA-TLX опросника 2',
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
    this.logEvent('EMERGENCY_STOP', { reason: 'Manual stop by experimenter' }, MARKER_CODES.SESSION_END);
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
