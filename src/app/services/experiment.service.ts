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
}

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

  constructor() {
    this.setupEmergencyStop();
  }

  startSession(pid: string, group: number, isTest: boolean) {
    this.participantId = pid;
    this.group = group;
    this.isTestMode = isTest;
    this.eventLog = [];
    this.answersLog = [];
    this.logEvent('SESSION_START', { pid, group, isTest, systemTime: new Date().toISOString() });
  }

  logEvent(name: string, details: any = {}) {
    this.eventLog.push({
      timestamp: Date.now(),
      readableTime: new Date().toISOString(),
      event: name,
      details: JSON.stringify(details)
    });
  }

  markQuestionShown(questionId: string) {
    this.questionShownTime = Date.now();
    this.logEvent('QUESTION_SHOWN', { questionId, timestamp: this.questionShownTime });
  }

  submitAnswer(stage: ConditionType, question: Question, input: string) {
    const submittedTime = Date.now();
    const responseTime = submittedTime - this.questionShownTime;
    const isCorrect = checkAnswer(question, input);

    this.answersLog.push({
      participantId: this.participantId,
      stage: stage,
      questionId: question.id,
      questionText: question.text,
      inputRaw: input,
      isCorrect: isCorrect,
      timestampShown: this.questionShownTime,
      timestampSubmitted: submittedTime,
      responseTimeMs: responseTime
    });

    this.logEvent('ANSWER_SUBMITTED', { 
      questionId: question.id, 
      correct: isCorrect,
      responseTimeMs: responseTime 
    });

    return isCorrect;
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
    this.logEvent('EXPORT_INITIATED');

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
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const answersData = this.answersLog.map(a => ({
      ParticipantID: a.participantId,
      Stage: a.stage,
      QuestionID: a.questionId,
      QuestionText: a.questionText.substring(0, 100) + '...',
      AnswerText: a.inputRaw,
      IsCorrect: a.isCorrect ? 'TRUE' : 'FALSE',
      ResponseTime_ms: a.responseTimeMs,
      TimestampShown: a.timestampShown,
      TimestampShown_Readable: new Date(a.timestampShown).toISOString(),
      TimestampSubmitted: a.timestampSubmitted,
      TimestampSubmitted_Readable: new Date(a.timestampSubmitted).toISOString()
    }));
    const wsAnswers = XLSX.utils.json_to_sheet(answersData);
    XLSX.utils.book_append_sheet(wb, wsAnswers, 'Answers');

    const eventsData = this.eventLog.map(e => ({
      Timestamp: e.timestamp,
      ReadableTime: e.readableTime,
      Event: e.event,
      Details: e.details
    }));
    const wsEvents = XLSX.utils.json_to_sheet(eventsData);
    XLSX.utils.book_append_sheet(wb, wsEvents, 'EventLog');

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    const fileName = `Participant_${this.participantId}_${Date.now()}.xlsx`;
    saveAs(data, fileName);

    this.logEvent('EXPORT_COMPLETED', { fileName });
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
    this.logEvent('EMERGENCY_STOP', { reason: 'Manual stop by experimenter' });
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