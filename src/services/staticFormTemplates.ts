/**
 * Static job application form templates.
 *
 * These mirror the exact shape returned by GET /api/v1/vendor/job-applications/form
 * and can be seeded directly to the DB. They are also used as an offline
 * fallback inside JobApplicationSheet when the API is unreachable.
 *
 * Location question logic:
 *  - Delhi NCR + 10h  → no location question
 *  - Delhi NCR + 24h  → options: दिल्ली NCR / पूरे भारत में कहीं भी
 *  - Outside NCR + 10h → options: NCR / अपने शहर में
 *  - Outside NCR + 24h → options: अपने शहर में / पूरे भारत में कहीं भी
 */

import type {
  FormQuestion,
  FormTemplateResponse,
  HoursType,
  JobCategory,
  QuestionOption,
} from './jobApplicationApi';

// ─── Delhi NCR Locations ──────────────────────────────────────────────────────

export const DELHI_NCR_LOCATIONS = [
  'faridabad',
  'gurugram',
  'gurgaon',
  'rohtak',
  'sonepat',
  'rewari',
  'jhajjhar',
  'panipat',
  'palwal',
  'bhiwani',
  'karnal',
  'meerut',
  'ghaziabad',
  'gautam-budh-nagar',
  'gautam-buddha-nagar',
  'alwar',
  'noida',
  'delhi',
  'mahendragarh',
  'kanina',
  // Hindi variants
  'फरीदाबाद',
  'गुरुग्राम',
  'गुड़गाँव',
  'रोहतक',
  'सोनीपत',
  'रेवाड़ी',
  'झज्जर',
  'पानीपत',
  'पलवल',
  'भिवानी',
  'करनाल',
  'मेरठ',
  'गाज़ियाबाद',
  'गाजियाबाद',
  'गौतमबुद्ध नगर',
  'अलवर',
  'नोएडा',
  'दिल्ली',
  'महेंद्रगढ़',
  'कनीना',
  'एनसीआर',
  'ncr',
];

export function isInDelhiNCR(address: string): boolean {
  const lower = address.toLowerCase();
  return DELHI_NCR_LOCATIONS.some(loc => lower.includes(loc));
}

// ─── Shared question builders ─────────────────────────────────────────────────

const JOB_TYPE_OPTIONS: QuestionOption[] = [
  {id: 'japa', label: 'जापा', value: 'japa'},
  {id: 'nanny', label: 'नैनी', value: 'nanny'},
  {id: 'babysitter', label: 'बेबीसिटर', value: 'babysitter'},
  {id: 'baby-maid', label: 'बेबी मेड', value: 'baby-maid'},
];

const START_TIME_OPTIONS: QuestionOption[] = [
  {id: 'immediate', label: 'तुरंत', value: 'immediate'},
  {id: '1-week', label: '1 हफ्ते में', value: '1-week'},
  {id: '15-days', label: '15 दिनों में', value: '15-days'},
  {id: '1-month', label: '1 महीने में', value: '1-month'},
];

function getLocationOptions(
  isNCR: boolean,
  hours: HoursType,
): QuestionOption[] | null {
  if (isNCR && hours === '10-hours') return null; // don't ask
  if (isNCR && hours === '24-hours') {
    return [
      {id: 'myCity', label: 'दिल्ली NCR', value: 'myCity'},
      {id: 'both', label: 'पूरे भारत में कहीं भी', value: 'both'},
    ];
  }
  if (!isNCR && hours === '10-hours') {
    return [
      {id: 'outsideCity', label: 'NCR', value: 'outsideCity'},
      {id: 'myCity', label: 'अपने शहर में', value: 'myCity'},
    ];
  }
  // Outside NCR + 24h
  return [
    {id: 'myCity', label: 'अपने शहर में', value: 'myCity'},
    {id: 'both', label: 'पूरे भारत में कहीं भी', value: 'both'},
  ];
}

const FORM_TITLE = {hi: 'आवेदन की गई नौकरी', en: 'Job Application'};
const FORM_SUBTITLE = {
  hi: '( आवेदन करने के लिए कृपया नीचे दी गई जानकारी भरें )',
  en: '( Please fill in the information below to apply )',
};

// ─── Hours-flow form (10h / 24h card) ─────────────────────────────────────────

export function getStaticForm(
  hoursType: HoursType,
  isNCR: boolean,
): FormTemplateResponse {
  const questions: FormQuestion[] = [
    {
      id: 'job_type',
      question: {hi: 'आप किस क्षेत्र में काम देख रही हैं?', en: 'What type of work are you looking for?'},
      type: 'single-select',
      required: true,
      order: 1,
      options: JOB_TYPE_OPTIONS,
    },
    {
      id: 'start_time',
      question: {hi: 'आप काम कब से शुरू कर सकती हैं?', en: 'When can you start work?'},
      type: 'single-select',
      required: true,
      order: 2,
      options: START_TIME_OPTIONS,
    },
  ];

  const locationOpts = getLocationOptions(isNCR, hoursType);
  if (locationOpts) {
    questions.push({
      id: 'work_location',
      question: {hi: 'आप कहाँ काम करना चाहती हैं?', en: 'Where do you want to work?'},
      type: 'single-select',
      required: true,
      order: 3,
      options: locationOpts,
    });
  }

  return {
    formId: `static-form-${hoursType}-v1`,
    version: 1,
    category: 'japa',
    hoursType,
    title: FORM_TITLE,
    subtitle: FORM_SUBTITLE,
    questions,
  };
}

// ─── Category-flow form (opened from job category cards) ─────────────────────

export function getStaticCategoryForm(
  category: JobCategory,
  isNCR: boolean,
): FormTemplateResponse {
  const questions: FormQuestion[] = [
    {
      id: 'work_hours',
      question: {hi: 'आपको कितने घंटे काम करना है?', en: 'How many hours do you want to work?'},
      type: 'single-select',
      required: true,
      order: 1,
      options: [
        {id: '10-hours', label: '10 घंटे', value: '10-hours'},
        {id: '24-hours', label: '24 घंटे', value: '24-hours'},
      ],
    },
    {
      id: 'start_time',
      question: {hi: 'आप काम कब से शुरू कर सकती हैं?', en: 'When can you start work?'},
      type: 'single-select',
      required: true,
      order: 2,
      options: START_TIME_OPTIONS,
    },
  ];

  if (isNCR) {
    // NCR + 10h → no location question (showWhen only matches 24h)
    questions.push({
      id: 'work_location',
      question: {hi: 'आप कहाँ काम करना चाहती हैं?', en: 'Where do you want to work?'},
      type: 'single-select',
      required: true,
      order: 3,
      showWhen: {questionId: 'work_hours', hasValue: '24-hours'},
      options: [
        {id: 'myCity', label: 'दिल्ली NCR', value: 'myCity'},
        {id: 'both', label: 'पूरे भारत में कहीं भी', value: 'both'},
      ],
    });
  } else {
    // Outside NCR + 10h
    questions.push({
      id: 'work_location',
      question: {hi: 'आप कहाँ काम करना चाहती हैं?', en: 'Where do you want to work?'},
      type: 'single-select',
      required: true,
      order: 3,
      showWhen: {questionId: 'work_hours', hasValue: '10-hours'},
      options: [
        {id: 'outsideCity', label: 'NCR', value: 'outsideCity'},
        {id: 'myCity', label: 'अपने शहर में', value: 'myCity'},
      ],
    });
    // Outside NCR + 24h
    questions.push({
      id: 'work_location',
      question: {hi: 'आप कहाँ काम करना चाहती हैं?', en: 'Where do you want to work?'},
      type: 'single-select',
      required: true,
      order: 4,
      showWhen: {questionId: 'work_hours', hasValue: '24-hours'},
      options: [
        {id: 'myCity', label: 'अपने शहर में', value: 'myCity'},
        {id: 'both', label: 'पूरे भारत में कहीं भी', value: 'both'},
      ],
    });
  }

  return {
    formId: `static-form-category-${category}-v1`,
    version: 1,
    category,
    title: FORM_TITLE,
    subtitle: FORM_SUBTITLE,
    questions,
  };
}
