/**
 * PatientPay Ambulatory Practice Financial Resiliency Assessment
 * CORE ENGINE - Version 2.0
 *
 * This file contains all business logic, calculations, and data.
 * It is UI-agnostic and can be used with any presentation layer.
 *
 * Strategic Narrative:
 *   "You can't control rising costs, shifting regulations, or insurance trends.
 *    But you CAN control how resilient your practice is. See where you stand."
 *
 * Three Scoring Pillars:
 *   0 = Revenue Cycle Resilience    (operational efficiency, cash flow, solvency)
 *   1 = Patient Payment Experience   (convenience, clarity, satisfaction)
 *   2 = Competitive Position         (reputation, differentiation, retention)
 *
 * Six Ambulatory Segments:
 *   PP = Physician Practice / Primary Care
 *   PT = Physical Therapy / Rehab
 *   BH = Behavioral / Mental Health
 *   UC = Urgent Care
 *   ASC = Ambulatory Surgery Center
 *   FC = Fertility Clinic
 *
 * Question Flow Architecture (4 Acts):
 *   Act 1: "The Financial Picture" — establish pain (D1, D2, D3, Q1, Q2, Q3)
 *   Act 2: "How You're Solving It"  — reveal gaps (Q4, Q5, Q6+conditionals, Q7, Q8)
 *   Act 3: "Competitive Impact"     — external consequence (Q9)
 *   Act 4: "Your Specialty"         — segment-specific (1-2 per segment)
 *
 * Built for: index.html React 18 / Babel presentation layer
 */

// ============================================
// PRACTICE TYPES (SEGMENT ROUTING)
// ============================================
const PracticeTypes = {
  PP: {
    id: 'PP',
    label: 'Physician Practice / Primary Care',
    description: 'Family medicine, internal medicine, pediatrics, or multi-specialty group practice',
    categoryWeights: [0.40, 0.35, 0.25],
    characteristics: {
      payerMix: '70% commercial / 25% Medicare / 5% self-pay',
      arDaysRange: '30-40 days optimal, <50 acceptable',
      collectionRate: '95% minimum, 97-99% optimal',
      badDebt: '<3% of expected collections',
      keyFocus: 'AR days reduction, payment flexibility, patient retention'
    }
  },
  PT: {
    id: 'PT',
    label: 'Physical Therapy / Rehab',
    description: 'Outpatient physical therapy, occupational therapy, or rehabilitation clinic',
    categoryWeights: [0.40, 0.35, 0.25],
    characteristics: {
      payerMix: '60% commercial / 30% Medicare / 10% self-pay',
      arDaysRange: '<35 days optimal, ~20 in EDI-mandated states',
      collectionRate: '95%+ net collection rate',
      agedAR: '<25% over 120 days',
      copayCollection: '90%+ at date of service',
      keyFocus: 'Copay collection per visit, recurring visit billing, HDHP management'
    }
  },
  BH: {
    id: 'BH',
    label: 'Behavioral / Mental Health',
    description: 'Psychiatry, psychology, counseling, substance abuse treatment, or behavioral health practice',
    categoryWeights: [0.35, 0.40, 0.25],
    characteristics: {
      payerMix: '50% commercial / 20% Medicare-Medicaid / 30% self-pay',
      arDaysRange: '65-75 days average (up from 50-55), <30 optimal',
      noShowRate: '20-30% (higher than other specialties)',
      cashPayPct: '30-40% operate cash-pay only',
      keyFocus: 'High AR days, cost barrier reduction, no-show management'
    }
  },
  UC: {
    id: 'UC',
    label: 'Urgent Care',
    description: 'Walk-in urgent care clinic or freestanding emergency center',
    categoryWeights: [0.40, 0.35, 0.25],
    characteristics: {
      payerMix: '55% commercial / 20% Medicare-Medicaid / 25% self-pay',
      arDaysRange: '<25 days optimal for self-pay, <40 for insurance',
      selfPayPct: '15-25% (higher than primary care)',
      posCollection: '70-85% of patient responsibility at time of service',
      keyFocus: 'Point-of-service collection, self-pay management, high volume throughput'
    }
  },
  ASC: {
    id: 'ASC',
    label: 'Ambulatory Surgery Center',
    description: 'Outpatient surgical center performing same-day procedures',
    categoryWeights: [0.40, 0.30, 0.30],
    characteristics: {
      payerMix: '65% commercial / 30% Medicare / 5% self-pay',
      arDaysRange: '15-20 days Medicare, 21-45 days commercial',
      revenuePerCase: '$1,500-$3,000 net per case',
      forProfit: '95.3% are for-profit',
      keyFocus: 'Upfront collection, high-value balances, pre-procedure financial clearance'
    }
  },
  FC: {
    id: 'FC',
    label: 'Fertility Clinic',
    description: 'Reproductive endocrinology, IVF, egg freezing, or fertility treatment center',
    categoryWeights: [0.35, 0.40, 0.25],
    characteristics: {
      payerMix: '25% insured / 75% self-pay or partial coverage',
      arDaysRange: '<30 days optimal (pre-collection model)',
      avgCycleCost: '$15,000-$30,000 per IVF cycle',
      avgCyclesNeeded: '2.5 cycles for pregnancy',
      financialStress: '70%+ patients report financial stress',
      keyFocus: 'High-value payment plans, financing clarity, upfront collections'
    }
  }
};

// ============================================
// BRAND COLORS (shared across all UIs)
// ============================================
const AssessmentColors = {
  primary: '#072140',
  secondary: '#3c8fc7',
  accent: '#fcc93b',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  neutral: '#6B7280',
  lightBg: '#F0F7FF',
  white: '#FFFFFF',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

// ============================================
// CATEGORY NAMES
// ============================================
const CategoryNames = [
  'Revenue Cycle Resilience',
  'Patient Payment Experience',
  'Competitive Position'
];

/**
 * Get category name for a segment (all segments use same 3 categories)
 */
function getCategoryName(categoryIndex, segment) {
  return CategoryNames[categoryIndex] || 'Unknown';
}

// ============================================
// INDUSTRY STATISTICS (from 288-row CSV benchmarking)
// ============================================
const IndustryStats = {
  // Patient behavior & expectations
  patientsWhoWouldSwitch: 56,         // % who would switch after poor billing
  youngPatientsWhoWouldSwitch: 74,    // % under 26 who would switch
  patientsAlreadySwitched: 38,        // % who have already switched providers over billing
  patientsSayBillingImportant: 94,    // % say billing important for return decision
  patientsMissBillsDueToComplexity: 37,
  patientsWantPaymentPlans: 77,
  patientsCantAffordLumpSum: 60,      // % can't afford surprise bill >$500
  patientsPreferDigitalPayments: 92,
  patientsWantRetailConvenience: 73,

  // HDHP trends
  hdhpEnrollmentCurrent: 33,          // % of workers on HDHPs
  hdhpEnrollmentPrior: 27,            // prior year
  hdhpGrowthRate: 0.22,              // YoY growth
  averageDeductible: 1886,

  // AR & Collections
  avgDaysToCollect: 45,              // industry average
  providersTaking30PlusDays: 71,     // % taking 30+ days
  patientCollectionRate: 24,         // cents on the dollar average
  posCollectionGrowth: 13.1,         // YoY %

  // Bad debt
  badDebtIncrease: 14,               // % increase YoY
  badDebtFromInsured: 58,            // % of bad debt from insured patients
  badDebtInsuredIncrease: '5x',      // increase factor

  // Digital & Text
  textOpenRate: 98,                  // % within 90 seconds
  textToPayEngagement: 60,           // PatientPay specific
  portalAdoptionRate: 25,            // industry average
  mobilePaymentRate: 70,             // % of PatientPay transactions on mobile
  paperStatementCost: 4,             // $ per statement

  // Denial & claims
  initialDenialRate: 11.8,
  denialAppealRate: 1,               // % of denials actually appealed
  denialAppealSuccessRate: 54,

  // Costs
  laborCostPct: 84,                  // % of practice expenses
  operatingCostIncrease: 11.1,       // % increase 2025
  avgBillingCallCost: 10,            // $ per billing confusion call
  avgBreachCost: 9800000,            // $ average healthcare breach
  creditCardFeeRate: 0.03,           // 3% average

  // Payment preferences
  preferCreditCard: 45.75,
  preferDebit: 38.75,
  preferCheck: 2.25,

  // Provider challenges
  providersStruggling: 68,           // % struggling with flexible payment
  providersPrioritizeBilling: 80,    // % identify updating billing as priority
  medicalGroupsRisingCosts: 90,      // % reporting rising costs
};

// ============================================
// INDUSTRY BENCHMARKS (scoring benchmarks for gap analysis)
// UI expects: .overall, .label, .operations, .family, .competitive
// ============================================
const IndustryBenchmarks = {
  PP: {
    label: 'Physician Practice',
    overall: 55,
    operations: 55,    // Revenue Cycle Resilience benchmark
    family: 50,        // Patient Payment Experience benchmark
    competitive: 50,   // Competitive Position benchmark
    arDays: 38,
    collectionRate: 0.96,
    badDebt: 0.03,
  },
  PT: {
    label: 'Physical Therapy',
    overall: 52,
    operations: 55,
    family: 48,
    competitive: 48,
    arDays: 30,
    collectionRate: 0.95,
    badDebt: 0.035,
  },
  BH: {
    label: 'Behavioral Health',
    overall: 42,
    operations: 40,
    family: 42,
    competitive: 40,
    arDays: 65,
    collectionRate: 0.88,
    badDebt: 0.05,
  },
  UC: {
    label: 'Urgent Care',
    overall: 55,
    operations: 58,
    family: 50,
    competitive: 50,
    arDays: 28,
    collectionRate: 0.94,
    badDebt: 0.04,
  },
  ASC: {
    label: 'Surgery Center',
    overall: 58,
    operations: 60,
    family: 52,
    competitive: 55,
    arDays: 25,
    collectionRate: 0.97,
    badDebt: 0.025,
  },
  FC: {
    label: 'Fertility Clinic',
    overall: 50,
    operations: 48,
    family: 50,
    competitive: 48,
    arDays: 30,
    collectionRate: 0.90,
    badDebt: 0.04,
  }
};

// ============================================
// SOURCE CITATIONS
// ============================================
const SourceCitations = [
  { id: 1, label: 'Experian Health', url: 'https://www.experian.com/healthcare/', year: 2024 },
  { id: 2, label: 'MGMA', url: 'https://www.mgma.com/', year: 2024 },
  { id: 3, label: 'Becker\'s Hospital Review', url: 'https://www.beckershospitalreview.com/', year: 2024 },
  { id: 4, label: 'Kaiser Family Foundation', url: 'https://www.kff.org/', year: 2025 },
  { id: 5, label: 'HFMA', url: 'https://www.hfma.org/', year: 2024 },
  { id: 6, label: 'McKinsey & Company', url: 'https://www.mckinsey.com/', year: 2024 },
  { id: 7, label: 'JPMorgan Health', url: 'https://www.jpmorgan.com/', year: 2024 },
  { id: 8, label: 'PatientPay Client Data', url: 'https://www.patientpay.com/', year: 2025 },
  { id: 9, label: 'Change Healthcare', url: 'https://www.changehealthcare.com/', year: 2024 },
  { id: 10, label: 'Waystar', url: 'https://www.waystar.com/', year: 2024 },
  { id: 11, label: 'Crowe RCA', url: 'https://www.crowe.com/', year: 2024 },
];


// ============================================
// QUESTIONS — Compressed 4-Act Flow
// ============================================
// Category indices: 0 = Revenue Cycle Resilience, 1 = Patient Payment Experience, 2 = Competitive Position
const Questions = [

  // ══════════════════════════════════════════
  // ACT 1: THE FINANCIAL PICTURE
  // "Here's your financial reality"
  // ══════════════════════════════════════════

  // D1: Patient Revenue at Risk (currency slider — all segments)
  {
    id: 'monthly_patient_billing',
    text: 'Approximately how much patient responsibility are you billing each month?',
    helpText: 'After insurance pays their share, this is the amount your practice has to work to collect directly from patients — copays, deductibles, coinsurance, and self-pay balances.',
    type: 'currency',
    isDiagnostic: true,
    categoryIndex: null,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    min: 5000,
    max: 500000,
    step: 5000,
    default: 75000,
    industryContext: 'This is the revenue that depends entirely on your patients paying you. We\'ll use this to calculate your financial opportunity.',
  },

  // D2: Time to Get Paid (slider — all segments)
  {
    id: 'patient_ar_days',
    text: 'How long does it take to actually get paid by patients?',
    helpText: 'From when a patient balance is created to when payment hits your account. Every extra day is cash sitting in someone else\'s pocket.',
    type: 'slider',
    isDiagnostic: true,
    categoryIndex: null,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    min: 10,
    max: 120,
    step: 1,
    defaultValue: 45,
    unit: ' days',
    benchmarks: {
      PP: { optimal: 35, label: 'Optimal: <35 days' },
      PT: { optimal: 25, label: 'Optimal: <25 days' },
      BH: { optimal: 30, label: 'Optimal: <30 days' },
      UC: { optimal: 25, label: 'Optimal: <25 days' },
      ASC: { optimal: 25, label: 'Optimal: <25 days' },
      FC: { optimal: 30, label: 'Optimal: <30 days' },
    },
    industryContext: '71% of providers take 30+ days to collect after a patient encounter. Every day in AR is cash not in your account.',
  },

  // D3: HDHP Exposure (slider — all segments)
  {
    id: 'hdhp_percentage',
    text: 'What percentage of your patients are on high-deductible health plans?',
    helpText: 'HDHP patients owe significantly more out-of-pocket. This means more of your revenue depends on patients paying you directly — and this number is growing every year.',
    type: 'slider',
    isDiagnostic: true,
    categoryIndex: null,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    min: 0,
    max: 80,
    step: 5,
    defaultValue: 30,
    unit: '%',
    industryContext: 'HDHP enrollment jumped from 27% to 33% in one year. Average deductible is now $1,886. More of your revenue comes from patient wallets every year.',
  },

  // Q1: Billing Staff Burden (single — all segments)
  {
    id: 'billing_staff_burden',
    text: 'How many staff members spend significant time on patient billing — chasing payments, answering billing questions, posting payments, managing plans?',
    helpText: 'Count anyone who spends more than a quarter of their time on billing-related work.',
    type: 'single',
    categoryIndex: 0,
    categoryWeights: [0.70, 0.30],
    crossCategory: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    options: [
      { value: '3_plus', label: '3 or more — multiple people spend most of their day on billing tasks', score: 10 },
      { value: '1_2_dedicated', label: '1-2 dedicated billing staff whose primary job is patient collections', score: 30 },
      { value: 'part_of_roles', label: 'Part of other roles — billing is folded into front desk and admin duties', score: 55 },
      { value: 'minimal_automated', label: 'Minimal — billing mostly runs itself, staff focuses on patient care', score: 90 },
    ],
    industryContext: 'Labor represents up to 84% of practice expenses, and operating costs rose 11% last year. Every hour spent chasing payments is an hour not spent on patient care.',
  },

  // Q2: Bad Debt + Collection Process (MERGED — single — all segments)
  {
    id: 'unpaid_and_bad_debt',
    text: 'When a patient balance goes unpaid, what happens — and how much do you ultimately write off?',
    helpText: 'This is where patient revenue either gets recovered or becomes bad debt.',
    type: 'single',
    categoryIndex: 0,
    categoryWeights: [0.65, 0.35],
    crossCategory: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    options: [
      { value: 'write_off_high', label: 'Send more statements, write off most of it — bad debt over 5%', score: 10 },
      { value: 'chase_manual', label: 'Staff calls and follows up — we recover some but write-offs are 3-5%', score: 30 },
      { value: 'collections_agency', label: 'Internal efforts first, then collections agency — write-offs 2-3%', score: 45 },
      { value: 'automated_low', label: 'Automated reminders with payment plan offers catch most balances — write-offs under 2%', score: 85 },
      { value: 'not_sure', label: 'Not sure — we follow up but don\'t closely track what we lose', score: 20 },
    ],
    industryContext: 'The average practice collects just 24 cents on every dollar of patient responsibility. Bad debt jumped 14% last year — and 58% of it comes from insured patients. That\'s not a collections problem. That\'s a process problem.',
  },

  // ══════════════════════════════════════════
  // ACT 2: HOW YOU'RE SOLVING IT TODAY
  // "Here's where your process has gaps"
  // ══════════════════════════════════════════

  // Q3: How You Reach Patients (MERGED statement + communications + notifications — single — all segments)
  {
    id: 'billing_notification',
    text: 'How do patients find out they owe you money, and how quickly?',
    helpText: 'Think about the full journey from when a balance is created to when a patient sees it and can take action.',
    type: 'single',
    categoryIndex: 0,
    categoryWeights: [0.40, 0.60],
    crossCategory: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    options: [
      { value: 'paper_mailed', label: 'Paper statements mailed — patients find out weeks after service', score: 10 },
      { value: 'paper_plus_portal', label: 'Paper statements plus patient portal notifications', score: 30 },
      { value: 'email_digital', label: 'Email notifications with payment links, plus portal access', score: 55 },
      { value: 'immediate_digital', label: 'Immediate text or email the moment a balance is ready, with a link to view and pay instantly', score: 90 },
    ],
    industryContext: '98% of text messages are read within 90 seconds. Paper statements take 7-14 days to arrive and have less than a 30% open rate. The gap between when you create a bill and when a patient sees it is where revenue goes to die.',
  },

  // Q4: Bill Clarity (single — all segments)
  {
    id: 'bill_clarity',
    text: 'How clear and easy to understand are your patient bills?',
    helpText: 'Can a patient look at your bill and immediately understand what they owe, why they owe it, and how to pay?',
    type: 'single',
    categoryIndex: 1,
    categoryWeights: [0.35, 0.65],
    crossCategory: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    options: [
      { value: 'confusing', label: 'Complex — patients often call confused about charges', score: 10 },
      { value: 'basic', label: 'Standard format — shows charges and total but patients sometimes struggle', score: 35 },
      { value: 'clear', label: 'Fairly clear — itemized with descriptions, most patients understand', score: 65 },
      { value: 'excellent', label: 'Very clear — plain language, visual breakdown, easy to understand and pay', score: 95 },
    ],
    industryContext: '37% of patients have missed medical bills because the payment process was too confusing. Clear billing reduces confusion calls by 40-60% and speeds up payment significantly.',
  },

  // Q5: How Patients Can Pay (MERGED channels + types + autopay + plans — multi — all segments)
  {
    id: 'payment_options',
    text: 'When a patient is ready to pay, what options do they have?',
    helpText: 'It\'s 9pm. Your patient just opened their bill on their phone. What can they do right now?',
    type: 'multi',
    categoryIndex: 1,
    categoryWeights: [0.30, 0.70],
    crossCategory: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    maxScore: 100,
    options: [
      { value: 'front_desk', label: 'Pay at the front desk / in person', points: 10 },
      { value: 'mail_check', label: 'Mail a check', points: 5 },
      { value: 'phone', label: 'Call and pay by phone during business hours', points: 10 },
      { value: 'portal', label: 'Pay through patient portal', points: 15 },
      { value: 'text_to_pay', label: 'Click a link in a text or email and pay instantly', points: 25 },
      { value: 'mobile_wallet', label: 'Pay with mobile wallet — Apple Pay, Google Pay', points: 10 },
      { value: 'hsa_fsa', label: 'HSA/FSA cards accepted', points: 10 },
      { value: 'payment_plan', label: 'Set up a payment plan online', points: 15 },
      { value: 'autopay', label: 'Enroll in autopay — bills paid automatically', points: 20 },
    ],
    industryContext: '70% of PatientPay payments happen on mobile devices. 92% of consumers use digital payments daily. If your patients can order dinner from their phone but can\'t pay your bill — or set up autopay — that\'s a gap costing you money every month.',
  },

  // Q5a: Autopay + Plan Automation Deep Dive (CONDITIONAL — only if autopay or payment_plan selected)
  {
    id: 'autopay_plan_setup',
    text: 'You offer autopay and/or payment plans — how automated is the experience?',
    helpText: 'Think about both the patient\'s setup experience and the ongoing management by your staff.',
    type: 'single',
    categoryIndex: 1,
    categoryWeights: [0.50, 0.50],
    crossCategory: true,
    isFeatured: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    conditional: {
      questionId: 'payment_options',
      showIfIncludesAny: ['autopay', 'payment_plan'],
    },
    options: [
      { value: 'mostly_manual', label: 'Mostly manual — staff sets up plans, cards on file but not truly automatic', score: 25 },
      { value: 'semi_automated', label: 'Semi-automated — plans auto-debit but require staff to set up, OR autopay works for plans only', score: 50 },
      { value: 'fully_self_service', label: 'Fully self-service — patients enroll themselves online, everything runs automatically, staff doesn\'t touch it', score: 90 },
    ],
    autoScore: { whenHidden: true, score: 5 },
    industryContext: 'Autopay is the ultimate win-win: patients never think about bills, you get paid the moment a balance is ready. Self-service plans have 3-4x higher completion rates than manual ones.',
  },

  // Q5b: Autopay Enrollment % (CONDITIONAL — only if Q5a = fully_self_service or semi_automated)
  {
    id: 'autopay_enrollment',
    text: 'What percentage of your patients are currently enrolled in autopay?',
    helpText: 'Having autopay available and having patients enrolled are two very different things.',
    type: 'slider',
    categoryIndex: 1,
    categoryWeights: [0.50, 0.50],
    crossCategory: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    conditional: {
      questionId: 'autopay_plan_setup',
      showIfIncludesAny: ['fully_self_service', 'semi_automated'],
    },
    min: 0,
    max: 80,
    step: 5,
    defaultValue: 10,
    unit: '%',
    scoring: function(value) {
      if (value >= 50) return 95;
      if (value >= 30) return 70;
      if (value >= 15) return 45;
      return 20;
    },
    autoScore: { whenHidden: true, score: 5 },
    industryContext: 'High-performing practices achieve 40-60% autopay enrollment. Every patient on autopay has effectively 0 AR days and virtually zero bad debt for their balance.',
  },

  // Q6: Upfront Collection + Cost Transparency (MERGED — single — all segments)
  {
    id: 'upfront_collection',
    text: 'Do patients know what they\'ll owe, and do you collect before or after service?',
    helpText: 'Think about the full picture: cost estimates before the visit AND collection at time of service.',
    type: 'single',
    categoryIndex: 2,
    categoryWeights: [0.35, 0.25, 0.40],
    crossCategory: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    options: [
      { value: 'bill_after', label: 'No estimates — patients find out what they owe when the bill arrives weeks later', score: 10 },
      { value: 'copays_at_checkout', label: 'We collect copays at checkout, but deductibles and coinsurance are billed later', score: 30 },
      { value: 'verify_and_collect', label: 'We verify eligibility and collect known amounts at check-in, but don\'t always communicate costs beforehand', score: 55 },
      { value: 'proactive_full', label: 'Patients get cost estimates before their visit and we collect everything possible at check-in', score: 90 },
    ],
    industryContext: '80% of patients list upfront cost estimates as a major factor in choosing a clinician. 43% have delayed or skipped care due to cost uncertainty. Collecting at time of service grew 13.1% last year — every dollar collected before they leave has 0 AR days.',
  },

  // Q7: Credit Card Fee Management (CONDITIONAL — only if payment_options includes non-cash options)
  {
    id: 'convenience_fee',
    text: 'Credit card fees cost your practice 2.5-3.5% on every card payment. How do you handle that?',
    helpText: 'On $1M in annual card payments, that\'s $25,000-$35,000 in processing fees.',
    type: 'single',
    categoryIndex: 0,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    conditional: {
      questionId: 'payment_options',
      showIfIncludesAny: ['front_desk', 'portal', 'text_to_pay', 'mobile_wallet'],
    },
    options: [
      { value: 'absorb', label: 'We absorb all processing fees — it\'s just a cost of doing business', score: 40 },
      { value: 'considering', label: 'We\'re considering passing fees to patients but haven\'t implemented', score: 50 },
      { value: 'yes_basic', label: 'Yes — we pass fees to patients who pay by card', score: 70 },
      { value: 'yes_compliant', label: 'Yes — compliant surcharging program that offsets costs without hurting patient experience', score: 90 },
    ],
    autoScore: { whenHidden: true, score: 30 },
    industryContext: 'Compliant surcharging can recover $15,000-$50,000+ annually in processing fees while maintaining patient satisfaction — especially when combined with easy digital payment options.',
  },

  // ══════════════════════════════════════════
  // ACT 3: COMPETITIVE IMPACT
  // "Here's how this affects your reputation"
  // ══════════════════════════════════════════

  // Q8: Billing as Competitive Advantage (MERGED satisfaction + reputation — single — all segments)
  {
    id: 'billing_competitive',
    text: 'How often do patients contact your office about billing confusion, and does billing come up in your online reviews?',
    helpText: 'Your billing process is part of your brand whether you manage it or not.',
    type: 'single',
    categoryIndex: 2,
    categoryWeights: [0, 0.40, 0.60],
    crossCategory: true,
    segments: ['PP', 'PT', 'BH', 'UC', 'ASC', 'FC'],
    options: [
      { value: 'frequent_negative', label: 'Frequent billing calls, some negative reviews — billing confusion is a regular issue', score: 10 },
      { value: 'regular_neutral', label: 'Regular billing calls, but reviews rarely mention billing', score: 30 },
      { value: 'occasional', label: 'Occasional billing questions — rarely causes issues', score: 60 },
      { value: 'rare_positive', label: 'Rare billing questions — patients actually compliment how easy it is to pay', score: 90 },
    ],
    industryContext: '56% of patients would switch providers after a poor billing experience — 74% of those under 26. Every billing confusion call costs $8-12 in staff time AND represents a patient who almost didn\'t pay you.',
  },

  // ══════════════════════════════════════════
  // ACT 4: SEGMENT-SPECIFIC QUESTIONS
  // "What's unique to YOUR practice type"
  // ══════════════════════════════════════════

  // PT-specific: Copay Collection Per Visit
  {
    id: 'pt_copay_collection',
    text: 'How consistently do you collect copays at each visit?',
    helpText: 'PT patients typically have 12-15 visits per episode of care. Missing copays compounds fast.',
    type: 'single',
    categoryIndex: 0,
    segments: ['PT'],
    options: [
      { value: 'rarely', label: 'Rarely — we usually bill copays later', score: 10 },
      { value: 'sometimes', label: 'Sometimes — depends on the front desk staff and the day', score: 30 },
      { value: 'usually', label: 'Usually — we collect most copays at check-in', score: 60 },
      { value: 'always', label: 'Always — 90%+ copay collection rate at time of service', score: 90 },
    ],
    industryContext: 'PT copays range from $30-$75 per visit across 12-15 visits. Missing copays at $50/visit over 12 visits = $600 in delayed collections per patient episode.',
  },

  // BH-specific: No-Show Financial Impact
  {
    id: 'bh_noshow_management',
    text: 'How do you handle the financial impact of no-shows and late cancellations?',
    helpText: 'Behavioral health has significantly higher no-show rates than other specialties.',
    type: 'single',
    categoryIndex: 0,
    segments: ['BH'],
    options: [
      { value: 'nothing', label: 'We don\'t charge — patients just reschedule', score: 10 },
      { value: 'policy_not_enforced', label: 'We have a policy but rarely enforce it', score: 25 },
      { value: 'manual_charge', label: 'We charge no-show fees manually when we can', score: 50 },
      { value: 'automated', label: 'Automated — card on file with clear policy, auto-charge for no-shows', score: 85 },
    ],
    industryContext: 'Behavioral health practices average 20-30% no-show rates. Each no-show is $100-$250 in lost revenue. Card-on-file with automated no-show fees reduces rates by 25-40%.',
  },

  // BH-specific: Making Care Affordable
  {
    id: 'bh_affordability',
    text: 'How do you make ongoing care affordable for patients who struggle with costs?',
    helpText: 'Patients who stop treatment due to cost concerns become lost revenue AND worse outcomes.',
    type: 'single',
    categoryIndex: 1,
    segments: ['BH'],
    options: [
      { value: 'no_options', label: 'We don\'t really have options — patients either pay or stop coming', score: 15 },
      { value: 'discounts_case_by_case', label: 'Discounts or sliding scale on a case-by-case basis', score: 35 },
      { value: 'standard_plans', label: 'Standard payment plan options we present to patients', score: 60 },
      { value: 'proactive_multiple', label: 'Proactive — multiple options: payment plans, autopay, sliding scale, and help finding assistance', score: 90 },
    ],
    industryContext: '42% of patients cite cost as a barrier to mental health care. Flexible payment options improve treatment continuity by 30-40% — that\'s better outcomes AND better revenue.',
  },

  // UC-specific: Self-Pay Management
  {
    id: 'uc_selfpay_process',
    text: 'How do you handle self-pay and uninsured patients?',
    helpText: 'Urgent care sees a higher percentage of self-pay patients than most specialties.',
    type: 'single',
    categoryIndex: 0,
    segments: ['UC'],
    options: [
      { value: 'bill_later', label: 'We provide service and bill them later', score: 10 },
      { value: 'collect_some', label: 'We try to collect a deposit at time of service', score: 35 },
      { value: 'upfront_pricing', label: 'Transparent self-pay pricing and collect at time of service', score: 60 },
      { value: 'optimized', label: 'Upfront pricing, immediate digital payment, payment plans for higher balances', score: 90 },
    ],
    industryContext: 'Urgent care centers see 15-25% self-pay patients and it\'s growing 8% year-over-year. Transparent pricing with immediate payment options is becoming table stakes.',
  },

  // ASC-specific: Pre-Procedure Financial Clearance
  {
    id: 'asc_financial_clearance',
    text: 'Do you verify patient financial responsibility and collect before the procedure?',
    helpText: 'ASC cases can be $1,500-$3,000+ in patient responsibility. Not collecting upfront is high-risk.',
    type: 'single',
    categoryIndex: 0,
    segments: ['ASC'],
    options: [
      { value: 'after_service', label: 'We bill patients after the procedure', score: 10 },
      { value: 'partial_upfront', label: 'We collect estimated copay/deductible at check-in', score: 35 },
      { value: 'pre_service', label: 'We verify benefits and collect patient responsibility before the procedure date', score: 65 },
      { value: 'comprehensive', label: 'Financial counseling + pre-authorization + full collection before procedure', score: 90 },
    ],
    industryContext: 'ASC net revenue averages $1,500-$3,000 per case. Collecting upfront prevents high-dollar balances from becoming bad debt. 95.3% of ASCs are for-profit — margins matter.',
  },

  // FC-specific: Financial Counseling
  {
    id: 'fc_financial_counseling',
    text: 'Do you provide financial counseling to help patients understand and plan for treatment costs?',
    helpText: 'Fertility treatment is one of the most expensive healthcare journeys patients face.',
    type: 'single',
    categoryIndex: 1,
    segments: ['FC'],
    options: [
      { value: 'none', label: 'No — patients receive cost information at time of service only', score: 10 },
      { value: 'basic', label: 'Basic — cost sheets and answers to questions', score: 30 },
      { value: 'dedicated', label: 'Dedicated financial coordinator who walks through costs and payment options', score: 65 },
      { value: 'comprehensive', label: 'Proactive counseling, financing options, insurance advocacy, and payment plans', score: 90 },
    ],
    industryContext: '70%+ of fertility patients report financial stress. Average IVF costs $15,000-$30,000 per cycle, with 2.5 cycles needed on average. Only 25% have insurance coverage.',
  },

  // FC-specific: Bundled Pricing
  {
    id: 'fc_bundled_pricing',
    text: 'Do you offer bundled or package pricing for fertility treatments?',
    type: 'single',
    categoryIndex: 2,
    categoryWeights: [0.30, 0.30, 0.40],
    crossCategory: true,
    segments: ['FC'],
    options: [
      { value: 'no', label: 'No — all services billed individually', score: 10 },
      { value: 'basic_bundles', label: 'Some basic packages but pricing isn\'t very transparent', score: 35 },
      { value: 'clear_bundles', label: 'Clear bundled pricing with financing options available', score: 65 },
      { value: 'comprehensive', label: 'Comprehensive packages with shared-risk/refund programs and flexible financing', score: 90 },
    ],
    industryContext: 'Bundled pricing is the predominant model in fertility. Shared risk/refund programs are increasingly expected as competitive differentiators.',
  },
];


// ============================================
// RESULTS FLOW (7 slides)
// ============================================
const ResultsFlow = [
  { id: 'overview', title: 'Your Score', component: 'OverviewSlide' },
  { id: 'strengths', title: 'Your Strengths', component: 'StrengthsSlide' },
  { id: 'market', title: 'Market Context', component: 'MarketContextSlide' },
  { id: 'opportunities', title: 'Opportunities', component: 'OpportunitiesSlide' },
  { id: 'improvements', title: 'Improvements', component: 'ImprovementsSlide' },
  { id: 'vision', title: 'Your Path Forward', component: 'VisionSlide' },
  { id: 'next', title: 'Next Steps', component: 'NextStepsSlide' },
];

const ResultsFlowV47 = ResultsFlow;


// ============================================
// RECOMMENDATION DEFINITIONS
// ============================================
const RecommendationDefinitions = [
  {
    id: 'enable_autopay',
    title: 'Enable Autopay for Patient Balances',
    description: 'Implement autopay so patients opt-in to automatic payments when bills arrive. The single biggest lever for reducing AR and improving cashflow.',
    category: 'Revenue Cycle Resilience',
    priority: 95,
    impact: 'high',
    triggerFn: (answers) => {
      const options = answers['payment_options'] || [];
      return !options.includes('autopay');
    },
    financialImpact: 'Autopay patients have 0 AR days. Even 30% enrollment can reduce overall AR days by 30%+.',
    patientPayFeature: 'PatientPay Autopay',
    sourceRef: 8,
  },
  {
    id: 'increase_autopay_enrollment',
    title: 'Increase Autopay Enrollment',
    description: 'Your autopay exists but enrollment is low. Promote autopay at check-in and through digital communications to capture more patients.',
    category: 'Revenue Cycle Resilience',
    priority: 88,
    impact: 'high',
    triggerFn: (answers) => {
      const options = answers['payment_options'] || [];
      const enrollment = answers['autopay_enrollment'] || 0;
      return options.includes('autopay') && enrollment < 30;
    },
    financialImpact: 'Every 10% increase in autopay enrollment reduces AR days by ~10% and bad debt proportionally.',
    patientPayFeature: 'PatientPay Autopay Promotion Tools',
    sourceRef: 8,
  },
  {
    id: 'implement_text_to_pay',
    title: 'Add Text-to-Pay Billing',
    description: 'Send patients a text with a secure pay link. 98% open rate within 90 seconds vs. weeks for paper.',
    category: 'Patient Payment Experience',
    priority: 90,
    impact: 'high',
    triggerFn: (answers) => {
      const options = answers['payment_options'] || [];
      return !options.includes('text_to_pay');
    },
    financialImpact: '60% text-to-pay engagement vs. <25% portal adoption. Faster payments = lower AR days.',
    patientPayFeature: 'PatientPay Text-to-Pay',
    sourceRef: 8,
  },
  {
    id: 'modernize_billing_delivery',
    title: 'Move Beyond Paper Statements',
    description: 'Transition from paper-first to digital-first billing. Paper costs $3-5/statement and delays payment by weeks.',
    category: 'Revenue Cycle Resilience',
    priority: 82,
    impact: 'high',
    triggerFn: (answers) => {
      const notif = answers['billing_notification'];
      return notif === 'paper_mailed' || notif === 'paper_plus_portal';
    },
    financialImpact: 'Digital-first billing reduces cost-to-collect by 50%+ and accelerates payment by 2-4 weeks.',
    patientPayFeature: 'PatientPay Digital Statements',
    sourceRef: 8,
  },
  {
    id: 'improve_bill_clarity',
    title: 'Simplify Your Patient Bills',
    description: 'Clear, plain-language bills reduce confusion calls and speed up payment. Visual breakdowns make a big difference.',
    category: 'Patient Payment Experience',
    priority: 75,
    impact: 'medium',
    triggerFn: (answers) => {
      const clarity = answers['bill_clarity'];
      return clarity === 'confusing' || clarity === 'basic';
    },
    financialImpact: '37% of patients miss bills due to complexity. Clear bills reduce inbound calls 40-60%.',
    patientPayFeature: 'PatientPay Clear Statements',
    sourceRef: 5,
  },
  {
    id: 'add_payment_plans',
    title: 'Offer Self-Service Payment Plans',
    description: 'Let patients set up their own plans online. Automated plan management reduces staff burden and recovers more revenue.',
    category: 'Patient Payment Experience',
    priority: 85,
    impact: 'high',
    triggerFn: (answers) => {
      const options = answers['payment_options'] || [];
      return !options.includes('payment_plan');
    },
    financialImpact: '77% want payment plans. Self-service plans recover 50%+ of difficult balances vs. 12% manual.',
    patientPayFeature: 'PatientPay Payment Plans',
    sourceRef: 6,
  },
  {
    id: 'automate_plans_and_autopay',
    title: 'Fully Automate Plans & Autopay',
    description: 'Move from manual plan management to fully self-service. Patients enroll themselves, payments auto-debit, staff freed up.',
    category: 'Revenue Cycle Resilience',
    priority: 78,
    impact: 'high',
    triggerFn: (answers) => {
      const setup = answers['autopay_plan_setup'];
      return setup === 'mostly_manual';
    },
    financialImpact: 'Automated plans have 3-4x higher completion rates. Self-service autopay enrollment doubles adoption.',
    patientPayFeature: 'PatientPay Automation Suite',
    sourceRef: 8,
  },
  {
    id: 'implement_surcharging',
    title: 'Implement Compliant Surcharging',
    description: 'A compliant program offsets 2.5-3.5% processing costs while maintaining patient satisfaction.',
    category: 'Revenue Cycle Resilience',
    priority: 55,
    impact: 'medium',
    triggerFn: (answers) => {
      const fee = answers['convenience_fee'];
      return fee === 'absorb' || fee === 'considering';
    },
    financialImpact: 'Recovering processing fees can save $15,000-$50,000+ annually.',
    patientPayFeature: 'PatientPay Compliant Surcharging',
    sourceRef: 8,
  },
  {
    id: 'improve_upfront_collection',
    title: 'Strengthen Upfront Collection & Cost Transparency',
    description: 'Provide cost estimates before visits and collect at check-in with real-time eligibility verification.',
    category: 'Competitive Position',
    priority: 72,
    impact: 'high',
    triggerFn: (answers) => {
      const upfront = answers['upfront_collection'];
      return upfront === 'bill_after' || upfront === 'copays_at_checkout';
    },
    financialImpact: '80% of patients want upfront estimates. Every dollar collected at service has 0 AR days.',
    patientPayFeature: 'PatientPay POS + Cost Estimation',
    sourceRef: 1,
  },
  {
    id: 'reduce_billing_staff',
    title: 'Reduce Billing Staff Burden Through Automation',
    description: 'Automate statement generation, payment posting, follow-up reminders, and plan management to free staff.',
    category: 'Revenue Cycle Resilience',
    priority: 70,
    impact: 'high',
    triggerFn: (answers) => {
      const burden = answers['billing_staff_burden'];
      return burden === '3_plus' || burden === '1_2_dedicated';
    },
    financialImpact: 'With labor at 84% of expenses and rising 11%+ annually, automation is essential for margin protection.',
    patientPayFeature: 'PatientPay Automation Suite',
    sourceRef: 2,
  },
  {
    id: 'implement_auto_dunning',
    title: 'Implement Intelligent Auto-Dunning',
    description: 'Replace manual phone calls with automated digital follow-up sequences that include payment plan offers and escalate intelligently.',
    category: 'Revenue Cycle Resilience',
    priority: 80,
    impact: 'high',
    triggerFn: (answers) => {
      const unpaid = answers['unpaid_and_bad_debt'];
      return unpaid === 'write_off_high' || unpaid === 'chase_manual' || unpaid === 'not_sure';
    },
    financialImpact: 'PatientPay\'s auto-dunning engine recovers 2-3x more than manual follow-up by making it easy to pay at every touchpoint.',
    patientPayFeature: 'PatientPay Smart Dunning Engine',
    sourceRef: 8,
  },
  {
    id: 'leverage_billing_reputation',
    title: 'Turn Billing Into a Competitive Advantage',
    description: 'Transform billing from a neutral or negative factor into a positive differentiator that attracts and retains patients.',
    category: 'Competitive Position',
    priority: 60,
    impact: 'medium',
    triggerFn: (answers) => {
      const comp = answers['billing_competitive'];
      return comp === 'frequent_negative' || comp === 'regular_neutral';
    },
    financialImpact: '38% of patients have switched providers over billing. Making billing easy reduces churn and attracts new patients.',
    patientPayFeature: 'PatientPay Experience Suite',
    sourceRef: 3,
  },
  {
    id: 'expand_digital_payments',
    title: 'Expand Digital Payment Options',
    description: 'Add mobile wallet, HSA/FSA, and text-to-pay. Patients who can pay their preferred way pay faster.',
    category: 'Patient Payment Experience',
    priority: 65,
    impact: 'medium',
    triggerFn: (answers) => {
      const options = answers['payment_options'] || [];
      const hasDigital = options.includes('mobile_wallet');
      const hasHSA = options.includes('hsa_fsa');
      const hasText = options.includes('text_to_pay');
      return (!hasDigital || !hasHSA) && !hasText;
    },
    financialImpact: '37% of patients now prefer mobile wallets. HSA/FSA acceptance captures tax-advantaged dollars.',
    patientPayFeature: 'PatientPay Multi-Payment Support',
    sourceRef: 7,
  },
];


// ============================================
// PATIENTPAY PROJECTION CONFIG
// ============================================
const PatientPayProjectionConfig = {
  metrics: {
    arDaysReduction: 0.47,
    badDebtReduction: 0.40,
    collectionsImprovement: 2.0,
    first30DaysImprovement: 0.25,
    textToPayRate: 0.60,
    industryTextToPayRate: 0.43,
    digitalAdoption: 0.90,
    autopayTarget: 0.40,
  },

  // Score improvements by question when using PatientPay
  scoreImprovements: {
    billing_staff_burden: { boost: 30, maxScore: 85, description: 'Automate billing operations', sourceRef: 8 },
    unpaid_and_bad_debt: { boost: 35, maxScore: 85, description: 'Smart dunning + payment plans reduce write-offs', sourceRef: 8 },
    billing_notification: { boost: 40, maxScore: 90, description: 'Instant digital notifications with click-to-pay', sourceRef: 8 },
    bill_clarity: { boost: 35, maxScore: 95, description: 'Clear, patient-friendly statement design', sourceRef: 8 },
    payment_options: { boost: 30, maxScore: 100, description: 'Full-spectrum digital payment options', sourceRef: 8 },
    autopay_plan_setup: { boost: 45, maxScore: 90, description: 'Fully self-service autopay + payment plans', sourceRef: 8 },
    autopay_enrollment: { boost: 30, maxScore: 80, description: 'Proven autopay promotion tools', sourceRef: 8 },
    upfront_collection: { boost: 25, maxScore: 85, description: 'Pre-visit cost estimates + POS collection', sourceRef: 1 },
    convenience_fee: { boost: 20, maxScore: 90, description: 'Compliant surcharging program', sourceRef: 8 },
    billing_competitive: { boost: 25, maxScore: 85, description: 'Transform billing into a competitive edge', sourceRef: 3 },
    // Segment-specific
    pt_copay_collection: { boost: 25, maxScore: 90, description: 'Automated copay collection per visit', sourceRef: 8 },
    bh_noshow_management: { boost: 30, maxScore: 85, description: 'Card-on-file with automated no-show fees', sourceRef: 8 },
    bh_affordability: { boost: 25, maxScore: 85, description: 'Self-service plans + autopay for ongoing care', sourceRef: 8 },
    uc_selfpay_process: { boost: 30, maxScore: 90, description: 'Transparent pricing + instant payment', sourceRef: 8 },
    asc_financial_clearance: { boost: 25, maxScore: 85, description: 'Pre-procedure financial clearance workflow', sourceRef: 8 },
    fc_financial_counseling: { boost: 20, maxScore: 80, description: 'Financial counseling + payment plan tools', sourceRef: 8 },
    fc_bundled_pricing: { boost: 15, maxScore: 75, description: 'Bundled payment + financing integration', sourceRef: 8 },
  },

  caseStudies: {
    lakeWashington: { name: 'Lake Washington PT', metric: '47% AR days reduction (45→20 days)', type: 'PT' },
    encore: { name: 'Encore Senior Living', metric: '40% bad debt reduction, 90% digital adoption', type: 'Multi' },
    irg: { name: 'IRG Physical Therapy', metric: '2X cash collections, 60% text-to-pay rate', type: 'PT' },
    alpine: { name: 'Alpine Physical Therapy', metric: '2X cash collections', type: 'PT' },
  }
};


// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

/**
 * Get visible questions based on current answers (segment routing + conditional logic)
 */
function getVisibleQuestions(answers) {
  const segment = answers['practice_type'] || answers['facility_type'];

  return Questions.filter(q => {
    if (q.isRoutingQuestion) return !segment;
    if (!segment) return false;
    if (q.segments && !q.segments.includes(segment)) return false;

    // Check conditional logic
    if (q.conditional) {
      const { questionId, showIfIncludes, showIfIncludesAny, showIfEquals, skipIfOption, hideIfIncludesAny } = q.conditional;
      const dependentAnswer = answers[questionId];

      if (showIfEquals) {
        if (dependentAnswer !== showIfEquals) return false;
      }

      if (showIfIncludes) {
        if (Array.isArray(dependentAnswer)) {
          if (!dependentAnswer.includes(showIfIncludes)) return false;
        } else {
          if (dependentAnswer !== showIfIncludes) return false;
        }
      }

      if (showIfIncludesAny && Array.isArray(showIfIncludesAny)) {
        if (Array.isArray(dependentAnswer)) {
          if (!showIfIncludesAny.some(trigger => dependentAnswer.includes(trigger))) return false;
        } else if (!dependentAnswer || !showIfIncludesAny.includes(dependentAnswer)) {
          return false;
        }
      }

      if (hideIfIncludesAny && Array.isArray(hideIfIncludesAny)) {
        if (Array.isArray(dependentAnswer)) {
          if (hideIfIncludesAny.some(trigger => dependentAnswer.includes(trigger))) return false;
        } else if (dependentAnswer && hideIfIncludesAny.includes(dependentAnswer)) {
          return false;
        }
      }

      if (skipIfOption && dependentAnswer === skipIfOption) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate score for a single question
 */
function calculateQuestionScore(question, answer) {
  if (answer === undefined || answer === null) return null;
  if (question.isRoutingQuestion) return null;
  if (question.isDiagnostic) return null;

  if (question.type === 'slider') {
    if (typeof question.scoring === 'function') {
      return question.scoring(answer);
    }
    // Linear scoring for sliders without custom scoring
    const range = question.max - question.min;
    return Math.round(((answer - question.min) / range) * 100);
  }

  if (question.type === 'single') {
    const option = question.options.find(o => o.value === answer);
    return option ? option.score : null;
  }

  if (question.type === 'multi') {
    if (Array.isArray(answer)) {
      // Check for exclusive option
      if (question.exclusiveOption && answer.includes('exclusive')) {
        return question.exclusiveOption.score;
      }
      let total = 0;
      answer.forEach(val => {
        const opt = question.options.find(o => o.value === val);
        if (opt) total += opt.points;
      });
      return Math.min(total, question.maxScore || 100);
    }
    return 0;
  }

  if (question.type === 'currency') {
    return null; // Currency inputs are diagnostic
  }

  return null;
}

/**
 * Calculate overall scores across all 3 categories
 * Returns: { overall, categories: [3], segment, useTwoCategories, weights }
 */
function calculateScores(answers) {
  const segment = answers['practice_type'] || answers['facility_type'] || 'PP';
  const practiceType = PracticeTypes[segment] || PracticeTypes.PP;
  const weights = practiceType.categoryWeights;
  const visibleQuestions = getVisibleQuestions(answers);

  // Accumulate scores per category
  const categoryScores = [[], [], []]; // 3 categories

  visibleQuestions.forEach(q => {
    if (q.isDiagnostic || q.isRoutingQuestion) return;

    let score = calculateQuestionScore(q, answers[q.id]);

    // Handle autoScore for hidden conditional questions
    if (score === null && q.autoScore && q.autoScore.whenHidden) {
      // Check if this question SHOULD be visible but wasn't answered
      // vs. hidden by conditional logic
      const isConditionallyHidden = q.conditional && !visibleQuestions.find(vq => vq.id === q.id);
      if (isConditionallyHidden) {
        score = q.autoScore.score;
      }
    }

    if (score === null) return;

    // Cross-category scoring
    if (q.crossCategory && q.categoryWeights) {
      q.categoryWeights.forEach((weight, catIdx) => {
        if (weight > 0) {
          categoryScores[catIdx].push({ score, weight: weight });
        }
      });
    } else {
      // Single-category scoring (full weight to primary category)
      const catIdx = q.categoryIndex;
      if (catIdx !== null && catIdx !== undefined && catIdx >= 0 && catIdx < 3) {
        categoryScores[catIdx].push({ score, weight: 1.0 });
      }
    }
  });

  // Also score hidden conditional questions that have autoScore
  Questions.forEach(q => {
    if (q.autoScore && q.autoScore.whenHidden && q.conditional) {
      // Only apply if the question isn't visible
      const isVisible = visibleQuestions.find(vq => vq.id === q.id);
      if (!isVisible && q.segments.includes(segment)) {
        const score = q.autoScore.score;
        if (q.crossCategory && q.categoryWeights) {
          q.categoryWeights.forEach((weight, catIdx) => {
            if (weight > 0) {
              categoryScores[catIdx].push({ score, weight: weight });
            }
          });
        } else if (q.categoryIndex !== null && q.categoryIndex !== undefined) {
          categoryScores[q.categoryIndex].push({ score, weight: 1.0 });
        }
      }
    }
  });

  // Calculate weighted average per category
  const categories = categoryScores.map(scores => {
    if (scores.length === 0) return 50; // default
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = scores.reduce((sum, s) => sum + (s.score * s.weight), 0);
    return Math.round(weightedSum / totalWeight);
  });

  // Calculate overall weighted score
  const overall = Math.round(
    categories[0] * weights[0] +
    categories[1] * weights[1] +
    categories[2] * weights[2]
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    categories: categories.map(c => Math.min(100, Math.max(0, c))),
    segment,
    useTwoCategories: false,
    weights,
  };
}

/**
 * Get score level label
 */
function getScoreLevel(score, segment) {
  if (score >= 85) return 'Highly Resilient';
  if (score >= 70) return 'Well Positioned';
  if (score >= 55) return 'Building Resilience';
  if (score >= 40) return 'At Risk';
  return 'Significant Gaps';
}

/**
 * Get score color
 */
function getScoreColor(score, segment) {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#3c8fc7';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

/**
 * Interpolate between two colors
 */
function interpolateColor(color1, color2, factor) {
  const hex = (c) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3)), g1 = hex(color1.slice(3, 5)), b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3)), g2 = hex(color2.slice(3, 5)), b2 = hex(color2.slice(5, 7));
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getGradientColor(score) {
  if (score <= 40) return interpolateColor('#EF4444', '#F59E0B', score / 40);
  if (score <= 70) return interpolateColor('#F59E0B', '#3c8fc7', (score - 40) / 30);
  return interpolateColor('#3c8fc7', '#10B981', (score - 70) / 30);
}


// ============================================
// FINANCIAL INSIGHTS CALCULATOR
// ============================================

/**
 * Calculate financial insights from form data and answers
 * Returns all properties that OpportunitiesSlide expects
 */
function calculateInsights(formData, answers) {
  const segment = answers['practice_type'] || answers['facility_type'] || 'PP';
  const benchmarks = IndustryBenchmarks[segment] || IndustryBenchmarks.PP;
  const metrics = PatientPayProjectionConfig.metrics;

  // Core inputs
  const monthlyBilling = answers['monthly_patient_billing'] || 75000;
  const annualBilling = monthlyBilling * 12;
  const dailyBilling = annualBilling / 365;
  const arDays = answers['patient_ar_days'] || 45;
  const hdhpPct = (answers['hdhp_percentage'] || 30) / 100;

  // Target AR days per segment
  const targetArDays = { PP: 35, PT: 25, BH: 30, UC: 25, ASC: 25, FC: 30 }[segment] || 35;

  // Cash in AR
  const cashInAR = Math.round(dailyBilling * arDays);

  // Projected AR days with PatientPay
  const projectedARDays = Math.round(arDays * (1 - metrics.arDaysReduction));

  // Cash freed by AR reduction
  const cashFreedByARReduction = Math.round(dailyBilling * (arDays - projectedARDays));

  // Bad debt calculation
  const unpaidAnswer = answers['unpaid_and_bad_debt'] || 'chase_manual';
  const badDebtRateMap = {
    'write_off_high': 0.06,
    'chase_manual': 0.04,
    'collections_agency': 0.025,
    'automated_low': 0.015,
    'not_sure': 0.04,
  };
  const badDebtRate = badDebtRateMap[unpaidAnswer] || 0.04;
  const currentBadDebt = Math.round(annualBilling * badDebtRate);
  const badDebtSavings = Math.round(currentBadDebt * metrics.badDebtReduction);

  // Autopay opportunity
  const currentAutopayEnrollment = (answers['autopay_enrollment'] || 0) / 100;
  const autopayTarget = metrics.autopayTarget;
  const autopayGap = Math.max(0, autopayTarget - currentAutopayEnrollment);
  const arDaysReductionFromAutopay = Math.round(arDays * autopayGap * 0.8);
  const cashFreedByAutopay = Math.round(dailyBilling * arDaysReductionFromAutopay);
  const autopayOpportunity = cashFreedByAutopay;

  // Payment plan opportunity (balances recovered that would otherwise be bad debt)
  const paymentPlanOpportunity = Math.round(currentBadDebt * 0.50);

  // Staff time savings
  const staffAnswer = answers['billing_staff_burden'] || 'part_of_roles';
  const staffCostMap = {
    '3_plus': 135000,
    '1_2_dedicated': 90000,
    'part_of_roles': 30000,
    'minimal_automated': 5000,
  };
  const currentStaffCost = staffCostMap[staffAnswer] || 30000;
  const staffTimeSavings = Math.round(currentStaffCost * 0.50);

  // Credit card fee savings
  const feeAnswer = answers['convenience_fee'] || 'absorb';
  const cardPaymentPct = 0.65;
  const annualCardPayments = annualBilling * cardPaymentPct;
  const annualCardFeesAbsorbed = (feeAnswer === 'absorb' || feeAnswer === 'considering')
    ? Math.round(annualCardPayments * IndustryStats.creditCardFeeRate)
    : 0;
  const creditCardFeeSavings = annualCardFeesAbsorbed;

  // HDHP exposure
  const hdhpExposure = Math.round(annualBilling * hdhpPct);
  const projectedHDHPGrowth = Math.round(hdhpExposure * IndustryStats.hdhpGrowthRate);

  // Potential freed cash (from AR reduction beyond autopay)
  const potentialFreedCash = Math.max(0, Math.round(dailyBilling * Math.max(0, arDays - targetArDays)));

  // Total financial opportunity
  const totalFinancialOpportunity = cashFreedByARReduction + badDebtSavings + staffTimeSavings;

  return {
    monthlyBilling,
    annualBilling,
    dailyBilling,
    arDays,
    cashInAR,
    projectedARDays,
    cashFreedByARReduction,
    badDebtRate,
    currentBadDebt,
    badDebtSavings,
    autopayEnrollment: currentAutopayEnrollment * 100,
    autopayTarget: autopayTarget * 100,
    arDaysReductionFromAutopay,
    cashFreedByAutopay,
    autopayOpportunity,
    paymentPlanOpportunity,
    currentStaffCost,
    staffTimeSavings,
    creditCardFeeSavings,
    annualCardFeesAbsorbed,
    hdhpPct: hdhpPct * 100,
    hdhpExposure,
    projectedHDHPGrowth,
    potentialFreedCash,
    totalFinancialOpportunity,
    targetArDays,
    segment,
    practiceType: PracticeTypes[segment]?.label || 'Practice',
  };
}


// ============================================
// GAP ANALYSIS
// ============================================

/**
 * Analyze gaps between scores and benchmarks
 * UI expects: { overall: { score, benchmark, gap, performance }, categories: [{ name, score, benchmark, gap, index, status }] }
 */
function getGapAnalysis(scores) {
  const segment = scores.segment || 'PP';
  const benchmarks = IndustryBenchmarks[segment] || IndustryBenchmarks.PP;

  const overallGap = scores.overall - benchmarks.overall;
  let performance;
  if (overallGap >= 10) performance = 'above';
  else if (overallGap >= -5) performance = 'near';
  else if (overallGap >= -15) performance = 'below';
  else performance = 'significantly_below';

  const categoryBenchmarks = [benchmarks.operations, benchmarks.family, benchmarks.competitive];
  const categories = CategoryNames.map((name, i) => {
    const score = scores.categories[i];
    const benchmark = categoryBenchmarks[i];
    const gap = score - benchmark;
    let status;
    if (gap >= 10) status = 'above';
    else if (gap >= -5) status = 'near';
    else if (gap >= -15) status = 'below';
    else status = 'significantly_below';

    return { name, score, benchmark, gap, index: i, status };
  });

  return {
    overall: {
      score: scores.overall,
      benchmark: benchmarks.overall,
      gap: overallGap,
      performance,
    },
    categories,
  };
}


// ============================================
// STRENGTHS ANALYSIS
// ============================================

/**
 * Analyze strengths from scores and answers
 * UI expects rich object with: summaryStatement, strongCategories, strongQuestions,
 * hasStrengths, isEarlyJourney, relativeStrength, moderateQuestions
 */
function getStrengths(scoresOrAnswers, answersOrScores) {
  // Handle both arg orders: (scores, answers) or (answers, scores)
  let scores, answers;
  if (scoresOrAnswers && scoresOrAnswers.overall !== undefined) {
    scores = scoresOrAnswers;
    answers = answersOrScores || {};
  } else {
    answers = scoresOrAnswers || {};
    scores = answersOrScores || { overall: 50, categories: [50, 50, 50], segment: 'PP' };
  }

  const segment = scores.segment || answers['practice_type'] || 'PP';
  const benchmarks = IndustryBenchmarks[segment] || IndustryBenchmarks.PP;
  const categoryBenchmarks = [benchmarks.operations, benchmarks.family, benchmarks.competitive];
  const visibleQuestions = getVisibleQuestions(answers);

  // Find strong categories (at or above benchmark)
  const strongCategories = [];
  const categoryColors = ['#3c8fc7', '#8B5CF6', '#fcc93b'];
  CategoryNames.forEach((name, i) => {
    const score = scores.categories[i];
    const benchmark = categoryBenchmarks[i];
    const gap = score - benchmark;
    if (gap >= 0) {
      let celebrationText;
      if (gap >= 15) celebrationText = `Excellent! You're ${gap} points above the ${benchmarks.label} benchmark.`;
      else if (gap >= 5) celebrationText = `Solid! You're above the industry benchmark here.`;
      else celebrationText = `You're meeting the industry standard — good foundation to build on.`;

      strongCategories.push({
        index: i,
        name,
        score,
        gap,
        color: categoryColors[i],
        celebrationText,
      });
    }
  });

  // Find strong questions (score >= 65)
  const strongQuestions = [];
  visibleQuestions.forEach(q => {
    if (q.isDiagnostic || q.isRoutingQuestion) return;
    const score = calculateQuestionScore(q, answers[q.id]);
    if (score !== null && score >= 65) {
      strongQuestions.push({
        id: q.id,
        question: q.text,
        answer: answers[q.id],
        score,
        categoryIndex: q.categoryIndex,
      });
    }
  });
  strongQuestions.sort((a, b) => b.score - a.score);

  // Find moderate questions (40 <= score < 65) for early journey
  const moderateQuestions = [];
  visibleQuestions.forEach(q => {
    if (q.isDiagnostic || q.isRoutingQuestion) return;
    const score = calculateQuestionScore(q, answers[q.id]);
    if (score !== null && score >= 40 && score < 65) {
      moderateQuestions.push({
        id: q.id,
        question: q.text,
        score,
        categoryIndex: q.categoryIndex,
      });
    }
  });
  moderateQuestions.sort((a, b) => b.score - a.score);

  const hasStrengths = strongCategories.length > 0 || strongQuestions.length >= 2;
  const isEarlyJourney = !hasStrengths;

  // Summary statement
  let summaryStatement;
  if (strongCategories.length >= 2) {
    summaryStatement = `Your practice shows strong performance across ${strongCategories.length} categories. You've already built a solid foundation for financial resilience.`;
  } else if (strongCategories.length === 1) {
    summaryStatement = `Your ${strongCategories[0].name} score stands out. Let's build on this strength while addressing other areas.`;
  } else if (strongQuestions.length > 0) {
    summaryStatement = `While your overall scores show room to grow, you have specific areas where you're performing well. These are foundations to build on.`;
  } else {
    summaryStatement = `Your assessment reveals significant opportunities across the board. The good news: these are all things within your control to improve.`;
  }

  // Relative strength (best category even if below benchmark)
  let relativeStrength = null;
  if (isEarlyJourney) {
    let bestCatIdx = 0;
    scores.categories.forEach((s, i) => {
      if (s > scores.categories[bestCatIdx]) bestCatIdx = i;
    });
    relativeStrength = {
      name: CategoryNames[bestCatIdx],
      score: scores.categories[bestCatIdx],
      gap: scores.categories[bestCatIdx] - categoryBenchmarks[bestCatIdx],
      color: categoryColors[bestCatIdx],
    };
  }

  return {
    summaryStatement,
    strongCategories,
    strongQuestions: strongQuestions.slice(0, 5),
    hasStrengths,
    isEarlyJourney,
    relativeStrength,
    moderateQuestions: moderateQuestions.slice(0, 4),
  };
}


// ============================================
// RECOMMENDATIONS ENGINE
// ============================================

/**
 * Get actionable recommendations sorted by priority
 */
function getActionableRecommendations(answers, scores, insights) {
  const segment = answers['practice_type'] || answers['facility_type'] || 'PP';

  const triggered = RecommendationDefinitions.filter(rec => {
    try {
      return rec.triggerFn(answers);
    } catch (e) {
      return false;
    }
  });

  // Adjust priority based on scores
  const adjusted = triggered.map(rec => {
    let adjustedPriority = rec.priority;

    // Boost priority for recommendations in weak categories
    if (scores && scores.categories) {
      const catIdx = CategoryNames.indexOf(rec.category);
      if (catIdx >= 0 && scores.categories[catIdx] < 40) {
        adjustedPriority += 10;
      }
    }

    return { ...rec, adjustedPriority };
  });

  adjusted.sort((a, b) => b.adjustedPriority - a.adjustedPriority);
  return adjusted;
}


// ============================================
// PATIENTPAY PROJECTIONS
// ============================================

/**
 * Calculate what scores could look like with PatientPay
 * UI expects: { current: { overall, categories }, projected: { overall, categories },
 *   overallImprovement, topImprovements, additionalImprovements, categoryImprovements }
 *
 * topImprovements items need: { id, description, overallImpact, categoryImpacts: [3], sourceRef }
 */
function calculatePatientPayProjections(answers, currentScores) {
  const segment = currentScores.segment || answers['practice_type'] || 'PP';
  const practiceType = PracticeTypes[segment] || PracticeTypes.PP;
  const weights = practiceType.categoryWeights;
  const improvements = PatientPayProjectionConfig.scoreImprovements;
  const visibleQuestions = getVisibleQuestions(answers);

  // Calculate per-question improvements
  const questionImprovements = [];

  // Process all questions including hidden conditionals with autoScore
  const allRelevantQuestions = [
    ...visibleQuestions.filter(q => !q.isDiagnostic && !q.isRoutingQuestion),
  ];

  // Add hidden conditional questions
  Questions.forEach(q => {
    if (q.autoScore && q.conditional && q.segments.includes(segment)) {
      const isVisible = visibleQuestions.find(vq => vq.id === q.id);
      if (!isVisible) {
        allRelevantQuestions.push(q);
      }
    }
  });

  allRelevantQuestions.forEach(q => {
    const imp = improvements[q.id];
    if (!imp) return;

    let currentScore = calculateQuestionScore(q, answers[q.id]);
    if (currentScore === null && q.autoScore) {
      currentScore = q.autoScore.score;
    }
    if (currentScore === null) return;

    const projectedScore = Math.min(imp.maxScore, currentScore + imp.boost);
    const improvement = projectedScore - currentScore;
    if (improvement <= 0) return;

    // Calculate impact per category
    const categoryImpacts = [0, 0, 0];
    if (q.crossCategory && q.categoryWeights) {
      q.categoryWeights.forEach((w, ci) => {
        if (w > 0) {
          categoryImpacts[ci] = Math.round(improvement * w);
        }
      });
    } else if (q.categoryIndex !== null && q.categoryIndex !== undefined) {
      categoryImpacts[q.categoryIndex] = improvement;
    }

    // Overall impact (weighted by category weights)
    const overallImpact = Math.round(
      categoryImpacts[0] * weights[0] +
      categoryImpacts[1] * weights[1] +
      categoryImpacts[2] * weights[2]
    );

    if (overallImpact > 0) {
      questionImprovements.push({
        id: q.id,
        questionId: q.id,
        description: imp.description,
        questionText: q.text,
        currentScore,
        projectedScore,
        improvement,
        overallImpact,
        categoryImpacts,
        categoryIndex: q.categoryIndex,
        category: q.categoryIndex !== null ? CategoryNames[q.categoryIndex] : '',
        patientPayFeature: imp.description,
        sourceRef: imp.sourceRef,
      });
    }
  });

  // Sort by overall impact
  questionImprovements.sort((a, b) => b.overallImpact - a.overallImpact);

  const topImprovements = questionImprovements.slice(0, 5);
  const additionalImprovements = questionImprovements.slice(5);

  // Calculate projected category scores
  const projectedCategories = [...currentScores.categories];
  const categoryCounts = [0, 0, 0];
  const categoryTotalImp = [0, 0, 0];

  questionImprovements.forEach(qi => {
    qi.categoryImpacts.forEach((impact, ci) => {
      if (impact > 0) {
        categoryTotalImp[ci] += impact;
        categoryCounts[ci]++;
      }
    });
  });

  // Apply improvements proportionally (diminishing returns at high scores)
  for (let i = 0; i < 3; i++) {
    if (categoryCounts[i] > 0) {
      const avgImprovement = categoryTotalImp[i] / categoryCounts[i];
      const headroom = 100 - projectedCategories[i];
      const effectiveImprovement = Math.min(avgImprovement * 1.5, headroom * 0.7);
      projectedCategories[i] = Math.min(100, Math.round(projectedCategories[i] + effectiveImprovement));
    }
  }

  const projectedOverall = Math.min(100, Math.round(
    projectedCategories[0] * weights[0] +
    projectedCategories[1] * weights[1] +
    projectedCategories[2] * weights[2]
  ));

  const overallImprovement = projectedOverall - currentScores.overall;

  const categoryImprovements = CategoryNames.map((name, i) => ({
    categoryName: name,
    name,
    currentScore: currentScores.categories[i],
    projectedScore: projectedCategories[i],
    improvement: projectedCategories[i] - currentScores.categories[i],
    categoryIndex: i,
    current: currentScores.categories[i],
    projected: projectedCategories[i],
  }));

  return {
    current: {
      overall: currentScores.overall,
      categories: [...currentScores.categories],
    },
    projected: {
      overall: projectedOverall,
      categories: projectedCategories,
    },
    overallImprovement,
    topImprovements,
    additionalImprovements,
    categoryImprovements,
    questionsImproved: questionImprovements.length,

    // Flat aliases for PDF/export compatibility
    currentOverall: currentScores.overall,
    projectedOverall,
    improvement: overallImprovement,
    currentCategories: [...currentScores.categories],
    projectedCategories,
  };
}


// ============================================
// BENCHMARK COMPARISON
// ============================================

function getPerformanceVsBenchmark(scores) {
  const segment = scores.segment || 'PP';
  const benchmarks = IndustryBenchmarks[segment] || IndustryBenchmarks.PP;
  return {
    overall: { score: scores.overall, benchmark: benchmarks.overall, gap: scores.overall - benchmarks.overall },
    categories: scores.categories.map((score, i) => ({
      score,
      benchmark: [benchmarks.operations, benchmarks.family, benchmarks.competitive][i],
      gap: score - [benchmarks.operations, benchmarks.family, benchmarks.competitive][i],
    })),
  };
}


// ============================================
// RESILIENCY INDEX
// ============================================
// The Resiliency Index measures how well a practice can withstand
// external market forces it cannot control. It reframes question
// answers through a vulnerability lens tied to 5 real market pressures.
//
// Resiliency Index = 100 - Composite Vulnerability
// Composite Vulnerability = weighted avg of 5 force vulnerability scores
// Force Vulnerability = Force Weight × (100 - Preparedness Score)
// Preparedness Score = avg of mapped question scores for that force

/**
 * The 5 external market forces pressuring every practice
 */
const ResiliencyForces = [
  {
    id: 'patient_responsibility',
    name: 'Rising Patient Responsibility',
    shortName: 'Patient Responsibility',
    icon: '📈',
    weight: 0.25,
    description: 'HDHP enrollment grew 22% in one year. Deductibles average $1,886. More of your revenue depends on patients paying you — not insurance.',
    trend: 'HDHP enrollment 27% → 33% in one year, still accelerating',
    // Question IDs that measure preparedness against this force
    questionMap: [
      { questionId: 'payment_options', subValues: ['autopay'], weight: 1.5, label: 'Autopay available' },
      { questionId: 'payment_options', subValues: ['payment_plan'], weight: 1.2, label: 'Payment plans available' },
      { questionId: 'autopay_plan_setup', weight: 1.3, label: 'Autopay/plan automation' },
      { questionId: 'autopay_enrollment', weight: 1.0, label: 'Autopay adoption' },
      { questionId: 'upfront_collection', weight: 1.0, label: 'Upfront collection' },
      { questionId: 'billing_notification', weight: 0.8, label: 'Fast billing notification' },
    ],
    // HDHP amplifier: higher HDHP % = more exposed to this force
    amplifier: (answers) => {
      const hdhp = (answers['hdhp_percentage'] || 30) / 100;
      return 0.7 + (hdhp * 0.75); // Range: 0.7 (0% HDHP) to 1.3 (80% HDHP)
    },
  },
  {
    id: 'expectation_gap',
    name: 'Patient Expectation Gap',
    shortName: 'Expectation Gap',
    icon: '📱',
    weight: 0.25,
    description: '92% of consumers use digital payments daily. 56% would switch providers over billing. Patients expect healthcare billing to work like every other part of their life.',
    trend: 'Digital payment adoption universal, 73% want retail convenience',
    questionMap: [
      { questionId: 'billing_notification', weight: 1.3, label: 'Digital-first notifications' },
      { questionId: 'bill_clarity', weight: 1.0, label: 'Bill clarity' },
      { questionId: 'payment_options', weight: 1.2, label: 'Payment options breadth' },
      { questionId: 'billing_competitive', weight: 1.0, label: 'Patient perception' },
      { questionId: 'upfront_collection', weight: 0.8, label: 'Cost transparency' },
    ],
    amplifier: null, // Universal pressure — no amplifier needed
  },
  {
    id: 'labor_cost',
    name: 'Labor Cost Pressure',
    shortName: 'Labor Costs',
    icon: '👥',
    weight: 0.20,
    description: 'Labor is 84% of practice expenses. Operating costs rose 11% last year. You can\'t afford to throw more people at billing — you need to automate.',
    trend: '90% of medical groups report rising costs, 11.1% increase in 2025',
    questionMap: [
      { questionId: 'billing_staff_burden', weight: 1.5, label: 'Staff dependency' },
      { questionId: 'autopay_plan_setup', weight: 1.2, label: 'Process automation' },
      { questionId: 'billing_notification', weight: 1.0, label: 'Notification automation' },
      { questionId: 'unpaid_and_bad_debt', weight: 0.8, label: 'Follow-up automation' },
    ],
    amplifier: (answers) => {
      // More staff = more exposed to labor cost increases
      const staff = answers['billing_staff_burden'];
      if (staff === '3_plus') return 1.3;
      if (staff === '1_2_dedicated') return 1.15;
      return 1.0;
    },
  },
  {
    id: 'bad_debt_trajectory',
    name: 'Bad Debt Acceleration',
    shortName: 'Bad Debt',
    icon: '📉',
    weight: 0.20,
    description: 'Bad debt jumped 14% last year. 58% now comes from insured patients — people who have coverage but can\'t navigate the payment process. This is accelerating.',
    trend: 'Bad debt up 14% YoY, 58% from insured patients (5x increase)',
    questionMap: [
      { questionId: 'unpaid_and_bad_debt', weight: 1.5, label: 'Collection process' },
      { questionId: 'payment_options', subValues: ['payment_plan'], weight: 1.3, label: 'Payment plans' },
      { questionId: 'payment_options', subValues: ['autopay'], weight: 1.3, label: 'Autopay' },
      { questionId: 'autopay_plan_setup', weight: 1.0, label: 'Plan automation' },
      { questionId: 'billing_notification', weight: 0.8, label: 'Timely notification' },
      { questionId: 'bill_clarity', weight: 0.7, label: 'Bill clarity' },
    ],
    amplifier: (answers) => {
      // Higher current bad debt = more exposed to acceleration
      const bd = answers['unpaid_and_bad_debt'];
      if (bd === 'write_off_high') return 1.4;
      if (bd === 'chase_manual' || bd === 'not_sure') return 1.2;
      return 1.0;
    },
  },
  {
    id: 'competitive_billing',
    name: 'Competitive Billing Pressure',
    shortName: 'Competitive Risk',
    icon: '🏥',
    weight: 0.10,
    description: '38% of patients have already switched providers over billing. 94% say billing matters for whether they return. Your competitors are modernizing.',
    trend: '56% would switch, 74% of under-26 patients',
    questionMap: [
      { questionId: 'billing_competitive', weight: 1.5, label: 'Billing reputation' },
      { questionId: 'bill_clarity', weight: 1.0, label: 'Bill clarity' },
      { questionId: 'payment_options', weight: 1.0, label: 'Payment convenience' },
      { questionId: 'upfront_collection', weight: 1.0, label: 'Cost transparency' },
    ],
    amplifier: null,
  },
];

/**
 * Calculate the Resiliency Index
 * Returns: {
 *   index: number (0-100, higher = more resilient),
 *   level: string,
 *   compositeVulnerability: number,
 *   forces: [{ id, name, shortName, icon, weight, description, trend,
 *              preparedness, vulnerability, exposure, amplifiedExposure, level }],
 *   projectedIndex: number (with PatientPay),
 *   projectedForces: [...],
 *   summary: string,
 *   methodology: string
 * }
 */
function calculateResiliencyIndex(answers, scores) {
  const segment = answers['practice_type'] || answers['facility_type'] || 'PP';
  const visibleQuestions = getVisibleQuestions(answers);

  /**
   * Get a question's score, handling multi-select sub-value checks
   */
  function getQuestionPreparedness(mapping) {
    const answer = answers[mapping.questionId];
    const question = Questions.find(q => q.id === mapping.questionId);

    // For multi-select sub-value checks (e.g., does payment_options include 'autopay'?)
    if (mapping.subValues) {
      if (Array.isArray(answer)) {
        const hasAll = mapping.subValues.every(sv => answer.includes(sv));
        return hasAll ? 85 : 5; // Binary: you offer it (85) or you don't (5)
      }
      return 5; // Not answered or not an array
    }

    // Standard question score
    if (question) {
      let score = calculateQuestionScore(question, answer);
      if (score !== null) return score;
      // Check autoScore for hidden conditionals
      if (question.autoScore && question.autoScore.whenHidden) {
        const isVisible = visibleQuestions.find(vq => vq.id === mapping.questionId);
        if (!isVisible) return question.autoScore.score;
      }
    }
    return 30; // Default if not answered
  }

  /**
   * Calculate preparedness score for a single force
   */
  function calculateForcePreparedness(force) {
    let weightedSum = 0;
    let totalWeight = 0;

    force.questionMap.forEach(mapping => {
      const prep = getQuestionPreparedness(mapping);
      weightedSum += prep * mapping.weight;
      totalWeight += mapping.weight;
    });

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 30;
  }

  // Calculate each force
  const forces = ResiliencyForces.map(force => {
    const preparedness = calculateForcePreparedness(force);
    const rawExposure = 100 - preparedness; // 0 = fully protected, 100 = fully exposed

    // Apply amplifier if present
    const amplifier = force.amplifier ? force.amplifier(answers) : 1.0;
    const amplifiedExposure = Math.min(100, Math.round(rawExposure * amplifier));

    // Weighted vulnerability contribution
    const vulnerability = Math.round(force.weight * amplifiedExposure);

    // Level label
    let level;
    if (amplifiedExposure <= 20) level = 'Well Protected';
    else if (amplifiedExposure <= 40) level = 'Moderately Protected';
    else if (amplifiedExposure <= 60) level = 'Partially Exposed';
    else if (amplifiedExposure <= 80) level = 'Significantly Exposed';
    else level = 'Highly Vulnerable';

    return {
      id: force.id,
      name: force.name,
      shortName: force.shortName,
      icon: force.icon,
      weight: force.weight,
      description: force.description,
      trend: force.trend,
      preparedness,
      exposure: rawExposure,
      amplifiedExposure,
      vulnerability,
      level,
    };
  });

  // Composite vulnerability = sum of all weighted vulnerabilities
  const compositeVulnerability = forces.reduce((sum, f) => sum + f.vulnerability, 0);

  // Resiliency Index = 100 - composite vulnerability
  const index = Math.max(0, Math.min(100, 100 - compositeVulnerability));

  // Index level
  let level;
  if (index >= 80) level = 'Highly Resilient';
  else if (index >= 65) level = 'Resilient';
  else if (index >= 45) level = 'Moderately Resilient';
  else if (index >= 25) level = 'Vulnerable';
  else level = 'Highly Vulnerable';

  // --- Projected index with PatientPay ---
  const improvements = PatientPayProjectionConfig.scoreImprovements;

  function getProjectedPreparedness(mapping) {
    let current = getQuestionPreparedness(mapping);

    // For sub-value checks, PatientPay enables autopay and payment plans
    if (mapping.subValues) {
      if (mapping.subValues.includes('autopay') || mapping.subValues.includes('payment_plan')) {
        return 85; // PatientPay provides both
      }
    }

    // Apply score improvement if available
    const imp = improvements[mapping.questionId];
    if (imp) {
      return Math.min(imp.maxScore, current + imp.boost);
    }
    return current;
  }

  function calculateProjectedForcePreparedness(force) {
    let weightedSum = 0;
    let totalWeight = 0;

    force.questionMap.forEach(mapping => {
      const prep = getProjectedPreparedness(mapping);
      weightedSum += prep * mapping.weight;
      totalWeight += mapping.weight;
    });

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  }

  const projectedForces = ResiliencyForces.map(force => {
    const preparedness = calculateProjectedForcePreparedness(force);
    const rawExposure = 100 - preparedness;
    // Amplifiers are reduced with PatientPay (automation reduces staff dependency, etc.)
    const amplifier = force.amplifier ? Math.max(1.0, force.amplifier(answers) * 0.7) : 1.0;
    const amplifiedExposure = Math.min(100, Math.round(rawExposure * amplifier));
    const vulnerability = Math.round(force.weight * amplifiedExposure);

    let projLevel;
    if (amplifiedExposure <= 20) projLevel = 'Well Protected';
    else if (amplifiedExposure <= 40) projLevel = 'Moderately Protected';
    else if (amplifiedExposure <= 60) projLevel = 'Partially Exposed';
    else if (amplifiedExposure <= 80) projLevel = 'Significantly Exposed';
    else projLevel = 'Highly Vulnerable';

    return {
      id: force.id,
      name: force.name,
      shortName: force.shortName,
      icon: force.icon,
      weight: force.weight,
      preparedness,
      exposure: rawExposure,
      amplifiedExposure,
      vulnerability,
      level: projLevel,
    };
  });

  const projectedVulnerability = projectedForces.reduce((sum, f) => sum + f.vulnerability, 0);
  const projectedIndex = Math.max(0, Math.min(100, 100 - projectedVulnerability));

  // Summary narrative
  const mostVulnerable = [...forces].sort((a, b) => b.amplifiedExposure - a.amplifiedExposure)[0];
  const mostProtected = [...forces].sort((a, b) => a.amplifiedExposure - b.amplifiedExposure)[0];

  let summary;
  if (index >= 65) {
    summary = `Your practice shows strong resilience against external market pressures. Your strongest protection is against ${mostProtected.name.toLowerCase()}. Continue building on these foundations.`;
  } else if (index >= 40) {
    summary = `Your practice has moderate resilience, but significant exposure to ${mostVulnerable.name.toLowerCase()}. The market forces affecting patient billing are accelerating — closing these gaps now protects your revenue.`;
  } else {
    summary = `Your practice is significantly exposed to the market forces reshaping healthcare billing. Your biggest vulnerability is ${mostVulnerable.name.toLowerCase()} — and these pressures are accelerating. The good news: these are all things within your control to address.`;
  }

  const methodology = 'The Resiliency Index measures your practice\'s preparedness against 5 external market forces — rising patient responsibility, digital payment expectations, labor costs, bad debt trends, and competitive billing pressure. Each force is weighted by its acceleration rate and amplified by your specific exposure (e.g., higher HDHP percentage increases your patient responsibility vulnerability). Your answers determine your preparedness score per force, and the index reflects how well-protected your practice is against these forces you cannot control — but can prepare for.';

  return {
    index,
    level,
    compositeVulnerability,
    forces,
    projectedIndex,
    projectedForces,
    projectedImprovement: projectedIndex - index,
    summary,
    methodology,
    mostVulnerable,
    mostProtected,
  };
}

/**
 * Get Resiliency Index color
 */
function getResiliencyColor(index) {
  if (index >= 80) return '#10B981';
  if (index >= 65) return '#3c8fc7';
  if (index >= 45) return '#F59E0B';
  if (index >= 25) return '#EF4444';
  return '#DC2626';
}

/**
 * Get vulnerability bar color (inverse — high exposure = red)
 */
function getExposureColor(exposure) {
  if (exposure <= 20) return '#10B981';
  if (exposure <= 40) return '#3c8fc7';
  if (exposure <= 60) return '#F59E0B';
  if (exposure <= 80) return '#EF4444';
  return '#DC2626';
}


// ============================================
// RESULTS SUMMARY GENERATOR
// ============================================

function generateResultsSummary(scores, insights, recommendations, answers) {
  const level = getScoreLevel(scores.overall);
  const ri = answers ? calculateResiliencyIndex(answers, scores) : null;
  return {
    headline: ri ? `Your Resiliency Index: ${ri.index}/100` : `Your Financial Resiliency Score: ${scores.overall}/100`,
    resiliencyIndex: ri ? ri.index : null,
    resiliencyLevel: ri ? ri.level : null,
    level,
    summary: ri
      ? `Your practice's Resiliency Index is ${ri.index}/100 (${ri.level}). Your payment readiness score is ${scores.overall}/100. ` +
        `With $${insights.annualBilling?.toLocaleString()} in annual patient billing, ` +
        `there's an estimated $${insights.totalFinancialOpportunity?.toLocaleString()} annual opportunity to improve. ` +
        `Your biggest vulnerability: ${ri.mostVulnerable.name.toLowerCase()}.`
      : `Your practice scored ${scores.overall} out of 100 on the Financial Resiliency Assessment, placing you in the "${level}" category. ` +
        `With $${insights.annualBilling?.toLocaleString()} in annual patient billing, ` +
        `there's an estimated $${insights.totalFinancialOpportunity?.toLocaleString()} annual opportunity to improve.`,
    topRecommendations: recommendations.slice(0, 3).map(r => r.title),
  };
}


// ============================================
// DATA EXPORT
// ============================================

function prepareExportData(formData, answers, scores, insights) {
  const name = formData.name || `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Unknown';
  return {
    timestamp: new Date().toISOString(),
    respondent: {
      name,
      email: formData.email || '',
      organization: formData.organization || formData.facilityName || '',
      practiceType: answers['practice_type'] || '',
    },
    scores: {
      overall: scores.overall,
      categories: {
        revenueCycleResilience: scores.categories[0],
        patientPaymentExperience: scores.categories[1],
        competitivePosition: scores.categories[2],
      },
    },
    answers,
    insights: {
      annualBilling: insights.annualBilling,
      arDays: insights.arDays,
      cashInAR: insights.cashInAR,
      totalFinancialOpportunity: insights.totalFinancialOpportunity,
      badDebtRate: insights.badDebtRate,
      currentBadDebt: insights.currentBadDebt,
    },
    resiliencyIndex: (() => {
      const ri = calculateResiliencyIndex(answers, scores);
      return {
        index: ri.index,
        level: ri.level,
        projectedIndex: ri.projectedIndex,
        projectedImprovement: ri.projectedImprovement,
        forces: ri.forces.map(f => ({ id: f.id, name: f.name, exposure: f.amplifiedExposure, level: f.level })),
      };
    })(),
    version: '2.0',
  };
}

function generateCSV(exportData) {
  const headers = [
    'Timestamp', 'Name', 'Email', 'Organization', 'Practice Type',
    'Overall Score', 'Revenue Cycle', 'Patient Experience', 'Competitive Position',
    'Annual Billing', 'AR Days', 'Cash in AR', 'Total Opportunity', 'Bad Debt Rate',
  ];
  const values = [
    exportData.timestamp, exportData.respondent.name, exportData.respondent.email,
    exportData.respondent.organization, exportData.respondent.practiceType,
    exportData.scores.overall, exportData.scores.categories.revenueCycleResilience,
    exportData.scores.categories.patientPaymentExperience, exportData.scores.categories.competitivePosition,
    exportData.insights.annualBilling, exportData.insights.arDays, exportData.insights.cashInAR,
    exportData.insights.totalFinancialOpportunity, exportData.insights.badDebtRate,
  ];
  return headers.join(',') + '\n' + values.map(v => `"${v}"`).join(',');
}


// ============================================
// WEBHOOK
// ============================================
const WebhookConfig = {
  url: '', // Make.com webhook URL — to be set by user
  enabled: false,
};

async function sendWebhook(data) {
  if (!WebhookConfig.enabled || !WebhookConfig.url) {
    console.log('Webhook not configured — skipping send');
    return { success: false, reason: 'not_configured' };
  }
  try {
    const response = await fetch(WebhookConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { success: response.ok, status: response.status };
  } catch (error) {
    console.error('Webhook error:', error);
    return { success: false, error: error.message };
  }
}


// ============================================
// PDF REPORT GENERATION (jsPDF)
// ============================================

function generatePDFReport(formData, answers, scores, insights, recommendations, projections) {
  if (typeof window === 'undefined' || !window.jspdf) {
    console.error('jsPDF not loaded');
    return null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const name = formData.name || `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Practice';
  const segment = answers['practice_type'] || 'PP';
  const practiceLabel = PracticeTypes[segment]?.label || 'Practice';

  // Helper: Add page header
  const addHeader = (pageNum) => {
    doc.setFillColor(7, 33, 64);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.text('PatientPay Financial Resiliency Assessment', margin, 16);
    doc.setFontSize(8);
    doc.text(`Page ${pageNum}`, pageWidth - margin, 16, { align: 'right' });
    doc.setTextColor(0);
    return 35;
  };

  // PAGE 1: Cover + Score Overview
  let y = addHeader(1);
  doc.setFontSize(24);
  doc.setTextColor(7, 33, 64);
  doc.text('Financial Resiliency Report', margin, y);
  y += 12;
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(`Prepared for: ${name}`, margin, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(`${practiceLabel} | ${new Date().toLocaleDateString()}`, margin, y);
  y += 20;

  // Resiliency Index (hero)
  const resiliency = calculateResiliencyIndex(answers, scores);
  doc.setFillColor(7, 33, 64);
  doc.roundedRect(margin, y, contentWidth, 42, 3, 3, 'F');
  doc.setFontSize(36);
  doc.setTextColor(60, 143, 199);
  doc.text(`${resiliency.index}`, margin + contentWidth / 2, y + 22, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(200);
  doc.text(`Resiliency Index — ${resiliency.level}`, margin + contentWidth / 2, y + 34, { align: 'center' });
  y += 50;

  // Overall Payment Readiness Score
  doc.setFillColor(240, 247, 255);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  doc.setFontSize(24);
  doc.setTextColor(60, 143, 199);
  doc.text(`${scores.overall}`, margin + contentWidth / 2, y + 16, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Payment Readiness Score — ${getScoreLevel(scores.overall)}`, margin + contentWidth / 2, y + 24, { align: 'center' });
  y += 35;

  // Category scores
  const catColors = [[60, 143, 199], [139, 92, 246], [252, 201, 59]];
  CategoryNames.forEach((name, i) => {
    doc.setFillColor(...catColors[i]);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.text(`${name}: ${scores.categories[i]}`, margin + 4, y + 8);
    y += 16;
  });
  y += 10;

  // Resiliency Force Breakdown
  doc.setFontSize(14);
  doc.setTextColor(7, 33, 64);
  doc.text('Resiliency Force Breakdown', margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(80);
  resiliency.forces.forEach(force => {
    const barWidth = Math.round((force.amplifiedExposure / 100) * (contentWidth - 80));
    doc.text(`${force.icon} ${force.shortName}`, margin, y + 3);
    // Exposure bar
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(margin + 55, y, contentWidth - 80, 6, 1, 1, 'F');
    if (force.amplifiedExposure > 60) doc.setFillColor(239, 68, 68);
    else if (force.amplifiedExposure > 40) doc.setFillColor(245, 158, 11);
    else if (force.amplifiedExposure > 20) doc.setFillColor(60, 143, 199);
    else doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin + 55, y, barWidth, 6, 1, 1, 'F');
    doc.setTextColor(80);
    doc.text(`${force.amplifiedExposure}%  ${force.level}`, margin + contentWidth - 20, y + 4, { align: 'right' });
    y += 10;
  });
  y += 6;

  // Projected Resiliency with PatientPay
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(`With PatientPay: Resiliency Index ${resiliency.index} → ${resiliency.projectedIndex} (+${resiliency.projectedImprovement} points)`, margin, y);
  y += 12;

  // Financial snapshot
  doc.setFontSize(14);
  doc.setTextColor(7, 33, 64);
  doc.text('Financial Snapshot', margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(80);
  const financials = [
    ['Annual Patient Billing', `$${insights.annualBilling?.toLocaleString()}`],
    ['Current AR Days', `${insights.arDays} days`],
    ['Cash Stuck in AR', `$${insights.cashInAR?.toLocaleString()}`],
    ['Annual Bad Debt', `$${insights.currentBadDebt?.toLocaleString()}`],
    ['Total Annual Opportunity', `$${insights.totalFinancialOpportunity?.toLocaleString()}`],
  ];
  financials.forEach(([label, val]) => {
    doc.text(label, margin, y);
    doc.text(val, margin + contentWidth, y, { align: 'right' });
    y += 6;
  });

  // PAGE 2: Recommendations
  doc.addPage();
  y = addHeader(2);
  doc.setFontSize(18);
  doc.setTextColor(7, 33, 64);
  doc.text('Top Recommendations', margin, y);
  y += 12;

  const topRecs = recommendations.slice(0, 5);
  topRecs.forEach((rec, i) => {
    if (y > 260) { doc.addPage(); y = addHeader(3); }
    doc.setFillColor(240, 247, 255);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setTextColor(7, 33, 64);
    doc.text(`${i + 1}. ${rec.title}`, margin + 4, y + 8);
    doc.setFontSize(9);
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(rec.description, contentWidth - 8);
    doc.text(descLines, margin + 4, y + 15);
    y += 28;
  });

  // PAGE 3: Score Projection
  if (projections) {
    y += 10;
    if (y > 230) { doc.addPage(); y = addHeader(3); }
    doc.setFontSize(18);
    doc.setTextColor(7, 33, 64);
    doc.text('With PatientPay', margin, y);
    y += 12;
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(`Current Score: ${projections.current?.overall || scores.overall}`, margin, y);
    y += 7;
    doc.setTextColor(16, 185, 129);
    doc.text(`Projected Score: ${projections.projected?.overall || scores.overall} (+${projections.overallImprovement || 0} points)`, margin, y);
    y += 12;

    if (projections.categoryImprovements) {
      projections.categoryImprovements.forEach((cat, i) => {
        doc.setTextColor(80);
        doc.setFontSize(10);
        doc.text(`${cat.categoryName || cat.name}: ${cat.currentScore || cat.current} → ${cat.projectedScore || cat.projected} (+${cat.improvement})`, margin, y);
        y += 6;
      });
    }
  }

  // Footer on last page
  y = 280;
  doc.setDrawColor(200);
  doc.line(margin, y - 5, pageWidth - margin, y - 5);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Generated by PatientPay Financial Resiliency Assessment | patientpay.com', margin, y);

  return doc;
}

function downloadPDFReport(formData, answers, scores, insights, recommendations, projections) {
  const doc = generatePDFReport(formData, answers, scores, insights, recommendations, projections);
  if (doc) {
    const name = formData.name || formData.organization || 'Practice';
    doc.save(`PatientPay-Resiliency-Report-${name.replace(/\s+/g, '-')}.pdf`);
    return true;
  }
  return false;
}


// ============================================
// EXPORT — window.AssessmentEngine
// ============================================
window.AssessmentEngine = {
  // Data
  practiceTypes: PracticeTypes,
  facilityTypes: PracticeTypes,          // backwards compat alias
  questions: Questions,
  categoryNames: CategoryNames,
  snfCategoryNames: CategoryNames,       // backwards compat alias
  industryStats: IndustryStats,
  industryBenchmarks: IndustryBenchmarks,
  assessmentColors: AssessmentColors,
  sourceCitations: SourceCitations,
  resultsFlow: ResultsFlow,
  resultsFlowV47: ResultsFlowV47,
  recommendationDefinitions: RecommendationDefinitions,
  projectionConfig: PatientPayProjectionConfig,
  webhookConfig: WebhookConfig,

  // Core functions
  getVisibleQuestions,
  calculateQuestionScore,
  calculateScores,
  getScoreLevel,
  getScoreColor,
  interpolateColor,
  getGradientColor,
  getCategoryName,

  // Analysis functions
  calculateInsights,
  getGapAnalysis,
  getStrengths,
  getActionableRecommendations,
  calculatePatientPayProjections,
  getPerformanceVsBenchmark,
  generateResultsSummary,

  // Resiliency Index
  resiliencyForces: ResiliencyForces,
  calculateResiliencyIndex,
  getResiliencyColor,
  getExposureColor,

  // Export functions
  prepareExportData,
  generateCSV,
  sendWebhook,
  generatePDFReport,
  downloadPDFReport,
};
