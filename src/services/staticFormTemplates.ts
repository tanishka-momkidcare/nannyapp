/**
 * Static job application form templates.
 *
 * These mirror the exact shape returned by GET /api/v1/vendor/job-applications/form
 * and can be seeded directly to the DB. They are also used as an offline
 * fallback inside JobApplicationSheet when the API is unreachable.
 */

import type {FormTemplateResponse} from './jobApplicationApi';

// ─── 10-Hour Form ─────────────────────────────────────────────────────────────

export const FORM_10_HOURS: FormTemplateResponse = {
  formId: 'static-form-10-hours-v1',
  version: 1,
  category: 'japa',
  hoursType: '10-hours',
  title: {
    hi: 'आवेदन की गई नौकरी',
    en: 'Job Application',
  },
  subtitle: {
    hi: '( आवेदन करने के लिए कृपया नीचे दी गई जानकारी भरें )',
    en: '( Please fill in the information below to apply )',
  },
  questions: [
    {
      id: 'job_type',
      question: {
        hi: 'आप किस क्षेत्र में काम देख रही हैं?',
        en: 'What type of work are you looking for?',
      },
      type: 'multi-select',
      required: true,
      order: 1,
      options: [
        {id: 'japa',        label: 'जापा',       value: 'japa'},
        {id: 'nanny',       label: 'नैनी',       value: 'nanny'},
        {id: 'babysitter',  label: 'बेबीसिटर',  value: 'babysitter'},
        {id: 'baby-maid',   label: 'बेबी मेड',  value: 'baby-maid'},
      ],
    },
    {
      id: 'start_time',
      question: {
        hi: 'आप काम कब से शुरू कर सकती हैं?',
        en: 'When can you start work?',
      },
      type: 'single-select',
      required: true,
      order: 2,
      options: [
        {id: 'immediate', label: 'तुरंत',       value: 'immediate'},
        {id: '1-week',    label: '1 हफ्ते में', value: '1-week'},
        {id: '15-days',   label: '15 दिनों में', value: '15-days'},
        {id: '1-month',   label: '1 महीने में', value: '1-month'},
      ],
    },
    {
      id: 'work_location',
      question: {
        hi: 'आप कहाँ काम करना चाहती हैं?',
        en: 'Where do you want to work?',
      },
      type: 'single-select',
      required: true,
      order: 3,
      options: [
        {id: 'delhi-ncr',    label: 'दिल्ली NCR',              value: 'delhi-ncr'},
        {id: 'outside-ncr',  label: 'दिल्ली NCR के बाहर',     value: 'outside-ncr'},
      ],
    },
    {
      id: 'salary_expectation',
      question: {
        hi: 'आप कितनी सैलरी की उम्मीद रखती हैं? (₹/माह)',
        en: 'What is your salary expectation? (₹/month)',
      },
      type: 'single-select',
      required: true,
      order: 4,
      options: [
        {id: '8k-10k',   label: '₹8,000 – ₹10,000',   value: '8k-10k'},
        {id: '10k-12k',  label: '₹10,000 – ₹12,000',  value: '10k-12k'},
        {id: '12k-15k',  label: '₹12,000 – ₹15,000',  value: '12k-15k'},
        {id: '15k-plus', label: '₹15,000 से अधिक',     value: '15k-plus'},
      ],
    },
    {
      id: 'experience',
      question: {
        hi: 'आपका अनुभव कितने साल का है?',
        en: 'How many years of experience do you have?',
      },
      type: 'single-select',
      required: true,
      order: 5,
      options: [
        {id: 'fresher',  label: 'कोई अनुभव नहीं', value: 'fresher'},
        {id: '1-2yr',    label: '1-2 साल',         value: '1-2yr'},
        {id: '3-5yr',    label: '3-5 साल',         value: '3-5yr'},
        {id: '5yr-plus', label: '5 साल से अधिक',  value: '5yr-plus'},
      ],
    },
    {
      id: 'accommodation',
      question: {
        hi: 'क्या आप रहने की सुविधा चाहती हैं?',
        en: 'Do you need accommodation?',
      },
      type: 'single-select',
      required: false,
      order: 6,
      options: [
        {id: 'live-in',  label: 'हाँ, रहना चाहूँगी',   value: 'live-in'},
        {id: 'live-out', label: 'नहीं, घर से आऊँगी',   value: 'live-out'},
      ],
    },
  ],
};

// ─── 24-Hour Form ─────────────────────────────────────────────────────────────

export const FORM_24_HOURS: FormTemplateResponse = {
  formId: 'static-form-24-hours-v1',
  version: 1,
  category: 'japa',
  hoursType: '24-hours',
  title: {
    hi: 'आवेदन की गई नौकरी',
    en: 'Job Application',
  },
  subtitle: {
    hi: '( आवेदन करने के लिए कृपया नीचे दी गई जानकारी भरें )',
    en: '( Please fill in the information below to apply )',
  },
  questions: [
    {
      id: 'job_type',
      question: {
        hi: 'आप किस क्षेत्र में काम देख रही हैं?',
        en: 'What type of work are you looking for?',
      },
      type: 'multi-select',
      required: true,
      order: 1,
      options: [
        {id: 'japa',        label: 'जापा',       value: 'japa'},
        {id: 'nanny',       label: 'नैनी',       value: 'nanny'},
        {id: 'babysitter',  label: 'बेबीसिटर',  value: 'babysitter'},
        {id: 'baby-maid',   label: 'बेबी मेड',  value: 'baby-maid'},
      ],
    },
    {
      id: 'start_time',
      question: {
        hi: 'आप काम कब से शुरू कर सकती हैं?',
        en: 'When can you start work?',
      },
      type: 'single-select',
      required: true,
      order: 2,
      options: [
        {id: 'immediate', label: 'तुरंत',        value: 'immediate'},
        {id: '1-week',    label: '1 हफ्ते में',  value: '1-week'},
        {id: '15-days',   label: '15 दिनों में', value: '15-days'},
        {id: '1-month',   label: '1 महीने में',  value: '1-month'},
      ],
    },
    {
      id: 'work_location',
      question: {
        hi: 'आप कहाँ काम करना चाहती हैं?',
        en: 'Where do you want to work?',
      },
      type: 'single-select',
      required: true,
      order: 3,
      options: [
        {id: 'delhi-ncr',    label: 'दिल्ली NCR',          value: 'delhi-ncr'},
        {id: 'outside-ncr',  label: 'दिल्ली NCR के बाहर', value: 'outside-ncr'},
      ],
    },
    {
      id: 'salary_expectation',
      question: {
        hi: 'आप कितनी सैलरी की उम्मीद रखती हैं? (₹/माह)',
        en: 'What is your salary expectation? (₹/month)',
      },
      type: 'single-select',
      required: true,
      order: 4,
      options: [
        {id: '12k-15k',  label: '₹12,000 – ₹15,000', value: '12k-15k'},
        {id: '15k-18k',  label: '₹15,000 – ₹18,000', value: '15k-18k'},
        {id: '18k-22k',  label: '₹18,000 – ₹22,000', value: '18k-22k'},
        {id: '22k-plus', label: '₹22,000 से अधिक',   value: '22k-plus'},
      ],
    },
    {
      id: 'experience',
      question: {
        hi: 'आपका अनुभव कितने साल का है?',
        en: 'How many years of experience do you have?',
      },
      type: 'single-select',
      required: true,
      order: 5,
      options: [
        {id: 'fresher',  label: 'कोई अनुभव नहीं', value: 'fresher'},
        {id: '1-2yr',    label: '1-2 साल',         value: '1-2yr'},
        {id: '3-5yr',    label: '3-5 साल',         value: '3-5yr'},
        {id: '5yr-plus', label: '5 साल से अधिक',  value: '5yr-plus'},
      ],
    },
    {
      id: 'infant_care',
      question: {
        hi: 'क्या आपने नवजात शिशु की देखभाल की है?',
        en: 'Have you cared for a newborn baby?',
      },
      type: 'single-select',
      required: false,
      order: 6,
      options: [
        {id: 'yes',       label: 'हाँ',             value: 'yes'},
        {id: 'no',        label: 'नहीं',             value: 'no'},
        {id: 'training',  label: 'ट्रेनिंग ली है',  value: 'training'},
      ],
    },
    {
      id: 'special_skills',
      question: {
        hi: 'आपके पास कौन सी विशेष skills हैं? (सभी चुनें)',
        en: 'What special skills do you have? (select all that apply)',
      },
      type: 'multi-select',
      required: false,
      order: 7,
      options: [
        {id: 'cooking',    label: 'खाना बनाना',      value: 'cooking'},
        {id: 'massage',    label: 'मालिश करना',      value: 'massage'},
        {id: 'first-aid',  label: 'प्राथमिक चिकित्सा', value: 'first-aid'},
        {id: 'english',    label: 'अंग्रेज़ी',         value: 'english'},
      ],
    },
  ],
};

// ─── Lookup helper ────────────────────────────────────────────────────────────

export function getStaticForm(
  hoursType: '10-hours' | '24-hours',
): FormTemplateResponse {
  return hoursType === '24-hours' ? FORM_24_HOURS : FORM_10_HOURS;
}
