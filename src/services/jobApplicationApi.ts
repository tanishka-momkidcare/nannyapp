/**
 * Job Application API Client
 *
 * Endpoints:
 *  - GET  /api/v1/vendor/job-applications/form        (no auth)
 *  - POST /api/v1/vendor/job-application/submit        (auth)
 */

import Axios from './Axios';
import {config1} from '../constants/config';

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuestionType = 'single-select' | 'multi-select' | 'text' | 'number';
export type JobCategory = 'japa' | 'nanny' | 'babysitter' | 'baby-maid';
export type HoursType = '10-hours' | '24-hours';
export type WorkLocationType = 'myCity' | 'outsideCity' | 'both';
export type ApplicationStatus = 'pending' | 'under-review' | 'approved' | 'rejected';

export interface QuestionOption {
  id: string;
  label: string;
  value?: string;
  icon?: string;
}

export interface FormQuestion {
  id: string;
  question: {hi: string; en: string};
  type: QuestionType;
  options?: QuestionOption[];
  required: boolean;
  order: number;
  showWhen?: {
    questionId: string;
    hasValue: string | string[];
  };
}

export interface FormTemplateResponse {
  formId: string;
  version: number;
  category: JobCategory;
  hoursType?: HoursType;
  title: {hi: string; en: string};
  subtitle: {hi: string; en: string};
  questions: FormQuestion[];
}

export interface QuestionAnswer {
  questionId: string;
  value: string | string[] | number;
}

/** Payload sent to POST /api/v1/vendor/job-application/submit */
export interface JobApplicationPayload {
  name: string;
  phone: string;
  email?: string;
  jobConcern: JobCategory;
  workingHourType: HoursType;
  preferredWorkStartDate?: string;
  workLocationType: WorkLocationType;
  myCity?: string;
  workLocation?: string;
}

export interface SubmitApplicationResponse {
  message: {hi: string; en: string};
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── Submit Application ───────────────────────────────────────────────────────

export async function submitJobApplication(
  payload: JobApplicationPayload,
): Promise<SubmitApplicationResponse> {
  const {data} = await Axios.post<ApiResponse<SubmitApplicationResponse>>(
    `${config1.API_HOST}/api/v1/vendor/job-application/submit`,
    payload,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message || 'Submission failed');
  }

  return data.data;
}
