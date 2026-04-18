/**
 * Job Application API Client
 *
 * Endpoints:
 *  - GET  /api/v1/vendor/job-applications/form     (no auth)
 *  - POST /api/v1/vendor/job-applications/submit   (auth)
 */

import Axios from './Axios';
import {config1} from '../constants/config';

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuestionType = 'single-select' | 'multi-select' | 'text' | 'number';
export type JobCategory = 'japa' | 'nanny' | 'babysitter' | 'baby-maid';
export type HoursType = '10-hours' | '24-hours';
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

export interface SubmitApplicationResponse {
  applicationId: string;
  status: 'pending';
  message: {hi: string; en: string};
  submittedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── Get Form Template ────────────────────────────────────────────────────────

export async function getFormTemplate(
  category: JobCategory,
  hoursType?: HoursType,
): Promise<FormTemplateResponse> {
  const params = new URLSearchParams({category});
  if (hoursType) params.append('hoursType', hoursType);

  const {data} = await Axios.get<ApiResponse<FormTemplateResponse>>(
    `${config1.API_HOST}/api/v1/vendor/job-applications/form?${params}`,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to load form');
  }

  return data.data;
}

// ─── Submit Application ───────────────────────────────────────────────────────

export async function submitApplication(
  formId: string,
  category: JobCategory,
  answers: QuestionAnswer[],
  hoursType?: HoursType,
): Promise<SubmitApplicationResponse> {
  const {data} = await Axios.post<ApiResponse<SubmitApplicationResponse>>(
    `${config1.API_HOST}/api/v1/vendor/job-applications/submit`,
    {formId, category, hoursType, answers},
  );

  if (!data.success || !data.data) {
    throw new Error(data.message || 'Submission failed');
  }

  return data.data;
}
