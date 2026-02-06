/**
 * PatientPay Senior Living Payment Readiness Assessment
 * CORE ENGINE - Version 4.13
 *
 * This file contains all business logic, calculations, and data.
 * It is UI-agnostic and can be used with any presentation layer.
 *
 * DO NOT MODIFY unless changing business logic, scoring, or questions.
 * UI changes should be made in the UI layer files only.
 *
 * V4.13 Changes (Exec Team Review):
 * - SPLIT: snf_payment_methods into two questions:
 *   - snf_payment_channels: How patients can pay (onsite, portal, text-to-pay, phone)
 *   - snf_payment_types: What payment types accepted (credit cards, debit, ACH, checks, cash)
 * - snf_convenience_fee now conditional on snf_payment_types includes credit_cards
 * - REMOVED: "We haven't needed to do this" option from statement_recipients (SL/MC/CCRC)
 * - Updated all scoring, recommendations, and insights to use new question IDs
 *
 * V4.12.2 Changes (SNF Payment Plans):
 * - NEW: snf_payment_plans question - asks about self-service payment plan capability
 *   - 3 options: no plans, manual process, fully automated self-service
 *   - Cross-category scoring: 65% Collection Efficiency, 35% Family Experience
 * - NEW: Payment plan recommendations (enable_snf_payment_plans, automate_snf_payment_plans)
 * - NEW: Payment plan financial insights:
 *   - Estimates difficult balances (15% of annual billing)
 *   - Calculates recovery improvement (12% → 50% with automated plans)
 *   - Added paymentPlanOpportunity to totalFinancialOpportunity
 *
 * V4.11 Changes (SNF Financial Impact Focus):
 * - REPLACED: snf_payer_mix (3-field) with snf_monthly_patient_billing (currency input)
 *   - Direct dollar input is more meaningful than payer percentages
 *   - Users know their monthly patient billing; they may not know exact payer mix
 * - NEW: snf_patient_ar_days - How long to collect patient balances (slider 15-120 days)
 *   - Enables powerful ROI projections based on PatientPay success stories
 * - ENHANCED: Financial calculations now show:
 *   - Cash stuck in AR (monthly billing × AR days / 30)
 *   - Projected AR reduction (47% based on Lake Washington PT case study)
 *   - Cash freed with PatientPay
 *   - Bad debt reduction (40% based on Encore case study)
 *   - Total annual financial impact
 * - ENHANCED: Results and PDF now prominently display dollar impact
 * - PatientPay Success Story Metrics Used:
 *   - 47% AR days reduction (Lake Washington: 45→20 days)
 *   - 40% bad debt reduction (Encore)
 *   - 2X cash collections (IRG, Alpine)
 *   - 25% more collected in first 30 days (IRG)
 *   - 60% text-to-pay rate vs 43% industry average (IRG)
 *
 * V4.10 Changes (SNF Option A - Simplified Patient Responsibility Collection):
 * - PHILOSOPHY: Only ask about things PatientPay actually fixes
 * - EXCLUDED: SNF from statement_processing and pcc_integration (generic ops questions)
 * - RENAMED: SNF categories from "Operational Readiness" to "Collection Efficiency"
 * - SNF questions focused on patient responsibility collection
 *
 * V4.13 Changes (SNF Payment Question Split):
 * - SPLIT: snf_payment_methods into two questions:
 *   - snf_payment_channels: How patients can pay (onsite, portal, text-to-pay, phone)
 *   - snf_payment_types: What payment types accepted (credit cards, debit, ACH, checks, cash)
 * - snf_convenience_fee now conditional on snf_payment_types includes credit_cards
 * - Updated all references throughout scoring, recommendations, and insights
 *
 * V4.9 Changes (SNF Assessment Overhaul - retained concepts):
 * - snf_payer_mix: 3-field input for precise Medicare/Medicaid/Private Pay %
 * - snf_collection_rate: Slider input (40-100%)
 * - snf_autopay: Standalone with conditional enrollment slider
 * - SNF financial calculations use exact patient counts from payer mix
 *
 * V4.8 Changes (Results UX Overhaul):
 * - New results flow: Overview → Strengths → Opportunities → Improvements → Vision → Next Steps
 * - Strengths fallback logic for low-scoring users
 * - Credit card fee savings calculations
 * - PatientPay projections with cumulative scoring
 *
 * V4.6 Changes (SNF Complete Redesign - retained):
 * - SNF uses "patient" not "resident" throughout (clinical accuracy)
 * - SNF uses "Patient & Family Experience" category name
 * - SNF diagnostic questions asked first for context
 *
 * V4.5 Changes:
 * - pcc_integration only shows for "Partially automated" (skip if manual or full PCC)
 * - autopay_rate moved as immediate sub-question after payment_methods
 * - Added autopay AR impact calculations (arDaysReductionFromAutopay, cashFreedByAutopay)
 * - Fixed PDF logo to use white background instead of changing brand colors
 *
 * V4.4 Changes (Claude.ai Review):
 * - NEW: multi_guarantor_capability question (replaces payers_per_resident)
 *   - Cross-category scoring: Ops 50% / Family 50%
 *   - Measures CAPABILITY, not reality (which was problematic)
 * - NEW: multi_guarantor_adoption conditional slider (if capability exists)
 * - NEW: multi_guarantor_payers diagnostic question (no scoring, feeds insights)
 * - NEW: family_satisfaction question for SL, MC, CCRC
 * - REMOVED: payers_per_resident (replaced by multi-guarantor flow)
 * - REMOVED: competitive_awareness (replaced by family_satisfaction)
 * - REMOVED: mc_family_management, mc_family_contacts, mc_collections (redundant)
 * - REMOVED: ccrc_multi_level, ccrc_entrance_fee, ccrc_contract_types (outside scope)
 * - UPDATED: SL category weights to 30% Ops / 45% Family / 25% Competitive
 * - UPDATED: Results use industry benchmarks instead of peer comparisons
 * - UPDATED: tour_billing opportunity flagging when score ≤ 45
 *
 * V4.3 Changes:
 * - Enhanced PDF report with PatientPay branding and deeper insights
 * - Added ROI calculations and industry benchmark comparisons
 * - Category-specific analysis with action items
 * - 5-page professional report format
 * - New conditional types: hideIfIncludesAny, showIfIncludesAny
 * - payment_demand now conditional (hidden if cards already accepted)
 * - Added convenience_fee question (conditional on card acceptance)
 * - Added tour_billing question for competitive positioning
 * - Reordered questions: Operations → Family → Competitive flow
 * - Reordered options: least sophisticated first, most sophisticated last
 *
 * V4.2 Changes:
 * - Cross-category scoring: questions can contribute to multiple categories
 *   - coordination_burden: Ops 70%, Family 30% (staff burden CAUSED by family confusion)
 *   - payment_methods: Family 70%, Competitive 30% (67% would choose card-accepting facility)
 * - Question flow optimized
 *
 * V4.1 Changes:
 * - Combined IL + AL into single "Senior Living" (SL) segment
 * - Facility type moved to contact form
 * - PointClickCare assumption (pcc_integration question)
 * - Autopay reframed as "automated recurring payments"
 *
 * V4.0 Changes:
 * - SNF uses TWO categories only: Operations (60%) + Family Experience (40%)
 * - Removed Competitive Position category from SNF (not relevant due to referral dynamics)
 * - Updated SNF questions to focus on operations and family enablement
 * - Simplified webhook payload (~30 fields instead of 200+)
 *
 * Previous version archived at: core/assessment-engine-v4.3-archive.js
 */

// ============================================
// FACILITY TYPES (SEGMENT ROUTING)
// ============================================
const FacilityTypes = {
  // V4.1: Combined Independent Living and Assisted Living into single "Senior Living" segment
  // Rationale: Same questions asked for both, differences in payer mix (95% vs 66% private pay)
  // and AR days (30-40 vs 45-60) don't justify separate scoring paths
  // Using AL's more conservative weights as they represent the more operationally complex scenario
  SL: {
    id: 'SL',
    label: 'Independent / Assisted Living',
    description: 'Independent seniors with amenities OR support with daily activities like bathing, dressing, medication',
    // Category weights: [Operational, Family Experience, Competitive]
    // V4.4: Updated weights - Family Experience is primary value prop
    categoryWeights: [0.30, 0.45, 0.25],
    characteristics: {
      payerMix: '66-95%+ private pay',
      arDaysRange: '30-60 days',
      complexity: 'Simple to Moderate',
      keyFocus: 'Multi-guarantor billing, payment flexibility, autopay adoption, family transparency'
    }
  },
  MC: {
    id: 'MC',
    label: 'Memory Care',
    description: 'Specialized care for residents with Alzheimer\'s or other dementias',
    categoryWeights: [0.25, 0.55, 0.20],
    characteristics: {
      payerMix: '80%+ private pay',
      arDaysRange: '40-50 days',
      complexity: 'Moderate',
      keyFocus: 'Family portal, multi-payer coordination, sensitive collections'
    }
  },
  SNF: {
    id: 'SNF',
    label: 'Skilled Nursing Facility',
    description: '24/7 clinical care including nursing, therapy, and rehabilitation',
    // V4.10: SNF uses TWO categories: Collection Efficiency (60%) + Family Experience (40%)
    // Competitive Position not relevant for SNF (referral dynamics, not family comparison shopping)
    categoryWeights: [0.60, 0.40, 0], // [Collection Efficiency, Family Experience, Competitive (unused)]
    useTwoCategories: true, // Flag for scoring calculations
    characteristics: {
      payerMix: '~25% private pay, 60% Medicaid, 15% Medicare',
      arDaysRange: '56+ days (industry typical)',
      complexity: 'Complex (but PatientPay focuses on patient responsibility only)',
      keyFocus: 'Patient responsibility collection, autopay, multi-guarantor billing'
    }
  },
  CCRC: {
    id: 'CCRC',
    label: 'CCRC / Life Plan Community',
    description: 'Multiple care levels (IL, AL, MC, SNF) on one campus',
    categoryWeights: [0.25, 0.45, 0.30],
    characteristics: {
      payerMix: '85% private pay',
      arDaysRange: '16-19 days (best performance)',
      complexity: 'Moderate',
      keyFocus: 'Multi-level coordination, premium experience, long-term relationship'
    }
  }
};

// ============================================
// BRAND COLORS (shared across all UIs)
// ============================================
const AssessmentColors = {
  primary: '#072140',      // Dark navy - primary brand
  secondary: '#3c8fc7',    // Bright blue - interactive elements
  accent: '#fcc93b',       // Yellow - highlights, CTAs
  success: '#10B981',      // Green - positive indicators
  warning: '#F59E0B',      // Amber - caution
  error: '#EF4444',        // Red - critical

  // Temperature scale for slider visualization
  tempScale: {
    freezing: '#3B82F6',   // Blue - excellent
    cold: '#06B6D4',       // Cyan - good
    cool: '#10B981',       // Green - acceptable
    mild: '#84CC16',       // Lime - caution
    warm: '#EAB308',       // Yellow - warning
    hot: '#F97316',        // Orange - concern
    burning: '#EF4444',    // Red - critical
  },

  // Category theme colors
  categories: {
    operational: '#3c8fc7',    // Blue
    family: '#8B5CF6',         // Purple
    competitive: '#F59E0B',    // Amber
  },

  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
  }
};

// ============================================
// INDUSTRY STATISTICS (segment-aware)
// ============================================
const IndustryStats = {
  // Universal stats
  universal: {
    operational: [
      { stat: "96%", context: "Reduction in processing time with automation", source: "TransactCare/Oaks Senior Living", sourceRef: 2 },
      { stat: "42%", context: "Finance team time spent on manual payment management", source: "TransactCare", sourceRef: 2 },
      { stat: "10 min → 15 sec", context: "Statement processing time: manual vs. automated", source: "TransactCare", sourceRef: 2 },
    ],
    experience: [
      { stat: "63 million", context: "Americans serve as caregivers", source: "AARP", sourceRef: 4 },
      { stat: "72%", context: "Less likely to miss payments with unified billing", source: "Healthcare Payment Surveys", sourceRef: 9 },
      { stat: "37%", context: "Have missed bills due to payment complexity", source: "Healthcare Payment Surveys", sourceRef: 9 },
    ],
    competitive: [
      { stat: "75%", context: "Want card payment options for long-term care", source: "CareGrove/Visa Research", sourceRef: 11 },
      { stat: "67%", context: "Would choose a facility that accepts cards over one that doesn't", source: "CareGrove Research", sourceRef: 11 },
      { stat: "82%", context: "Of consumers prefer digital payments", source: "Industry Analysis", sourceRef: 2 },
    ]
  },
  // Segment-specific stats
  // V4.1: Combined IL+AL into SL (Senior Living)
  SL: {
    operational: [
      { stat: "30-60 days", context: "Typical A/R days for Senior Living (IL: 30-40, AL: 45-60)", source: "Industry Analysis", sourceRef: 1 },
      { stat: "66-95%+", context: "Private pay payer mix (IL: 95%+, AL: 66%)", source: "Industry Analysis", sourceRef: 1 },
      { stat: "87-90%", context: "Current occupancy rates", source: "NIC MAP", sourceRef: 5 },
    ],
    experience: [
      { stat: "75%", context: "Want credit/debit card options", source: "CareGrove/Visa", sourceRef: 11 },
      { stat: "~100%", context: "Would consider autopay enrollment", source: "CareGrove", sourceRef: 7 },
      { stat: "69%", context: "Willing to pay convenience fee for cards", source: "CareGrove/Visa", sourceRef: 11 },
    ]
  },
  MC: {
    operational: [
      { stat: "40-50 days", context: "Typical A/R days for Memory Care", source: "Industry Analysis", sourceRef: 1 },
      { stat: "80%+", context: "Private pay payer mix", source: "Industry Analysis", sourceRef: 1 },
    ],
    experience: [
      { stat: "11+ million", context: "Americans provide unpaid care to those with dementia", source: "Alzheimer's Association", sourceRef: 4 },
      { stat: "Nearly all", context: "Memory Care finances managed by family members", source: "Industry Analysis", sourceRef: 1 },
      { stat: "50-60%", context: "Annual turnover rate", source: "Industry Analysis", sourceRef: 1 },
    ]
  },
  SNF: {
    operational: [
      { stat: "56-100+ days", context: "Typical A/R days (target: 30-40)", source: "Richter Healthcare", sourceRef: 1 },
      { stat: "95%+", context: "Target clean claims rate", source: "Industry Analysis", sourceRef: 1 },
      { stat: "<10%", context: "Target A/R over 120 days", source: "GMA CPAs", sourceRef: 1 },
    ],
    experience: [
      { stat: "23%", context: "Private pay payer mix", source: "KFF", sourceRef: 1 },
      { stat: "63%", context: "Medicaid payer mix", source: "KFF", sourceRef: 1 },
      { stat: "14%", context: "Medicare payer mix", source: "KFF", sourceRef: 1 },
    ],
    competitive: [
      { stat: "10-20%", context: "Recovery rate for A/R over 120 days", source: "Medical Billers", sourceRef: 1 },
      { stat: "83.3%", context: "Current occupancy (recovery from 67.5% pandemic low)", source: "NIC MAP", sourceRef: 5 },
      { stat: "0.6%", context: "Median SNF operating margin", source: "Industry Analysis", sourceRef: 1 },
    ]
  },
  CCRC: {
    operational: [
      { stat: "16-19 days", context: "Typical A/R days (BEST in industry!)", source: "CARF-Ziegler", sourceRef: 1 },
      { stat: "85%", context: "Private pay payer mix", source: "Industry Analysis", sourceRef: 1 },
      { stat: "Nearly all", context: "Top providers have EMR adoption", source: "Ziegler", sourceRef: 1 },
    ],
    experience: [
      { stat: "10-12 years", context: "Average resident tenure", source: "Industry Analysis", sourceRef: 1 },
      { stat: "$400K", context: "Average entrance fee", source: "Ziegler", sourceRef: 1 },
      { stat: "86-90%", context: "Current occupancy rate", source: "NIC MAP", sourceRef: 5 },
    ]
  }
};

// ============================================
// INDUSTRY BENCHMARKS FOR RESULTS COMPARISON (V4.4)
// Used for comparing user scores vs industry benchmarks
// Replaces peer comparison language with benchmark comparisons
// ============================================
const IndustryBenchmarks = {
  SL: {
    overall: 58,
    operations: 55,
    family: 60,
    competitive: 58,
    label: 'Senior Living'
  },
  MC: {
    overall: 52,
    operations: 48,
    family: 55,
    competitive: 52,
    label: 'Memory Care'
  },
  SNF: {
    overall: 48,
    operations: 45,
    family: 52,
    // No competitive for SNF (2-category model)
    label: 'Skilled Nursing'
  },
  CCRC: {
    overall: 62,
    operations: 58,
    family: 65,
    competitive: 62,
    label: 'CCRC / Life Plan'
  }
};

/**
 * Get performance label comparing user score to industry benchmark
 * V4.4: Replaces peer comparison language
 * @param {number} score - User's score
 * @param {number} benchmark - Industry benchmark
 * @returns {string} - Performance label
 */
function getPerformanceVsBenchmark(score, benchmark) {
  const diff = score - benchmark;
  if (diff >= 15) return 'significantly above';
  if (diff >= 5) return 'above';
  if (diff >= -5) return 'near';
  if (diff >= -15) return 'below';
  return 'significantly below';
}

// ============================================
// QUESTION DEFINITIONS - V4.11 Financial Impact Focus
//
// V4.11 PHILOSOPHY: Ask questions that directly connect to ROI
// SNF assessment captures dollars and days for powerful projections
//
// SNF FLOW (V4.11 - Financial Impact):
// Categories: Collection Efficiency (60%) + Family Experience (40%)
//
// 1. CONTEXT (diagnostic, no scoring):
//    - snf_annual_patients (exact number input)
//    - snf_monthly_patient_billing (currency input - what they bill patients)
//    - snf_patient_ar_days (slider - how long to collect)
//
// 2. COLLECTION EFFICIENCY (scored):
//    - snf_collection_rate (slider 40-100%)
//    - snf_payment_channels (multi-select: onsite, portal, text-to-pay, phone)
//    - snf_payment_types (multi-select: credit cards, debit, ACH, checks, cash)
//    - snf_convenience_fee (conditional on credit cards)
//    - snf_autopay + snf_autopay_enrollment (conditional)
//
// 3. FAMILY EXPERIENCE (scored):
//    - snf_multi_guarantor
//    - snf_family_satisfaction
//
// TOTAL: 8 questions (3 diagnostic + 5-6 scored depending on autopay conditional)
//
// V4.11 FINANCIAL IMPACT CALCULATIONS:
// - Cash stuck in AR = monthly_billing × ar_days / 30
// - AR reduction = 47% (Lake Washington PT case study)
// - Bad debt reduction = 40% (Encore case study)
// - Cash freed = cash_in_ar × 0.47
// - Annual bad debt savings = annual_billing × 0.03 × 0.40
//
// NON-SNF FLOW (V4.4 - unchanged):
// 1. OPERATIONS: statement_processing, pcc_integration, coordination_burden
// 2. FAMILY EXPERIENCE: multi_guarantor_*, statement_recipients, payment_methods, etc.
// 3. COMPETITIVE: payment_demand, tour_billing
// ============================================
const Questions = [
  // ========================================
  // ROUTING QUESTION (Q0) - Skipped if facility_type already set from contact form
  // ========================================
  {
    id: 'facility_type',
    category: null, // Not scored
    categoryIndex: null,
    question: "What type of senior care community are you?",
    type: "single",
    isRoutingQuestion: true,
    // V4.1: IL+AL combined into SL (Senior Living)
    options: [
      { label: "Independent / Assisted Living", value: "SL", description: "Active seniors with amenities OR support with daily activities like bathing, dressing, medication" },
      { label: "Memory Care", value: "MC", description: "Specialized care for residents with Alzheimer's or other dementias" },
      { label: "Skilled Nursing Facility (SNF)", value: "SNF", description: "24/7 clinical care including nursing, therapy, and rehabilitation" },
      { label: "CCRC / Life Plan Community", value: "CCRC", description: "Multiple care levels (IL, AL, MC, SNF) on one campus" }
    ]
  },

  // ========================================
  // SNF CONTEXT QUESTIONS (Asked First for SNF)
  // V4.6: These diagnostic questions appear BEFORE operational questions for SNF users
  // to establish context and validate their world before diving into specifics
  // ========================================

  // SNF-CTX1: Annual Patient Count (V4.9 - exact number input)
  // Enables precise calculations: patients × payer_mix = exact patient counts by payer type
  {
    id: 'snf_annual_patients',
    category: null, // Diagnostic - no scoring
    categoryIndex: null,
    isDiagnostic: true,
    question: "How many patients does your facility serve annually?",
    subtext: "Include short-term rehab and long-term care. This enables precise financial calculations.",
    type: "number", // V4.9: Exact number input per spec
    segments: ['SNF'],
    min: 50,
    max: 2000,
    default: 400,
    unit: "patients/year"
  },

  // SNF-CTX1b: Payer Sources (V4.14 - diagnostic credibility question)
  // V4.14: Shows we understand their world - no scoring, not in results
  {
    id: 'snf_payer_sources',
    category: null, // Diagnostic - no scoring
    categoryIndex: null,
    isDiagnostic: true,
    question: "What payer sources does your organization accept?",
    subtext: "Select all that apply",
    type: "multi",
    segments: ['SNF'],
    options: [
      { label: "Medicaid", value: "medicaid" },
      { label: "Medicare", value: "medicare" },
      { label: "Medicare Advantage", value: "medicare_advantage" },
      { label: "Private Pay", value: "private_pay" },
      { label: "Private Insurance", value: "private_insurance" },
      { label: "Other", value: "other" }
    ]
    // No scoring function - purely diagnostic for credibility
  },

  // SNF-CTX2: Monthly Patient Billing Volume (V4.11 - replaces payer mix)
  // V4.11: Simplified to ask directly about patient responsibility billing
  // This is more meaningful than payer mix because it's what PatientPay actually optimizes
  {
    id: 'snf_monthly_patient_billing',
    category: null, // Diagnostic - no scoring
    categoryIndex: null,
    isDiagnostic: true,
    question: "How much does your facility bill directly to patients and families each month?",
    subtext: "Include private pay and Medicare coinsurance (days 21-100). Exclude claims billed to Medicare/Medicaid payers.",
    type: "currency", // V4.11: New currency input type
    segments: ['SNF'],
    min: 10000,
    max: 750000,
    step: 5000,
    default: 75000,
    unit: "per month",
    formatPrefix: "$",
    insight: {
      trigger: (value) => value >= 50000,
      message: "Your patient responsibility revenue is exactly what PatientPay optimizes - faster collection, lower bad debt, better family experience.",
      proofPoint: "Facilities see 2X cash collections and 40% reduction in bad debt"
    }
  },

  // SNF-CTX3: Current AR Days for Patient Balances (V4.11 - NEW)
  // V4.11: Directly measures collection speed - key metric for ROI calculation
  {
    id: 'snf_patient_ar_days',
    category: null, // Diagnostic - no scoring
    categoryIndex: null,
    isDiagnostic: true,
    question: "On average, how long does it take to collect patient responsibility balances?",
    subtext: "From statement sent to payment received. SNF industry average is 56-60 days; best practice is 30-40 days.",
    type: "slider",
    segments: ['SNF'],
    min: 15,
    max: 120,
    step: 5,
    default: 60,
    unit: "days",
    benchmark: 35, // Best practice target
    benchmarkLabel: "Best Practice: 30-40 days",
    insight: {
      trigger: (value) => value > 45,
      message: "Facilities using PatientPay see a 47% reduction in AR days - from 45 days to 20 days on average.",
      proofPoint: "Lake Washington PT: AR days dropped from 45 to 20 within the first month"
    }
  },

  // V4.10: snf_primary_challenge REMOVED - Option A simplification
  // Was asking about challenges PatientPay doesn't address (claims, staffing)
  // Keeping assessment focused on patient responsibility collection

  // ========================================
  // SECTION 1: OPERATIONAL READINESS (Universal)
  // How efficient is your billing process?
  // ========================================

  // OP1: Statement Processing Method
  // V4.6: Added segmentText for SNF "patient" vs "resident" terminology
  {
    id: 'statement_processing',
    category: "Operational Readiness",
    categoryIndex: 0,
    question: "How do you currently process billing statements?",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'], // V4.10: SNF excluded - Option A focuses on patient responsibility collection
    // V4.3: Least sophisticated first
    options: [
      { label: "Entirely manual (print, stuff, mail)", score: 10 },
      { label: "Mostly manual with spreadsheet tracking", score: 35 },
      { label: "Partially automated with some manual steps", score: 65 },
      { label: "Fully automated with PCC integration", score: 100 }
    ],
    insight: {
      trigger: ["Mostly manual with spreadsheet tracking", "Entirely manual (print, stuff, mail)"],
      message: "Manual statement processing takes approximately 10 minutes per statement. Automation reduces this to 15 seconds - a 96% time savings.",
      proofPoint: "42% of finance staff time is spent on manual payment management"
    }
  },

  // OP2: PointClickCare Integration Level
  // V4.5: Only show as sub-question when statement_processing is "Partially automated"
  // If manual (entirely/mostly), we KNOW they're not PCC integrated - auto-score as not integrated
  // If fully automated with PCC, we KNOW they're fully integrated - skip entirely
  // Only ask this question to clarify the "partial automation" scenario
  {
    id: 'pcc_integration',
    category: "Operational Readiness",
    categoryIndex: 0,
    question: "How is your partial automation integrated with PointClickCare?",
    subtext: "This helps us understand where your manual steps occur",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'], // V4.10: SNF excluded - Option A focuses on patient responsibility collection
    isSubQuestion: true, // V4.5: Render as indented sub-question in UI
    conditional: {
      questionId: 'statement_processing',
      // Only show for partially automated - manual = not integrated, full PCC = already integrated
      showIfIncludesAny: ["Partially automated with some manual steps"]
    },
    // V4.5: Removed "Not sure" and "Fully integrated" - they picked partial, so we only offer partial options
    options: [
      { label: "Separate systems - billing is managed outside PointClickCare", score: 35 },
      { label: "Partially integrated - some manual data entry between systems", score: 65 }
    ],
    // V4.5: Auto-scoring for skipped scenarios handled in calculateScores
    autoScore: {
      // When statement_processing is manual, assume not integrated (lowest score)
      whenParentIs: ["Entirely manual (print, stuff, mail)", "Mostly manual with spreadsheet tracking"],
      score: 25
    },
    insight: {
      trigger: ["Separate systems - billing is managed outside PointClickCare"],
      message: "Full PointClickCare integration eliminates duplicate data entry and reduces billing errors. PatientPay integrates directly with PointClickCare for seamless statement generation.",
      proofPoint: "96% reduction in processing time with automation"
    }
  },

  // OP3: Family Coordination Burden
  // V4.2: Cross-category scoring - staff burden (Ops 70%) is CAUSED by family confusion (Family 30%)
  // V4.6: SNF excluded - they have dedicated context and collection questions
  {
    id: 'coordination_burden',
    category: "Operational Readiness",
    categoryIndex: 0,
    categoryWeights: [
      { index: 0, weight: 0.70 }, // Operations (primary)
      { index: 1, weight: 0.30 }  // Family Experience (secondary)
    ],
    // V4.14: Reframed from hours to staff count - more intuitive for users
    question: "How many staff members regularly handle billing questions and payment inquiries from families?",
    subtext: "Include anyone who spends significant time on 'who paid what?' calls, payment status questions, or helping families understand their bills.",
    type: "slider",
    segments: ['SL', 'MC', 'CCRC'], // V4.6: SNF excluded - has own flow
    min: 0,
    max: 10,
    step: 1,
    default: 2,
    unit: "staff",
    // V4.14: Scoring based on staff count - fewer = more efficient
    scoring: (val) => {
      if (val <= 1) return 100;  // Minimal burden or highly efficient
      if (val === 2) return 75;  // Normal for small-medium facility
      if (val <= 4) return 50;   // Moderate burden, room for improvement
      if (val <= 6) return 35;   // High burden, significant opportunity
      return 20;                  // Very high burden, major opportunity
    },
    insight: {
      trigger: (val) => val >= 2,
      message: "37% of families have missed bills due to payment complexity. Self-service portals with individual family member access dramatically reduce these inquiries.",
      annualCostCalculation: true
    }
  },

  // ========================================
  // SECTION 2: RESIDENT & FAMILY EXPERIENCE (Universal)
  // What's the family billing experience like?
  // ========================================

  // FAM1: Multi-Guarantor CAPABILITY (V4.4 - replaces payers_per_resident)
  // This measures capability, not reality. Cross-category: Ops 50% / Family 50%
  // V4.6: SNF has its own multi-guarantor question (snf_multi_guarantor) focused on patient responsibility
  {
    id: 'multi_guarantor_capability',
    category: "Resident & Family Experience",
    categoryIndex: 1,
    categoryWeights: [
      { index: 0, weight: 0.50 }, // Operations (manual effort impact)
      { index: 1, weight: 0.50 }  // Family Experience (confusion impact)
    ],
    question: "Do you offer multi-guarantor billing (splitting a resident's bill among multiple family members)?",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'], // V4.6: SNF uses snf_multi_guarantor instead
    options: [
      { label: "No, we can only bill one responsible party", value: "no", score: 20 },
      { label: "Yes, but it requires significant manual effort", value: "yes_manual", score: 50 },
      { label: "Yes, with some automation but still labor-intensive", value: "yes_partial", score: 70 },
      { label: "Yes, fully automated with individual statements to each payer", value: "yes_automated", score: 100 }
    ],
    insight: {
      trigger: ["No, we can only bill one responsible party", "Yes, but it requires significant manual effort"],
      message: "62% of caregivers share responsibilities with others. Multi-guarantor billing eliminates 'who paid what?' confusion by giving each family member their own statement.",
      proofPoint: "70% of caregivers spend 2+ hours resolving billing errors"
    }
  },

  // FAM1b: Multi-Guarantor ADOPTION (V4.4 - conditional on capability)
  // V4.6: SNF excluded - they have separate flow
  {
    id: 'multi_guarantor_adoption',
    category: "Resident & Family Experience",
    categoryIndex: 1,
    question: "What percentage of your residents use multi-guarantor billing?",
    type: "slider",
    segments: ['SL', 'MC', 'CCRC'], // V4.6: SNF excluded
    conditional: {
      questionId: 'multi_guarantor_capability',
      showIfIncludesAny: ["yes_manual", "yes_partial", "yes_automated"]
    },
    min: 0,
    max: 100,
    default: 30,
    unit: "%",
    benchmark: 45,
    benchmarkLabel: "High adoption: 45%+ | Average: 25-35%",
    scoring: (val) => {
      if (val >= 60) return 100;
      if (val >= 45) return 80;
      if (val >= 30) return 65;
      if (val >= 15) return 50;
      return 35;
    },
    insight: {
      trigger: (val) => val < 40,
      message: "Your {value}% multi-guarantor adoption rate suggests many families who could benefit from split billing aren't using it. Proactive enrollment can reduce coordination burden.",
      proofPoint: "Families with split billing are 72% less likely to miss payments"
    }
  },

  // FAM1c: Multi-Guarantor PAYERS COUNT (V4.14 - slider, diagnostic only)
  // V4.14: Changed from single-select to slider 1-8 for precise data capture
  // V4.6: SNF excluded - they have separate flow
  {
    id: 'multi_guarantor_payers',
    category: null, // Diagnostic - no category scoring
    categoryIndex: null,
    isDiagnostic: true,
    question: "For residents with multi-guarantor billing, how many family members typically share the bill?",
    subtext: "From adult children to extended family members sharing financial responsibility",
    type: "slider",
    segments: ['SL', 'MC', 'CCRC'], // V4.6: SNF excluded
    conditional: {
      questionId: 'multi_guarantor_capability',
      showIfIncludesAny: ["yes_manual", "yes_partial", "yes_automated"]
    },
    min: 1,
    max: 8,
    step: 1,
    default: 2,
    unit: " family members",
    insightUse: "Feeds financial insight calculations for total payers managed"
  },

  // FAM2: Statement Recipients (Multi-Guarantor Capability)
  // V4.6: SNF excluded - they have separate flow (snf_multi_guarantor covers this)
  // V4.13: Removed "We haven't needed to do this" option - not applicable given flow context
  {
    id: 'statement_recipients',
    category: "Resident & Family Experience",
    categoryIndex: 1,
    question: "For residents with multiple family members involved, can you send separate statements to each person?",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'], // V4.6: SNF excluded
    conditional: {
      questionId: 'multi_guarantor_capability',
      hideIfIncludesAny: ["no", "No, we can only bill one responsible party"]
    },
    options: [
      { label: "No, we can only send statements to one person", score: 20 },
      { label: "We can CC multiple people on the same statement", score: 50 },
      { label: "Yes, each family member gets their own statement for their portion", score: 100 }
    ],
    insight: {
      trigger: ["No, we can only send statements to one person"],
      message: "When one family member receives the bill and has to chase siblings for their share, 37% of payments get missed. Individual statements eliminate this coordination burden.",
      proofPoint: "PatientPay's multi-guarantor billing sends individual statements with individual payment preferences per family member"
    }
  },

  // FAM3: Payment Methods Accepted
  // V4.2: Cross-category scoring - Family (70%) + Competitive (30%)
  // Note: autopay_rate and convenience_fee questions are conditional on this answer
  // V4.13: SNF has its own split questions (snf_payment_channels + snf_payment_types)
  {
    id: 'payment_methods',
    category: "Resident & Family Experience",
    categoryIndex: 1,
    categoryWeights: [
      { index: 1, weight: 0.70 }, // Family Experience (primary)
      { index: 2, weight: 0.30 }  // Competitive Position (secondary)
    ],
    question: "Which payment methods do you currently accept from families?",
    type: "multi",
    segments: ['SL', 'MC', 'CCRC'], // V4.13: SNF uses snf_payment_channels + snf_payment_types
    options: [
      { label: "Paper checks / money orders", score: 10 },
      { label: "ACH / bank transfer", score: 20 },
      { label: "Credit cards", score: 25 },
      { label: "Debit cards", score: 25 },
      { label: "Automated recurring payments available", score: 20 }
    ],
    maxScore: 100,
    exclusiveOption: {
      label: "Paper checks only",
      score: 10,
      insight: "75% of long-term care bill payers want credit/debit card options. 67% would choose a facility that accepts cards over one that doesn't."
    }
  },

  // FAM3a: Autopay Rate (CONDITIONAL sub-question - if autopay selected)
  // V4.5: Moved to immediately follow payment_methods for better UX flow
  // V4.9: SNF excluded - has dedicated snf_autopay and snf_autopay_enrollment questions
  {
    id: 'autopay_rate',
    category: "Operational Readiness",
    categoryIndex: 0,
    question: "What percentage of families use automated recurring payments?",
    subtext: "True 'fire and forget' billing - autopay, automatic bank drafts, or scheduled recurring charges that process without manual intervention each month",
    type: "slider",
    segments: ['SL', 'MC', 'CCRC'], // V4.6: SNF excluded
    isSubQuestion: true, // V4.5: Render as indented sub-question in UI
    min: 0,
    max: 100,
    default: 20,
    unit: "%",
    conditional: {
      questionId: 'payment_methods',
      showIfIncludesAny: ["Automated recurring payments available"]
    },
    benchmark: 50,
    benchmarkLabel: "High-performing: 50%+ | Average: 20-35%",
    scoring: (val) => {
      if (val >= 70) return 100;
      if (val >= 50) return 85;
      if (val >= 30) return 60;
      if (val >= 15) return 40;
      return 20;
    },
    insight: {
      trigger: (val) => val < 40,
      message: "Nearly 100% of card-paying families would consider automated recurring payments. Your {value}% enrollment rate represents significant untapped potential for 'fire and forget' billing.",
      proofPoint: "Autopay reduces AR days and creates predictable monthly cash flow"
    }
  },

  // FAM3b: Convenience Fee Pass-Through (CONDITIONAL sub-question - if credit cards selected)
  // V4.5: Marked as sub-question for indented UI rendering
  // V4.6: SNF excluded - handled differently due to patient responsibility focus
  {
    id: 'convenience_fee',
    category: "Operational Readiness",
    categoryIndex: 0,
    question: "Do you pass credit card processing fees (convenience fees) to families?",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'], // V4.6: SNF excluded
    isSubQuestion: true, // V4.5: Render as indented sub-question in UI
    conditional: {
      questionId: 'payment_methods',
      // Only show if they accept credit cards
      showIfIncludesAny: ["Credit cards"]
    },
    // V4.3: Reordered - least sophisticated first, removed redundant option
    options: [
      { label: "No, we absorb all processing fees", score: 40 },
      { label: "We'd like to but our current system doesn't support it", score: 60 },
      { label: "Yes, we pass fees to families who choose card payments", score: 100 }
    ],
    insight: {
      trigger: ["No, we absorb all processing fees", "We'd like to but our current system doesn't support it"],
      message: "69% of families are willing to pay a convenience fee for card payment. Passing through fees can save facilities 2-3% on card transactions while still offering the payment flexibility families want.",
      proofPoint: "PatientPay supports convenience fee pass-through to protect your margins"
    }
  },

  // FAM4: Billing Statement Delivery
  // V4.13: SNF excluded - statement delivery covered through snf_payment_channels (includes portal, text-to-pay)
  {
    id: 'statement_delivery',
    category: "Resident & Family Experience",
    categoryIndex: 1,
    question: "How do you deliver billing statements to families?",
    type: "multi",
    segments: ['SL', 'MC', 'CCRC'], // V4.13: SNF excluded
    options: [
      { label: "Paper mail", score: 10 },
      { label: "Email", score: 30 },
      { label: "Text/SMS notification", score: 30 },
      { label: "Online portal access", score: 30 }
    ],
    maxScore: 100,
    exclusiveOption: {
      label: "Paper mail only",
      score: 10,
      insight: "82% of consumers prefer digital payment methods. Paper-only statements take 2-3 weeks longer to convert to cash compared to digital."
    }
  },

  // FAM5: Family Portal Capability
  // V4.16: Conditional on statement_delivery including "Online portal access"
  // If no portal selected in delivery, question is hidden and scored as minimum (no portal)
  // If portal IS selected, asks about capability depth (removes "No portal" option - they already said they have one)
  {
    id: 'family_portal',
    category: "Resident & Family Experience",
    categoryIndex: 1,
    question: "How capable is your family billing portal?",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'],
    isSubQuestion: true, // Render as indented sub-question (follows from portal selection in delivery)
    conditional: {
      questionId: 'statement_delivery',
      showIfIncludesAny: ["Online portal access"]
    },
    // V4.16: When hidden (no portal delivery selected), auto-score as no portal (20/100)
    autoScore: {
      whenHidden: true,
      score: 20
    },
    options: [
      { label: "Viewing only (no payments)", score: 50 },
      { label: "Viewing and payments", score: 80 },
      { label: "Full portal: viewing, payments, history, and communication", score: 100 }
    ]
  },

  // FAM6: Family Satisfaction (V4.4 - NEW)
  // Replaces competitive_awareness - direct measure vs speculative comparison
  {
    id: 'family_satisfaction',
    category: "Resident & Family Experience",
    categoryIndex: 1,
    question: "How would you rate overall family satisfaction with your billing and payment process?",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'], // V4.9: SNF has snf_family_satisfaction which serves similar purpose
    options: [
      { label: "We receive frequent complaints or confusion", value: "poor", score: 20 },
      { label: "We hear occasional frustrations", value: "fair", score: 45 },
      { label: "Families seem generally satisfied", value: "good", score: 70 },
      { label: "We regularly receive positive feedback", value: "excellent", score: 100 }
    ],
    insight: {
      trigger: ["We receive frequent complaints or confusion", "We hear occasional frustrations"],
      message: "38% of patients find medical bills confusing. Improving billing clarity directly impacts family satisfaction and reduces staff time spent on inquiries.",
      proofPoint: "70% of caregivers spend 2+ hours resolving billing errors"
    }
  },

  // ========================================
  // SECTION 3: SNF-SPECIFIC QUESTIONS
  // V4.6: Complete SNF redesign based on industry analysis
  // - Uses "patient" terminology (not "resident")
  // - Front-loads context questions (annual patients, private pay %)
  // - Validates their world before probing metrics
  // - Positions family billing as opportunity for 23% private pay
  // ========================================

  // ========================================
  // SNF OPERATIONAL METRICS
  // ========================================

  // V4.10: REMOVED snf_ar_days, snf_clean_claims, snf_aged_ar - Option A simplification
  // These are primarily driven by Medicare/Medicaid payer dynamics, not patient responsibility
  // PatientPay focuses on patient responsibility collection - keeping assessment aligned

  // SNF Collection Rate (V4.10 - Core question, renamed from SNF-OP4)
  // Upgraded from categorical to slider for precise projections
  {
    id: 'snf_collection_rate',
    category: "Collection Efficiency", // V4.10: Option A - focused category name
    categoryIndex: 0,
    question: "What percentage of patient responsibility balances do you actually collect?",
    subtext: "Patient responsibility includes private pay, copays, and coinsurance - not payer claims",
    type: "slider",
    segments: ['SNF'],
    min: 40,
    max: 100,
    default: 75,
    unit: "%",
    benchmark: 90,
    benchmarkLabel: "Target: 90% | Industry typical: 70-80%",
    scoring: (val) => {
      if (val >= 90) return 100;
      if (val >= 80) return 75;
      if (val >= 70) return 50;
      if (val >= 60) return 25;
      return 10;
    },
    insight: {
      trigger: (val) => val < 85,
      message: "At {value}% collection rate, you're leaving significant patient responsibility revenue on the table. PatientPay customers see 60% payment rates via text-to-pay vs 43% industry average.",
      proofPoint: "15+ percentage point improvement typical with modern payment tools"
    },
    // V4.9: PatientPay projection - add 15 percentage points, cap at 95%
    patientPayProjection: (currentRate) => Math.min(95, currentRate + 15)
  },

  // ========================================
  // SNF FAMILY/PATIENT EXPERIENCE (V4.9 Enhanced)
  // ========================================

  // V4.13: Split payment question into two parts:
  // 1. Payment CHANNELS (how they can pay) - portal, text-to-pay, onsite, phone
  // 2. Payment TYPES (what methods accepted) - credit cards, debit, ACH, checks, cash

  // SNF-PAY1: Payment Channels (V4.13 - how patients can pay you)
  // Focus on accessibility and convenience of payment collection
  {
    id: 'snf_payment_channels',
    category: "Collection Efficiency",
    categoryIndex: 0,
    categoryWeights: [
      { index: 0, weight: 0.70 }, // Collection Efficiency (primary)
      { index: 1, weight: 0.30 }  // Family Experience (convenience for families)
    ],
    question: "How can your patients and families pay you?",
    subtext: "Select all payment channels available for the private pay portion",
    type: "multi",
    segments: ['SNF'],
    options: [
      { label: "Onsite / in-person", value: "onsite", points: 10 },
      { label: "Online payment portal", value: "portal", points: 30 },
      { label: "Text-to-pay", value: "text_to_pay", points: 35 },
      { label: "Call in via phone", value: "phone", points: 15 }
    ],
    scoring: (selected) => {
      if (!selected || !Array.isArray(selected)) return 10;
      const totalPoints = selected.reduce((sum, opt) => {
        const option = [
          { value: "onsite", points: 10 },
          { value: "portal", points: 30 },
          { value: "text_to_pay", points: 35 },
          { value: "phone", points: 15 }
        ].find(o => o.value === opt);
        return sum + (option ? option.points : 0);
      }, 0);
      return Math.min(100, totalPoints);
    },
    insight: {
      trigger: (selected) => !selected || (!selected.includes('portal') && !selected.includes('text_to_pay')),
      message: "Digital payment channels like text-to-pay achieve 60% payment rates vs 43% for traditional methods. Meeting families where they are increases collections.",
      proofPoint: "PatientPay text-to-pay: 60% payment rate vs 43% industry average"
    }
  },

  // SNF-PAY2: Payment Types (V4.13 - what payment methods accepted)
  // Focus on payment method acceptance
  {
    id: 'snf_payment_types',
    category: "Collection Efficiency",
    categoryIndex: 0,
    categoryWeights: [
      { index: 0, weight: 0.70 }, // Collection Efficiency (primary)
      { index: 1, weight: 0.30 }  // Family Experience (convenience for families)
    ],
    question: "Which payment types do you accept from patients and families?",
    subtext: "Select all payment types accepted",
    type: "multi",
    segments: ['SNF'],
    options: [
      { label: "Credit cards", value: "credit_cards", points: 30 },
      { label: "Debit cards", value: "debit_cards", points: 25 },
      { label: "ACH / bank transfer", value: "ach", points: 20 },
      { label: "Paper checks", value: "checks", points: 10 },
      { label: "Money orders / cash", value: "cash", points: 5 }
    ],
    scoring: (selected) => {
      if (!selected || !Array.isArray(selected)) return 10;
      const totalPoints = selected.reduce((sum, opt) => {
        const option = [
          { value: "credit_cards", points: 30 },
          { value: "debit_cards", points: 25 },
          { value: "ach", points: 20 },
          { value: "checks", points: 10 },
          { value: "cash", points: 5 }
        ].find(o => o.value === opt);
        return sum + (option ? option.points : 0);
      }, 0);
      return Math.min(100, totalPoints);
    },
    insight: {
      trigger: (selected) => !selected || !selected.includes('credit_cards'),
      message: "67% of families would choose a facility that accepts cards over one that doesn't. 75% want card payment options.",
      proofPoint: "82% of consumers prefer digital payments"
    }
  },

  // SNF Convenience Fee Question (V4.13 - conditional on credit card acceptance)
  // Shows only when they select credit_cards in snf_payment_types
  // Passing fees is a positive for operations (cost savings)
  {
    id: 'snf_convenience_fee',
    category: "Collection Efficiency",
    categoryIndex: 0,
    question: "How do you handle credit card processing fees?",
    subtext: "Processing fees typically run 2-3% of the transaction amount",
    type: "single",
    segments: ['SNF'],
    isSubQuestion: true,
    conditional: {
      questionId: 'snf_payment_types',
      showIfIncludes: 'credit_cards' // V4.13: Show if credit_cards is in snf_payment_types
    },
    options: [
      { label: "We pass processing fees to patients as a convenience fee", value: "pass_through", score: 100 },
      { label: "We absorb the fees as a business decision", value: "absorb_choice", score: 50 },
      { label: "We'd like to pass fees but haven't been able to implement it", value: "want_to_pass", score: 30 },
      { label: "We haven't considered this option", value: "not_considered", score: 20 }
    ],
    insight: {
      trigger: ["We absorb the fees as a business decision", "We'd like to pass fees but haven't been able to implement it", "We haven't considered this option"],
      message: "69% of families are willing to pay a small convenience fee for the option to pay by card. Passing through fees can save thousands annually while families still prefer the convenience.",
      proofPoint: "Average SNF saves $15,000-$50,000 annually by passing card fees"
    }
  },

  // SNF Multi-Guarantor Billing (V4.10 - Cross-category scoring)
  // Multi-guarantor affects both operational efficiency AND family experience
  // Automated billing reduces staff burden AND improves family satisfaction
  {
    id: 'snf_multi_guarantor',
    category: "Family Experience", // Primary category (display label)
    categoryIndex: 1, // Used for display, but categoryWeights determines actual scoring
    // V4.10: Cross-category scoring - impacts both operations and family experience
    // Automated split billing reduces staff time AND eliminates family coordination burden
    categoryWeights: [
      { index: 0, weight: 0.40 }, // Collection Efficiency (reduces manual tracking burden)
      { index: 1, weight: 0.60 }  // Family Experience (primary - eliminates "who paid?" confusion)
    ],
    question: "How do you handle billing when multiple family members share payment responsibility?",
    subtext: "47% of SNF caregivers are adult children. 92% of family caregivers manage the patient's finances.",
    type: "single",
    segments: ['SNF'],
    options: [
      { label: "Automated split billing with individual statements and tracking", value: "automated", score: 100 },
      { label: "Manual splitting with separate tracking", value: "manual", score: 60 },
      { label: "Bill one person, they coordinate with family", value: "single_bill", score: 20 },
      { label: "This is a major pain point for us", value: "pain_point", score: 5 }
    ],
    insight: {
      trigger: ["Bill one person, they coordinate with family", "This is a major pain point for us", "Manual splitting with separate tracking"],
      message: "When multiple family members share costs, billing one person creates coordination burden. 37% of payments get missed when one family member has to chase others.",
      proofPoint: "72% less likely to miss payments with individual statements"
    }
  },

  // SNF-FAM4: Autopay (V4.10 - simplified to Yes/No)
  // V4.10: Simplified - enrollment level captured by follow-up slider question
  {
    id: 'snf_autopay',
    category: "Collection Efficiency", // V4.10: Option A - collection tool
    categoryIndex: 0,
    question: "Do you offer autopay for recurring patient balances?",
    type: "single",
    segments: ['SNF'],
    options: [
      { label: "Yes, we offer autopay", value: "yes", score: 70 }, // V4.10: Base score for capability, enrollment slider adjusts
      { label: "No, we don't offer autopay", value: "no", score: 10 }
    ],
    insight: {
      trigger: ["No, we don't offer autopay"],
      message: "~100% of card-paying families say they would use autopay if offered. Autopay dramatically improves collection velocity.",
      proofPoint: "80% of card payments happen without staff involvement with autopay"
    }
  },

  // SNF-FAM4b: Autopay Enrollment Rate (conditional - only shows if Yes)
  // V4.10: This is where enrollment level matters for scoring
  {
    id: 'snf_autopay_enrollment',
    category: "Collection Efficiency", // V4.10: Option A - follows parent
    categoryIndex: 0,
    question: "What percentage of eligible patients are enrolled in autopay?",
    type: "slider",
    segments: ['SNF'],
    isSubQuestion: true,
    conditional: {
      questionId: 'snf_autopay',
      showIfEquals: "yes"  // V4.10: Only show if they answered Yes
    },
    min: 0,
    max: 80,
    default: 15,
    unit: "%",
    benchmark: 50,
    benchmarkLabel: "Target: 50%+ | Typical: 15-25%",
    // V4.10: Scoring reflects enrollment level
    scoring: (val) => {
      if (val >= 50) return 100; // Excellent enrollment
      if (val >= 40) return 85;
      if (val >= 30) return 70;
      if (val >= 20) return 55;
      return 40; // Low enrollment still gets some credit
    },
    insight: {
      trigger: (val) => val < 40,
      message: "At {value}% autopay enrollment, there's significant opportunity. PatientPay customers typically achieve 25+ percentage point improvement in autopay adoption.",
      proofPoint: "Autopay families pay on day 1, dramatically reducing AR days"
    },
    patientPayProjection: (currentRate) => Math.min(70, currentRate + 25)
  },

  // V4.12.2: SNF Payment Plans - Re-added based on CEO feedback
  // Payment plans convert potential bad debt into structured payments
  // Cross-category: Collection Efficiency (primary) + Family Experience (secondary)
  {
    id: 'snf_payment_plans',
    category: "Collection Efficiency", // Primary category (display label)
    categoryIndex: 0,
    // V4.12.2: Cross-category scoring - 65% Collection, 35% Family Experience
    // Primary benefit: recovering revenue that would become bad debt
    // Secondary benefit: reducing financial stress for families
    categoryWeights: [
      { index: 0, weight: 0.65 }, // Collection Efficiency (primary - bad debt prevention)
      { index: 1, weight: 0.35 }  // Family Experience (financial flexibility for families)
    ],
    question: "Do you offer payment plans for patients and families who can't pay their balance in full?",
    subtext: "Self-service payment plans convert potential bad debt into structured payments. Facilities report 40-60% of payment plan balances are recovered vs. 10-15% without.",
    type: "single",
    segments: ['SNF'],
    options: [
      { label: "No, we don't currently offer payment plans", value: "no", score: 15 },
      { label: "Yes, but it's a manual process (staff sets up and tracks)", value: "manual", score: 55 },
      { label: "Yes, fully automated self-service (patients enroll themselves)", value: "automated", score: 100 }
    ],
    insight: {
      trigger: ["No, we don't currently offer payment plans", "Yes, but it's a manual process (staff sets up and tracks)"],
      message: "When patients can't pay in full, payment plans are 4-5x more likely to result in collection than sending to bad debt. Self-service enrollment removes staff burden while improving recovery.",
      proofPoint: "PatientPay customers see 40-60% recovery on payment plans vs. 10-15% industry average on uncollected balances"
    },
    patientPayProjection: (currentAnswer) => {
      // If no plans or manual, project improvement to automated
      if (currentAnswer === 'no') return 85; // Major improvement
      if (currentAnswer === 'manual') return 100; // Full automation
      return 100; // Already automated
    }
  },

  // SNF Family Satisfaction (V4.10 - Family Experience)
  // This is the core family experience question
  {
    id: 'snf_family_satisfaction',
    category: "Family Experience", // V4.10: Option A - family-facing outcome
    categoryIndex: 1,
    question: "How would you rate family satisfaction with your billing process?",
    type: "single",
    segments: ['SNF'],
    options: [
      { label: "Excellent - rarely get complaints", value: "excellent", score: 100 },
      { label: "Good - occasional questions but generally smooth", value: "good", score: 75 },
      { label: "Fair - regular complaints or confusion", value: "fair", score: 40 },
      { label: "Poor - frequent complaints, major pain point", value: "poor", score: 10 }
    ],
    insight: {
      trigger: ["Fair - regular complaints or confusion", "Poor - frequent complaints, major pain point"],
      message: "Family billing satisfaction impacts overall facility ratings and referral likelihood. Modern billing tools reduce confusion and improve the family experience.",
      proofPoint: "Clear, modern billing improves family satisfaction scores"
    },
    patientPayProjection: (currentScore) => currentScore < 75 ? Math.min(100, currentScore + 25) : currentScore
  },

  // V4.4: CCRC-specific questions removed (outside payment processing scope)
  // CCRC differentiation now through segment weights (30% Competitive)
  // Entrance fees, contract types, and care-level transitions are clinical/admin
  // not directly related to digital payment readiness

  // ========================================
  // SECTION 5: COMPETITIVE POSITION (Non-SNF)
  // ========================================

  // COMP1: Payment Method Demand (CONDITIONAL - only if NOT accepting cards)
  // V4.4: Scoring confirmed correct - higher demand = higher score (reveals gap)
  {
    id: 'payment_demand',
    category: "Competitive Position",
    categoryIndex: 2,
    question: "How often do families ask about paying by credit or debit card?",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'],
    conditional: {
      questionId: 'payment_methods',
      hideIfIncludesAny: ["Credit cards", "Debit cards"]
    },
    options: [
      { label: "Rarely - most are fine with checks or ACH", value: "rarely", score: 40 },
      { label: "Occasionally - a few families ask", value: "occasionally", score: 60 },
      { label: "Frequently - it's a common request", value: "frequently", score: 80 },
      { label: "Very frequently - we lose prospects over this", value: "very_frequently", score: 100 }
    ],
    insight: {
      trigger: ["Rarely - most are fine with checks or ACH", "Occasionally - a few families ask"],
      message: "75% of LTC bill payers WANT card options - but they may not ask if they assume you don't accept them. This is latent demand.",
      proofPoint: "69% are willing to pay a convenience fee for card payment"
    }
  },

  // V4.4: competitive_awareness REMOVED
  // Replaced by family_satisfaction (direct measure vs speculative comparison)
  // family_satisfaction is in Family Experience section above

  // COMP2: Tour Billing Discussion
  {
    id: 'tour_billing',
    category: "Competitive Position",
    categoryIndex: 2,
    question: "When giving facility tours to prospective residents and families, how do you handle billing discussions?",
    type: "single",
    segments: ['SL', 'MC', 'CCRC'], // SNF removed - referral dynamics different
    options: [
      { label: "We try to avoid billing topics during tours", score: 25 },
      { label: "We briefly mention it if asked", score: 45 },
      { label: "We cover it as part of our standard tour", score: 70 },
      { label: "We proudly showcase our billing and payment experience", score: 100 }
    ],
    insight: {
      trigger: ["We try to avoid billing topics during tours", "We briefly mention it if asked"],
      message: "Your billing experience is part of your competitive position. Facilities with modern, family-friendly payment options use it as a differentiator during tours - showing families they'll have flexibility, transparency, and convenience.",
      proofPoint: "67% of families would choose a facility that accepts cards over one that doesn't"
    }
  }
];

// ============================================
// CATEGORY NAMES
// ============================================
const CategoryNames = ["Operational Readiness", "Resident & Family Experience", "Competitive Position"];

// V4.10: SNF uses simplified Option A categories focused on patient responsibility collection
// "Collection Efficiency" = how well equipped to collect (payment methods, autopay, collection rate)
// "Family Experience" = how families perceive billing (multi-guarantor, satisfaction)
const SNFCategoryNames = ["Collection Efficiency", "Family Experience", "Competitive Position"];

/**
 * Get the appropriate category name based on segment
 * V4.6: SNF uses "Patient & Family Experience" instead of "Resident & Family Experience"
 * @param {number} categoryIndex - 0, 1, or 2
 * @param {string} segment - 'SL', 'MC', 'SNF', or 'CCRC'
 * @returns {string} - The category name
 */
function getCategoryName(categoryIndex, segment) {
  const names = segment === 'SNF' ? SNFCategoryNames : CategoryNames;
  return names[categoryIndex] || '';
}

// ============================================
// RESULTS FLOW DEFINITION
// ============================================
const ResultsFlow = {
  totalSlides: 6,

  slides: [
    {
      id: 0,
      type: 'overview',
      title: 'Your Payment Readiness Score',
      description: 'Overall score with category breakdown',
      content: ['overall_score_gauge', 'category_bars', 'segment_context']
    },
    {
      id: 1,
      type: 'category-detail',
      categoryIndex: 0,
      title: 'Operational Readiness',
      description: 'Deep dive into operational efficiency',
      content: ['category_score', 'personalized_insight', 'segment_benchmarks'],
      insight: {
        key: 'operationalInsight',
        label: 'Your Numbers',
        showSegmentBenchmark: true
      }
    },
    {
      id: 2,
      type: 'category-detail',
      categoryIndex: 1,
      // V4.6: UI should use getCategoryName(1, segment) for SNF "Patient & Family Experience"
      title: 'Resident & Family Experience',
      snfTitle: 'Patient & Family Experience', // V4.6: Alternate title for SNF
      description: 'Family payment experience analysis',
      content: ['category_score', 'personalized_insight', 'multi_guarantor_insight'],
      insight: {
        key: 'familyInsight',
        label: 'Your Numbers',
        metric: 'Multi-guarantor billing potential',
        showImpact: true
      }
    },
    {
      id: 3,
      type: 'category-detail',
      categoryIndex: 2,
      title: 'Competitive Position',
      description: 'Market positioning through billing experience',
      content: ['category_score', 'segment_benchmarks'],
      // V4: SNF skips this slide (uses 2-category model)
      skipForSegments: ['SNF']
    },
    {
      id: 4,
      type: 'opportunities',
      title: 'Key Opportunities',
      description: 'Personalized financial impact and improvement areas',
      content: ['financial_summary', 'lowest_categories', 'recommendations']
    },
    {
      id: 5,
      type: 'next-steps',
      title: 'Next Steps',
      description: 'Action items and resources',
      content: ['schedule_cta', 'marketplace_cta', 'download_csv', 'copy_data', 'sources']
    }
  ],

  getSlide: function(index) {
    return this.slides[index] || null;
  },

  getStatsForCategory: function(categoryIndex, segment) {
    const statKeys = ['operational', 'experience', 'competitive'];
    const key = statKeys[categoryIndex];

    // Combine universal + segment-specific stats
    const universalStats = IndustryStats.universal[key] || [];
    const segmentStats = segment && IndustryStats[segment] ? (IndustryStats[segment][key] || []) : [];

    return [...segmentStats, ...universalStats].slice(0, 3);
  },

  getLowestCategories: function(scores, segment) {
    // V4: For SNF (useTwoCategories), only consider first 2 categories
    // V4.6: Use segment-appropriate category names
    const categoryCount = scores.useTwoCategories ? 2 : 3;
    const names = segment === 'SNF' ? SNFCategoryNames : CategoryNames;
    const indexed = scores.categories.slice(0, categoryCount).map((score, i) => ({
      score,
      name: names[i],
      index: i
    }));
    // For 2-category model, return both; for 3-category, return lowest 2
    const returnCount = scores.useTwoCategories ? 2 : 2;
    return indexed.sort((a, b) => a.score - b.score).slice(0, returnCount);
  },

  getCategoryRecommendation: function(categoryIndex, segment) {
    const segmentRecommendations = {
      IL: [
        "Modern payment options match your residents' independent lifestyle. Streamlining billing keeps your community competitive.",
        "Active residents and their families expect digital-first experiences. Multi-guarantor billing and self-service portals reduce friction.",
        "Your billing process is part of every tour. Modern payment options signal a modern community."
      ],
      AL: [
        "Multi-guarantor billing and processing automation reduce administrative burden when care levels change.",
        "Adult children managing parents' finances need clear visibility. Individual statements for each family member eliminate confusion.",
        "Family experience with billing directly impacts satisfaction scores and referrals."
      ],
      MC: [
        "When family members manage all finances, operational efficiency depends on clear processes and minimal inquiries.",
        "Memory Care families are under stress. Empathetic billing with multi-guarantor support shows you understand their situation.",
        "Specialized care deserves specialized billing. Sensitive collections and family portals differentiate your community."
      ],
      SNF: [
        "AR improvement directly impacts your margin. With 45% of SNFs operating at a loss, every day matters.",
        "Even with 23% private pay, family experience affects satisfaction scores and referrals.",
        "Quality billing operations signal quality care. Reducing aged AR protects your financial health."
      ],
      CCRC: [
        "Multi-level coordination is key. Residents stay 10-12 years and expect seamless transitions.",
        "Premium pricing deserves premium billing experience. Your affluent residents expect digital-first options.",
        "CCRCs have the best AR performance in senior living. Maintain your competitive edge."
      ]
    };

    const defaults = [
      "Streamlined billing with PCC integration can reduce A/R days and free up finance team time.",
      "Multi-guarantor billing and flexible payment channels reduce family confusion and billing-related calls.",
      "Your billing process is part of your tour. Modern payment options signal a modern community."
    ];

    const recs = segment && segmentRecommendations[segment] ? segmentRecommendations[segment] : defaults;
    return recs[categoryIndex] || defaults[categoryIndex];
  }
};

// ============================================
// ACTIONABLE RECOMMENDATIONS ENGINE (V4.4)
// Answer-driven, prioritized recommendations with PatientPay connections
// ============================================

/**
 * Recommendation definitions - each tied to specific answer patterns
 * Priority is calculated dynamically based on score impact
 */
const RecommendationDefinitions = [
  // ========================================
  // MULTI-GUARANTOR RECOMMENDATIONS (Highest Impact)
  // ========================================
  {
    id: 'enable_multi_guarantor',
    category: 'family',
    title: 'Enable Automated Multi-Guarantor Billing',
    trigger: (answers) => {
      const capability = answers['multi_guarantor_capability'];
      return capability === 'no' || capability === 'No, we can only bill one responsible party';
    },
    currentState: (answers) => "You can only bill one responsible party per resident",
    targetState: "Automated split billing with individual statements to each family member",
    impact: {
      description: "Eliminate 'who paid what?' confusion, reduce coordination calls by 60-70%",
      metrics: [
        "72% reduction in missed payments with split billing",
        "62% of caregivers share financial responsibilities",
        "37% of payments missed when one person must chase others"
      ]
    },
    patientPayConnection: "PatientPay's multi-guarantor billing automatically generates individual statements with personalized payment links for each family member - no manual splitting required.",
    scoreImpact: { category: 'family', points: 25, overall: 10 },
    basePriority: 95 // Very high - this is core value prop
  },
  {
    id: 'automate_multi_guarantor',
    category: 'operations',
    title: 'Automate Your Multi-Guarantor Process',
    trigger: (answers) => {
      const capability = answers['multi_guarantor_capability'];
      return capability === 'yes_manual' || capability === 'Yes, but it requires significant manual effort';
    },
    currentState: (answers) => "You offer multi-guarantor billing but it requires significant manual effort",
    targetState: "Fully automated split billing with zero manual intervention",
    impact: {
      description: "Reclaim staff hours spent manually splitting bills and tracking payments",
      metrics: [
        "96% reduction in processing time with automation",
        "42% of finance staff time spent on manual payment management",
        "Each manual statement takes ~10 minutes vs 15 seconds automated"
      ]
    },
    patientPayConnection: "PatientPay automatically calculates splits, generates individual statements, and tracks payments per guarantor - turning hours of work into seconds.",
    scoreImpact: { category: 'operations', points: 20, overall: 8 },
    basePriority: 85
  },
  {
    id: 'increase_multi_guarantor_adoption',
    category: 'family',
    title: 'Increase Multi-Guarantor Enrollment',
    trigger: (answers) => {
      const capability = answers['multi_guarantor_capability'];
      const adoption = answers['multi_guarantor_adoption'] || 0;
      const hasCapability = capability && capability !== 'no' && capability !== 'No, we can only bill one responsible party';
      return hasCapability && adoption < 40;
    },
    currentState: (answers) => `Only ${answers['multi_guarantor_adoption'] || 0}% of eligible residents use multi-guarantor billing`,
    targetState: "45%+ of residents with multiple family payers enrolled in split billing",
    impact: {
      description: "Many families who could benefit aren't using split billing - proactive enrollment reduces payment friction",
      metrics: [
        "Families with split billing are 72% less likely to miss payments",
        "Industry benchmark: 45%+ adoption among eligible residents",
        "Proactive enrollment during move-in captures families when they're most receptive"
      ]
    },
    patientPayConnection: "PatientPay makes enrollment easy with digital signup flows that families can complete on any device during move-in or anytime after.",
    scoreImpact: { category: 'family', points: 15, overall: 6 },
    basePriority: 70
  },

  // ========================================
  // PAYMENT METHODS RECOMMENDATIONS
  // ========================================
  {
    id: 'add_card_payments',
    category: 'competitive',
    title: 'Accept Credit and Debit Card Payments',
    trigger: (answers) => {
      const methods = answers['payment_methods'] || [];
      return !methods.includes('Credit cards') && !methods.includes('Debit cards');
    },
    currentState: (answers) => {
      const methods = answers['payment_methods'] || [];
      if (methods.length === 0 || (methods.length === 1 && methods[0] === 'Paper checks / money orders')) {
        return "You only accept checks/ACH - no card payments";
      }
      return "You accept ACH but not credit/debit cards";
    },
    targetState: "Full payment flexibility including credit cards, debit cards, and digital payments",
    impact: {
      description: "Meet family expectations and remove a key objection during tours",
      metrics: [
        "75% of LTC bill payers want card payment options",
        "67% would choose a facility that accepts cards over one that doesn't",
        "69% are willing to pay a convenience fee for card payment"
      ]
    },
    patientPayConnection: "PatientPay enables card payments with optional convenience fee pass-through to protect your margins while giving families the flexibility they want.",
    scoreImpact: { category: 'competitive', points: 25, overall: 8 },
    basePriority: 80
  },
  {
    id: 'enable_convenience_fees',
    category: 'operations',
    title: 'Implement Convenience Fee Pass-Through',
    trigger: (answers) => {
      const methods = answers['payment_methods'] || [];
      const convenienceFee = answers['convenience_fee'];
      const acceptsCards = methods.includes('Credit cards');
      return acceptsCards && (convenienceFee === 'No, we absorb all processing fees' || convenienceFee === "We'd like to but our current system doesn't support it");
    },
    currentState: (answers) => {
      if (answers['convenience_fee'] === 'No, we absorb all processing fees') {
        return "You absorb 2-3% processing fees on every card transaction";
      }
      return "Your current system doesn't support convenience fee pass-through";
    },
    targetState: "Optional convenience fee for card payments - families choose, you keep margins",
    impact: {
      description: "Recover 2-3% on card transactions while still offering payment flexibility",
      metrics: [
        "69% of families are willing to pay a convenience fee",
        "2-3% processing fee savings on every card transaction",
        "Families appreciate the choice - pay fee for card convenience OR use ACH for free"
      ]
    },
    patientPayConnection: "PatientPay supports compliant convenience fee pass-through, clearly disclosing fees to families and letting them choose their payment method.",
    scoreImpact: { category: 'operations', points: 15, overall: 5 },
    basePriority: 60
  },

  // ========================================
  // AUTOPAY RECOMMENDATIONS
  // ========================================
  {
    id: 'enable_autopay',
    category: 'operations',
    title: 'Offer Automated Recurring Payments',
    trigger: (answers) => {
      const methods = answers['payment_methods'] || [];
      return !methods.includes('Automated recurring payments available');
    },
    currentState: (answers) => "Families must manually pay each month - no autopay option",
    targetState: "Automated recurring payments with 'fire and forget' billing",
    impact: {
      description: "Predictable cash flow and dramatically reduced collection effort",
      metrics: [
        "Nearly 100% of card-paying families would consider autopay",
        "Autopay reduces AR days by ensuring payment on the same date each month",
        "Eliminates late payment follow-up for enrolled families"
      ]
    },
    patientPayConnection: "PatientPay's recurring payment feature automatically charges the family's preferred payment method each month with advance notification.",
    scoreImpact: { category: 'operations', points: 20, overall: 7 },
    basePriority: 75
  },
  {
    id: 'increase_autopay_adoption',
    category: 'operations',
    title: 'Grow Autopay Enrollment',
    trigger: (answers) => {
      const methods = answers['payment_methods'] || [];
      const autopayRate = answers['autopay_rate'] || 0;
      return methods.includes('Automated recurring payments available') && autopayRate < 40;
    },
    currentState: (answers) => `Only ${answers['autopay_rate'] || 0}% of families are enrolled in autopay`,
    targetState: "50%+ families on automated recurring payments",
    impact: {
      description: "Your autopay is underutilized - proactive enrollment creates predictable cash flow",
      metrics: [
        "High-performing communities: 50%+ autopay enrollment",
        "Each autopay enrollment eliminates monthly collection touchpoints",
        "Autopay families have near-zero late payment rates"
      ]
    },
    patientPayConnection: "PatientPay makes autopay enrollment easy with digital signup and helps you run enrollment campaigns to existing families.",
    scoreImpact: { category: 'operations', points: 15, overall: 5 },
    basePriority: 65
  },

  // ========================================
  // OPERATIONAL EFFICIENCY RECOMMENDATIONS
  // ========================================
  {
    id: 'automate_statement_processing',
    category: 'operations',
    title: 'Automate Statement Processing',
    trigger: (answers) => {
      const processing = answers['statement_processing'];
      return processing === 'Entirely manual (print, stuff, mail)' || processing === 'Mostly manual with spreadsheet tracking';
    },
    currentState: (answers) => {
      if (answers['statement_processing'] === 'Entirely manual (print, stuff, mail)') {
        return "Statements are entirely manual - print, stuff, mail";
      }
      return "Statements are mostly manual with spreadsheet tracking";
    },
    targetState: "Fully automated statement generation integrated with PointClickCare",
    impact: {
      description: "Reclaim hours of staff time and eliminate manual errors",
      metrics: [
        "96% reduction in processing time (10 minutes to 15 seconds per statement)",
        "42% of finance staff time currently spent on manual payment management",
        "Automated statements go out on schedule every time - no delays"
      ]
    },
    patientPayConnection: "PatientPay integrates directly with PointClickCare to automatically generate and deliver statements - no manual intervention required.",
    scoreImpact: { category: 'operations', points: 30, overall: 10 },
    basePriority: 85
  },
  {
    id: 'integrate_with_pcc',
    category: 'operations',
    title: 'Fully Integrate Billing with PointClickCare',
    trigger: (answers) => {
      const integration = answers['pcc_integration'];
      return integration === 'Separate systems - billing is managed outside PointClickCare' ||
             integration === 'Partially integrated - some manual data entry between systems';
    },
    currentState: (answers) => {
      const integration = answers['pcc_integration'];
      if (integration === 'Separate systems - billing is managed outside PointClickCare') {
        return "Billing is separate from PointClickCare - manual data reconciliation required";
      }
      return "Partially integrated - some manual data entry between systems";
    },
    targetState: "Billing flows automatically from PointClickCare with zero manual data entry",
    impact: {
      description: "Eliminate duplicate data entry and ensure billing accuracy",
      metrics: [
        "Full integration eliminates reconciliation errors",
        "Census changes automatically reflect in billing",
        "Staff freed from manual data entry between systems"
      ]
    },
    patientPayConnection: "PatientPay is a PointClickCare Marketplace partner with native integration - resident data, census changes, and charges flow automatically.",
    scoreImpact: { category: 'operations', points: 25, overall: 8 },
    basePriority: 80
  },
  {
    id: 'reduce_coordination_burden',
    category: 'operations',
    title: 'Reduce Family Billing Inquiries',
    // V4.14: Updated trigger for staff count slider (was hour-based options)
    trigger: (answers) => {
      const staffCount = answers['coordination_burden'] || 0;
      return staffCount >= 2; // Opportunity exists when 2+ staff on inquiries
    },
    currentState: (answers) => {
      const staffCount = answers['coordination_burden'] || 0;
      if (staffCount >= 5) return `You have ${staffCount} staff members handling billing inquiries - a significant operational burden`;
      if (staffCount >= 3) return `You have ${staffCount} staff members handling billing inquiries`;
      return `You have ${staffCount} staff members spending time on billing questions`;
    },
    targetState: "Minimal staff time on billing inquiries with self-service handling most questions",
    impact: {
      description: "Self-service access and clear statements dramatically reduce 'who paid what?' calls",
      metrics: [
        "37% of families miss payments due to billing complexity",
        "Self-service portals reduce inquiry volume by 60-70%",
        "Clear individual statements eliminate family coordination confusion"
      ]
    },
    patientPayConnection: "PatientPay's family portal gives each payer 24/7 access to their balance, payment history, and easy payment options - answering questions before they become calls.",
    scoreImpact: { category: 'operations', points: 20, overall: 7 },
    basePriority: 75
  },

  // ========================================
  // FAMILY EXPERIENCE RECOMMENDATIONS
  // ========================================
  {
    id: 'enable_separate_statements',
    category: 'family',
    title: 'Send Individual Statements to Each Payer',
    trigger: (answers) => {
      const recipients = answers['statement_recipients'];
      return recipients === 'No, we can only send statements to one person';
    },
    currentState: (answers) => {
      if (answers['statement_recipients'] === 'No, we can only send statements to one person') {
        return "Statements only go to one person who must coordinate with family";
      }
      return "You haven't set up separate statements - one person receives everything";
    },
    targetState: "Each family member gets their own statement showing only their portion",
    impact: {
      description: "Eliminate the 'statement coordinator' role that causes payment delays",
      metrics: [
        "37% of payments missed when one person must coordinate with others",
        "Individual statements eliminate 'I didn't know I owed anything' situations",
        "Each payer sees only their balance - clear accountability"
      ]
    },
    patientPayConnection: "PatientPay automatically generates individual statements for each guarantor with their specific amount, delivered to their preferred channel.",
    scoreImpact: { category: 'family', points: 25, overall: 10 },
    basePriority: 80
  },
  {
    id: 'add_digital_delivery',
    category: 'family',
    title: 'Enable Digital Statement Delivery',
    trigger: (answers) => {
      const delivery = answers['statement_delivery'];
      return delivery === 'Paper mail only' ||
             (Array.isArray(delivery) && delivery.length === 1 && delivery[0] === 'Paper mail');
    },
    currentState: (answers) => "Statements are paper mail only - 2-3 week delivery cycle",
    targetState: "Multi-channel delivery: email, text, portal access, with paper as backup",
    impact: {
      description: "Faster delivery means faster payment and lower postage costs",
      metrics: [
        "82% of consumers prefer digital payment methods",
        "Digital statements convert to cash 2-3 weeks faster than paper",
        "Postage and printing cost savings of $2-5 per statement"
      ]
    },
    patientPayConnection: "PatientPay delivers statements via email, text, and portal - with automatic fallback to paper for families who prefer it.",
    scoreImpact: { category: 'family', points: 20, overall: 8 },
    basePriority: 70
  },
  {
    id: 'add_family_portal',
    category: 'family',
    title: 'Implement a Family Self-Service Portal',
    trigger: (answers) => {
      // V4.16: Portal question is now conditional on delivery method
      // If user didn't select "Online portal access" in delivery, they have no portal
      const delivery = answers['statement_delivery'];
      const hasPortalDelivery = Array.isArray(delivery)
        ? delivery.includes('Online portal access')
        : delivery === 'Online portal access';
      if (!hasPortalDelivery) return true; // No portal delivery = no portal
      // Legacy fallback for old answers
      const portal = answers['family_portal'];
      return portal === 'No self-service portal available';
    },
    currentState: (answers) => "No self-service portal - families must call for any billing information",
    targetState: "24/7 portal access for viewing balances, history, and making payments",
    impact: {
      description: "Self-service reduces calls and lets families pay when convenient for them",
      metrics: [
        "Self-service portals reduce billing inquiry calls by 60-70%",
        "Families can pay at midnight, on weekends, whenever they have time",
        "Payment history and receipts always accessible"
      ]
    },
    patientPayConnection: "PatientPay's family portal provides complete billing visibility, payment history, and easy payment options - accessible 24/7 from any device.",
    scoreImpact: { category: 'family', points: 25, overall: 10 },
    basePriority: 75
  },
  {
    id: 'enhance_family_portal',
    category: 'family',
    title: 'Upgrade to Full-Featured Family Portal',
    trigger: (answers) => {
      const portal = answers['family_portal'];
      // V4.16: Option label shortened (removed "Yes, but" prefix)
      return portal === 'Viewing only (no payments)' || portal === 'Yes, but viewing only (no payments)';
    },
    currentState: (answers) => "Portal is view-only - families can see bills but can't pay online",
    targetState: "Full portal with viewing, payments, history, and communication",
    impact: {
      description: "A view-only portal creates friction - families see the bill but must find another way to pay",
      metrics: [
        "Portal payment capability increases on-time payments",
        "Reduces 'I saw the bill but couldn't figure out how to pay' delays",
        "Complete self-service eliminates payment friction"
      ]
    },
    patientPayConnection: "PatientPay's portal includes one-click payments, autopay enrollment, and payment history - turning viewing into paying.",
    scoreImpact: { category: 'family', points: 15, overall: 5 },
    basePriority: 60
  },
  {
    id: 'improve_family_satisfaction',
    category: 'family',
    title: 'Address Family Billing Satisfaction',
    trigger: (answers) => {
      const satisfaction = answers['family_satisfaction'];
      return satisfaction === 'poor' ||
             satisfaction === 'We receive frequent complaints or confusion' ||
             satisfaction === 'fair' ||
             satisfaction === 'We hear occasional frustrations';
    },
    currentState: (answers) => {
      const satisfaction = answers['family_satisfaction'];
      if (satisfaction === 'poor' || satisfaction === 'We receive frequent complaints or confusion') {
        return "Families frequently complain or express confusion about billing";
      }
      return "Families occasionally express frustrations with billing";
    },
    targetState: "Families regularly give positive feedback about billing clarity and ease",
    impact: {
      description: "Billing satisfaction directly affects overall satisfaction scores and referrals",
      metrics: [
        "38% of patients find medical bills confusing",
        "70% of caregivers spend 2+ hours resolving billing errors",
        "Billing experience influences facility recommendations to others"
      ]
    },
    patientPayConnection: "PatientPay's clear statements, flexible payment options, and family portal address the root causes of billing confusion and frustration.",
    scoreImpact: { category: 'family', points: 20, overall: 8 },
    basePriority: 70
  },

  // ========================================
  // COMPETITIVE RECOMMENDATIONS
  // ========================================
  {
    id: 'showcase_billing_on_tours',
    category: 'competitive',
    title: 'Make Billing a Tour Differentiator',
    trigger: (answers) => {
      const tourBilling = answers['tour_billing'];
      return tourBilling === 'We try to avoid billing topics during tours' ||
             tourBilling === 'We briefly mention it if asked';
    },
    currentState: (answers) => {
      if (answers['tour_billing'] === 'We try to avoid billing topics during tours') {
        return "You avoid billing discussions during tours";
      }
      return "You only discuss billing if families ask";
    },
    targetState: "Proudly showcase your modern billing and payment experience during every tour",
    impact: {
      description: "Billing flexibility is a competitive differentiator - use it",
      metrics: [
        "67% of families would choose a facility that accepts cards over one that doesn't",
        "Modern billing signals a modern, well-run facility",
        "Proactive billing discussion builds trust and reduces move-in surprises"
      ]
    },
    patientPayConnection: "With PatientPay, you'll have a billing experience worth showcasing - payment flexibility, family portal, and clear statements that impress prospective families.",
    scoreImpact: { category: 'competitive', points: 20, overall: 5 },
    basePriority: 55
  },

  // ========================================
  // SNF-SPECIFIC RECOMMENDATIONS (V4.10 Option A - simplified)
  // ========================================

  // V4.10: REMOVED reduce_ar_days, improve_clean_claims, reduce_aged_ar
  // These referenced questions that PatientPay doesn't directly address
  // Option A focuses on patient responsibility collection only

  {
    id: 'improve_snf_family_experience',
    category: 'family',
    title: 'Elevate Private Pay Family Experience',
    trigger: (answers) => {
      // V4.9: Updated to use snf_family_satisfaction
      const satisfaction = answers['snf_family_satisfaction'];
      return answers['facility_type'] === 'SNF' &&
             (satisfaction === 'fair' || satisfaction === 'poor');
    },
    currentState: (answers) => {
      const satisfaction = answers['snf_family_satisfaction'];
      if (satisfaction === 'poor') {
        return "Family billing satisfaction is poor - frequent complaints and a major pain point";
      }
      return "Family billing satisfaction is fair - regular complaints and confusion";
    },
    targetState: "Families can easily view bills, understand charges, and pay - positive experience",
    impact: {
      description: "Even at 23% private pay, family experience affects satisfaction scores and referrals",
      metrics: [
        "23% of SNF revenue is private pay - families matter",
        "Family satisfaction influences hospital discharge planner relationships",
        "Billing experience is part of overall care perception"
      ]
    },
    patientPayConnection: "PatientPay provides the same premium family experience for your private pay patients that families expect from any modern service.",
    scoreImpact: { category: 'family', points: 25, overall: 10 },
    basePriority: 70,
    segmentSpecific: ['SNF']
  },
  // V4.9: Updated SNF recommendations for new question structure
  {
    id: 'improve_snf_collection_rate',
    category: 'operations',
    title: 'Increase Patient Responsibility Collection Rate',
    trigger: (answers) => {
      const rate = answers['snf_collection_rate'];
      return answers['facility_type'] === 'SNF' && rate && rate < 85;
    },
    currentState: (answers) => {
      const rate = answers['snf_collection_rate'] || 75;
      return `Your collection rate is ${rate}% - below the 90% industry target`;
    },
    targetState: "90%+ patient responsibility collection rate with modern payment tools",
    impact: {
      description: "Every percentage point improvement directly increases private pay revenue",
      metrics: [
        "PatientPay achieves 60% payment rate via text-to-pay vs 43% industry average",
        "15+ percentage point improvement typical with modern payment tools",
        "Target: 90% collection rate (industry best practice)"
      ]
    },
    patientPayConnection: "PatientPay's text-to-pay, digital statements, and autopay enrollment drive significantly higher collection rates for patient responsibility portions.",
    scoreImpact: { category: 'operations', points: 25, overall: 12 },
    basePriority: 90,
    segmentSpecific: ['SNF']
  },
  {
    id: 'expand_snf_payment_options',
    category: 'family',
    title: 'Expand Digital Payment Options',
    trigger: (answers) => {
      // V4.13: Check both channels and types
      const channels = answers['snf_payment_channels'] || [];
      const types = answers['snf_payment_types'] || [];
      return answers['facility_type'] === 'SNF' &&
             (!types.includes('credit_cards') || !channels.includes('text_to_pay') || !channels.includes('portal'));
    },
    currentState: (answers) => {
      const channels = answers['snf_payment_channels'] || [];
      const types = answers['snf_payment_types'] || [];
      const missing = [];
      if (!types.includes('credit_cards')) missing.push('credit cards');
      if (!channels.includes('text_to_pay')) missing.push('text-to-pay');
      if (!channels.includes('portal')) missing.push('online portal');
      return `Missing key payment options: ${missing.join(', ')}`;
    },
    targetState: "Full digital payment suite: cards, text-to-pay, and 24/7 online portal",
    impact: {
      description: "More payment options = more payments received",
      metrics: [
        "75% of bill payers want card payment options",
        "67% would choose a facility that accepts cards",
        "Text-to-pay achieves 60% payment rate vs 43% traditional"
      ]
    },
    patientPayConnection: "PatientPay provides the full digital payment suite: credit/debit cards, text-to-pay, and a 24/7 family portal for viewing and paying bills.",
    scoreImpact: { category: 'family', points: 20, overall: 10 },
    basePriority: 80,
    segmentSpecific: ['SNF']
  },
  // V4.13: SNF convenience fee pass-through (conditional on credit card acceptance)
  {
    id: 'enable_snf_convenience_fees',
    category: 'operations',
    title: 'Enable Convenience Fee Pass-Through',
    trigger: (answers) => {
      // V4.13: Check snf_payment_types for credit cards
      const snfPaymentTypes = answers['snf_payment_types'] || [];
      const acceptsCards = snfPaymentTypes.includes('credit_cards');
      const convenienceFee = answers['snf_convenience_fee'];
      // Trigger if they accept cards but are NOT passing fees
      return answers['facility_type'] === 'SNF' &&
             acceptsCards &&
             convenienceFee !== 'pass_through';
    },
    currentState: (answers) => {
      const convenienceFee = answers['snf_convenience_fee'];
      if (convenienceFee === 'absorb_choice') return "You've chosen to absorb card processing fees as a business decision";
      if (convenienceFee === 'want_to_pass') return "You want to pass fees but haven't been able to implement it";
      return "You haven't considered passing card processing fees to patients";
    },
    targetState: "Compliant convenience fee pass-through with clear disclosure to families",
    impact: {
      description: "Eliminate processing costs while families retain card payment convenience",
      metrics: [
        "69% of families willing to pay small convenience fee for card option",
        "Average SNF saves $15,000-$50,000 annually",
        "2.5% processing fees add up quickly on private pay volume"
      ]
    },
    patientPayConnection: "PatientPay supports compliant convenience fee pass-through, clearly disclosing fees to families while protecting your margins.",
    scoreImpact: { category: 'operations', points: 15, overall: 8 },
    basePriority: 70,
    segmentSpecific: ['SNF']
  },
  {
    id: 'enable_snf_multi_guarantor',
    category: 'family',
    title: 'Enable Automated Split Billing',
    trigger: (answers) => {
      const mg = answers['snf_multi_guarantor'];
      return answers['facility_type'] === 'SNF' &&
             (mg === 'single_bill' || mg === 'manual' || mg === 'pain_point');
    },
    currentState: (answers) => {
      const mg = answers['snf_multi_guarantor'];
      if (mg === 'single_bill') return "You bill one person who must chase other family members";
      if (mg === 'pain_point') return "Multi-guarantor billing is a major pain point for your team";
      return "Split billing requires manual effort to manage";
    },
    targetState: "Automated split billing with individual statements to each family member",
    impact: {
      description: "47% of SNF caregivers are adult children sharing costs",
      metrics: [
        "92% of family caregivers manage patient finances",
        "37% of payments missed when one person coordinates",
        "72% less likely to miss with individual statements"
      ]
    },
    patientPayConnection: "PatientPay automatically generates individual statements and payment links for each family member, eliminating coordination hassles.",
    scoreImpact: { category: 'family', points: 20, overall: 10 },
    basePriority: 80,
    segmentSpecific: ['SNF']
  },
  {
    id: 'enable_snf_autopay',
    category: 'family',
    title: 'Enable or Expand Autopay Enrollment',
    trigger: (answers) => {
      const autopay = answers['snf_autopay'];
      const enrollment = answers['snf_autopay_enrollment'] || 0;
      return answers['facility_type'] === 'SNF' &&
             (autopay === 'no' || (autopay && enrollment < 40));
    },
    currentState: (answers) => {
      const autopay = answers['snf_autopay'];
      const enrollment = answers['snf_autopay_enrollment'] || 0;
      if (autopay === 'no') return "You don't offer autopay for recurring balances";
      return `Only ${enrollment}% autopay enrollment - below 50% target`;
    },
    targetState: "50%+ autopay enrollment with active promotion campaigns",
    impact: {
      description: "Autopay dramatically improves collection velocity",
      metrics: [
        "~100% of card users would use autopay if offered",
        "80% of card payments happen without staff involvement",
        "Autopay families effectively have 0 AR days"
      ]
    },
    patientPayConnection: "PatientPay makes autopay enrollment easy and runs campaigns to drive adoption - typical customers see 25+ percentage point improvement.",
    scoreImpact: { category: 'family', points: 15, overall: 10 },
    basePriority: 75,
    segmentSpecific: ['SNF']
  },
  // V4.12.2: SNF Payment Plans recommendations - re-added
  {
    id: 'enable_snf_payment_plans',
    category: 'operations',
    title: 'Enable Self-Service Payment Plans',
    trigger: (answers) => {
      const plans = answers['snf_payment_plans'];
      return answers['facility_type'] === 'SNF' && plans === 'no';
    },
    currentState: () => "You don't offer payment plans for patients who can't pay in full",
    targetState: "Self-service payment plans that convert potential bad debt into structured payments",
    impact: {
      description: "Payment plans dramatically improve collection on difficult balances",
      metrics: [
        "40-60% recovery rate on payment plans vs. 10-15% without",
        "Families prefer structured payments over ignoring bills",
        "Reduces bad debt write-offs significantly"
      ]
    },
    patientPayConnection: "PatientPay's self-service payment plans let facilities configure plan options while families self-enroll. Payments auto-process - no staff intervention needed.",
    scoreImpact: { category: 'operations', points: 20, overall: 12 },
    basePriority: 85,
    segmentSpecific: ['SNF']
  },
  {
    id: 'automate_snf_payment_plans',
    category: 'operations',
    title: 'Automate Payment Plan Management',
    trigger: (answers) => {
      const plans = answers['snf_payment_plans'];
      return answers['facility_type'] === 'SNF' && plans === 'manual';
    },
    currentState: () => "Payment plans require manual staff setup and tracking",
    targetState: "Fully automated self-service payment plans with automatic payment processing",
    impact: {
      description: "Automation removes staff burden while improving enrollment",
      metrics: [
        "Self-service enrollment increases plan adoption 2-3x",
        "Automatic payments eliminate missed installments",
        "Staff freed from tracking and follow-up"
      ]
    },
    patientPayConnection: "PatientPay automates the entire payment plan lifecycle - enrollment, scheduling, processing, and communications - with no staff involvement required.",
    scoreImpact: { category: 'operations', points: 15, overall: 8 },
    basePriority: 75,
    segmentSpecific: ['SNF']
  },
  {
    id: 'improve_snf_family_satisfaction',
    category: 'family',
    title: 'Improve Family Billing Satisfaction',
    trigger: (answers) => {
      const sat = answers['snf_family_satisfaction'];
      return answers['facility_type'] === 'SNF' &&
             (sat === 'fair' || sat === 'poor');
    },
    currentState: (answers) => {
      const sat = answers['snf_family_satisfaction'];
      if (sat === 'poor') return "Family billing experience is a frequent complaint";
      return "Families have regular billing complaints or confusion";
    },
    targetState: "Positive family billing experience with minimal complaints",
    impact: {
      description: "Billing satisfaction affects overall facility perception",
      metrics: [
        "Family satisfaction influences referral relationships",
        "Clear, modern billing signals a well-run facility",
        "Billing complaints consume staff time"
      ]
    },
    patientPayConnection: "PatientPay's clear statements, self-service portal, and payment flexibility address the root causes of family billing frustration.",
    scoreImpact: { category: 'family', points: 20, overall: 8 },
    basePriority: 70,
    segmentSpecific: ['SNF']
  }
];

/**
 * Get actionable recommendations based on answers and scores
 * V4.4: Answer-driven, prioritized recommendations with PatientPay connections
 *
 * @param {Object} answers - User's answers to all questions
 * @param {Object} scores - Calculated scores { overall, categories, segment, useTwoCategories }
 * @param {Object} insights - Financial insights from calculateInsights()
 * @returns {Array} - Prioritized array of recommendation objects
 */
function getActionableRecommendations(answers, scores, insights) {
  const segment = answers['facility_type'];
  const recommendations = [];

  // Evaluate each recommendation definition
  RecommendationDefinitions.forEach(def => {
    // Check segment-specific recommendations
    if (def.segmentSpecific && !def.segmentSpecific.includes(segment)) {
      return;
    }

    // Skip competitive recommendations for SNF (2-category model)
    if (scores.useTwoCategories && def.category === 'competitive') {
      return;
    }

    // Check if trigger condition is met
    let triggered = false;
    try {
      triggered = def.trigger(answers);
    } catch (e) {
      triggered = false;
    }

    if (!triggered) return;

    // Calculate priority based on base priority and score gap
    let priority = def.basePriority;

    // Boost priority if this category is their lowest
    const categoryIndex = def.category === 'operations' ? 0 : def.category === 'family' ? 1 : 2;
    const categoryScore = scores.categories[categoryIndex] || 0;

    // Lower category scores = higher priority for recommendations in that category
    if (categoryScore < 40) priority += 15;
    else if (categoryScore < 60) priority += 10;
    else if (categoryScore < 80) priority += 5;

    // Build the recommendation object
    const recommendation = {
      id: def.id,
      category: def.category,
      categoryLabel: def.category === 'operations' ? 'Operational Readiness' :
                     def.category === 'family' ? 'Resident & Family Experience' : 'Competitive Position',
      title: def.title,
      priority: priority,
      priorityLabel: priority >= 80 ? 'High' : priority >= 60 ? 'Medium' : 'Ongoing',
      currentState: typeof def.currentState === 'function' ? def.currentState(answers) : def.currentState,
      targetState: def.targetState,
      impact: def.impact,
      patientPayConnection: def.patientPayConnection,
      scoreImpact: def.scoreImpact
    };

    recommendations.push(recommendation);
  });

  // Sort by priority (highest first)
  recommendations.sort((a, b) => b.priority - a.priority);

  // Add rank and limit to top recommendations
  return recommendations.slice(0, 8).map((rec, index) => ({
    ...rec,
    rank: index + 1
  }));
}

/**
 * Get gap analysis comparing user scores to industry benchmarks
 * V4.4: Shows where user stands vs segment benchmark
 *
 * @param {Object} scores - Calculated scores
 * @returns {Object} - Gap analysis with benchmark comparisons
 */
function getGapAnalysis(scores) {
  const segment = scores.segment;
  const benchmarks = IndustryBenchmarks[segment];

  if (!benchmarks) {
    return null;
  }

  const analysis = {
    segment: segment,
    segmentLabel: benchmarks.label,
    overall: {
      score: scores.overall,
      benchmark: benchmarks.overall,
      gap: scores.overall - benchmarks.overall,
      performance: getPerformanceVsBenchmark(scores.overall, benchmarks.overall)
    },
    categories: []
  };

  // Operations - V4.10: Use segment-aware category names
  analysis.categories.push({
    name: getCategoryName(0, segment),
    index: 0,
    score: scores.categories[0],
    benchmark: benchmarks.operations,
    gap: scores.categories[0] - benchmarks.operations,
    performance: getPerformanceVsBenchmark(scores.categories[0], benchmarks.operations)
  });

  // Family Experience - V4.10: Use segment-aware category names
  analysis.categories.push({
    name: getCategoryName(1, segment),
    index: 1,
    score: scores.categories[1],
    benchmark: benchmarks.family,
    gap: scores.categories[1] - benchmarks.family,
    performance: getPerformanceVsBenchmark(scores.categories[1], benchmarks.family)
  });

  // Competitive (if applicable) - V4.10: Use segment-aware category names
  if (!scores.useTwoCategories && benchmarks.competitive) {
    analysis.categories.push({
      name: getCategoryName(2, segment),
      index: 2,
      score: scores.categories[2],
      benchmark: benchmarks.competitive,
      gap: scores.categories[2] - benchmarks.competitive,
      performance: getPerformanceVsBenchmark(scores.categories[2], benchmarks.competitive)
    });
  }

  // Identify biggest opportunity (largest negative gap)
  const sortedByGap = [...analysis.categories].sort((a, b) => a.gap - b.gap);
  analysis.biggestOpportunity = sortedByGap[0];
  analysis.strongestArea = sortedByGap[sortedByGap.length - 1];

  return analysis;
}

/**
 * Generate a summary statement for the results
 * V4.4: Natural language summary of position and opportunities
 *
 * @param {Object} scores - Calculated scores
 * @param {Object} gapAnalysis - Gap analysis from getGapAnalysis()
 * @param {Array} recommendations - Top recommendations
 * @returns {Object} - Summary statements for display
 */
function generateResultsSummary(scores, gapAnalysis, recommendations) {
  const segment = scores.segment;
  const level = getScoreLevel(scores.overall, segment);

  // Overall position statement
  let positionStatement = '';
  if (gapAnalysis) {
    const overallPerf = gapAnalysis.overall.performance;
    if (overallPerf === 'significantly above' || overallPerf === 'above') {
      positionStatement = `Your overall score of ${scores.overall} places you ${overallPerf} the ${gapAnalysis.segmentLabel} industry benchmark of ${gapAnalysis.overall.benchmark}. You've built a strong foundation.`;
    } else if (overallPerf === 'near') {
      positionStatement = `Your overall score of ${scores.overall} is near the ${gapAnalysis.segmentLabel} industry benchmark of ${gapAnalysis.overall.benchmark}. Targeted improvements can differentiate you.`;
    } else {
      positionStatement = `Your overall score of ${scores.overall} is ${overallPerf} the ${gapAnalysis.segmentLabel} industry benchmark of ${gapAnalysis.overall.benchmark}. There are clear opportunities to improve.`;
    }
  } else {
    positionStatement = `Your overall payment readiness score is ${scores.overall} (${level}).`;
  }

  // Opportunity statement
  let opportunityStatement = '';
  if (gapAnalysis && gapAnalysis.biggestOpportunity) {
    const opp = gapAnalysis.biggestOpportunity;
    if (opp.gap < -10) {
      opportunityStatement = `Your biggest opportunity is in ${opp.name}, where you're ${Math.abs(opp.gap)} points below benchmark. Improvements here will have the most impact.`;
    } else if (opp.gap < 0) {
      opportunityStatement = `${opp.name} is your area with the most room for growth, currently ${Math.abs(opp.gap)} points below benchmark.`;
    } else {
      opportunityStatement = `You're meeting or exceeding benchmarks across categories - focus on maintaining your advantage.`;
    }
  }

  // Strength statement
  let strengthStatement = '';
  if (gapAnalysis && gapAnalysis.strongestArea && gapAnalysis.strongestArea.gap > 0) {
    const str = gapAnalysis.strongestArea;
    strengthStatement = `Your strongest area is ${str.name}, where you're ${str.gap} points above benchmark.`;
  }

  // Top action statement
  let topActionStatement = '';
  if (recommendations && recommendations.length > 0) {
    const topRec = recommendations[0];
    topActionStatement = `Top recommendation: ${topRec.title}. ${topRec.impact.description}`;
  }

  return {
    positionStatement,
    opportunityStatement,
    strengthStatement,
    topActionStatement,
    level,
    levelDescription: level === 'Excellent' ? 'Industry-leading payment operations' :
                      level === 'Strong' ? 'Solid foundation with optimization opportunities' :
                      level === 'Progressing' ? 'Good progress with room for improvement' :
                      level === 'Developing' ? 'Significant opportunities to modernize' :
                      'Critical improvements needed'
  };
}

// ============================================
// STRENGTHS ANALYSIS (V4.7)
// Identifies what user is doing well for positive framing
// ============================================

/**
 * Get user's strengths - categories and questions where they're performing well
 * Used for "Your Strengths" slide to validate before challenging
 * @param {Object} scores - Calculated scores from calculateScores()
 * @param {Object} answers - User's answers
 * @returns {Object} - { strongCategories, strongQuestions, hasStrengths }
 */
function getStrengths(scores, answers) {
  const gapAnalysis = getGapAnalysis(scores);
  const segment = answers['facility_type'];
  const visibleQuestions = getVisibleQuestions(answers);

  // Categories at or above benchmark (positive gap)
  const strongCategories = gapAnalysis ? gapAnalysis.categories
    .filter(c => c.gap >= 0)
    .sort((a, b) => b.gap - a.gap)
    .map(c => ({
      ...c,
      color: c.index === 0 ? '#3c8fc7' : c.index === 1 ? '#8B5CF6' : '#fcc93b',
      celebrationText: c.gap >= 10 ? 'Excellent!' :
                       c.gap >= 5 ? 'Above average' :
                       'Meeting benchmark'
    })) : [];

  // Individual high-scoring questions (score >= 70)
  const strongQuestions = visibleQuestions
    .filter(q => !q.isDiagnostic && !q.isRoutingQuestion && q.categoryIndex !== null)
    .map(q => {
      const score = calculateQuestionScore(q, answers[q.id]);
      return {
        id: q.id,
        question: q.question,
        answer: answers[q.id],
        score: score,
        categoryIndex: q.categoryIndex,
        categoryName: getCategoryName(q.categoryIndex, segment)
      };
    })
    .filter(q => q.score !== null && q.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Determine if user has meaningful strengths to celebrate
  const hasStrengths = strongCategories.length > 0 || strongQuestions.length > 0;

  // FALLBACK: If no strengths above benchmark, find relative strengths
  let relativeStrength = null;
  let moderateQuestions = [];

  if (!hasStrengths && gapAnalysis) {
    // Find the category closest to benchmark (smallest negative gap)
    const sortedByGap = [...gapAnalysis.categories].sort((a, b) => b.gap - a.gap);
    if (sortedByGap.length > 0) {
      const closest = sortedByGap[0];
      relativeStrength = {
        ...closest,
        color: closest.index === 0 ? '#3c8fc7' : closest.index === 1 ? '#8B5CF6' : '#fcc93b',
        isRelative: true // Flag to indicate this is a relative strength, not above benchmark
      };
    }

    // Find questions with scores >= 50 (moderate, not failing)
    moderateQuestions = visibleQuestions
      .filter(q => !q.isDiagnostic && !q.isRoutingQuestion && q.categoryIndex !== null)
      .map(q => {
        const score = calculateQuestionScore(q, answers[q.id]);
        return {
          id: q.id,
          question: q.question,
          answer: answers[q.id],
          score: score,
          categoryIndex: q.categoryIndex,
          categoryName: getCategoryName(q.categoryIndex, segment)
        };
      })
      .filter(q => q.score !== null && q.score >= 50 && q.score < 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  // Generate a strength summary statement
  let summaryStatement = '';
  let isEarlyJourney = false;

  if (strongCategories.length > 0) {
    const topCategory = strongCategories[0];
    if (topCategory.gap >= 10) {
      summaryStatement = `You're excelling in ${topCategory.name}, scoring ${topCategory.gap} points above the industry benchmark.`;
    } else if (topCategory.gap >= 0) {
      summaryStatement = `You're performing well in ${topCategory.name}, meeting or exceeding industry standards.`;
    }
  } else if (strongQuestions.length > 0) {
    summaryStatement = `You have ${strongQuestions.length} area${strongQuestions.length > 1 ? 's' : ''} scoring 70 or above.`;
  } else if (relativeStrength) {
    // Fallback messaging for early journey users
    isEarlyJourney = true;
    summaryStatement = `You're early in your payment modernization journey. Your strongest area is ${relativeStrength.name} at ${relativeStrength.score}, which is ${Math.abs(relativeStrength.gap)} points from the industry benchmark.`;
  } else {
    isEarlyJourney = true;
    summaryStatement = `You're early in your payment modernization journey, which means there's significant opportunity ahead.`;
  }

  return {
    strongCategories,
    strongQuestions,
    hasStrengths,
    summaryStatement,
    // Fallback data for early journey users
    relativeStrength,
    moderateQuestions,
    isEarlyJourney
  };
}

// ============================================
// PATIENTPAY PROJECTION CONFIG (V4.7)
// Centralized configuration for projected improvements
// Each improvement maps to specific questions/answers
// ============================================

/**
 * Configuration for PatientPay improvement projections
 * Each entry defines:
 * - condition: Function to check if this improvement applies
 * - categoryImpacts: Points added to each category [ops, family, competitive]
 * - description: What PatientPay enables
 * - questionMapping: Which question(s) this improvement addresses
 */
const PatientPayProjectionConfig = {
  // Multi-guarantor capability
  enable_multi_guarantor: {
    condition: (answers) => {
      const cap = answers['multi_guarantor_capability'];
      return cap === 'no' || cap === 'No, we can only bill one responsible party';
    },
    categoryImpacts: [10, 25, 5], // [operations, family, competitive]
    overallImpact: 12,
    description: 'Automated multi-guarantor billing with individual statements',
    questionMapping: ['multi_guarantor_capability'],
    sourceRef: 9 // Healthcare Payment Surveys
  },

  // Automate manual multi-guarantor
  automate_multi_guarantor: {
    condition: (answers) => {
      const cap = answers['multi_guarantor_capability'];
      return cap === 'yes_manual' || cap === 'Yes, but it requires significant manual effort';
    },
    categoryImpacts: [20, 10, 0],
    overallImpact: 8,
    description: 'Fully automated split billing replacing manual effort',
    questionMapping: ['multi_guarantor_capability'],
    sourceRef: 2 // TransactCare
  },

  // Statement processing automation
  automate_statements: {
    condition: (answers) => {
      const proc = answers['statement_processing'];
      return proc === 'Entirely manual (print, stuff, mail)' ||
             proc === 'Mostly manual with spreadsheet tracking';
    },
    categoryImpacts: [30, 5, 0],
    overallImpact: 10,
    description: 'Fully automated statement processing with PCC integration',
    questionMapping: ['statement_processing'],
    sourceRef: 2 // TransactCare - 96% reduction
  },

  // Add card payments
  add_card_payments: {
    condition: (answers) => {
      const methods = answers['payment_methods'] || [];
      return !methods.includes('Credit cards') && !methods.includes('Debit cards');
    },
    categoryImpacts: [5, 15, 25],
    overallImpact: 10,
    description: 'Credit and debit card acceptance with convenience fee option',
    questionMapping: ['payment_methods'],
    sourceRef: 11 // CareGrove/Visa - 75% want cards
  },

  // Enable autopay
  enable_autopay: {
    condition: (answers) => {
      const methods = answers['payment_methods'] || [];
      return !methods.includes('Automated recurring payments available');
    },
    categoryImpacts: [20, 10, 0],
    overallImpact: 8,
    description: 'Automated recurring payments for predictable cash flow',
    questionMapping: ['payment_methods'],
    sourceRef: 7 // CareGrove - ~100% would consider
  },

  // Increase autopay adoption
  increase_autopay: {
    condition: (answers) => {
      const methods = answers['payment_methods'] || [];
      const rate = answers['autopay_rate'] || 0;
      return methods.includes('Automated recurring payments available') && rate < 40;
    },
    categoryImpacts: [15, 5, 0],
    overallImpact: 5,
    description: 'Autopay enrollment campaigns to reach 50%+ adoption',
    questionMapping: ['autopay_rate'],
    sourceRef: 7
  },

  // Add family portal
  // V4.16: Also triggers when portal question was hidden (no portal delivery selected)
  add_family_portal: {
    condition: (answers) => {
      const delivery = answers['statement_delivery'];
      const hasPortalDelivery = Array.isArray(delivery)
        ? delivery.includes('Online portal access')
        : delivery === 'Online portal access';
      if (!hasPortalDelivery) return true;
      return answers['family_portal'] === 'No self-service portal available';
    },
    categoryImpacts: [10, 25, 5],
    overallImpact: 10,
    description: 'Full-featured family portal with payments and history',
    questionMapping: ['family_portal'],
    sourceRef: 9
  },

  // Enhance family portal
  // V4.16: Updated to match new option label
  enhance_family_portal: {
    condition: (answers) => {
      const portal = answers['family_portal'];
      return portal === 'Viewing only (no payments)' || portal === 'Yes, but viewing only (no payments)';
    },
    categoryImpacts: [5, 15, 0],
    overallImpact: 5,
    description: 'Portal payment capability and autopay enrollment',
    questionMapping: ['family_portal'],
    sourceRef: 9
  },

  // Digital statement delivery
  add_digital_delivery: {
    condition: (answers) => {
      const delivery = answers['statement_delivery'];
      return delivery === 'Paper mail only' ||
             (Array.isArray(delivery) && delivery.length === 1 && delivery[0] === 'Paper mail');
    },
    categoryImpacts: [10, 15, 5],
    overallImpact: 8,
    description: 'Multi-channel digital delivery (email, text, portal)',
    questionMapping: ['statement_delivery'],
    sourceRef: 2
  },

  // Reduce coordination burden
  // V4.14: Updated for staff count slider (was hour-based options)
  reduce_coordination: {
    condition: (answers) => {
      const staffCount = answers['coordination_burden'] || 0;
      return staffCount >= 2; // Opportunity when 2+ staff on inquiries
    },
    categoryImpacts: [20, 15, 0],
    overallImpact: 8,
    description: 'Self-service portal and individual statements reduce inquiries',
    questionMapping: ['coordination_burden'],
    sourceRef: 9
  },

  // Improve family satisfaction
  improve_satisfaction: {
    condition: (answers) => {
      const sat = answers['family_satisfaction'];
      return sat === 'poor' || sat === 'We receive frequent complaints or confusion' ||
             sat === 'fair' || sat === 'We hear occasional frustrations';
    },
    categoryImpacts: [5, 20, 5],
    overallImpact: 8,
    description: 'Comprehensive billing modernization improves family experience',
    questionMapping: ['family_satisfaction'],
    sourceRef: 9
  },

  // Enable convenience fees
  enable_convenience_fees: {
    condition: (answers) => {
      const methods = answers['payment_methods'] || [];
      const fee = answers['convenience_fee'];
      return methods.includes('Credit cards') &&
             (fee === 'No, we absorb all processing fees' ||
              fee === "We'd like to but our current system doesn't support it");
    },
    categoryImpacts: [15, 0, 5],
    overallImpact: 5,
    description: 'Convenience fee pass-through to protect margins',
    questionMapping: ['convenience_fee'],
    sourceRef: 11
  },

  // V4.10: REMOVED snf_reduce_ar (references removed snf_ar_days question)
  // AR days improvement is implicit - PatientPay reduces AR through better collection

  // V4.9: SNF: Improve collection rate (slider-based)
  snf_improve_collection: {
    condition: (answers) => {
      const rate = answers['snf_collection_rate'];
      return answers['facility_type'] === 'SNF' && rate && rate < 85;
    },
    categoryImpacts: [25, 10, 0],
    overallImpact: 12,
    description: 'Increase collection rate by 15+ percentage points',
    questionMapping: ['snf_collection_rate'],
    sourceRef: 1, // Industry data
    segmentSpecific: ['SNF'],
    // V4.9: Specific projection - add 15pp to collection rate, cap at 95%
    projectionLogic: 'Math.min(95, current_rate + 15)'
  },

  // V4.13: SNF: Add full digital payment options (channels + types)
  snf_add_payment_options: {
    condition: (answers) => {
      // V4.13: Check both channels and types
      const channels = answers['snf_payment_channels'] || [];
      const types = answers['snf_payment_types'] || [];
      // Missing key digital options
      return answers['facility_type'] === 'SNF' &&
             (!types.includes('credit_cards') || !channels.includes('text_to_pay') || !channels.includes('portal'));
    },
    categoryImpacts: [5, 20, 0],
    overallImpact: 10,
    description: 'Full digital payment suite: cards, text-to-pay, online portal',
    questionMapping: ['snf_payment_channels', 'snf_payment_types'],
    sourceRef: 11, // CareGrove - 75% want card options
    segmentSpecific: ['SNF']
  },

  // V4.13: SNF convenience fee pass-through projection
  snf_enable_convenience_fees: {
    condition: (answers) => {
      // V4.13: Check snf_payment_types for credit cards
      const types = answers['snf_payment_types'] || [];
      const acceptsCards = types.includes('credit_cards');
      const fee = answers['snf_convenience_fee'];
      // Trigger if they accept cards but are NOT passing fees
      return answers['facility_type'] === 'SNF' &&
             acceptsCards &&
             fee !== 'pass_through';
    },
    categoryImpacts: [15, 0, 0], // Operations impact (cost savings)
    overallImpact: 8,
    description: 'Convenience fee pass-through to eliminate processing costs',
    questionMapping: ['snf_convenience_fee'],
    sourceRef: 11, // CareGrove - 69% willing to pay convenience fee
    segmentSpecific: ['SNF']
  },

  // V4.9: SNF: Enable/improve autopay
  // V4.10: Updated for simplified Yes/No autopay question
  snf_enable_autopay: {
    condition: (answers) => {
      const autopay = answers['snf_autopay'];
      const enrollment = answers['snf_autopay_enrollment'] || 0;
      return answers['facility_type'] === 'SNF' &&
             (autopay === 'no' || (autopay === 'yes' && enrollment < 40));
    },
    categoryImpacts: [15, 10, 0],
    overallImpact: 10,
    description: 'Automated recurring payments with enrollment campaigns',
    questionMapping: ['snf_autopay', 'snf_autopay_enrollment'],
    sourceRef: 7, // CareGrove - ~100% would use autopay
    segmentSpecific: ['SNF'],
    projectionLogic: 'Math.min(70, current_enrollment + 25)'
  },

  // V4.9: SNF: Improve multi-guarantor billing
  snf_improve_multi_guarantor: {
    condition: (answers) => {
      const mg = answers['snf_multi_guarantor'];
      return answers['facility_type'] === 'SNF' &&
             (mg === 'single_bill' || mg === 'manual' || mg === 'pain_point');
    },
    categoryImpacts: [10, 20, 0],
    overallImpact: 10,
    description: 'Automated split billing with individual family statements',
    questionMapping: ['snf_multi_guarantor'],
    sourceRef: 9, // Healthcare Payment Surveys - 72% less missed
    segmentSpecific: ['SNF']
  },

  // V4.10: REMOVED snf_add_payment_plans (references removed snf_payment_plans question)

  // V4.9: SNF: Improve family satisfaction
  snf_improve_satisfaction: {
    condition: (answers) => {
      const sat = answers['snf_family_satisfaction'];
      return answers['facility_type'] === 'SNF' &&
             (sat === 'fair' || sat === 'poor');
    },
    categoryImpacts: [5, 20, 0],
    overallImpact: 8,
    description: 'Modern billing experience improves family satisfaction',
    questionMapping: ['snf_family_satisfaction'],
    sourceRef: 9,
    segmentSpecific: ['SNF']
  }
};

/**
 * Calculate projected scores assuming PatientPay implementation
 * @param {Object} answers - User's answers
 * @param {Object} scores - Current calculated scores
 * @returns {Object} - { current, projected, improvements, overallImprovement }
 */
function calculatePatientPayProjections(answers, scores) {
  const segment = answers['facility_type'];
  const useTwoCategories = scores.useTwoCategories;

  // Start with current scores
  const projected = {
    overall: scores.overall,
    categories: [...scores.categories]
  };

  const improvements = [];
  const categoryImprovements = [0, 0, 0]; // Track total improvement per category

  // Evaluate each projection config
  Object.entries(PatientPayProjectionConfig).forEach(([id, config]) => {
    // Skip segment-specific configs that don't match
    if (config.segmentSpecific && !config.segmentSpecific.includes(segment)) {
      return;
    }

    // Check if this improvement applies
    if (config.condition(answers)) {
      improvements.push({
        id,
        description: config.description,
        categoryImpacts: config.categoryImpacts,
        overallImpact: config.overallImpact,
        questionMapping: config.questionMapping,
        sourceRef: config.sourceRef
      });

      // Add category impacts
      config.categoryImpacts.forEach((impact, i) => {
        // Skip competitive for SNF
        if (useTwoCategories && i === 2) return;
        categoryImprovements[i] += impact;
      });
    }
  });

  // Apply improvements to projected scores (capped at 100)
  const categoryCount = useTwoCategories ? 2 : 3;
  for (let i = 0; i < categoryCount; i++) {
    projected.categories[i] = Math.min(100, scores.categories[i] + categoryImprovements[i]);
  }

  // Recalculate overall using segment weights
  const facilityConfig = FacilityTypes[segment];
  if (facilityConfig) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < categoryCount; i++) {
      weightedSum += projected.categories[i] * facilityConfig.categoryWeights[i];
      totalWeight += facilityConfig.categoryWeights[i];
    }
    projected.overall = Math.round(weightedSum / totalWeight);
  } else {
    // Fallback: simple average
    projected.overall = Math.round(
      projected.categories.slice(0, categoryCount).reduce((a, b) => a + b, 0) / categoryCount
    );
  }

  // Sort improvements by overall impact
  improvements.sort((a, b) => b.overallImpact - a.overallImpact);

  return {
    current: {
      overall: scores.overall,
      categories: [...scores.categories]
    },
    projected: {
      overall: projected.overall,
      categories: projected.categories
    },
    improvements: improvements,
    topImprovements: improvements.slice(0, 5),
    additionalImprovements: improvements.slice(5),
    overallImprovement: projected.overall - scores.overall,
    categoryImprovements: categoryImprovements.slice(0, categoryCount).map((imp, i) => ({
      categoryIndex: i,
      categoryName: getCategoryName(i, segment),
      currentScore: scores.categories[i],
      projectedScore: Math.min(100, scores.categories[i] + imp),
      improvement: Math.min(100 - scores.categories[i], imp)
    }))
  };
}

// ============================================
// UPDATED RESULTS FLOW (V4.7)
// New emotional arc: Context → Validation → Opportunity → Action → Vision
// ============================================

const ResultsFlowV47 = {
  // V4.12.2: Standard flow for SL, MC, CCRC (7 slides - added Market Context)
  standardSlides: [
    {
      id: 0,
      type: 'overview',
      title: 'Your Payment Readiness Score',
      description: 'Overall score with benchmark comparison',
      content: ['overall_score_gauge', 'benchmark_comparison', 'segment_context']
    },
    {
      id: 1,
      type: 'strengths',
      title: 'Your Strengths',
      description: 'What you\'re doing well',
      content: ['strong_categories', 'strong_questions', 'celebration']
    },
    {
      id: 2,
      type: 'market-context',
      title: 'What Families Are Choosing',
      description: 'Industry statistics showing family expectations',
      content: ['family_stats', 'digital_adoption', 'opportunity_window']
    },
    {
      id: 3,
      type: 'opportunities',
      title: 'Your Opportunities',
      description: 'Where you can improve',
      content: ['gap_analysis', 'opportunity_areas', 'quick_wins']
    },
    {
      id: 4,
      type: 'improvements',
      title: 'Actionable Improvements',
      description: 'Top 5 recommendations with projected impact',
      content: ['top_recommendations', 'score_projections', 'additional_items']
    },
    {
      id: 5,
      type: 'vision',
      title: 'With PatientPay',
      description: 'Your projected future state',
      content: ['current_vs_projected', 'category_breakdown', 'capabilities']
    },
    {
      id: 6,
      type: 'next-steps',
      title: 'Next Steps',
      description: 'Action items and resources',
      content: ['schedule_cta', 'download_pdf', 'sources']
    }
  ],

  // SNF flow (5 slides - combined improvements + vision)
  snfSlides: [
    {
      id: 0,
      type: 'overview',
      title: 'Your Payment Readiness Score',
      description: 'Overall score with benchmark comparison',
      content: ['overall_score_gauge', 'benchmark_comparison', 'segment_context']
    },
    {
      id: 1,
      type: 'strengths',
      title: 'Your Strengths',
      description: 'What you\'re doing well',
      content: ['strong_categories', 'strong_questions', 'celebration']
    },
    {
      id: 2,
      type: 'opportunities',
      title: 'Your Opportunities',
      description: 'Where you can improve',
      content: ['gap_analysis', 'opportunity_areas', 'quick_wins']
    },
    {
      id: 3,
      type: 'improvements-vision',
      title: 'Improvements & PatientPay Vision',
      description: 'Top recommendations with projected future state',
      content: ['top_recommendations', 'current_vs_projected', 'capabilities']
    },
    {
      id: 4,
      type: 'next-steps',
      title: 'Next Steps',
      description: 'Action items and resources',
      content: ['schedule_cta', 'download_pdf', 'sources']
    }
  ],

  getSlides: function(segment) {
    return segment === 'SNF' ? this.snfSlides : this.standardSlides;
  },

  getTotalSlides: function(segment) {
    return segment === 'SNF' ? 5 : 6;
  }
};

// ============================================
// SOURCE CITATIONS
// ============================================
const SourceCitations = [
  { id: 1, name: "Industry Analysis / Senior Living Statistics 2024-2025" },
  { id: 2, name: "TransactCare" },
  { id: 3, name: "Aline Operations" },
  { id: 4, name: "AARP / Alzheimer's Association" },
  { id: 5, name: "NIC MAP Vision" },
  { id: 6, name: "Pew Research" },
  { id: 7, name: "CareGrove" },
  { id: 8, name: "Pew/AARP Research" },
  { id: 9, name: "Healthcare Payment Surveys" },
  { id: 10, name: "Richter Healthcare Consulting" },
  { id: 11, name: "CareGrove/Visa Research" }
];

// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

/**
 * Get questions visible for a given segment and current answers
 * V4.1: Skip routing question if facility_type already set (from contact form)
 * @param {Object} answers - Current answers including facility_type
 * @returns {Array} - Questions applicable to this segment
 */
function getVisibleQuestions(answers) {
  const segment = answers['facility_type'];

  return Questions.filter(q => {
    // V4.1: Skip routing question if segment is already set (from contact form)
    if (q.isRoutingQuestion) {
      return !segment; // Only show if segment NOT yet selected
    }

    // If no segment selected yet, only show routing
    if (!segment) return false;

    // Check segment applicability
    if (q.segments && !q.segments.includes(segment)) return false;

    // Check conditional logic
    if (q.conditional) {
      const { questionId, showIfIncludes, showIfIncludesAny, showIfEquals, skipIfOption, hideIfIncludesAny } = q.conditional;
      const dependentAnswer = answers[questionId];

      // V4.9: Show only if dependent answer exactly equals specified value
      if (showIfEquals) {
        if (dependentAnswer !== showIfEquals) return false;
      }

      if (showIfIncludes) {
        // For multi-select: show if the trigger option is included
        if (Array.isArray(dependentAnswer)) {
          if (!dependentAnswer.includes(showIfIncludes)) return false;
        } else {
          if (dependentAnswer !== showIfIncludes) return false;
        }
      }

      // V4.3: Show if ANY of the specified options are selected
      if (showIfIncludesAny && Array.isArray(showIfIncludesAny)) {
        if (Array.isArray(dependentAnswer)) {
          // Show only if at least one of the trigger options is in the answer array
          if (!showIfIncludesAny.some(trigger => dependentAnswer.includes(trigger))) {
            return false;
          }
        } else if (!dependentAnswer || !showIfIncludesAny.includes(dependentAnswer)) {
          return false;
        }
      }

      // V4.3: Hide if any of the specified options are selected
      if (hideIfIncludesAny && Array.isArray(hideIfIncludesAny)) {
        if (Array.isArray(dependentAnswer)) {
          // If any of the hide triggers are in the answer array, hide this question
          if (hideIfIncludesAny.some(trigger => dependentAnswer.includes(trigger))) {
            return false;
          }
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
 * Calculate individual question score
 * @param {Object} question - Question definition
 * @param {*} answer - User's answer
 * @returns {number} - Score (0-100)
 */
function calculateQuestionScore(question, answer) {
  if (answer === undefined || answer === null) return null;
  if (question.isRoutingQuestion) return null;
  if (question.isDiagnostic) return null; // V4.9: Diagnostic questions don't score

  if (question.type === 'slider') {
    return question.scoring(answer);
  }

  if (question.type === 'single') {
    const option = question.options.find(o => o.label === answer || o.value === answer);
    return option ? (option.score !== undefined ? option.score : 0) : 0;
  }

  if (question.type === 'multi') {
    if (!Array.isArray(answer)) return 0;

    // V4.9: Support custom scoring function (e.g., snf_payment_methods)
    if (typeof question.scoring === 'function') {
      return question.scoring(answer);
    }

    // Check if exclusive option is selected
    if (question.exclusiveOption && answer.includes(question.exclusiveOption.label)) {
      return question.exclusiveOption.score;
    }

    // V4.9: Support value-based matching (for options with value property)
    const sum = answer.reduce((total, selection) => {
      const opt = question.options.find(o =>
        o.value === selection || o.label === selection
      );
      // V4.9: Use points for SNF payment methods, score for others
      const points = opt ? (opt.points !== undefined ? opt.points : (opt.score || 0)) : 0;
      return total + points;
    }, 0);
    return Math.min(sum, question.maxScore || 100);
  }

  // V4.12.2: Removed orphaned payer_mix scoring - question type removed in V4.11

  return 0;
}

/**
 * Calculate all scores with segment-specific weighting
 * V4: SNF uses TWO categories only (Operations 60%, Family 40%)
 * V4.2: Cross-category scoring - questions can contribute to multiple categories
 * @param {Object} answers - All user answers
 * @returns {Object} - { overall, categories: [op, family, competitive], segment, useTwoCategories }
 */
function calculateScores(answers) {
  const segment = answers['facility_type'];
  const visibleQuestions = getVisibleQuestions(answers);
  const facilityConfig = segment && FacilityTypes[segment] ? FacilityTypes[segment] : null;
  const useTwoCategories = facilityConfig && facilityConfig.useTwoCategories;

  // Track scores per category (using weighted counts for cross-category questions)
  const categoryData = [
    { sum: 0, count: 0 },
    { sum: 0, count: 0 },
    { sum: 0, count: 0 }
  ];

  // V4.5: Check for questions with autoScore that were skipped (not visible)
  // but should still contribute a score based on their parent question's answer
  const allQuestions = Questions.filter(q => {
    if (!q.segments) return true;
    return q.segments.includes(segment);
  });

  allQuestions.forEach((q) => {
    if (!q.autoScore || q.isRoutingQuestion || q.categoryIndex === null) return;

    // Check if this question was NOT visible (skipped) and should get auto-score
    const isVisible = visibleQuestions.some(vq => vq.id === q.id);
    if (isVisible) return; // Don't auto-score if question was shown

    // V4.16: Support autoScoreWhenHidden (always score when hidden, regardless of parent value)
    if (q.autoScore.whenHidden) {
      categoryData[q.categoryIndex].sum += q.autoScore.score;
      categoryData[q.categoryIndex].count += 1;
      return;
    }

    // Check if parent answer matches autoScore.whenParentIs
    const parentAnswer = answers[q.conditional?.questionId];
    if (parentAnswer && q.autoScore.whenParentIs.includes(parentAnswer)) {
      // Apply auto-score
      categoryData[q.categoryIndex].sum += q.autoScore.score;
      categoryData[q.categoryIndex].count += 1;
    }
  });

  // Process each visible question
  visibleQuestions.forEach((q) => {
    if (q.isRoutingQuestion || q.categoryIndex === null) return;

    const answer = answers[q.id];
    if (answer === undefined) return;

    const score = calculateQuestionScore(q, answer);
    if (score === null) return;

    // V4.2: Support cross-category scoring
    // If question has categoryWeights array, distribute score across multiple categories
    // Otherwise, use single categoryIndex (backwards compatible)
    if (q.categoryWeights && Array.isArray(q.categoryWeights)) {
      // Cross-category scoring: distribute score based on weights
      q.categoryWeights.forEach(cw => {
        // For SNF (2-category model), skip competitive category contributions
        if (useTwoCategories && cw.index === 2) return;

        categoryData[cw.index].sum += score * cw.weight;
        categoryData[cw.index].count += cw.weight; // Weighted count maintains proper averaging
      });
    } else {
      // Single category (original behavior)
      categoryData[q.categoryIndex].sum += score;
      categoryData[q.categoryIndex].count += 1;
    }
  });

  // Calculate category averages
  const categoryScores = categoryData.map(data =>
    data.count > 0 ? Math.round(data.sum / data.count) : 0
  );

  // Apply segment-specific weights
  let overallScore;
  let weights;

  if (facilityConfig) {
    weights = facilityConfig.categoryWeights;

    if (useTwoCategories) {
      // SNF: Only use Operations (60%) and Family Experience (40%)
      // Competitive category is ignored (weight = 0)
      overallScore = Math.round(
        categoryScores[0] * 0.60 +  // Operations
        categoryScores[1] * 0.40    // Family Experience
      );
    } else {
      // All other segments: Use all 3 categories
      overallScore = Math.round(
        categoryScores[0] * weights[0] +
        categoryScores[1] * weights[1] +
        categoryScores[2] * weights[2]
      );
    }
  } else {
    // Equal weighting if no segment
    weights = [0.33, 0.34, 0.33];
    overallScore = Math.round(categoryScores.reduce((a, b) => a + b, 0) / 3);
  }

  return {
    overall: overallScore,
    categories: categoryScores,
    segment: segment,
    weights: weights,
    useTwoCategories: useTwoCategories || false
  };
}

/**
 * Get score level interpretation - V4.15: Benchmark-relative labels
 * When segment is provided, labels are relative to the industry benchmark.
 * This ensures a facility scoring above their industry average gets positive
 * language, even if their absolute score is moderate.
 *
 * @param {number} score - Score value (0-100)
 * @param {string} [segment] - Optional segment (SL, MC, SNF, CCRC) for benchmark-relative labels
 * @returns {string} - Level name
 */
function getScoreLevel(score, segment) {
  const benchmark = segment && IndustryBenchmarks[segment]
    ? IndustryBenchmarks[segment].overall
    : null;

  if (benchmark !== null) {
    const gap = score - benchmark;
    if (gap >= 15) return 'Leading';
    if (gap >= 5) return 'Ahead of Benchmark';
    if (gap >= -4) return score >= 60 ? 'On Track' : 'Building Momentum';
    if (gap >= -14) return 'Opportunity Ahead';
    return 'Early Stage';
  }

  // Fallback: absolute thresholds (used when segment not available)
  if (score >= 85) return 'Leading';
  if (score >= 70) return 'Ahead of Benchmark';
  if (score >= 55) return 'On Track';
  if (score >= 40) return 'Building Momentum';
  return 'Early Stage';
}

/**
 * Get score color - V4.15: Smooth continuous gradient from red → amber → green
 * Uses benchmark-relative positioning when segment is provided.
 * The color is a smooth interpolation, not discrete buckets.
 *
 * Spectrum: Red (#EF4444) → Orange (#F97316) → Amber (#F59E0B) → Lime (#84CC16) → Green (#10B981)
 * Mapped to: 15+ below benchmark ... at benchmark ... 15+ above benchmark
 *
 * @param {number} score - Score value (0-100)
 * @param {string} [segment] - Optional segment for benchmark-relative coloring
 * @returns {string} - CSS color string
 */
function getScoreColor(score, segment) {
  // Determine position as 0-1 value (0 = worst, 1 = best)
  let position;

  const benchmark = segment && IndustryBenchmarks[segment]
    ? IndustryBenchmarks[segment].overall
    : null;

  if (benchmark !== null) {
    // Benchmark-relative: map gap of -20..+20 to 0..1
    const gap = score - benchmark;
    position = Math.max(0, Math.min(1, (gap + 20) / 40));
  } else {
    // Fallback: absolute 0-100 mapped to 0..1
    position = Math.max(0, Math.min(1, score / 100));
  }

  // 5-stop gradient: Red → Orange → Amber → Lime → Green
  const stops = [
    { pos: 0.00, color: '#EF4444' },  // Red
    { pos: 0.25, color: '#F97316' },  // Orange
    { pos: 0.50, color: '#F59E0B' },  // Amber (benchmark)
    { pos: 0.75, color: '#84CC16' },  // Lime
    { pos: 1.00, color: '#10B981' },  // Green
  ];

  // Find the two stops to interpolate between
  for (let i = 0; i < stops.length - 1; i++) {
    if (position <= stops[i + 1].pos) {
      const t = (position - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      return interpolateColor(stops[i].color, stops[i + 1].color, t);
    }
  }
  return stops[stops.length - 1].color;
}

/**
 * Calculate personalized financial insights
 * V4.4: Updated to use new multi-guarantor question flow
 * V4.11: SNF now uses direct financial inputs for powerful ROI projections:
 *       - snf_monthly_patient_billing (what they actually bill patients)
 *       - snf_patient_ar_days (how long to collect)
 *       - snf_collection_rate (what % they actually collect)
 *       PatientPay success story metrics for projections:
 *       - 47% AR days reduction (Lake Washington PT)
 *       - 40% bad debt reduction (Encore)
 *       - 2X collections improvement (IRG, Alpine)
 * @param {Object} formData - { bedCount, avgMonthlyRate }
 * @param {Object} answers - User answers
 * @returns {Object|null} - Insights or null if insufficient data
 */
function calculateInsights(formData, answers) {
  const { bedCount, avgMonthlyRate } = formData;
  const segment = answers['facility_type'];

  // V4.11: SNF uses direct financial inputs
  const isSNF = segment === 'SNF';
  const snfAnnualPatients = answers['snf_annual_patients'];
  const snfMonthlyPatientBilling = answers['snf_monthly_patient_billing']; // V4.11: Direct dollar input
  const snfPatientARDays = answers['snf_patient_ar_days']; // V4.11: AR days for patient balances
  const snfCollectionRate = answers['snf_collection_rate']; // Collection rate slider

  // For non-SNF, require bedCount and avgMonthlyRate
  if (!isSNF && (!bedCount || !avgMonthlyRate)) return null;
  // For SNF, we can work with monthly billing or annual patients
  if (isSNF && !snfMonthlyPatientBilling && !snfAnnualPatients && !bedCount) return null;

  const occupancyRates = { IL: 0.92, AL: 0.877, SL: 0.88, MC: 0.87, SNF: 0.833, CCRC: 0.88 };
  const occupancyRate = occupancyRates[segment] || 0.85;

  // V4.11: SNF-specific calculations with direct financial inputs
  let occupiedBeds, monthlyRevenue, annualRevenue, dailyRevenue;
  let privatePayRevenue = 0;
  let collectionRate = 75; // Default
  let annualPatients = 0;

  // V4.11: PatientPay Success Story Metrics
  const PATIENTPAY_METRICS = {
    arDaysReduction: 0.47,        // 47% reduction (Lake Washington: 45→20 days)
    badDebtReduction: 0.40,       // 40% reduction (Encore)
    collectionsImprovement: 2.0,  // 2X collections (IRG, Alpine)
    first30DaysImprovement: 0.25, // 25% more in first 30 days (IRG)
    textToPayRate: 0.60,          // 60% text-to-pay rate (IRG)
    industryTextToPayRate: 0.43,  // 43% industry average
    digitalAdoption: 0.90,        // 90% digital adoption (Encore)
  };

  // V4.11: SNF Financial Impact Variables
  let snfMonthlyBilling = 0;
  let snfAnnualBilling = 0;
  let snfCashInAR = 0;
  let snfCurrentARDays = 60; // Default
  let snfProjectedARDays = 0;
  let snfCashFreedByARReduction = 0;
  let snfCurrentBadDebt = 0;
  let snfBadDebtSavings = 0;
  let snfTotalAnnualImpact = 0;

  if (isSNF) {
    // V4.11: Use direct monthly billing input if provided
    if (snfMonthlyPatientBilling && snfMonthlyPatientBilling > 0) {
      snfMonthlyBilling = snfMonthlyPatientBilling;
    } else {
      // Fallback calculation based on patients or beds
      const SNF_CONSTANTS = {
        dailyRate: 305,
        avgStayDays: 28,
      };
      occupiedBeds = bedCount ? Math.round(bedCount * occupancyRate) : 100;
      annualPatients = snfAnnualPatients || (occupiedBeds * 3);
      const privatePayPct = 0.25; // Industry average
      const privatePayPatients = Math.round(annualPatients * privatePayPct);
      const annualPatientResponsibility = privatePayPatients * SNF_CONSTANTS.dailyRate * SNF_CONSTANTS.avgStayDays;
      snfMonthlyBilling = Math.round(annualPatientResponsibility / 12);
    }

    snfAnnualBilling = snfMonthlyBilling * 12;

    // V4.11: AR days from user input or default
    snfCurrentARDays = snfPatientARDays || 60;

    // V4.11: Collection rate from slider
    collectionRate = snfCollectionRate || 75;

    // V4.11: Calculate Cash Stuck in AR
    // Formula: (Monthly Billing × AR Days) / 30
    snfCashInAR = Math.round((snfMonthlyBilling * snfCurrentARDays) / 30);

    // V4.11: Calculate Projected AR Days with PatientPay (47% reduction)
    snfProjectedARDays = Math.round(snfCurrentARDays * (1 - PATIENTPAY_METRICS.arDaysReduction));

    // V4.11: Calculate Cash Freed by AR Reduction
    const projectedCashInAR = Math.round((snfMonthlyBilling * snfProjectedARDays) / 30);
    snfCashFreedByARReduction = snfCashInAR - projectedCashInAR;

    // V4.11: Calculate Bad Debt Impact
    // Industry typical: 3% bad debt when AR is high
    const badDebtRate = snfCurrentARDays > 45 ? 0.03 : 0.02;
    snfCurrentBadDebt = Math.round(snfAnnualBilling * badDebtRate);
    snfBadDebtSavings = Math.round(snfCurrentBadDebt * PATIENTPAY_METRICS.badDebtReduction);

    // V4.11: Total Annual Impact
    snfTotalAnnualImpact = snfCashFreedByARReduction + snfBadDebtSavings;

    // Set standard variables for compatibility
    monthlyRevenue = snfMonthlyBilling;
    annualRevenue = snfAnnualBilling;
    dailyRevenue = snfAnnualBilling / 365;
    privatePayRevenue = snfAnnualBilling;
    occupiedBeds = bedCount ? Math.round(bedCount * occupancyRate) : Math.round(snfMonthlyBilling / 2500); // Estimate beds from billing

  } else {
    // Standard calculations for senior living
    occupiedBeds = Math.round(bedCount * occupancyRate);
    monthlyRevenue = occupiedBeds * avgMonthlyRate;
    annualRevenue = monthlyRevenue * 12;
    dailyRevenue = annualRevenue / 365;
  }

  // AR-related calculations
  // V4.11: SNF uses user-provided AR days; non-SNF uses industry benchmarks
  let arDays = 45; // Default
  if (isSNF) {
    arDays = snfCurrentARDays; // V4.11: From user input
  } else if (segment === 'CCRC') {
    arDays = 18; // CCRC benchmark
  } else if (segment === 'SL') {
    arDays = 45; // Senior Living: midpoint of IL (35) and AL (50)
  } else if (segment === 'MC') {
    arDays = 50;
  }

  // V4.11: For SNF, use calculated values; for others, use standard calculation
  let cashInAR, potentialFreedCash;
  if (isSNF) {
    cashInAR = snfCashInAR;
    potentialFreedCash = snfCashFreedByARReduction;
  } else {
    cashInAR = Math.round(dailyRevenue * arDays);
    const targetArDaysMap = { SNF: 35, CCRC: 19, SL: 35, MC: 40 };
    const targetArDays = targetArDaysMap[segment] || 35;
    potentialFreedCash = arDays > targetArDays ? Math.round(dailyRevenue * (arDays - targetArDays)) : 0;
  }

  // V4.11: Target AR days (for display and comparison)
  const targetArDaysMap = { SNF: 35, CCRC: 19, SL: 35, MC: 40 };
  const targetArDays = targetArDaysMap[segment] || 35;

  // Staff time calculations
  const billingFTEs = Math.max(1, Math.round((bedCount || occupiedBeds) / 50));
  const timeOnPayments = Math.round(billingFTEs * 50000 * 0.42);

  // Autopay calculations
  // V4.5: Added AR reduction impact from autopay
  const autopayPct = (answers['autopay_rate'] || 20) / 100;
  const residentsOnAutopay = Math.round(occupiedBeds * autopayPct);
  const autopayOpportunity = Math.max(0, Math.round(occupiedBeds * 0.5) - residentsOnAutopay);

  // V4.5: Calculate potential AR day reduction from autopay
  // Autopay families pay on day 1 (effectively 0 AR days for their portion)
  // Non-autopay families average the current AR days
  // If 50% autopay target achieved, AR days could drop significantly
  const autopayTargetPct = 0.50; // Industry high-performer target
  const currentAutopayARContribution = autopayPct * 0; // Autopay = 0 AR days for that portion
  const currentNonAutopayARContribution = (1 - autopayPct) * arDays;
  const effectiveARDays = currentAutopayARContribution + currentNonAutopayARContribution;

  // If they hit 50% autopay, what would AR days become?
  const targetAutopayARContribution = autopayTargetPct * 0;
  const targetNonAutopayARContribution = (1 - autopayTargetPct) * arDays;
  const projectedARWithAutopay = Math.round(targetAutopayARContribution + targetNonAutopayARContribution);
  const arDaysReductionFromAutopay = autopayPct < autopayTargetPct ? Math.round(arDays - projectedARWithAutopay) : 0;
  const cashFreedByAutopay = arDaysReductionFromAutopay > 0 ? Math.round(dailyRevenue * arDaysReductionFromAutopay) : 0;

  // V4.4/V4.6: Multi-guarantor calculations
  // Non-SNF: Uses multi_guarantor_capability, multi_guarantor_adoption, multi_guarantor_payers
  // SNF: Uses snf_multi_guarantor (simplified yes/no/not-needed/manual)
  let avgPayersPerResident = 1;
  let multiGuarantorResidents = 0;
  let totalPayers = occupiedBeds;
  let hasMultiGuarantorCapability = false;
  let snfMultiGuarantorStatus = null;

  if (isSNF) {
    // V4.9: SNF uses enhanced multi-guarantor question
    const snfMultiGuarantor = answers['snf_multi_guarantor'];
    snfMultiGuarantorStatus = snfMultiGuarantor;
    if (snfMultiGuarantor === 'automated' || snfMultiGuarantor === 'manual') {
      hasMultiGuarantorCapability = true;
      avgPayersPerResident = 2; // Estimate for SNF (47% adult children caregivers)
      multiGuarantorResidents = Math.round(occupiedBeds * 0.30); // ~30% have multiple payers
      totalPayers = occupiedBeds - multiGuarantorResidents + Math.round(multiGuarantorResidents * avgPayersPerResident);
    }
  } else {
    // Non-SNF uses full multi-guarantor question flow
    const multiGuarantorCapability = answers['multi_guarantor_capability'];
    const multiGuarantorAdoption = (answers['multi_guarantor_adoption'] || 30) / 100;
    const multiGuarantorPayersAnswer = answers['multi_guarantor_payers'];

    if (multiGuarantorCapability && multiGuarantorCapability !== 'no') {
      hasMultiGuarantorCapability = true;
      // V4.14: Get avg payers from slider (1-8, integer) or default to 2
      avgPayersPerResident = parseInt(multiGuarantorPayersAnswer) || 2;

      // Calculate residents using multi-guarantor and total payers
      multiGuarantorResidents = Math.round(occupiedBeds * multiGuarantorAdoption);
      const singlePayerResidents = occupiedBeds - multiGuarantorResidents;
      totalPayers = singlePayerResidents + Math.round(multiGuarantorResidents * avgPayersPerResident);
    }
  }

  // V4.14: Coordination burden calculations - now based on staff count
  // Staff count × estimated salary allocation (30% of $50K salary spent on billing inquiries)
  const staffOnInquiries = answers['coordination_burden'] || 2;
  const avgSalary = 50000;
  const inquiryTimeAllocation = 0.30; // 30% of their time on billing inquiries
  const inquiryCost = Math.round(staffOnInquiries * avgSalary * inquiryTimeAllocation);

  // V4.14: Keep legacy fields for backward compatibility, estimate hours from staff count
  const weeklyHoursOnInquiries = staffOnInquiries * 8; // Estimate ~8 hours/week per staff member
  const annualInquiryHours = weeklyHoursOnInquiries * 52;

  // V4.8/V4.9: Credit card fee absorption calculation
  // V4.13: For SNF, use snf_payment_types; For non-SNF, use payment_methods and convenience_fee
  // Show potential savings if NOT passing fees through
  let acceptsCards = false;
  let passingFeesToFamilies = false;
  let cardVolumePct = 0.50; // Default 50% of revenue goes through cards

  if (isSNF) {
    // V4.13: SNF uses snf_payment_types for card acceptance check
    const snfPaymentTypes = answers['snf_payment_types'] || [];
    acceptsCards = snfPaymentTypes.includes('credit_cards') || snfPaymentTypes.includes('debit_cards');
    // V4.13: Check SNF convenience fee question (only asked if they accept credit cards)
    const snfConvenienceFee = answers['snf_convenience_fee'];
    // They're passing fees if they answered "pass_through"
    passingFeesToFamilies = (snfConvenienceFee === 'pass_through');
  } else {
    // Non-SNF uses original questions
    const paymentMethods = answers['payment_methods'] || [];
    acceptsCards = paymentMethods.includes('Credit cards') || paymentMethods.includes('Debit cards');
    const convenienceFeeAnswer = answers['convenience_fee'];
    // V4.13: Match actual option label for convenience fee pass-through detection
    passingFeesToFamilies = (convenienceFeeAnswer === 'Yes, we pass fees to families who choose card payments');
  }

  // V4.10: Calculate potential card fee savings if they accept cards but don't pass fees
  // absorbingCardFees is true if they accept cards AND don't pass fees to families
  const absorbingCardFees = acceptsCards && !passingFeesToFamilies;
  let annualCardFeesAbsorbed = 0;
  if (absorbingCardFees) {
    // Calculate based on card volume and processing fees
    const processingFeeRate = 0.025; // 2.5% average
    // For SNF, apply to private pay revenue; for others, apply to annual revenue
    const revenueBase = isSNF ? privatePayRevenue : annualRevenue;
    const annualCardVolume = revenueBase * cardVolumePct;
    annualCardFeesAbsorbed = Math.round(annualCardVolume * processingFeeRate);
  }

  // Build base insights
  const baseInsights = {
    segment,
    occupiedBeds,
    monthlyRevenue,
    annualRevenue,
    dailyRevenue,
    cashInAR,
    potentialFreedCash,
    timeOnPayments,
    billingFTEs,
    arDays,
    targetArDays,
    residentsOnAutopay,
    autopayPct: Math.round(autopayPct * 100),
    autopayOpportunity,
    // V4.5: Autopay AR impact
    arDaysReductionFromAutopay,
    cashFreedByAutopay,
    projectedARWithAutopay,
    // V4.4/V4.6: Multi-guarantor insights
    hasMultiGuarantorCapability,
    avgPayersPerResident,
    totalPayers,
    multiGuarantorResidents,
    // V4.14: Staff-based coordination burden metrics
    staffOnInquiries,
    weeklyHoursOnInquiries,
    staffHoursPerWeek: weeklyHoursOnInquiries, // Alias for PDF ROI calculations
    annualInquiryHours,
    inquiryCost,
    potentialInquirySavings: Math.round(inquiryCost * 0.65), // 65% reduction with self-service
    // V4.8: Credit card fee absorption
    acceptsCards,
    absorbingCardFees,
    annualCardFeesAbsorbed
  };

  // V4.11: Add SNF-specific insights with financial impact calculations
  if (isSNF) {
    // V4.11: Calculate collection gap (revenue left on table)
    const targetCollectionRate = 90; // Target 90%
    const actualCollected = privatePayRevenue * (collectionRate / 100);
    const targetCollected = privatePayRevenue * (targetCollectionRate / 100);
    const collectionGap = Math.round(Math.max(0, targetCollected - actualCollected));

    // V4.11: Autopay calculation using SNF-specific questions
    const snfAutopay = answers['snf_autopay'];
    const snfAutopayEnrollment = answers['snf_autopay_enrollment'] || 15;
    const snfHasAutopay = snfAutopay === 'yes';

    // V4.12.2: Payment plan insights calculation
    const snfPaymentPlans = answers['snf_payment_plans'];
    const hasPaymentPlans = snfPaymentPlans === 'manual' || snfPaymentPlans === 'automated';
    const hasAutomatedPaymentPlans = snfPaymentPlans === 'automated';

    // Payment plan financial impact:
    // Without payment plans: ~10-15% recovery on difficult balances
    // With payment plans: ~40-60% recovery (4-5x improvement)
    // Estimate: 15% of annual billing becomes "difficult" balances
    const difficultBalancesPct = 0.15;
    const difficultBalances = Math.round(snfAnnualBilling * difficultBalancesPct);
    const currentRecoveryRate = hasPaymentPlans ? 0.40 : 0.12; // 40% with plans, 12% without
    const targetRecoveryRate = 0.50; // 50% with automated self-service
    const currentRecovery = Math.round(difficultBalances * currentRecoveryRate);
    const potentialRecovery = Math.round(difficultBalances * targetRecoveryRate);
    const paymentPlanOpportunity = Math.max(0, potentialRecovery - currentRecovery);

    return {
      ...baseInsights,
      // V4.11: Direct financial inputs from user
      snfMonthlyBilling,
      snfAnnualBilling,
      snfCurrentARDays,
      // V4.11: PatientPay Impact Projections
      snfProjectedARDays,
      snfCashInAR,
      snfCashFreedByARReduction,
      snfCurrentBadDebt,
      snfBadDebtSavings,
      snfTotalAnnualImpact,
      // V4.11: PatientPay success metrics used
      patientPayMetrics: PATIENTPAY_METRICS,
      // Legacy fields for compatibility
      annualPatients,
      privatePayRevenue,
      snfMultiGuarantorStatus,
      // Collection rate data
      collectionRate,
      collectionGap,
      targetCollectionRate,
      // Autopay data
      snfHasAutopay,
      snfAutopayEnrollment,
      // V4.12.2: Payment plan data
      hasPaymentPlans,
      hasAutomatedPaymentPlans,
      snfPaymentPlans,
      difficultBalances,
      paymentPlanOpportunity,
      // V4.11: Total financial opportunity (AR reduction + bad debt savings + collection gap + payment plans)
      totalFinancialOpportunity: snfCashFreedByARReduction + snfBadDebtSavings + collectionGap + paymentPlanOpportunity,
      // Collection improvement opportunity
      privatePayCollectionOpportunity: collectionGap
    };
  }

  // Non-SNF: include multi-guarantor adoption percentage
  const multiGuarantorAdoptionPct = Math.round((answers['multi_guarantor_adoption'] || 30));
  return {
    ...baseInsights,
    multiGuarantorAdoptionPct
  };
}

/**
 * Prepare comprehensive export data
 * V4: Updated to reflect two-category model for SNF
 * @param {Object} formData - Contact/facility info
 * @param {Object} answers - User answers
 * @param {Object} scores - Calculated scores
 * @returns {Object} - Full export data object
 */
function prepareExportData(formData, answers, scores) {
  const visibleQuestions = getVisibleQuestions(answers);
  const timestamp = new Date().toISOString();
  const segment = answers['facility_type'];
  const useTwoCategories = scores.useTwoCategories || false;

  // Map answers to human-readable format
  const answersReadable = {};
  visibleQuestions.forEach(q => {
    if (q.isRoutingQuestion) return;
    const answer = answers[q.id];
    if (answer !== undefined) {
      answersReadable[`Q: ${q.question}`] = Array.isArray(answer) ? answer.join('; ') : answer;
    }
  });

  const insights = calculateInsights(formData, answers);

  return {
    submission_id: `pcc-v4-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    source: 'pcc_assessment_v4',
    segment: segment,
    segment_label: segment && FacilityTypes[segment] ? FacilityTypes[segment].label : 'Unknown',

    contact: {
      name: formData.name,
      email: formData.email,
      organization: formData.organization,
    },

    facility: {
      type: segment,
      bed_count: formData.bedCount,
      avg_monthly_rate: formData.avgMonthlyRate,
    },

    scores: {
      overall: scores.overall,
      overall_level: getScoreLevel(scores.overall, segment),
      operational_readiness: scores.categories[0],
      operational_level: getScoreLevel(scores.categories[0], segment),
      family_experience: scores.categories[1],
      family_level: getScoreLevel(scores.categories[1], segment),
      // SNF uses 2-category model - no competitive position
      competitive_position: useTwoCategories ? null : scores.categories[2],
      competitive_level: useTwoCategories ? null : getScoreLevel(scores.categories[2], segment),
      weights: useTwoCategories ? [0.60, 0.40] : scores.weights,
      uses_two_categories: useTwoCategories,
    },

    insights,
    answers: answersReadable,
    answers_raw: answers,

    opportunities: {
      low_autopay: (answers['autopay_rate'] || 0) < 30,
      // V4.4: Updated to use new multi_guarantor_capability question
      no_multi_guarantor: answers['multi_guarantor_capability'] === 'no' || answers['multi_guarantor_capability'] === 'No, we can only bill one responsible party',
      limited_payment_methods: !answers['payment_methods'] || answers['payment_methods'].length < 3,
      paper_statements: answers['statement_delivery'] === 'Paper mail only' || (Array.isArray(answers['statement_delivery']) && answers['statement_delivery'].length === 1 && answers['statement_delivery'][0] === 'Paper mail'),
      manual_processing: answers['statement_processing'] === 'Entirely manual (print, stuff, mail)' || answers['statement_processing'] === 'Mostly manual with spreadsheet tracking',
      high_coordination_burden: (answers['coordination_burden'] || 0) >= 3, // V4.14: Updated for staff count slider
      // V4.4: Tour billing opportunity flag (when score ≤ 45)
      tour_billing_opportunity: answers['tour_billing'] === 'We try to avoid billing topics during tours' || answers['tour_billing'] === 'We briefly mention it if asked',
      // V4.4: Family satisfaction opportunity
      low_family_satisfaction: answers['family_satisfaction'] === 'poor' || answers['family_satisfaction'] === 'We receive frequent complaints or confusion' || answers['family_satisfaction'] === 'fair' || answers['family_satisfaction'] === 'We hear occasional frustrations',
      // V4.10: SNF-specific flags (simplified - no longer using removed questions)
      // SNF opportunities based on collection rate and family satisfaction
      low_snf_collection: segment === 'SNF' && (answers['snf_collection_rate'] || 75) < 85,
      low_snf_family_satisfaction: segment === 'SNF' && (answers['snf_family_satisfaction'] === 'fair' || answers['snf_family_satisfaction'] === 'poor'),
    },
  };
}

/**
 * Generate CSV string from export data
 * V4: Updated to handle two-category model for SNF
 * @param {Object} data - Export data object
 * @returns {string} - CSV formatted string
 */
function generateCSV(data) {
  const rows = [];
  const useTwoCategories = data.scores.uses_two_categories || false;

  rows.push(['Field', 'Value']);
  rows.push(['Submission ID', data.submission_id]);
  rows.push(['Timestamp', data.timestamp]);
  rows.push(['Assessment Version', 'v4.13']);
  rows.push(['Facility Type', data.segment_label]);
  rows.push(['Name', data.contact.name]);
  rows.push(['Email', data.contact.email]);
  rows.push(['Organization', data.contact.organization]);
  rows.push(['Bed Count', data.facility.bed_count || '']);
  rows.push(['Avg Monthly Rate', data.facility.avg_monthly_rate || '']);
  rows.push(['Overall Score', data.scores.overall]);
  rows.push(['Overall Level', data.scores.overall_level]);
  rows.push(['Operational Readiness', data.scores.operational_readiness]);
  rows.push(['Operational Weight', Math.round(data.scores.weights[0] * 100) + '%']);
  rows.push(['Family Experience', data.scores.family_experience]);
  rows.push(['Family Weight', Math.round(data.scores.weights[1] * 100) + '%']);

  // Only include Competitive Position for segments that use 3 categories
  if (!useTwoCategories) {
    rows.push(['Competitive Position', data.scores.competitive_position]);
    rows.push(['Competitive Weight', Math.round(data.scores.weights[2] * 100) + '%']);
  } else {
    rows.push(['Competitive Position', 'N/A (SNF uses 2-category model)']);
  }

  if (data.insights) {
    rows.push(['--- Insights ---', '']);
    rows.push(['Occupied Beds', data.insights.occupiedBeds]);
    rows.push(['Monthly Revenue', data.insights.monthlyRevenue]);
    rows.push(['Annual Revenue', data.insights.annualRevenue]);
    rows.push(['Cash in A/R', data.insights.cashInAR]);
    rows.push(['Potential Freed Cash', data.insights.potentialFreedCash]);
    rows.push(['Avg Payers per Resident', data.insights.avgPayersPerResident]);
    rows.push(['Total Payers', data.insights.totalPayers]);
    rows.push(['Annual Inquiry Cost', data.insights.inquiryCost]);
  }

  rows.push(['--- Answers ---', '']);
  Object.entries(data.answers).forEach(([q, a]) => {
    rows.push([q, a]);
  });

  // V4.13: Sanitize CSV cells to prevent formula injection in spreadsheet apps
  const sanitizeCSVCell = (val) => {
    const str = String(val).replace(/"/g, '""');
    // Prefix formula-triggering characters to prevent execution in Excel/Sheets
    if (/^[=+\-@\t\r]/.test(str)) return "'" + str;
    return str;
  };

  return rows.map(row =>
    row.map(cell => `"${sanitizeCSVCell(cell)}"`).join(',')
  ).join('\n');
}

// ============================================
// WEBHOOK CONFIGURATION
// ============================================
const WebhookConfig = {
  url: 'https://hook.us2.make.com/rfkguwgo35h5hcvouwemkbull48gbnrh',
  enabled: true,
  timeout: 10000,
  retryAttempts: 2,
};

/**
 * Send assessment data to webhook
 * V4: Simplified payload (~30 fields) - just answers and scores
 * @param {Object} formData - Contact/facility info
 * @param {Object} answers - User answers
 * @param {Object} scores - Calculated scores
 * @param {string} uiVersion - Which UI version was used
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
async function sendWebhook(formData, answers, scores, uiVersion = 'unknown') {
  if (!WebhookConfig.enabled || !WebhookConfig.url) {
    // Webhook disabled or no URL configured
    return { success: false, error: 'Webhook disabled' };
  }

  const segment = answers['facility_type'];
  const facilityConfig = segment && FacilityTypes[segment] ? FacilityTypes[segment] : null;
  const useTwoCategories = scores.useTwoCategories || false;

  // V4 Simplified Payload (~30 fields)
  const payload = {
    submissionId: `pcc-v4-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    assessmentVersion: '4.13',

    contact: {
      name: formData.name || '',
      email: formData.email || '',
      organization: formData.organization || '',
      phone: formData.phone || ''
    },

    facility: {
      type: segment || '',
      typeLabel: facilityConfig ? facilityConfig.label : '',
      bedCount: formData.bedCount || null,
      avgMonthlyRate: formData.avgMonthlyRate || null
    },

    // Raw answers - all question responses
    answers: { ...answers },

    // Scores
    scores: {
      overall: scores.overall,
      overallLevel: getScoreLevel(scores.overall, segment),
      operational: scores.categories[0],
      familyExperience: scores.categories[1],
      // Competitive is null for SNF (uses 2-category model)
      competitive: useTwoCategories ? null : scores.categories[2],
      weights: useTwoCategories ? [0.60, 0.40] : scores.weights
    }
  };

  let lastError = null;
  for (let attempt = 0; attempt <= WebhookConfig.retryAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WebhookConfig.timeout);

      const response = await fetch(WebhookConfig.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Webhook sent successfully
        return { success: true, submissionId: payload.submissionId };
      } else {
        lastError = `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`Webhook attempt ${attempt + 1} failed:`, lastError);
      }
    } catch (err) {
      lastError = err.name === 'AbortError' ? 'Request timeout' : err.message;
      console.warn(`Webhook attempt ${attempt + 1} error:`, lastError);
    }

    if (attempt < WebhookConfig.retryAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  console.error('Webhook failed after all retries:', lastError);
  return { success: false, error: lastError };
}

// ============================================
// PDF REPORT GENERATION
// ============================================

// PatientPay logo as base64 (small optimized version for PDF)
// Note: For production, this could be loaded from CDN or converted from the full logo
const PATIENTPAY_LOGO_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgNjAiPjx0ZXh0IHg9IjAiIHk9IjQ1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDgiIGZvbnQtd2VpZ2h0PSJib2xkIj48dHNwYW4gZmlsbD0iIzA3MjE0MCI+UGF0aWVudDwvdHNwYW4+PHRzcGFuIGZpbGw9IiMzYzhmYzciPlBheTwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg==`;

/**
 * Generate a professional PDF report using jsPDF
 * V4.3 Enhanced with:
 * - PatientPay logo
 * - Deeper industry insights and benchmarks
 * - Category-specific analysis with action items
 * - ROI calculations
 * - Peer comparison context
 *
 * @param {Object} formData - Contact/facility info
 * @param {Object} answers - User answers
 * @param {Object} scores - Calculated scores
 * @returns {Promise<Blob>} - PDF blob for download
 */
async function generatePDFReport(formData, answers, scores) {
  // V4.13: Dynamically load jsPDF with integrity check
  if (typeof window.jspdf === 'undefined') {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.integrity = 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk';
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'letter');

  // V4.15: Load actual PatientPay logo PNG for PDF embedding
  let logoImg = null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => resolve(); // Don't reject, just fall back to text
      img.src = 'assets/patientpay_color.png';
    });
    if (img.naturalWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      logoImg = canvas.toDataURL('image/png');
    }
  } catch (e) {
    // Silently fall back to text-based logo
  }

  const segment = answers['facility_type'];
  const segmentLabel = segment && FacilityTypes[segment] ? FacilityTypes[segment].label : 'Senior Living';
  const visibleQuestions = getVisibleQuestions(answers);
  const insights = calculateInsights(formData, answers);

  // V4.7: Add strengths and projections data for enhanced PDF
  const strengthsData = getStrengths(scores, answers);
  const projectionsData = calculatePatientPayProjections(answers, scores);
  const gapAnalysisData = getGapAnalysis(scores);
  const recommendationsData = getActionableRecommendations(answers, scores, insights);

  // Brand colors
  const colors = {
    primary: [7, 33, 64],
    secondary: [60, 143, 199],
    accent: [252, 201, 59],
    success: [16, 185, 129],
    warning: [245, 158, 11],
    error: [239, 68, 68],
    textDark: [30, 41, 59],
    textMuted: [100, 116, 139],
    bgLight: [248, 250, 252],
    white: [255, 255, 255],
  };

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  // V4.9: Design system constants for consistent spacing
  const spacing = {
    xs: 8,
    sm: 12,
    md: 18,
    lg: 25,
    xl: 35,
    section: 30  // Between major sections
  };
  const radius = {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10
  };
  const fontSize = {
    xs: 8,
    sm: 9,
    body: 10,
    md: 11,
    lg: 12,
    xl: 14,
    h2: 16,
    h1: 20,
    display: 28
  };

  const setColor = (color) => doc.setTextColor(color[0], color[1], color[2]);
  const setFillColor = (color) => doc.setFillColor(color[0], color[1], color[2]);
  const setDrawColor = (color) => doc.setDrawColor(color[0], color[1], color[2]);

  const formatCurrency = (num) => {
    if (!num) return 'N/A';
    return '$' + num.toLocaleString('en-US');
  };

  // V4.15: Smooth continuous gradient for PDF (red → amber → green)
  // Returns RGB array for jsPDF. Uses same benchmark-relative logic as getScoreColor.
  const getScoreColorArr = (score) => {
    const benchmark = IndustryBenchmarks[segment] ? IndustryBenchmarks[segment].overall : null;
    let position;
    if (benchmark !== null) {
      const gap = score - benchmark;
      position = Math.max(0, Math.min(1, (gap + 20) / 40));
    } else {
      position = Math.max(0, Math.min(1, score / 100));
    }

    // 5-stop gradient: Red → Orange → Amber → Lime → Green (RGB arrays)
    const stops = [
      { pos: 0.00, rgb: [239, 68, 68] },    // Red
      { pos: 0.25, rgb: [249, 115, 22] },    // Orange
      { pos: 0.50, rgb: [245, 158, 11] },    // Amber
      { pos: 0.75, rgb: [132, 204, 22] },    // Lime
      { pos: 1.00, rgb: [16, 185, 129] },    // Green
    ];

    for (let i = 0; i < stops.length - 1; i++) {
      if (position <= stops[i + 1].pos) {
        const t = (position - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
        return stops[i].rgb.map((c, j) => Math.round(c + (stops[i + 1].rgb[j] - c) * t));
      }
    }
    return stops[stops.length - 1].rgb;
  };

  // V4.15: Benchmark-relative labels with contextual descriptions
  const getScoreLevelText = (score) => {
    const benchmark = IndustryBenchmarks[segment] ? IndustryBenchmarks[segment].overall : null;
    const gap = benchmark !== null ? score - benchmark : null;

    if (gap !== null) {
      if (gap >= 15) return { level: 'Leading', desc: `Your payment operations lead the ${segmentLabel} industry (benchmark: ${benchmark})` };
      if (gap >= 5) return { level: 'Ahead of Benchmark', desc: `You're outperforming the ${segmentLabel} industry benchmark of ${benchmark}` };
      if (gap >= -4 && score >= 60) return { level: 'On Track', desc: `You're tracking with the ${segmentLabel} industry benchmark of ${benchmark}` };
      if (gap >= -4) return { level: 'Building Momentum', desc: `You're near the ${segmentLabel} industry benchmark of ${benchmark} with strong foundations` };
      if (gap >= -14) return { level: 'Opportunity Ahead', desc: `Clear opportunities to reach the ${segmentLabel} benchmark of ${benchmark}` };
      return { level: 'Early Stage', desc: `Significant potential to improve toward the ${segmentLabel} benchmark of ${benchmark}` };
    }

    // Fallback: absolute thresholds
    if (score >= 85) return { level: 'Leading', desc: 'Your payment operations are industry-leading' };
    if (score >= 70) return { level: 'Ahead of Benchmark', desc: 'Your payment operations are well-positioned' };
    if (score >= 55) return { level: 'On Track', desc: 'Good foundation with room for optimization' };
    if (score >= 40) return { level: 'Building Momentum', desc: 'Growing foundation with clear next steps' };
    return { level: 'Early Stage', desc: 'Significant potential for improvement with the right tools' };
  };

  // V4.15: Draw logo using actual PNG image with text fallback
  const drawLogo = (x, y, size = 'normal', onDarkBg = false) => {
    if (logoImg) {
      // Logo aspect ratio is approximately 4.8:1 (wide horizontal wordmark)
      const heights = { large: 28, normal: 18, small: 12 };
      const h = heights[size] || 18;
      const w = h * 4.8;

      if (onDarkBg) {
        setFillColor(colors.white);
        const pad = size === 'large' ? 10 : 6;
        doc.roundedRect(x - pad, y - h - 2, w + pad * 2, h + pad * 2 - 2, radius.sm, radius.sm, 'F');
      }
      doc.addImage(logoImg, 'PNG', x, y - h, w, h);
    } else {
      // Fallback: text-based logo
      const logoFontSize = size === 'large' ? 28 : size === 'small' ? 12 : 18;
      doc.setFontSize(logoFontSize);
      doc.setFont('helvetica', 'bold');
      const patientWidth = doc.getTextWidth('Patient');
      const payWidth = doc.getTextWidth('Pay');
      const totalWidth = patientWidth + payWidth;

      if (onDarkBg) {
        setFillColor(colors.white);
        const padding = size === 'large' ? 10 : 6;
        const bgHeight = logoFontSize + padding;
        doc.roundedRect(x - padding, y - logoFontSize + 2, totalWidth + (padding * 2), bgHeight, radius.sm, radius.sm, 'F');
      }
      setColor(colors.primary);
      doc.text('Patient', x, y);
      setColor(colors.secondary);
      doc.text('Pay', x + patientWidth, y);
    }
  };

  let totalPages = 7; // V4.9: Cover, Financial Impact, Strengths & Opportunities, Path to Improvement, Category Analysis, Benchmarks & Action Plan, Responses

  const addFooter = (pageNum) => {
    // V4.9: Refined footer with better spacing and visual weight
    setDrawColor([220, 225, 230]);
    doc.setLineWidth(0.75);
    doc.line(margin, pageHeight - 45, pageWidth - margin, pageHeight - 45);

    setColor(colors.textMuted);
    doc.setFontSize(fontSize.xs);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 28, { align: 'center' });
    doc.text('PatientPay Assessment v4.15', margin, pageHeight - 28);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 28, { align: 'right' });
  };

  const addHeader = (title, showLogo = true) => {
    // V4.9: Refined header with improved proportions
    setFillColor(colors.primary);
    doc.rect(0, 0, pageWidth, 65, 'F');

    // Subtle accent line at bottom of header
    setFillColor(colors.secondary);
    doc.rect(0, 63, pageWidth, 2, 'F');

    if (showLogo) {
      // V4.15: Use actual logo image or fallback to text
      const logoX = pageWidth - margin - 75;
      const logoY = 38;
      drawLogo(logoX, logoY, 'normal', true);
    }

    setColor(colors.white);
    doc.setFontSize(fontSize.h1);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, 40);
  };

  // ============================================
  // PAGE 1: COVER
  // ============================================
  // V4.9: Refined cover with improved visual hierarchy
  setFillColor(colors.primary);
  doc.rect(0, 0, pageWidth, 305, 'F');

  // Accent bar with gradient effect
  setFillColor(colors.accent);
  doc.rect(0, 305, pageWidth, 6, 'F');
  setFillColor(colors.secondary);
  doc.rect(0, 311, pageWidth, 2, 'F');

  // Logo - V4.4: Pass true for onDarkBg since cover has dark navy background
  drawLogo(margin, 65, 'large', true);

  // Tagline - V4.9: Slightly larger and more prominent
  setColor(colors.secondary);
  doc.setFontSize(fontSize.lg);
  doc.setFont('helvetica', 'normal');
  doc.text('PointClickCare Marketplace Partner', margin, 92);

  // Title - V4.9: Better vertical rhythm
  setColor(colors.white);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Readiness', margin, 155);
  doc.text('Assessment Report', margin, 198);

  // Segment badge - V4.9: More padding and cleaner proportions
  doc.setFontSize(fontSize.xl);
  const badgeWidth = doc.getTextWidth(segmentLabel) + 28;
  setFillColor(colors.accent);
  doc.roundedRect(margin, 220, badgeWidth, 30, radius.md, radius.md, 'F');
  setColor(colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(segmentLabel, margin + 14, 240);

  // Organization - V4.9: Better spacing from badge
  setColor(colors.white);
  doc.setFontSize(fontSize.h2);
  doc.setFont('helvetica', 'normal');
  doc.text(formData.organization || 'Your Organization', margin, 278);

  // Overall score box - V4.9: Improved card design with better proportions
  let y = 345;
  setFillColor(colors.bgLight);
  doc.roundedRect(margin, y, contentWidth, 165, radius.xl, radius.xl, 'F');

  // Subtle top border accent (flat rect inset to stay within rounded corners)
  setFillColor(colors.secondary);
  doc.rect(margin + radius.xl, y, contentWidth - radius.xl * 2, 4, 'F');

  setColor(colors.textDark);
  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'bold');
  doc.text('OVERALL PAYMENT READINESS SCORE', margin + spacing.lg, y + 35);

  const scoreColor = getScoreColorArr(scores.overall);
  const scoreLevelInfo = getScoreLevelText(scores.overall);

  // Score circle - V4.9: Slightly larger with better positioning
  setFillColor(scoreColor);
  doc.circle(margin + 85, y + 100, 52, 'F');
  setColor(colors.white);
  doc.setFontSize(44);
  doc.setFont('helvetica', 'bold');
  doc.text(scores.overall.toString(), margin + 85, y + 115, { align: 'center' });

  // Score level - V4.9: Better alignment with circle
  setColor(scoreColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(scoreLevelInfo.level, margin + 165, y + 90);

  setColor(colors.textMuted);
  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(scoreLevelInfo.desc, 270);
  doc.text(descLines, margin + 165, y + 112);

  // Category bars (mini) - V4.9: Improved bar design with better spacing
  y = 540;
  setColor(colors.textDark);
  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'bold');
  doc.text('CATEGORY SCORES', margin, y);

  y += spacing.lg;
  const weights = scores.useTwoCategories ? [0.60, 0.40] : scores.weights;
  const categoryCount = scores.useTwoCategories ? 2 : 3;
  // V4.6: Use SNF-specific category names for SNF segment
  const categoryLabels = segment === 'SNF' ? SNFCategoryNames : CategoryNames;

  categoryLabels.slice(0, categoryCount).forEach((name, i) => {
    setColor(colors.textDark);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.text(name, margin, y + 11);

    // Progress bar background - V4.9: Taller bars with cleaner look
    setFillColor([225, 230, 235]);
    doc.roundedRect(margin + 155, y, 195, 16, radius.sm, radius.sm, 'F');

    // Progress bar fill
    const fillWidth = (scores.categories[i] / 100) * 195;
    if (fillWidth > 0) {
      setFillColor(getScoreColorArr(scores.categories[i]));
      doc.roundedRect(margin + 155, y, fillWidth, 16, radius.sm, radius.sm, 'F');
    }

    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.text(`${scores.categories[i]}/100 (${Math.round(weights[i] * 100)}% weight)`, margin + 362, y + 11);

    y += 30;
  });

  // Contact info box - V4.9: Cleaner design with better visual separation
  y = 665;
  setFillColor([245, 247, 250]);
  doc.roundedRect(margin, y, contentWidth, 72, radius.md, radius.md, 'F');

  // Vertical divider
  setFillColor([220, 225, 230]);
  doc.rect(margin + 260, y + 12, 1, 48, 'F');

  setColor(colors.textMuted);
  doc.setFontSize(fontSize.xs);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR', margin + 18, y + 20);

  setColor(colors.textDark);
  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'bold');
  doc.text(formData.name || 'Assessment User', margin + 18, y + 38);
  doc.setFontSize(fontSize.body);
  doc.setFont('helvetica', 'normal');
  doc.text(formData.email || '', margin + 18, y + 54);

  if (formData.bedCount || formData.avgMonthlyRate) {
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.xs);
    doc.setFont('helvetica', 'bold');
    doc.text('FACILITY DETAILS', margin + 278, y + 20);
    setColor(colors.textDark);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    if (formData.bedCount) {
      doc.text(`${formData.bedCount} beds`, margin + 278, y + 38);
    }
    if (formData.avgMonthlyRate) {
      doc.text(`${formatCurrency(formData.avgMonthlyRate)}/month avg`, margin + 278, y + 54);
    }
  }

  // Generation date - V4.9: Positioned in corner
  setColor(colors.textMuted);
  doc.setFontSize(fontSize.xs);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated: ' + new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }), pageWidth - margin - 15, y + 60, { align: 'right' });

  addFooter(1);


  // ============================================
  // V4.15: PAGES 2-6 - SEGMENT-BRANCHED
  // Non-SNF: Restructured with behavioral psychology arc
  // SNF: Preserved existing flow
  // ============================================

  if (segment !== 'SNF') {

  // ============================================
  // PAGE 2: YOUR PAYMENT READINESS (Non-SNF)
  // Benchmark comparison + strengths
  // ============================================
  doc.addPage();
  addHeader('Your Payment Readiness');
  y = 95;

  // Section A: Benchmark Comparison
  setColor(colors.textDark);
  doc.setFontSize(fontSize.xl);
  doc.setFont('helvetica', 'bold');
  doc.text('How You Compare', margin, y);
  y += spacing.md;

  // Overall score vs benchmark
  if (gapAnalysisData) {
    const benchmarkScore = gapAnalysisData.overall.benchmark;
    const overallGap = gapAnalysisData.overall.gap;
    const gapColor = overallGap >= 5 ? colors.success : overallGap >= -4 ? colors.secondary : colors.warning;

    // Proportional thirds layout within the box
    const boxH = 85;
    const thirdW = contentWidth / 3;

    setFillColor(colors.bgLight);
    doc.roundedRect(margin, y, contentWidth, boxH, radius.lg, radius.lg, 'F');
    setFillColor(gapColor);
    doc.rect(margin + radius.lg, y, contentWidth - radius.lg * 2, 4, 'F');

    // Left third: Your Score
    const leftX = margin + spacing.lg;
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'bold');
    doc.text('YOUR SCORE', leftX, y + 24);

    const scoreColorArr = getScoreColorArr(scores.overall);
    setColor(scoreColorArr);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(scores.overall.toString(), leftX, y + 58);

    // Center third: Gap badge + label
    const centerX = margin + thirdW;
    const gapText = overallGap >= 0 ? `+${overallGap}` : `${overallGap}`;
    const perfLabel = overallGap >= 5 ? 'Above Benchmark' : overallGap >= -4 ? 'At Benchmark' : 'Below Benchmark';

    setFillColor(gapColor);
    const badgeW = 65;
    doc.roundedRect(centerX + (thirdW - badgeW) / 2, y + 25, badgeW, 26, radius.md, radius.md, 'F');
    setColor(colors.white);
    doc.setFontSize(fontSize.xl);
    doc.setFont('helvetica', 'bold');
    doc.text(gapText, centerX + thirdW / 2, y + 43, { align: 'center' });

    setColor(gapColor);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'bold');
    doc.text(perfLabel, centerX + thirdW / 2, y + 62, { align: 'center' });

    // Right third: Benchmark
    const rightX = margin + thirdW * 2 + spacing.md;
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'bold');
    doc.text(`${segmentLabel.toUpperCase()} BENCHMARK`, rightX, y + 24);
    setColor(colors.textDark);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(benchmarkScore.toString(), rightX, y + 58);

    y += boxH + spacing.lg;

    // Per-category comparison bars
    setColor(colors.textDark);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text('CATEGORY BREAKDOWN', margin, y);
    y += spacing.lg;

    const benchmarkKeys = ['operations', 'family', 'competitive'];
    const catColors = [colors.secondary, [139, 92, 246], colors.accent];

    for (let i = 0; i < 3; i++) {
      const catName = CategoryNames[i];
      const catScore = scores.categories[i];
      const catBenchmark = IndustryBenchmarks[segment] ? IndustryBenchmarks[segment][benchmarkKeys[i]] : 50;
      const catGap = catScore - catBenchmark;

      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text(catName, margin, y + 10);

      // Score bar background
      const barX = margin + 180;
      const barWidth = 230;
      setFillColor([225, 230, 235]);
      doc.roundedRect(barX, y, barWidth, 16, radius.sm, radius.sm, 'F');

      // Score bar fill
      const fillWidth = (catScore / 100) * barWidth;
      if (fillWidth > 0) {
        setFillColor(catColors[i]);
        doc.roundedRect(barX, y, fillWidth, 16, radius.sm, radius.sm, 'F');
      }

      // Benchmark marker
      const benchmarkX = barX + (catBenchmark / 100) * barWidth;
      setDrawColor(colors.textDark);
      doc.setLineWidth(1.5);
      doc.line(benchmarkX, y - 2, benchmarkX, y + 18);

      // Score text (right of bar)
      setColor(colors.textDark);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'bold');
      doc.text(`${catScore}`, barX + barWidth + 10, y + 11);

      // Gap badge (compact)
      const catGapStr = catGap >= 0 ? `+${catGap}` : `${catGap}`;
      const catGapColor = catGap >= 5 ? colors.success : catGap >= -4 ? colors.secondary : colors.warning;
      setFillColor(catGapColor);
      doc.roundedRect(barX + barWidth + 30, y + 1, 32, 14, radius.sm, radius.sm, 'F');
      setColor(colors.white);
      doc.setFontSize(fontSize.xs);
      doc.text(catGapStr, barX + barWidth + 46, y + 10, { align: 'center' });

      y += 30;
    }
  }

  y += spacing.section;

  // Section B: Your Strengths
  setColor(colors.textDark);
  doc.setFontSize(fontSize.xl);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Strengths', margin, y);
  y += spacing.md;

  if (strengthsData.strongCategories && strengthsData.strongCategories.length > 0) {
    strengthsData.strongCategories.forEach((cat) => {
      setFillColor([240, 253, 244]);
      doc.roundedRect(margin, y, contentWidth, 45, radius.md, radius.md, 'F');
      setFillColor(colors.success);
      doc.roundedRect(margin, y, 5, 45, radius.sm, radius.sm, 'F');

      setColor(colors.textDark);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text(cat.name, margin + spacing.lg, y + 20);

      setColor(colors.success);
      doc.setFontSize(fontSize.body);
      doc.text(`${cat.score}/100`, margin + 320, y + 20);

      // Above benchmark badge
      setFillColor(colors.success);
      doc.roundedRect(margin + 370, y + 10, 100, 20, radius.sm, radius.sm, 'F');
      setColor(colors.white);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'bold');
      doc.text(`+${cat.gap} Above`, margin + 420, y + 24, { align: 'center' });

      y += 55;
    });
  } else if (strengthsData.relativeStrength) {
    const rs = strengthsData.relativeStrength;
    setFillColor([255, 251, 235]);
    doc.roundedRect(margin, y, contentWidth, 45, radius.md, radius.md, 'F');
    setFillColor(colors.accent);
    doc.roundedRect(margin, y, 5, 45, radius.sm, radius.sm, 'F');

    setColor(colors.textDark);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text(`Strongest Area: ${rs.name}`, margin + spacing.lg, y + 20);
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.text(`Score: ${rs.score}/100`, margin + 320, y + 20);
    y += 55;

    // Building blocks
    if (strengthsData.moderateQuestions && strengthsData.moderateQuestions.length > 0) {
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'bold');
      doc.text('BUILDING BLOCKS IN PLACE', margin, y);
      y += spacing.md;

      strengthsData.moderateQuestions.slice(0, 3).forEach((q) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize.body);
        setColor(colors.textDark);
        const qLines = doc.splitTextToSize(`${q.question}: ${q.answer || ''}`, contentWidth - 20);
        doc.text(qLines, margin + 10, y);
        y += qLines.length * 14 + 8;
      });
    }
  } else {
    setFillColor(colors.bgLight);
    doc.roundedRect(margin, y, contentWidth, 50, radius.md, radius.md, 'F');
    setColor(colors.textDark);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text('Early in Your Modernization Journey', margin + spacing.lg, y + 22);
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.text('Every leading facility started exactly where you are today.', margin + spacing.lg, y + 38);
    y += 60;
  }

  addFooter(2);

  // ============================================
  // PAGE 3: WHAT FAMILIES EXPECT (Non-SNF)
  // The strongest page - demographic shift + gap analysis
  // ============================================
  doc.addPage();
  addHeader('What Today\'s Families Expect');
  y = 95;

  // Section A: Demographic Shift Statement
  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'normal');
  const shiftText = '11,200 Americans turn 65 every day. Their adult children grew up with Venmo, Apple Pay, and online banking. They expect the same from your billing.';
  const shiftLines = doc.splitTextToSize(shiftText, contentWidth - spacing.lg * 2);
  const shiftBoxH = shiftLines.length * 15 + 40;

  setFillColor(colors.primary);
  doc.roundedRect(margin, y, contentWidth, shiftBoxH, radius.lg, radius.lg, 'F');
  // Accent bar inset to stay within rounded corners
  setFillColor(colors.accent);
  doc.rect(margin + radius.lg, y, contentWidth - radius.lg * 2, 4, 'F');

  setColor(colors.white);
  doc.text(shiftLines, margin + spacing.lg, y + 26);

  y += shiftBoxH + spacing.md;

  // Section B: Family Expectations Dashboard (3x2 grid)
  setColor(colors.textDark);
  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'bold');
  doc.text('WHAT FAMILIES ARE CHOOSING', margin, y);
  y += spacing.md;

  const statGrid = [
    { value: '67%', label: 'would choose a card-accepting facility', color: colors.accent },
    { value: '78%', label: 'of seniors 65+ own smartphones', color: colors.secondary },
    { value: '75%', label: 'want card payment options', color: colors.secondary },
    { value: '82%', label: 'prefer digital payments', color: colors.success },
    { value: '37%', label: 'miss bills due to payment complexity', color: colors.warning },
    { value: '72%', label: 'less likely to miss with unified billing', color: colors.success },
  ];

  const statGap = 10;
  const statBoxW = (contentWidth - statGap * 2) / 3;
  const statBoxH = 78;
  statGrid.forEach((stat, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const sx = margin + col * (statBoxW + statGap);
    const sy = y + row * (statBoxH + statGap);

    setFillColor(colors.bgLight);
    doc.roundedRect(sx, sy, statBoxW, statBoxH, radius.md, radius.md, 'F');
    setFillColor(stat.color);
    doc.roundedRect(sx, sy, statBoxW, 3, radius.md, radius.md, 'F');

    setColor(stat.color);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, sx + spacing.md, sy + 30);

    setColor(colors.textDark);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'normal');
    const labelLines = doc.splitTextToSize(stat.label, statBoxW - spacing.md * 2);
    doc.text(labelLines, sx + spacing.md, sy + 46);
  });

  y += (statBoxH + statGap) * 2 + spacing.md;

  // Section C: Your Gap (personalized)
  const gaps = [];
  const delivery = answers['statement_delivery'];
  const isPaperOnly = delivery === 'Paper mail only' || (Array.isArray(delivery) && delivery.length === 1 && delivery[0] === 'Paper mail');
  if (isPaperOnly) {
    gaps.push({ yours: 'Paper mail only', expected: 'Digital delivery: email, text, portal' });
  }

  const methods = answers['payment_methods'] || [];
  const hasCards = methods.includes('Credit cards') || methods.includes('Debit cards');
  if (!hasCards) {
    gaps.push({ yours: 'Checks and ACH only', expected: 'Card payments and digital wallets' });
  }

  // V4.16: Check portal status from both delivery method and portal capability question
  const hasPortalDelivery = Array.isArray(delivery)
    ? delivery.includes('Online portal access')
    : delivery === 'Online portal access';
  const portal = answers['family_portal'];
  if (!hasPortalDelivery) {
    // No portal delivery selected = no portal at all
    gaps.push({ yours: 'No self-service billing access', expected: '24/7 online portal for balances and payments' });
  } else if (portal === 'No self-service portal available' || portal === 'no') {
    // Legacy answer fallback
    gaps.push({ yours: 'No self-service billing access', expected: '24/7 online portal for balances and payments' });
  }

  const mgCap = answers['multi_guarantor_capability'];
  if (mgCap === 'no' || mgCap === 'No, we can only bill one responsible party') {
    gaps.push({ yours: 'One bill to one responsible party', expected: 'Individual statements per family member' });
  } else if (mgCap === 'yes_manual' || mgCap === 'Yes, but it requires significant manual effort') {
    gaps.push({ yours: 'Manual split billing (labor intensive)', expected: 'Automated multi-guarantor billing' });
  }

  const autopayRate = answers['autopay_rate'] || 0;
  const hasAutopay = methods.includes('Automated recurring payments available') || methods.includes('Automated recurring payments (autopay)');
  if (!hasAutopay) {
    gaps.push({ yours: 'No autopay option', expected: 'Recurring automated payments' });
  } else if (autopayRate < 30) {
    gaps.push({ yours: `Only ${autopayRate}% on autopay`, expected: '50%+ autopay enrollment' });
  }

  const satisfaction = answers['family_satisfaction'];
  if (satisfaction === 'poor' || satisfaction === 'We receive frequent complaints or confusion') {
    gaps.push({ yours: 'Frequent billing complaints', expected: 'Positive billing experience' });
  } else if (satisfaction === 'fair' || satisfaction === 'We hear occasional frustrations') {
    gaps.push({ yours: 'Occasional billing frustrations', expected: 'Consistently positive experience' });
  }

  if (gaps.length > 0) {
    setColor(colors.textDark);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text('YOUR GAP', margin, y);
    y += spacing.sm;

    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'normal');
    doc.text('Where your facility stands today vs. what families expect', margin, y);
    y += spacing.md;

    // Table header
    const colHalfW = contentWidth / 2;
    setFillColor(colors.primary);
    doc.roundedRect(margin, y, contentWidth, 24, radius.sm, radius.sm, 'F');
    setColor(colors.white);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'bold');
    doc.text('What You Offer Today', margin + spacing.md, y + 16);
    doc.text('What Families Expect', margin + colHalfW + spacing.md, y + 16);
    y += 28;

    // Table rows (max 5, dynamic height)
    doc.setFontSize(fontSize.body);
    gaps.slice(0, 5).forEach((gap, idx) => {
      doc.setFont('helvetica', 'normal');
      const yoursLines = doc.splitTextToSize(gap.yours, colHalfW - spacing.md * 2);
      const expectedLines = doc.splitTextToSize(gap.expected, colHalfW - spacing.md * 2);
      const maxLines = Math.max(yoursLines.length, expectedLines.length);
      const rowH = maxLines * 13 + 16;

      const rowBg = idx % 2 === 0 ? colors.bgLight : colors.white;
      setFillColor(rowBg);
      doc.rect(margin, y, contentWidth, rowH, 'F');

      // Left column - current state
      setColor([200, 100, 50]);
      doc.text(yoursLines, margin + spacing.md, y + 13);

      // Right column - expected state
      setColor(colors.success);
      doc.text(expectedLines, margin + colHalfW + spacing.md, y + 13);

      // Divider
      setFillColor([210, 215, 220]);
      doc.rect(margin + colHalfW - 0.5, y + 4, 1, rowH - 8, 'F');

      y += rowH;
    });
  } else {
    // No gaps - congratulatory message
    setFillColor([240, 253, 244]);
    doc.roundedRect(margin, y, contentWidth, 50, radius.md, radius.md, 'F');
    setFillColor(colors.success);
    doc.roundedRect(margin, y, 5, 50, radius.sm, radius.sm, 'F');

    setColor(colors.success);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text('You\'re Ahead of Most Facilities', margin + spacing.lg, y + 22);
    setColor(colors.textDark);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.text('Your facility is already meeting key family expectations across the board.', margin + spacing.lg, y + 38);
  }

  addFooter(3);

  // ============================================
  // PAGE 4: THE COST OF MANUAL OPERATIONS (Non-SNF)
  // Current state vs optimized, card fees, autopay, savings
  // ============================================
  doc.addPage();
  addHeader('The Cost of Manual Operations');
  y = 95;

  // Section A: Current State vs Optimized State
  setColor(colors.textDark);
  doc.setFontSize(fontSize.xl);
  doc.setFont('helvetica', 'bold');
  doc.text('Current State vs. Optimized State', margin, y);
  y += spacing.md;

  const halfWidth = (contentWidth - 16) / 2;

  // Column headers
  setFillColor([254, 242, 242]); // Light red
  doc.roundedRect(margin, y, halfWidth, 28, radius.md, radius.md, 'F');
  setColor(colors.error);
  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'bold');
  doc.text('TODAY', margin + halfWidth / 2, y + 18, { align: 'center' });

  setFillColor([240, 253, 244]); // Light green
  doc.roundedRect(margin + halfWidth + 16, y, halfWidth, 28, radius.md, radius.md, 'F');
  setColor(colors.success);
  doc.text('WITH PATIENTPAY', margin + halfWidth + 16 + halfWidth / 2, y + 18, { align: 'center' });
  y += 36;

  // Comparison rows
  const compRows = [];

  // Billing inquiries
  const staffCount = answers['coordination_burden'] || 0;
  if (staffCount > 0 && insights.inquiryCost > 0) {
    compRows.push({
      label: 'Billing Inquiries',
      today: `${staffCount} staff on billing questions (${formatCurrency(insights.inquiryCost)}/yr)`,
      optimized: `Self-service handles 65%+ (save ${formatCurrency(insights.potentialInquirySavings || 0)}/yr)`
    });
  }

  // Statement processing
  const stmtProc = answers['statement_processing'];
  if (stmtProc) {
    const procSimple = typeof stmtProc === 'string' ? stmtProc.substring(0, 50) : '';
    compRows.push({
      label: 'Statement Processing',
      today: procSimple || 'Current process',
      optimized: 'Automated from PointClickCare (15 sec)'
    });
  }

  // Statement delivery
  if (delivery) {
    const deliveryText = Array.isArray(delivery) ? delivery.join(', ') : delivery;
    compRows.push({
      label: 'Statement Delivery',
      today: deliveryText.substring(0, 50),
      optimized: 'Multi-channel digital (email, text, portal)'
    });
  }

  // Family portal - V4.16: Check both delivery method and portal answer
  if (!hasPortalDelivery || portal === 'No self-service portal available' || portal === 'no') {
    compRows.push({
      label: 'Family Access',
      today: 'No self-service billing access',
      optimized: '24/7 online portal for balances and payments'
    });
  }

  // Multi-guarantor
  if (mgCap === 'no' || mgCap === 'No, we can only bill one responsible party') {
    compRows.push({
      label: 'Split Billing',
      today: 'One bill to one responsible party',
      optimized: 'Automated multi-guarantor billing'
    });
  } else if (mgCap === 'yes_manual' || mgCap === 'Yes, but it requires significant manual effort') {
    compRows.push({
      label: 'Split Billing',
      today: 'Manual split billing process',
      optimized: 'Fully automated split billing'
    });
  }

  compRows.slice(0, 5).forEach((row, idx) => {
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    const todayLines = doc.splitTextToSize(row.today, halfWidth - spacing.md * 2);
    const optLines = doc.splitTextToSize(row.optimized, halfWidth - spacing.md * 2);
    const maxContentLines = Math.max(todayLines.length, optLines.length);
    const rowH = maxContentLines * 13 + 30;

    const rowBg = idx % 2 === 0 ? [248, 249, 251] : colors.white;
    setFillColor(rowBg);
    doc.rect(margin, y, contentWidth, rowH, 'F');

    // Row label (spans full width)
    setColor(colors.textDark);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'bold');
    doc.text(row.label, margin + spacing.md, y + 14);

    // Today column text
    setColor([180, 80, 60]);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.text(todayLines, margin + spacing.md, y + 28);

    // Optimized column text
    setColor(colors.success);
    doc.text(optLines, margin + halfWidth + 16 + spacing.md, y + 28);

    // Column divider
    setFillColor([220, 225, 230]);
    doc.rect(margin + halfWidth + 7, y + 4, 1, rowH - 8, 'F');

    y += rowH;
  });

  y += spacing.lg;

  // Section B: Card Fee Savings (conditional, prominent)
  if (insights.absorbingCardFees && insights.annualCardFeesAbsorbed > 0) {
    if (y + 105 < pageHeight - 80) {
      setFillColor([255, 251, 235]); // Light amber
      doc.roundedRect(margin, y, contentWidth, 95, radius.lg, radius.lg, 'F');
      // Accent bar inset to stay within rounded corners
      setFillColor(colors.accent);
      doc.rect(margin + radius.lg, y, contentWidth - radius.lg * 2, 4, 'F');

      // Headline with amount
      setColor(colors.textDark);
      doc.setFontSize(fontSize.lg);
      doc.setFont('helvetica', 'bold');
      const feeHeadline = `You are absorbing ${formatCurrency(insights.annualCardFeesAbsorbed)} in card processing fees annually`;
      const feeLines = doc.splitTextToSize(feeHeadline, contentWidth - spacing.lg * 2);
      doc.text(feeLines, margin + spacing.lg, y + 24);
      const feeHeadlineEnd = y + 24 + feeLines.length * 14;

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text('69% of families are willing to pay a convenience fee for the option to pay by card.', margin + spacing.lg, feeHeadlineEnd + 4);
      doc.text(`Annual savings with convenience fee pass-through: ${formatCurrency(insights.annualCardFeesAbsorbed)}`, margin + spacing.lg, feeHeadlineEnd + 18);

      setColor(colors.success);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'bold');
      doc.text('Zero revenue impact. Families choose cards (with fee) or ACH (free).', margin + spacing.lg, feeHeadlineEnd + 34);

      y += 105;
    }
  }

  // Section C: Autopay Cash Flow (conditional)
  if (insights.cashFreedByAutopay > 0 && y + 65 < pageHeight - 80) {
    setFillColor([240, 249, 255]);
    doc.roundedRect(margin, y, contentWidth, 60, radius.md, radius.md, 'F');
    setFillColor(colors.secondary);
    doc.roundedRect(margin, y, 5, 60, radius.sm, radius.sm, 'F');

    setColor(colors.secondary);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text('Autopay Opportunity', margin + spacing.lg, y + 20);

    setColor(colors.textDark);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.text(`Current enrollment: ${insights.autopayPct || 0}%`, margin + spacing.lg, y + 36);
    doc.text(`Target: 50%+`, margin + 170, y + 36);
    doc.text(`Cash flow acceleration: ${formatCurrency(insights.cashFreedByAutopay)}`, margin + 260, y + 36);

    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.text('Autopay reduces late payments and accelerates cash flow predictability.', margin + spacing.lg, y + 50);

    y += 68;
  }

  // Section D: Annual Impact Summary (individual line items, no combined total)
  const savingsInquiry = insights.potentialInquirySavings || 0;
  const savingsCards = insights.annualCardFeesAbsorbed || 0;
  const savingsAutopay = insights.cashFreedByAutopay || 0;
  const hasAnySavings = savingsInquiry > 0 || savingsCards > 0 || savingsAutopay > 0;

  if (hasAnySavings) {
    // Count line items to size the box
    let savingsLineCount = 0;
    if (savingsInquiry > 0) savingsLineCount++;
    if (savingsCards > 0) savingsLineCount++;
    if (savingsAutopay > 0) savingsLineCount++;
    const savingsBoxH = 36 + savingsLineCount * 18;

    // Ensure savings box always fits - anchor to bottom of page if tight on space
    const savingsMinY = pageHeight - 60 - savingsBoxH;
    if (y > savingsMinY) {
      y = savingsMinY;
    }

    // Navy box with integrated yellow accent top
    setFillColor(colors.primary);
    doc.roundedRect(margin, y, contentWidth, savingsBoxH, radius.lg, radius.lg, 'F');
    // Accent bar inset by corner radius so it doesn't extend past rounded corners
    setFillColor(colors.accent);
    doc.rect(margin + radius.lg, y, contentWidth - radius.lg * 2, 4, 'F');

    setColor(colors.accent);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text('ANNUAL IMPACT WITH PATIENTPAY', margin + spacing.lg, y + 22);

    // Line items
    let lineY = y + 38;
    setColor(colors.white);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');

    if (savingsInquiry > 0) {
      doc.text(`Staff Time Recaptured: ${formatCurrency(savingsInquiry)}`, margin + spacing.lg, lineY);
      lineY += 18;
    }
    if (savingsCards > 0) {
      doc.text(`Card Fees Eliminated: ${formatCurrency(savingsCards)}`, margin + spacing.lg, lineY);
      lineY += 18;
    }
    if (savingsAutopay > 0) {
      doc.text(`Cash Flow from Autopay: ${formatCurrency(savingsAutopay)}`, margin + spacing.lg, lineY);
      lineY += 18;
    }

    y += savingsBoxH + spacing.sm;
  }

  addFooter(4);

  // ============================================
  // PAGE 5: YOUR PATH FORWARD (Non-SNF)
  // Score projection + top improvements + category transformation
  // ============================================
  doc.addPage();
  addHeader('Your Path Forward');
  y = 95;

  if (projectionsData) {
    // Section A: Score Projection
    setFillColor([240, 253, 244]);
    doc.roundedRect(margin, y, contentWidth, 90, radius.lg, radius.lg, 'F');
    // Accent bar inset to stay within rounded corners
    setFillColor(colors.success);
    doc.rect(margin + radius.lg, y, contentWidth - radius.lg * 2, 4, 'F');

    // Balanced layout: current at 1/4, arrow in center, projected at 3/4
    const quarterX = margin + contentWidth * 0.2;
    const threeQuarterX = margin + contentWidth * 0.65;
    const centerX = margin + contentWidth / 2;

    // Current score (left side, centered on 1/4 mark)
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'bold');
    doc.text('CURRENT', quarterX, y + 24, { align: 'center' });

    const curColor = getScoreColorArr(projectionsData.current.overall);
    setColor(curColor);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(projectionsData.current.overall.toString(), quarterX, y + 60, { align: 'center' });

    setColor(curColor);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'normal');
    doc.text(getScoreLevelText(projectionsData.current.overall).level, quarterX, y + 76, { align: 'center' });

    // Arrow line with arrowhead (centered in box)
    const arrowStartX = quarterX + 45;
    const arrowEndX = threeQuarterX - 45;
    const arrowY = y + 50;
    setDrawColor(colors.success);
    doc.setLineWidth(2);
    doc.line(arrowStartX, arrowY, arrowEndX, arrowY);
    // Arrowhead
    doc.line(arrowEndX - 8, arrowY - 5, arrowEndX, arrowY);
    doc.line(arrowEndX - 8, arrowY + 5, arrowEndX, arrowY);

    // Improvement badge (centered on arrow)
    const badgeCenterX = (arrowStartX + arrowEndX) / 2;
    setFillColor(colors.success);
    doc.roundedRect(badgeCenterX - 28, y + 28, 56, 22, radius.md, radius.md, 'F');
    setColor(colors.white);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${projectionsData.overallImprovement}`, badgeCenterX, y + 43, { align: 'center' });

    // Projected score (right side, centered on 3/4 mark)
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECTED', threeQuarterX, y + 24, { align: 'center' });

    setColor(colors.success);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(projectionsData.projected.overall.toString(), threeQuarterX, y + 60, { align: 'center' });

    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'normal');
    doc.text(getScoreLevelText(projectionsData.projected.overall).level, threeQuarterX, y + 76, { align: 'center' });

    y += 110;

    // Section B: Top 5 Improvements
    setColor(colors.textDark);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP IMPROVEMENTS', margin, y);
    y += spacing.md;

    const topImps = projectionsData.topImprovements || [];
    let cumulativeScore = projectionsData.current.overall;

    topImps.slice(0, 5).forEach((imp, idx) => {
      if (y + 40 > pageHeight - 80) return;

      cumulativeScore = Math.min(100, cumulativeScore + imp.overallImpact);

      // Rank circle
      setFillColor(colors.secondary);
      doc.circle(margin + 12, y + 12, 10, 'F');
      setColor(colors.white);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}`, margin + 12, y + 16, { align: 'center' });

      // Points badge
      setFillColor([240, 249, 255]);
      doc.roundedRect(margin + 28, y + 2, 45, 18, radius.sm, radius.sm, 'F');
      setColor(colors.secondary);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'bold');
      doc.text(`+${imp.overallImpact} pts`, margin + 50, y + 14, { align: 'center' });

      // Description
      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(imp.description, contentWidth - 160);
      doc.text(descLines, margin + 80, y + 14);

      // Cumulative score
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.text(`Score: ${cumulativeScore}`, margin + contentWidth - 50, y + 14);

      y += 30 + (descLines.length > 1 ? 12 : 0);
    });

    // Additional improvements (if any)
    const additional = projectionsData.additionalImprovements || [];
    if (additional.length > 0 && y + 60 < pageHeight - 80) {
      y += spacing.sm;
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'bold');
      doc.text('ADDITIONAL IMPROVEMENTS', margin, y);
      y += spacing.sm;

      doc.setFont('helvetica', 'normal');
      additional.slice(0, 4).forEach((imp) => {
        if (y + 16 > pageHeight - 80) return;
        setColor(colors.textDark);
        doc.setFontSize(fontSize.body);
        const addLines = doc.splitTextToSize(`- ${imp.description}`, contentWidth - 20);
        doc.text(addLines, margin + 10, y);
        y += addLines.length * 12 + 4;
      });
    }

    // Section C: Category Transformation
    if (projectionsData.categoryImprovements && y + 100 < pageHeight - 80) {
      y += spacing.lg;
      setColor(colors.textDark);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text('CATEGORY TRANSFORMATION', margin, y);
      y += spacing.md;

      const catImpColors = [colors.secondary, [139, 92, 246], colors.accent];
      projectionsData.categoryImprovements.forEach((ci, idx) => {
        if (y + 34 > pageHeight - 80) return;

        setColor(colors.textDark);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'normal');
        doc.text(ci.categoryName, margin, y + 10);

        const barX = margin + 175;
        const barW = 200;
        const barH = 10;

        // Current bar (30% blend toward white for faded effect)
        setFillColor([225, 230, 235]);
        doc.roundedRect(barX, y, barW, barH, 3, 3, 'F');
        const curW = (ci.currentScore / 100) * barW;
        if (curW > 0) {
          const baseColor = catImpColors[idx];
          const fadedColor = baseColor.map(c => Math.round(c * 0.4 + 255 * 0.6));
          setFillColor(fadedColor);
          doc.roundedRect(barX, y, curW, barH, 3, 3, 'F');
        }

        // Projected bar (full color)
        setFillColor([225, 230, 235]);
        doc.roundedRect(barX, y + barH + 4, barW, barH, 3, 3, 'F');
        const projW = (ci.projectedScore / 100) * barW;
        if (projW > 0) {
          setFillColor(catImpColors[idx]);
          doc.roundedRect(barX, y + barH + 4, projW, barH, 3, 3, 'F');
        }

        // Current label
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'normal');
        doc.text(`Now: ${ci.currentScore}`, barX + barW + 8, y + 9);

        // Projected label
        setColor(catImpColors[idx]);
        doc.setFont('helvetica', 'bold');
        doc.text(`Goal: ${ci.projectedScore} (+${ci.improvement})`, barX + barW + 8, y + barH + 13);

        y += 34;
      });
    }
  }

  addFooter(5);

  // ============================================
  // PAGE 6: CATEGORY ANALYSIS (Non-SNF)
  // Per-category deep dive with personalized recommendations
  // ============================================
  doc.addPage();
  addHeader('Category Analysis');
  y = 95;

  const catDescriptions = [
    'Statement processing, PointClickCare integration, staff efficiency, and automation.',
    'Payment flexibility, transparency, multi-guarantor support, and family satisfaction.',
    'Payment options that attract and retain residents, tour billing, and market position.'
  ];

  const catKeyAnswers = [
    // Operations
    [
      answers['statement_processing'] ? { label: 'Statement Processing', value: answers['statement_processing'] } : null,
      answers['coordination_burden'] ? { label: 'Staff on Billing', value: `${answers['coordination_burden']} staff members` } : null,
      answers['autopay_rate'] ? { label: 'Autopay Rate', value: `${answers['autopay_rate']}%` } : null,
    ].filter(Boolean),
    // Family Experience
    [
      answers['multi_guarantor_capability'] ? { label: 'Multi-Guarantor', value: answers['multi_guarantor_capability'] } : null,
      answers['payment_methods'] ? { label: 'Payment Methods', value: Array.isArray(answers['payment_methods']) ? answers['payment_methods'].join(', ') : answers['payment_methods'] } : null,
      // V4.16: Show portal status derived from delivery + portal capability
      { label: 'Family Portal', value: hasPortalDelivery ? (answers['family_portal'] || 'Available') : 'Not available' },
      answers['family_satisfaction'] ? { label: 'Family Satisfaction', value: answers['family_satisfaction'] } : null,
    ].filter(Boolean),
    // Competitive
    [
      answers['tour_billing'] ? { label: 'Tour Billing', value: answers['tour_billing'] } : null,
      answers['payment_demand'] ? { label: 'Card Demand', value: answers['payment_demand'] } : null,
    ].filter(Boolean),
  ];

  const recCategoryMap = ['operations', 'family', 'competitive'];
  const p6CatColors = [colors.secondary, [139, 92, 246], colors.accent];

  for (let i = 0; i < 3; i++) {
    // Check if we need a new page for this category
    if (y + 180 > pageHeight - 60) {
      addFooter(6);
      doc.addPage();
      addHeader(i === 0 ? 'Category Analysis' : 'Category Analysis (continued)');
      y = 95;
    }

    const catName = CategoryNames[i];
    const catScore = scores.categories[i];
    const catWeight = Math.round(scores.weights[i] * 100);

    // Category header bar (dynamic height - drawn after content)
    const catStartY = y;

    // Category name
    setColor(colors.textDark);
    doc.setFontSize(fontSize.h2);
    doc.setFont('helvetica', 'bold');
    doc.text(catName, margin + spacing.lg, y + 22);

    // Score badge
    setFillColor(getScoreColorArr(catScore));
    doc.roundedRect(margin + 340, y + 6, 55, 24, radius.md, radius.md, 'F');
    setColor(colors.white);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    doc.text(`${catScore}/100`, margin + 367, y + 22, { align: 'center' });

    // Weight
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'normal');
    doc.text(`${catWeight}% weight`, margin + 410, y + 22);

    // Focus description
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');
    const focusLines = doc.splitTextToSize('Focus: ' + catDescriptions[i], contentWidth - 30);
    doc.text(focusLines, margin + spacing.lg, y + 42);

    let catY = y + 42 + focusLines.length * 14 + spacing.sm;

    // Key responses
    if (catKeyAnswers[i].length > 0) {
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.xs);
      doc.setFont('helvetica', 'bold');
      doc.text('KEY RESPONSES', margin + spacing.lg, catY);
      catY += spacing.sm;

      catKeyAnswers[i].slice(0, 3).forEach((ka) => {
        setColor(colors.textDark);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'bold');
        doc.text(ka.label + ':', margin + spacing.lg, catY);

        doc.setFont('helvetica', 'normal');
        const valText = ka.value.toString().substring(0, 60);
        const valLines = doc.splitTextToSize(valText, contentWidth - 150);
        doc.text(valLines, margin + 150, catY);
        catY += valLines.length * 12 + 4;
      });
    }

    // Personalized recommendations for this category
    const catRecs = (recommendationsData || []).filter(r => r.category === recCategoryMap[i]).slice(0, 2);
    if (catRecs.length > 0) {
      catY += spacing.xs;
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.xs);
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMMENDED ACTIONS', margin + spacing.lg, catY);
      catY += spacing.sm;

      catRecs.forEach((rec) => {
        // Priority badge
        const prioColors = {
          'High': colors.error,
          'Medium': colors.warning,
          'Ongoing': colors.secondary
        };
        const prioColor = prioColors[rec.priorityLabel] || colors.secondary;
        setFillColor(prioColor);
        doc.roundedRect(margin + spacing.lg, catY - 2, 45, 14, radius.sm, radius.sm, 'F');
        setColor(colors.white);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'bold');
        doc.text(rec.priorityLabel, margin + spacing.lg + 22, catY + 8, { align: 'center' });

        // Title
        setColor(colors.textDark);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'bold');
        doc.text(rec.title, margin + spacing.lg + 55, catY + 8);
        catY += 16;

        // Current state
        if (rec.currentState) {
          setColor(colors.textMuted);
          doc.setFontSize(fontSize.sm);
          doc.setFont('helvetica', 'normal');
          const csLines = doc.splitTextToSize(rec.currentState, contentWidth - 60);
          doc.text(csLines, margin + spacing.lg + 55, catY);
          catY += csLines.length * 10 + 6;
        }
      });
    }

    // Draw the colored sidebar with dynamic height based on content
    const catContentHeight = catY - catStartY + spacing.sm;
    setFillColor(p6CatColors[i]);
    doc.roundedRect(margin, catStartY, 6, catContentHeight, radius.sm, radius.sm, 'F');

    y = catY + spacing.lg;
  }

  addFooter(6);

  } else {
  // ============================================
  // SNF PATH: Pages 2-6 (PRESERVED - existing logic)
  // ============================================

    // ============================================
    // PAGE 2: FINANCIAL INSIGHTS
    // ============================================
    doc.addPage();
    addHeader('Financial Impact Analysis');
    y = 95;

    // Segment context box - V4.9: Improved card design
    if (segment && FacilityTypes[segment]) {
      setFillColor(colors.bgLight);
      doc.roundedRect(margin, y, contentWidth, 80, radius.md, radius.md, 'F');

      // Accent bar
      setFillColor(colors.secondary);
      doc.roundedRect(margin, y, 5, 80, radius.sm, radius.sm, 'F');

      setColor(colors.textDark);
      doc.setFontSize(fontSize.lg);
      doc.setFont('helvetica', 'bold');
      doc.text('Your Segment: ' + segmentLabel, margin + spacing.lg, y + 24);

      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      const chars = FacilityTypes[segment].characteristics;

      // V4.10: Adjusted column widths for SNF long text values
      const col1X = margin + spacing.lg;
      const col2X = margin + 220;
      const col3X = margin + 380;

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.text('Payer Mix:', col1X, y + 45);
      doc.text('Typical AR Days:', col2X, y + 45);
      doc.text('Complexity:', col3X, y + 45);

      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'bold');

      // V4.10: Handle long payer mix text with wrapping
      const payerMixWidth = col2X - col1X - 15;
      const payerMixLines = doc.splitTextToSize(chars.payerMix, payerMixWidth);
      doc.text(payerMixLines, col1X, y + 62);

      doc.text(chars.arDaysRange, col2X, y + 62);

      // V4.10: Truncate complexity if too long
      const maxComplexityWidth = contentWidth + margin - col3X - 10;
      let complexityText = chars.complexity;
      if (doc.getTextWidth(complexityText) > maxComplexityWidth) {
        complexityText = complexityText.substring(0, 25) + '...';
      }
      doc.text(complexityText, col3X, y + 62);

      y += 100;
    }

    // V4.11: SNF Financial Impact - using direct billing inputs
    if (segment === 'SNF' && insights && insights.snfMonthlyBilling > 0) {
      setColor(colors.textDark);
      doc.setFontSize(fontSize.xl);
      doc.setFont('helvetica', 'bold');
      doc.text('Your Patient Billing', margin, y);
      y += spacing.md;

      // Monthly billing highlight
      setFillColor([240, 249, 255]);
      doc.roundedRect(margin, y, contentWidth, 65, radius.md, radius.md, 'F');
      setFillColor(colors.secondary);
      doc.roundedRect(margin, y, 5, 65, radius.sm, radius.sm, 'F');

      setColor(colors.secondary);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(insights.snfMonthlyBilling), margin + spacing.lg, y + 38);

      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text('/month in patient responsibility', margin + 160, y + 38);

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.text(`(${formatCurrency(insights.snfAnnualBilling)} annually)`, margin + spacing.lg, y + 55);

      y += 80;

      // Current state - Cash in AR and Bad Debt
      setColor(colors.textDark);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text('CURRENT STATE', margin, y);
      y += spacing.md;

      const currentStateWidth = (contentWidth - 12) / 2;

      // Cash stuck in AR
      setFillColor([254, 242, 242]); // Light red
      doc.roundedRect(margin, y, currentStateWidth, 75, radius.md, radius.md, 'F');
      setFillColor(colors.error);
      doc.roundedRect(margin, y, currentStateWidth, 4, radius.md, radius.md, 'F');

      setColor(colors.error);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(insights.snfCashInAR), margin + spacing.md, y + 35);

      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text('Cash stuck in A/R', margin + spacing.md, y + 52);

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.text(`${insights.snfCurrentARDays} days to collect`, margin + spacing.md, y + 66);

      // Annual bad debt risk
      const col2X = margin + currentStateWidth + 12;
      setFillColor([255, 251, 235]); // Light amber
      doc.roundedRect(col2X, y, currentStateWidth, 75, radius.md, radius.md, 'F');
      setFillColor(colors.warning);
      doc.roundedRect(col2X, y, currentStateWidth, 4, radius.md, radius.md, 'F');

      setColor(colors.warning);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(insights.snfCurrentBadDebt), col2X + spacing.md, y + 35);

      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text('Annual bad debt risk', col2X + spacing.md, y + 52);

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.text('~3% of patient billing', col2X + spacing.md, y + 66);

      y += 90;

      // PatientPay Impact
      setFillColor([240, 253, 244]); // Light green
      doc.roundedRect(margin, y, contentWidth, 120, radius.lg, radius.lg, 'F');
      setFillColor(colors.success);
      doc.roundedRect(margin, y, contentWidth, 5, radius.lg, radius.lg, 'F');

      setColor(colors.success);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text('WITH PATIENTPAY', margin + spacing.lg, y + 24);

      // Impact metrics in columns
      const impactColWidth = (contentWidth - 48) / 3;
      const impactY = y + 45;

      // Cash freed
      setColor(colors.success);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(insights.snfCashFreedByARReduction), margin + spacing.lg, impactY);
      setColor(colors.textDark);
      doc.setFontSize(fontSize.sm);
      doc.text('Cash freed', margin + spacing.lg, impactY + 16);

      // AR days reduction
      setColor(colors.success);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(`${insights.snfCurrentARDays} to ${insights.snfProjectedARDays}`, margin + spacing.lg + impactColWidth, impactY);
      setColor(colors.textDark);
      doc.setFontSize(fontSize.sm);
      doc.text('AR days (47% faster)', margin + spacing.lg + impactColWidth, impactY + 16);

      // Bad debt savings
      setColor(colors.success);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(insights.snfBadDebtSavings), margin + spacing.lg + impactColWidth * 2, impactY);
      setColor(colors.textDark);
      doc.setFontSize(fontSize.sm);
      doc.text('Bad debt reduced', margin + spacing.lg + impactColWidth * 2, impactY + 16);

      // Total annual impact
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.text('Total Annual Impact:', margin + spacing.lg, impactY + 45);
      setColor(colors.success);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(insights.snfTotalAnnualImpact) + '+', margin + 140, impactY + 45);

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.xs);
      doc.setFont('helvetica', 'normal');
      doc.text('Based on PatientPay customer results: 47% AR reduction, 40% bad debt reduction', margin + spacing.lg, impactY + 62);

      y += 135;
    }

    // Financial insights - V4.9: Improved card layout
    if (insights) {
      setColor(colors.textDark);
      doc.setFontSize(fontSize.xl);
      doc.setFont('helvetica', 'bold');
      doc.text('Your Financial Numbers', margin, y);

      y += spacing.lg;

      // Big stat cards - V4.9: Better proportions and visual hierarchy
      const financialStats = [
        {
          label: 'Annual Revenue',
          value: formatCurrency(insights.annualRevenue),
          sublabel: 'Based on beds x rate x occupancy',
          color: colors.primary
        },
        {
          label: 'Cash Tied in A/R',
          value: formatCurrency(insights.cashInAR),
          sublabel: `Currently at ${insights.arDays} days`,
          color: colors.warning
        },
        {
          label: 'Potential to Free',
          value: formatCurrency(insights.potentialFreedCash),
          sublabel: `If reduced to ${insights.targetArDays} days`,
          color: colors.success
        },
      ];

      const statBoxWidth = (contentWidth - 24) / 3;
      const statGap = 12;
      financialStats.forEach((stat, i) => {
        const boxX = margin + (i * (statBoxWidth + statGap));

        setFillColor(colors.bgLight);
        doc.roundedRect(boxX, y, statBoxWidth, 100, radius.lg, radius.lg, 'F');

        // Color accent at top of each card
        setFillColor(stat.color);
        doc.roundedRect(boxX, y, statBoxWidth, 4, radius.lg, radius.lg, 'F');

        setColor(colors.textMuted);
        doc.setFontSize(fontSize.sm);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.label.toUpperCase(), boxX + spacing.md, y + 24);

        setColor(stat.color);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.value, boxX + spacing.md, y + 56);

        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'normal');
        const subLines = doc.splitTextToSize(stat.sublabel, statBoxWidth - 28);
        doc.text(subLines, boxX + spacing.md, y + 78);
      });

      y += 125;

      // Multi-guarantor insight (if applicable) - V4.14: Enhanced with complexity multiplier & 3-column metrics
      // V4.12.2: Only show if there's enough space on the page
      const multiGuarantorHeight = 155;
      const footerSpace = 60;
      if (insights.avgPayersPerResident > 1 && (y + multiGuarantorHeight + footerSpace < pageHeight)) {
        const personTerm = segment === 'SNF' ? 'patient' : 'resident';
        const personTermPlural = segment === 'SNF' ? 'Patients' : 'Residents';
        const complexityMultiplier = insights.avgPayersPerResident.toFixed(1);

        // Main container
        setFillColor([240, 249, 255]); // Light blue background
        doc.roundedRect(margin, y, contentWidth, 140, radius.lg, radius.lg, 'F');

        // Left accent bar
        setFillColor([139, 92, 246]); // Purple accent (matches UI)
        doc.roundedRect(margin, y, 5, 140, radius.sm, radius.sm, 'F');

        // Title
        setColor([139, 92, 246]);
        doc.setFontSize(fontSize.lg);
        doc.setFont('helvetica', 'bold');
        doc.text('Billing Complexity Multiplier', margin + spacing.lg, y + 24);

        // Subtitle text
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'normal');
        doc.text(`Each ${personTerm} generates ${insights.avgPayersPerResident} billing relationships`, margin + spacing.lg, y + 42);

        // 3-column metric boxes
        const metricY = y + 54;
        const metricBoxWidth = (contentWidth - spacing.lg * 2 - 16) / 3;
        const metricBoxHeight = 50;

        // Column 1: Complexity multiplier
        setFillColor([245, 240, 255]); // Light purple
        doc.roundedRect(margin + spacing.lg, metricY, metricBoxWidth, metricBoxHeight, radius.md, radius.md, 'F');
        setColor([139, 92, 246]);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`${complexityMultiplier}x`, margin + spacing.lg + metricBoxWidth / 2, metricY + 22, { align: 'center' });
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'normal');
        doc.text('Complexity vs. single payer', margin + spacing.lg + metricBoxWidth / 2, metricY + 38, { align: 'center' });

        // Column 2: Total family payers
        const col2X = margin + spacing.lg + metricBoxWidth + 8;
        setFillColor([235, 248, 255]); // Light blue
        doc.roundedRect(col2X, metricY, metricBoxWidth, metricBoxHeight, radius.md, radius.md, 'F');
        setColor(colors.secondary);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`${insights.totalPayers}`, col2X + metricBoxWidth / 2, metricY + 22, { align: 'center' });
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'normal');
        doc.text('Total family payers', col2X + metricBoxWidth / 2, metricY + 38, { align: 'center' });

        // Column 3: Split billing residents/patients
        const col3X = col2X + metricBoxWidth + 8;
        setFillColor([236, 253, 245]); // Light green
        doc.roundedRect(col3X, metricY, metricBoxWidth, metricBoxHeight, radius.md, radius.md, 'F');
        setColor([16, 185, 129]); // Green
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`${insights.multiGuarantorResidents}`, col3X + metricBoxWidth / 2, metricY + 22, { align: 'center' });
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'normal');
        doc.text(`${personTermPlural} with split billing`, col3X + metricBoxWidth / 2, metricY + 38, { align: 'center' });

        // Impact callout bar (if inquiry cost exists)
        if (insights.inquiryCost > 0) {
          const calloutY = metricY + metricBoxHeight + 10;
          setFillColor([255, 251, 235]); // Light amber
          doc.roundedRect(margin + spacing.lg, calloutY, contentWidth - spacing.lg * 2, 24, radius.sm, radius.sm, 'F');
          setFillColor([252, 201, 59]); // Amber left border
          doc.roundedRect(margin + spacing.lg, calloutY, 3, 24, 1, 1, 'F');

          setColor([180, 140, 20]);
          doc.setFontSize(fontSize.sm);
          doc.setFont('helvetica', 'bold');
          doc.text(`$${insights.inquiryCost.toLocaleString()}/year`, margin + spacing.lg + 10, calloutY + 15);
          doc.setFont('helvetica', 'normal');
          setColor(colors.textMuted);
          const impactText = insights.avgPayersPerResident > 2
            ? `estimated inquiry cost — ${insights.avgPayersPerResident} payers per ${personTerm} multiply coordination burden`
            : 'estimated inquiry cost — individual statements could reduce this by 60-70%';
          doc.text(impactText, margin + spacing.lg + 80, calloutY + 15);
        }

        y += multiGuarantorHeight;
      }

      // ROI Calculation Box - V4.9: Better visual design with columns
      const roiBoxHeight = insights.annualCardFeesAbsorbed > 0 ? 125 : 108;
      setFillColor(colors.primary);
      doc.roundedRect(margin, y, contentWidth, roiBoxHeight, radius.lg, radius.lg, 'F');

      setColor(colors.accent);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTIMATED ROI WITH PATIENTPAY', margin + spacing.lg, y + 26);

      // Calculate ROI estimates
      // V4.14: Updated for staff-based inquiry cost calculation
      const inquiryCostSavings = insights.potentialInquirySavings || 0;
      const arReduction = insights.potentialFreedCash || 0;
      const autopayIncrease = formData.bedCount ? Math.round(formData.bedCount * 0.25 * (formData.avgMonthlyRate || 5000) * 12 * 0.15) : 0; // 15% revenue acceleration from 25% more autopay

      const roiItems = [
        { label: 'Inquiry Cost Savings', value: inquiryCostSavings ? formatCurrency(inquiryCostSavings) + '/year' : 'Based on staff data' },
        { label: 'Cash Freed from A/R', value: formatCurrency(arReduction) },
        { label: 'Revenue Acceleration', value: autopayIncrease ? formatCurrency(autopayIncrease) : 'Based on autopay increase' }
      ];

      // V4.8: Add credit card fees absorbed if applicable
      if (insights.annualCardFeesAbsorbed > 0) {
        roiItems.push({
          label: 'Card Fees Eliminated',
          value: formatCurrency(insights.annualCardFeesAbsorbed) + '/year'
        });
      }

      let roiY = y + 48;
      roiItems.forEach((item) => {
        setColor(colors.white);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label + ':', margin + spacing.lg, roiY);
        setColor(colors.accent);
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, margin + 210, roiY);
        roiY += 20;
      });

      y += roiBoxHeight + spacing.lg;
    }

    // V4.10: Check if Industry Context will fit on current page (need ~130px)
    // If not, it will be shown at bottom or we skip it to avoid overflow
    const industryContextHeight = 115; // Title + box + margins
    const availableSpace = pageHeight - 60 - y; // 60 for footer

    if (availableSpace >= industryContextHeight) {
      // Industry benchmark context - V4.9: Better visual design with dividers
      setColor(colors.textDark);
      doc.setFontSize(fontSize.lg);
      doc.setFont('helvetica', 'bold');
      doc.text('Industry Context', margin, y);

      y += spacing.lg;
      setFillColor(colors.bgLight);
      doc.roundedRect(margin, y, contentWidth, 85, radius.md, radius.md, 'F');

    const benchmarks = [
      { stat: '75%', label: 'of bill payers want card payment options' },
      { stat: '67%', label: 'would choose a facility that accepts cards' },
      { stat: '96%', label: 'reduction in processing time with automation' },
      { stat: '37%', label: 'miss payments due to billing complexity' }
    ];

    const benchWidth = contentWidth / 4;
    benchmarks.forEach((b, i) => {
      const bx = margin + (i * benchWidth);

      // Add divider between items
      if (i > 0) {
        setFillColor([220, 225, 230]);
        doc.rect(bx, y + 15, 1, 55, 'F');
      }

      setColor(colors.secondary);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(b.stat, bx + benchWidth/2, y + 35, { align: 'center' });

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.xs);
      doc.setFont('helvetica', 'normal');
      const labelLines = doc.splitTextToSize(b.label, benchWidth - 20);
      doc.text(labelLines, bx + benchWidth/2, y + 55, { align: 'center' });
    });
    } // End of Industry Context conditional block

    addFooter(2);

    // ============================================
    // PAGE 3: YOUR STRENGTHS (V4.8 - follows emotional arc)
    // ============================================
    doc.addPage();
    addHeader('What You\'re Doing Well');
    y = 95;

    // Benchmark Comparison Summary at top - V4.9: Cleaner layout
    if (gapAnalysisData) {
      setColor(colors.textDark);
      doc.setFontSize(fontSize.lg);
      doc.setFont('helvetica', 'bold');
      doc.text('How You Compare', margin, y);

      y += spacing.md;

      // Overall comparison box - V4.9: Better visual hierarchy
      const overallGap = gapAnalysisData.overall.gap;
      const overallBgColor = overallGap >= 0 ? [240, 253, 244] : [255, 251, 235];
      const overallTextColor = overallGap >= 0 ? colors.success : colors.warning;

      setFillColor(overallBgColor);
      doc.roundedRect(margin, y, contentWidth, 60, radius.md, radius.md, 'F');

      // Your score
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.xs);
      doc.setFont('helvetica', 'bold');
      doc.text('YOUR SCORE', margin + 28, y + 18);
      setColor(colors.textDark);
      doc.setFontSize(fontSize.display);
      doc.setFont('helvetica', 'bold');
      doc.text(`${scores.overall}`, margin + 28, y + 46);

      // Gap indicator
      setColor(overallTextColor);
      doc.setFontSize(fontSize.h2);
      doc.setFont('helvetica', 'bold');
      doc.text(overallGap >= 0 ? `+${overallGap}` : `${overallGap}`, margin + 145, y + 38);
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.xs);
      doc.setFont('helvetica', 'normal');
      doc.text('vs benchmark', margin + 145, y + 18);

      // Benchmark
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.xs);
      doc.setFont('helvetica', 'bold');
      doc.text(`${segmentLabel.toUpperCase()} AVERAGE`, margin + 245, y + 18);
      setColor(colors.textDark);
      doc.setFontSize(fontSize.display);
      doc.setFont('helvetica', 'bold');
      doc.text(`${gapAnalysisData.overall.benchmark}`, margin + 245, y + 46);

      // Performance badge - V4.10: Wider badge for longer text, positioned at right edge
      const badgeWidth = 130;
      const badgeX = contentWidth + margin - badgeWidth; // Right-align with content area
      setFillColor(overallTextColor);
      doc.roundedRect(badgeX, y + 15, badgeWidth, 30, radius.sm, radius.sm, 'F');
      setColor(colors.white);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      const perfLabel = overallGap >= 5 ? 'Above Benchmark' : overallGap >= 0 ? 'At Benchmark' : 'Below Benchmark';
      doc.text(perfLabel, badgeX + badgeWidth / 2, y + 35, { align: 'center' });

      y += 80;
    }

    // Your Strengths Section - V4.9: Better visual hierarchy
    setColor(colors.success);
    doc.setFontSize(fontSize.xl);
    doc.setFont('helvetica', 'bold');
    doc.text('Your Strengths', margin, y);

    y += spacing.lg;

    // V4.8: Check for strong categories first
    if (strengthsData.strongCategories && strengthsData.strongCategories.length > 0) {
      const boxHeight = 20 + (strengthsData.strongCategories.length * 40);
      setFillColor([240, 253, 244]);
      doc.roundedRect(margin, y, contentWidth, boxHeight, radius.md, radius.md, 'F');
      setFillColor(colors.success);
      doc.roundedRect(margin, y, 5, boxHeight, radius.sm, radius.sm, 'F');

      let strengthY = y + 28;
      strengthsData.strongCategories.forEach((cat) => {
        setColor(colors.textDark);
        doc.setFontSize(fontSize.lg);
        doc.setFont('helvetica', 'bold');
        doc.text(cat.name, margin + spacing.lg, strengthY);

        setColor(colors.success);
        doc.setFontSize(fontSize.md);
        doc.setFont('helvetica', 'bold');
        doc.text(`${cat.score}/100`, margin + 225, strengthY);

        // Green badge for positive gap
        setFillColor(colors.success);
        doc.roundedRect(margin + 295, strengthY - 10, 90, 18, radius.sm, radius.sm, 'F');
        setColor(colors.white);
        doc.setFontSize(fontSize.sm);
        doc.text(`+${cat.gap} above`, margin + 340, strengthY, { align: 'center' });

        strengthY += 40;
      });
      y += boxHeight + spacing.md;

    } else if (strengthsData.relativeStrength) {
      // V4.8 Fallback: Show relative strength (closest to benchmark) - V4.9: Better styling
      setFillColor([255, 251, 235]); // Amber tint for "building towards"
      doc.roundedRect(margin, y, contentWidth, 70, radius.md, radius.md, 'F');
      setFillColor(colors.warning);
      doc.roundedRect(margin, y, 5, 70, radius.sm, radius.sm, 'F');

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text('Your strongest area relative to benchmark:', margin + spacing.lg, y + 20);

      doc.setFontSize(fontSize.xl);
      doc.setFont('helvetica', 'bold');
      setColor(colors.textDark);
      doc.text(strengthsData.relativeStrength.name, margin + spacing.lg, y + 42);

      setColor(colors.warning);
      doc.setFontSize(fontSize.md);
      doc.text(`${strengthsData.relativeStrength.score}/100`, margin + 255, y + 42);
      doc.text(`${strengthsData.relativeStrength.gap} vs benchmark`, margin + 335, y + 42);

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'normal');
      doc.text('This is your closest category to reaching benchmark performance.', margin + spacing.lg, y + 60);

      y += 85;

      // Show moderate questions if available (building blocks) - V4.9: Better card design
      if (strengthsData.moderateQuestions && strengthsData.moderateQuestions.length > 0) {
        setColor(colors.textDark);
        doc.setFontSize(fontSize.md);
        doc.setFont('helvetica', 'bold');
        doc.text('Building Blocks in Place:', margin, y);
        y += spacing.md;

        strengthsData.moderateQuestions.slice(0, 3).forEach((q) => {
          setFillColor(colors.bgLight);
          doc.roundedRect(margin, y, contentWidth, 38, radius.sm, radius.sm, 'F');

          // Score badge
          setFillColor(colors.secondary);
          doc.roundedRect(margin + spacing.sm, y + 8, 36, 22, radius.sm, radius.sm, 'F');
          setColor(colors.white);
          doc.setFontSize(fontSize.lg);
          doc.setFont('helvetica', 'bold');
          doc.text(`${q.score}`, margin + 30, y + 24, { align: 'center' });

          setColor(colors.textDark);
          doc.setFontSize(fontSize.sm);
          doc.setFont('helvetica', 'normal');
          const qText = doc.splitTextToSize(q.question, 390);
          doc.text(qText[0], margin + 58, y + 22);

          y += 44;
        });
      }

    } else if (strengthsData.strongQuestions && strengthsData.strongQuestions.length > 0) {
      // Fallback: Show strong individual questions - V4.9: Better card design
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.body);
      doc.text('Areas where you\'re performing well:', margin, y);
      y += spacing.md;

      strengthsData.strongQuestions.slice(0, 3).forEach((q) => {
        setFillColor(colors.bgLight);
        doc.roundedRect(margin, y, contentWidth, 42, radius.sm, radius.sm, 'F');

        // Score badge
        setFillColor(colors.success);
        doc.roundedRect(margin + spacing.sm, y + 10, 36, 22, radius.sm, radius.sm, 'F');
        setColor(colors.white);
        doc.setFontSize(fontSize.lg);
        doc.setFont('helvetica', 'bold');
        doc.text(`${q.score}`, margin + 30, y + 26, { align: 'center' });

        setColor(colors.textDark);
        doc.setFontSize(fontSize.sm);
        doc.setFont('helvetica', 'normal');
        const qText = doc.splitTextToSize(q.question, 390);
        doc.text(qText[0], margin + 58, y + 24);

        y += 48;
      });

    } else {
      // V4.8: Early journey framing - V4.9: Better styling
      setFillColor([240, 249, 255]);
      doc.roundedRect(margin, y, contentWidth, 55, radius.md, radius.md, 'F');
      setFillColor(colors.secondary);
      doc.roundedRect(margin, y, 5, 55, radius.sm, radius.sm, 'F');

      setColor(colors.textDark);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text('Early in Your Modernization Journey', margin + spacing.lg, y + 22);

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text('The opportunities below represent significant potential for improvement.', margin + spacing.lg, y + 42);

      y += 70;
    }

    y += spacing.md;

    // Your Opportunities Section (Categories below benchmark) - V4.9: Better visual design
    setColor(colors.warning);
    doc.setFontSize(fontSize.xl);
    doc.setFont('helvetica', 'bold');
    doc.text('Your Opportunities', margin, y);

    y += spacing.lg;

    // Get categories below benchmark, ordered by index (Ops -> Family -> Competitive)
    const opportunityCategories = gapAnalysisData ? gapAnalysisData.categories
      .filter(c => c.gap < 0)
      .sort((a, b) => a.index - b.index) : [];

    if (opportunityCategories.length > 0) {
      opportunityCategories.forEach((cat) => {
        setFillColor([255, 251, 235]);
        doc.roundedRect(margin, y, contentWidth, 45, radius.sm, radius.sm, 'F');
        setFillColor(colors.warning);
        doc.roundedRect(margin, y, 4, 45, radius.sm, radius.sm, 'F');

        setColor(colors.textDark);
        doc.setFontSize(fontSize.lg);
        doc.setFont('helvetica', 'bold');
        doc.text(cat.name, margin + spacing.md, y + 18);

        setColor(colors.warning);
        doc.setFontSize(fontSize.md);
        doc.setFont('helvetica', 'bold');
        doc.text(`${cat.score}/100`, margin + 255, y + 18);

        // Warning badge for negative gap
        setFillColor(colors.warning);
        doc.roundedRect(margin + 335, y + 8, 85, 22, radius.sm, radius.sm, 'F');
        setColor(colors.white);
        doc.setFontSize(fontSize.sm);
        doc.setFont('helvetica', 'bold');
        doc.text(`${cat.gap} vs benchmark`, margin + 377, y + 22, { align: 'center' });

        setColor(colors.textMuted);
        doc.setFontSize(fontSize.sm);
        doc.setFont('helvetica', 'normal');
        doc.text(`Industry benchmark: ${cat.benchmark}`, margin + spacing.md, y + 36);

        y += 52;
      });
    }

    // Financial Opportunity (Cash in AR + Card Fees) - V4.9: Better card design
    if (insights && (insights.potentialFreedCash > 0 || insights.annualCardFeesAbsorbed > 0)) {
      y += spacing.sm;
      setColor(colors.textDark);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Opportunity', margin, y);
      y += spacing.md;

      const showBoth = insights.potentialFreedCash > 0 && insights.annualCardFeesAbsorbed > 0;
      const boxWidth = showBoth ? (contentWidth - 12) / 2 : contentWidth;

      if (insights.potentialFreedCash > 0) {
        setFillColor([240, 253, 244]);
        doc.roundedRect(margin, y, boxWidth, 70, radius.md, radius.md, 'F');

        // Top accent
        setFillColor(colors.success);
        doc.roundedRect(margin, y, boxWidth, 3, radius.md, radius.md, 'F');

        setColor(colors.success);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(insights.potentialFreedCash + (insights.cashFreedByAutopay || 0)), margin + spacing.md, y + 32);

        setColor(colors.textDark);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'bold');
        doc.text('Cash tied up in A/R', margin + spacing.md, y + 50);

        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'normal');
        doc.text(`Based on ${insights.arDays} days vs ${insights.targetArDays}-day target`, margin + spacing.md, y + 64);
      }

      if (insights.annualCardFeesAbsorbed > 0) {
        const cardBoxX = showBoth ? margin + boxWidth + 12 : margin;
        setFillColor([255, 251, 235]);
        doc.roundedRect(cardBoxX, y, boxWidth, 70, radius.md, radius.md, 'F');

        // Top accent
        setFillColor(colors.warning);
        doc.roundedRect(cardBoxX, y, boxWidth, 3, radius.md, radius.md, 'F');

        setColor(colors.warning);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(insights.annualCardFeesAbsorbed), cardBoxX + spacing.md, y + 32);

        setColor(colors.textDark);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'bold');
        doc.text('Card fees absorbed/year', cardBoxX + spacing.md, y + 50);

        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'normal');
        doc.text('Eliminate with convenience fee pass-through', cardBoxX + spacing.md, y + 64);
      }
    }

    addFooter(3);

    // ============================================
    // PAGE 4: ACTIONABLE IMPROVEMENTS & PROJECTIONS (V4.8)
    // ============================================
    doc.addPage();
    addHeader('Your Path to Improvement');
    y = 95;

    // PatientPay Projections Section - V4.9: Improved visual design
    setColor(colors.textDark);
    doc.setFontSize(fontSize.xl);
    doc.setFont('helvetica', 'bold');
    doc.text('With PatientPay', margin, y);

    y += spacing.lg;

    // Large projection comparison box - V4.9: Better proportions
    setFillColor([240, 249, 255]);
    doc.roundedRect(margin, y, contentWidth, 90, radius.lg, radius.lg, 'F');
    setFillColor(colors.secondary);
    doc.roundedRect(margin, y, 5, 90, radius.sm, radius.sm, 'F');

    // Current score
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.xs);
    doc.setFont('helvetica', 'bold');
    doc.text('YOUR CURRENT SCORE', margin + 40, y + 20);
    setColor(colors.textDark);
    doc.setFontSize(38);
    doc.setFont('helvetica', 'bold');
    doc.text(`${projectionsData.current.overall}`, margin + 40, y + 60);

    // Arrow - V4.10: Use visual arrow shape instead of unicode (font compatibility)
    setColor(colors.secondary);
    // Draw arrow using lines
    const arrowX = margin + 175;
    const arrowY = y + 45;
    doc.setLineWidth(3);
    setDrawColor(colors.secondary);
    doc.line(arrowX, arrowY, arrowX + 35, arrowY); // Horizontal line
    doc.line(arrowX + 25, arrowY - 10, arrowX + 35, arrowY); // Upper arrow head
    doc.line(arrowX + 25, arrowY + 10, arrowX + 35, arrowY); // Lower arrow head

    // Projected score
    setColor(colors.success);
    doc.setFontSize(fontSize.xs);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECTED WITH PATIENTPAY', margin + 245, y + 20);
    doc.setFontSize(38);
    doc.text(`${projectionsData.projected.overall}`, margin + 245, y + 60);

    // Improvement badge with percentage - V4.9: Larger and more prominent
    const improvementPct = Math.round((projectionsData.overallImprovement / projectionsData.current.overall) * 100);
    setFillColor(colors.success);
    doc.roundedRect(margin + 370, y + 18, 115, 52, radius.md, radius.md, 'F');
    setColor(colors.white);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${projectionsData.overallImprovement}`, margin + 428, y + 48, { align: 'center' });
    doc.setFontSize(fontSize.body);
    doc.text(`points (${improvementPct}%)`, margin + 428, y + 64, { align: 'center' });

    y += 115;

    // Top 5 Improvements with enhanced formatting - V4.9: Better visual design
    setColor(colors.textDark);
    doc.setFontSize(fontSize.lg);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 5 High-Impact Improvements', margin, y);

    // V4.12.2: Move subtitle to next line to prevent text overlap
    y += 14;
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'normal');
    doc.text('Implementing all five could increase your score by up to ' + projectionsData.overallImprovement + ' points.', margin, y);

    y += spacing.lg;

    if (projectionsData.topImprovements.length > 0) {
      let cumulativeScore = projectionsData.current.overall;
      const topImprovements = projectionsData.topImprovements.slice(0, 5);

      topImprovements.forEach((imp, i) => {
        const prevScore = cumulativeScore;
        cumulativeScore = Math.min(100, cumulativeScore + imp.overallImpact);

        setFillColor(colors.bgLight);
        doc.roundedRect(margin, y, contentWidth, 46, radius.sm, radius.sm, 'F');

        // Rank circle - V4.9: Slightly larger
        setFillColor(colors.secondary);
        doc.circle(margin + 20, y + 23, 12, 'F');
        setColor(colors.white);
        doc.setFontSize(fontSize.lg);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}`, margin + 20, y + 28, { align: 'center' });

        // Points badge - V4.9: Better proportions
        setFillColor([240, 253, 244]);
        doc.roundedRect(margin + 42, y + 10, 58, 22, radius.sm, radius.sm, 'F');
        setColor(colors.success);
        doc.setFontSize(fontSize.lg);
        doc.setFont('helvetica', 'bold');
        doc.text(`+${imp.overallImpact} pts`, margin + 71, y + 25, { align: 'center' });

        // Description - V4.12.2: Show full description with proper truncation
        setColor(colors.textDark);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'bold');
        // V4.12.2: Increased width and show two lines if needed
        const maxDescWidth = 285;
        const descText = doc.splitTextToSize(imp.description, maxDescWidth);
        // Show first line, and if there's more, add ellipsis or show second line
        if (descText.length > 1) {
          doc.text(descText[0], margin + 112, y + 18);
          doc.setFontSize(fontSize.sm);
          doc.setFont('helvetica', 'normal');
          doc.text(descText[1], margin + 112, y + 30);
        } else {
          doc.text(descText[0], margin + 112, y + 22);
        }

        // Running total - V4.10: Use text arrow for font compatibility
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.sm);
        doc.setFont('helvetica', 'normal');
        const scoreY = descText.length > 1 ? y + 42 : y + 38;
        doc.text(`Score: ${prevScore} -> ${cumulativeScore}`, margin + 112, scoreY);

        // Score progression box - V4.10: Show just the target score
        setFillColor(colors.secondary);
        doc.roundedRect(margin + 418, y + 12, 72, 24, radius.sm, radius.sm, 'F');
        setColor(colors.white);
        doc.setFontSize(fontSize.md);
        doc.setFont('helvetica', 'bold');
        doc.text(`${cumulativeScore}`, margin + 454, y + 28, { align: 'center' });

        y += 52;
      });
    }

    // Additional improvements - V4.9: Better card design
    if (projectionsData.additionalImprovements && projectionsData.additionalImprovements.length > 0) {
      y += spacing.md;

      // Container box for additional improvements
      setFillColor([250, 251, 252]);
      const additionalHeight = Math.min(projectionsData.additionalImprovements.length, 4) * 18 + 35;
      doc.roundedRect(margin, y, contentWidth, additionalHeight, radius.sm, radius.sm, 'F');

      setColor(colors.textDark);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text(`PatientPay Also Helps With (${projectionsData.additionalImprovements.length} more):`, margin + spacing.md, y + 18);
      y += 30;

      projectionsData.additionalImprovements.slice(0, 4).forEach((imp) => {
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.sm);
        doc.setFont('helvetica', 'normal');
        doc.text(`\u2022  ${imp.description}`, margin + spacing.md, y);

        setColor(colors.success);
        doc.setFontSize(fontSize.sm);
        doc.setFont('helvetica', 'bold');
        doc.text(`+${imp.overallImpact} pts`, margin + 450, y);

        y += 16;
      });

      if (projectionsData.additionalImprovements.length > 4) {
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'italic');
        doc.text(`+ ${projectionsData.additionalImprovements.length - 4} more improvements...`, margin + spacing.md, y);
      }
    }

    // V4.12: Triple Win Framework for non-SNF segments
    // V4.12.2: Only show if there's enough space on page (need ~225px for both sections)
    const tripleWinTotalHeight = 225;
    const availableForTripleWin = pageHeight - 60 - y; // 60 for footer

    if (segment !== 'SNF' && availableForTripleWin >= tripleWinTotalHeight) {
      y += spacing.md;

      // "What Today's Families Expect" Stats Box
      setFillColor([255, 251, 235]); // Light amber
      doc.roundedRect(margin, y, contentWidth, 100, radius.md, radius.md, 'F');

      // Accent bar
      setFillColor(colors.accent);
      doc.roundedRect(margin, y, 5, 100, radius.sm, radius.sm, 'F');

      setColor(colors.textDark);
      doc.setFontSize(fontSize.lg);
      doc.setFont('helvetica', 'bold');
      doc.text('What Today\'s Families Expect', margin + spacing.lg, y + 22);

      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'normal');
      doc.text('Today\'s families aren\'t asking IF you offer modern payment options—they\'re surprised when you don\'t.', margin + spacing.lg, y + 38);

      // 4 key stats in a row
      const statsY = y + 55;
      const statWidth = (contentWidth - 40) / 4;
      const familyStats = [
        { value: '78%', label: 'seniors 65+ have smartphones' },
        { value: '70%', label: 'adults 50+ use FinTech' },
        { value: '62%', label: 'pay bills digitally' },
        { value: '67%', label: 'prefer card-accepting facilities' }
      ];

      familyStats.forEach((stat, i) => {
        const statX = margin + spacing.lg + (i * statWidth);

        setColor(colors.secondary);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.value, statX, statsY);

        setColor(colors.textMuted);
        doc.setFontSize(fontSize.xs);
        doc.setFont('helvetica', 'normal');
        const labelLines = doc.splitTextToSize(stat.label, statWidth - 10);
        doc.text(labelLines, statX, statsY + 14);
      });

      y += 115;

      // Triple Win Summary Box
      setFillColor(colors.primary);
      doc.roundedRect(margin, y, contentWidth, 95, radius.lg, radius.lg, 'F');

      // Accent line at top (flat rect inset to stay within rounded corners)
      setFillColor(colors.accent);
      doc.rect(margin + radius.lg, y, contentWidth - radius.lg * 2, 3, 'F');

      setColor(colors.accent);
      doc.setFontSize(fontSize.md);
      doc.setFont('helvetica', 'bold');
      doc.text('THE ONE DECISION THAT DOES THREE THINGS', margin + spacing.lg, y + 22);

      setColor(colors.white);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'normal');
      doc.text('Smart operators don\'t make three separate investments—they make one.', margin + spacing.lg, y + 38);

      // Three pillars
      const pillarY = y + 52;
      const pillarWidth = (contentWidth - 50) / 3;

      // V4.12.1: Renamed "Edge" to "Preference" for softer, less sales-y language
      const pillars = [
        { title: 'Efficiency', stat: '96% faster', color: colors.secondary },
        { title: 'Experience', stat: '72% fewer misses', color: [139, 92, 246] }, // Purple
        { title: 'Preference', stat: '67% choose modern', color: colors.accent }
      ];

      pillars.forEach((pillar, i) => {
        const pillarX = margin + spacing.lg + (i * (pillarWidth + 10));

        // Pillar background (semi-transparent white effect using light color)
        setFillColor([30, 50, 80]); // Slightly lighter than navy
        doc.roundedRect(pillarX, pillarY, pillarWidth, 35, radius.sm, radius.sm, 'F');

        setColor(pillar.color);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'bold');
        doc.text(pillar.title, pillarX + 8, pillarY + 14);

        setColor(colors.white);
        doc.setFontSize(fontSize.sm);
        doc.setFont('helvetica', 'normal');
        doc.text(pillar.stat, pillarX + 8, pillarY + 28);
      });

      y += 110;
    }

    addFooter(4);

    // ============================================
    // PAGE 5: CATEGORY DEEP DIVE (with question-level scoring)
    // ============================================
    doc.addPage();
    addHeader('Category Analysis');
    y = 95;

    // Detailed category breakdowns - V4.10: Use segment-aware category names
    const categoryDetails = [
      {
        name: getCategoryName(0, segment),
        score: scores.categories[0],
        weight: weights[0],
        focus: 'System integration, automation, and staff efficiency',
        keyMetrics: [
          { label: 'PCC Integration', answer: answers['pcc_integration'] || 'Not specified' },
          { label: 'Statement Processing', answer: answers['statement_processing'] || 'Not specified' },
          { label: 'Staff on Inquiries', answer: answers['coordination_burden'] ? `${answers['coordination_burden']} staff` : 'Not specified' }
        ],
        improvements: scores.categories[0] < 80 ? [
          'Automate statement generation and delivery',
          'Integrate billing directly with PointClickCare',
          'Implement electronic payment acceptance'
        ] : ['Maintain current operational excellence', 'Explore advanced automation opportunities']
      },
      {
        // V4.10: Use segment-aware category names via getCategoryName
        name: getCategoryName(1, segment),
        score: scores.categories[1],
        weight: weights[1],
        focus: 'Payment flexibility, transparency, and multi-guarantor support',
        keyMetrics: segment === 'SNF' ? [
          // V4.13: SNF-specific metrics with split payment questions
          { label: 'Split Billing', answer: answers['snf_multi_guarantor'] || 'Not specified' },
          { label: 'Collection Rate', answer: answers['snf_collection_rate'] ? `${answers['snf_collection_rate']}%` : 'Not specified' },
          { label: 'Payment Channels', answer: Array.isArray(answers['snf_payment_channels']) ? answers['snf_payment_channels'].join(', ') : 'Not specified' },
          { label: 'Payment Types', answer: Array.isArray(answers['snf_payment_types']) ? answers['snf_payment_types'].join(', ') : 'Not specified' }
        ] : [
          // V4.4: Non-SNF metrics
          { label: 'Multi-Guarantor Capability', answer: answers['multi_guarantor_capability'] || 'Not specified' },
          { label: 'Payment Methods', answer: Array.isArray(answers['payment_methods']) ? answers['payment_methods'].join(', ') : 'Not specified' },
          { label: 'Family Satisfaction', answer: answers['family_satisfaction'] || answers['family_portal'] || 'Not specified' }
        ],
        improvements: scores.categories[1] < 80 ? [
          'Enable automated multi-guarantor split billing',
          'Add online payment portal for families',
          'Offer autopay enrollment options'
        ] : ['Continue excellent family engagement', 'Consider advanced portal features']
      }
    ];

    // Add competitive if applicable - V4.10: Use segment-aware category names
    if (!scores.useTwoCategories) {
      categoryDetails.push({
        name: getCategoryName(2, segment),
        score: scores.categories[2],
        weight: weights[2],
        focus: 'Market differentiation through billing experience',
        keyMetrics: [
          { label: 'Payment Demand', answer: answers['payment_demand'] || 'Not asked (cards accepted)' },
          { label: 'Tour Billing Discussion', answer: answers['tour_billing'] || 'Not specified' },
          // V4.4: Removed competitive_awareness (replaced by family_satisfaction in Family category)
          { label: 'Family Satisfaction', answer: answers['family_satisfaction'] || 'Not asked' }
        ],
        improvements: scores.categories[2] < 80 ? [
          'Highlight payment flexibility in marketing',
          'Train sales team on billing advantages',
          'Showcase modern billing during tours'
        ] : ['Leverage billing as competitive advantage', 'Share family testimonials']
      });
    }

    categoryDetails.forEach((cat, idx) => {
      // Check for page break
      if (y > pageHeight - 250) {
        addFooter(5);
        doc.addPage();
        addHeader('Category Analysis (continued)');
        y = 95;
      }

      // Category card - V4.9: Improved proportions and visual hierarchy
      setFillColor(colors.bgLight);
      doc.roundedRect(margin, y, contentWidth, 185, radius.lg, radius.lg, 'F');

      // Score indicator bar
      const catScoreColor = getScoreColorArr(cat.score);
      setFillColor(catScoreColor);
      doc.roundedRect(margin, y, 6, 185, radius.sm, radius.sm, 'F');

      // Category header
      setColor(colors.textDark);
      doc.setFontSize(fontSize.xl);
      doc.setFont('helvetica', 'bold');
      doc.text(cat.name, margin + spacing.lg, y + 28);

      // Score badge - V4.9: Larger and more prominent
      setFillColor(catScoreColor);
      doc.roundedRect(margin + 345, y + 12, 70, 28, radius.sm, radius.sm, 'F');
      setColor(colors.white);
      doc.setFontSize(fontSize.xl);
      doc.setFont('helvetica', 'bold');
      doc.text(`${cat.score}/100`, margin + 380, y + 31, { align: 'center' });

      // Weight badge
      setFillColor([230, 235, 240]);
      doc.roundedRect(margin + 422, y + 14, 65, 22, radius.sm, radius.sm, 'F');
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'bold');
      doc.text(`${Math.round(cat.weight * 100)}% weight`, margin + 454, y + 29, { align: 'center' });

      // Focus area
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text(cat.focus, margin + spacing.lg, y + 50);

      // Your responses section - V4.9: Better label/value formatting
      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'bold');
      doc.text('Your Responses:', margin + spacing.lg, y + 75);

      doc.setFont('helvetica', 'normal');
      let metricY = y + 92;
      cat.keyMetrics.forEach(metric => {
        setColor(colors.textMuted);
        doc.setFontSize(fontSize.sm);
        doc.text(metric.label + ':', margin + spacing.lg, metricY);
        setColor(colors.textDark);
        doc.setFontSize(fontSize.body);
        doc.setFont('helvetica', 'bold');
        const answerText = String(metric.answer).substring(0, 55) + (String(metric.answer).length > 55 ? '...' : '');
        doc.text(answerText, margin + 155, metricY);
        doc.setFont('helvetica', 'normal');
        metricY += 16;
      });

      // Improvement opportunities - V4.9: Better visual separation
      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'bold');
      doc.text('Opportunities:', margin + spacing.lg, metricY + 12);

      doc.setFont('helvetica', 'normal');
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      metricY += 28;
      cat.improvements.slice(0, 2).forEach((imp, i) => {
        doc.text(`${i + 1}. ${imp}`, margin + spacing.lg + 5, metricY);
        metricY += 14;
      });

      y += 205;
    });

    addFooter(5);

    // ============================================
    // PAGE 6: BENCHMARKS & RECOMMENDATIONS
    // ============================================
    doc.addPage();
    addHeader('Industry Benchmarks & Action Plan');
    y = 95;

    // Segment-specific benchmarks - V4.9: Better section header
    setColor(colors.textDark);
    doc.setFontSize(fontSize.xl);
    doc.setFont('helvetica', 'bold');
    doc.text(`${segmentLabel} Industry Benchmarks`, margin, y);

    y += spacing.lg;

    // Benchmark table
    const segmentBenchmarks = {
      SL: [
        { metric: 'Target AR Days', benchmark: '<45 days', yours: insights?.arDays ? `${insights.arDays} days` : 'N/A' },
        { metric: 'Private Pay %', benchmark: '66-95%', yours: '~80% typical' },
        { metric: 'Autopay Adoption', benchmark: '40-50%', yours: answers['autopay_rate'] ? `${answers['autopay_rate']}%` : 'N/A' },
        { metric: 'Online Payments', benchmark: '60%+', yours: answers['payment_methods']?.includes('Credit cards') ? 'Enabled' : 'Not enabled' }
      ],
      MC: [
        { metric: 'Target AR Days', benchmark: '<45 days', yours: insights?.arDays ? `${insights.arDays} days` : 'N/A' },
        { metric: 'Private Pay %', benchmark: '80%+', yours: '~80% typical' },
        { metric: 'Family Portal Usage', benchmark: '50%+', yours: answers['family_portal'] ? 'Available' : 'Not available' },
        { metric: 'Multi-Guarantor', benchmark: '60% of residents', yours: answers['payers_per_resident'] || 'N/A' }
      ],
      // V4.10: SNF benchmarks updated to focus on patient responsibility collection (Option A)
      SNF: [
        { metric: 'Collection Rate', benchmark: '90%', yours: answers['snf_collection_rate'] ? `${answers['snf_collection_rate']}%` : 'Industry avg: 75%' },
        { metric: 'Private Pay %', benchmark: '~25%', yours: insights?.privatePayPct ? `${insights.privatePayPct}%` : '~25% typical' },
        { metric: 'Autopay Enrollment', benchmark: '50%+', yours: answers['snf_autopay_enrollment'] ? `${answers['snf_autopay_enrollment']}%` : 'N/A' },
        { metric: 'Multi-Guarantor', benchmark: 'Automated', yours: answers['snf_multi_guarantor'] === 'automated' ? 'Yes' : (answers['snf_multi_guarantor'] || 'N/A') }
      ],
      CCRC: [
        { metric: 'Target AR Days', benchmark: '<20 days', yours: insights?.arDays ? `${insights.arDays} days` : 'N/A' },
        { metric: 'Private Pay %', benchmark: '85%', yours: '~85% typical' },
        { metric: 'Multi-Level Billing', benchmark: 'Unified system', yours: answers['ccrc_multi_level'] || 'N/A' },
        { metric: 'Entrance Fee Handling', benchmark: 'Automated', yours: answers['ccrc_entrance_fee'] || 'N/A' }
      ]
    };

    const benchmarksForSegment = segmentBenchmarks[segment] || segmentBenchmarks['SL'];

    // Table header - V4.9: Better proportions and styling
    setFillColor(colors.primary);
    doc.roundedRect(margin, y, contentWidth, 28, radius.sm, radius.sm, 'F');
    setColor(colors.white);
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'bold');
    doc.text('Metric', margin + 18, y + 18);
    doc.text('Industry Benchmark', margin + 185, y + 18);
    doc.text('Your Status', margin + 365, y + 18);

    y += 28;

    // Table rows - V4.9: Taller rows with better spacing
    benchmarksForSegment.forEach((row, i) => {
      setFillColor(i % 2 === 0 ? colors.bgLight : colors.white);
      doc.rect(margin, y, contentWidth, 26, 'F');

      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'normal');
      doc.text(row.metric, margin + 18, y + 17);

      setColor(colors.secondary);
      doc.setFont('helvetica', 'bold');
      doc.text(row.benchmark, margin + 185, y + 17);

      setColor(colors.textDark);
      doc.setFont('helvetica', 'normal');
      doc.text(row.yours, margin + 365, y + 17);

      y += 26;
    });

    // Table border
    setDrawColor([220, 225, 230]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y - (benchmarksForSegment.length * 26), contentWidth, benchmarksForSegment.length * 26, radius.sm, radius.sm, 'S');

    y += spacing.section;

    // Action Plan - V4.9: Better section styling
    setColor(colors.textDark);
    doc.setFontSize(fontSize.xl);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Action Plan', margin, y);

    y += spacing.lg;

    // Priority actions based on scores
    const actions = [];

    if (scores.categories[0] < 60) {
      actions.push({ priority: 'High', action: 'Implement automated statement generation through PointClickCare integration', impact: 'Reduce staff time by 60%+' });
    }
    if (scores.categories[1] < 60) {
      actions.push({ priority: 'High', action: 'Enable multi-guarantor billing to send individual statements to each family payer', impact: 'Improve collection rates 15-20%' });
    }
    if (!scores.useTwoCategories && scores.categories[2] < 60) {
      actions.push({ priority: 'Medium', action: 'Add card payment acceptance and online payment portal', impact: '67% of families prefer card-accepting facilities' });
    }
    if (answers['autopay_rate'] && answers['autopay_rate'] < 40) {
      actions.push({ priority: 'Medium', action: 'Launch autopay enrollment campaign to increase from ' + answers['autopay_rate'] + '% to 50%+', impact: 'Reduce late payments, improve cash flow' });
    }

    // Add general recommendations if not enough specific ones
    if (actions.length < 3) {
      actions.push({ priority: 'Ongoing', action: 'Schedule PatientPay demo to explore full PointClickCare integration capabilities', impact: 'Comprehensive billing modernization' });
    }

    actions.slice(0, 4).forEach((action, i) => {
      setFillColor(colors.bgLight);
      doc.roundedRect(margin, y, contentWidth, 55, radius.md, radius.md, 'F');

      // Priority badge - V4.9: Larger and more prominent
      const priorityColor = action.priority === 'High' ? colors.error : action.priority === 'Medium' ? colors.warning : colors.success;
      setFillColor(priorityColor);
      doc.roundedRect(margin + spacing.sm, y + 12, 55, 22, radius.sm, radius.sm, 'F');
      setColor(colors.white);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'bold');
      doc.text(action.priority, margin + 40, y + 27, { align: 'center' });

      // Action text - V4.9: Better spacing
      setColor(colors.textDark);
      doc.setFontSize(fontSize.body);
      doc.setFont('helvetica', 'bold');
      const actionLines = doc.splitTextToSize(action.action, contentWidth - 95);
      doc.text(actionLines, margin + 78, y + 22);

      // Impact - V4.9: Better label formatting
      setColor(colors.textMuted);
      doc.setFontSize(fontSize.sm);
      doc.setFont('helvetica', 'normal');
      doc.text('Impact: ', margin + 78, y + 44);
      setColor(colors.secondary);
      doc.setFont('helvetica', 'bold');
      doc.text(action.impact, margin + 115, y + 44);

      y += 62;
    });

    addFooter(6);

  }


  // ============================================
  // PAGE 7: YOUR RESPONSES
  // ============================================
  doc.addPage();
  addHeader('Your Assessment Responses');
  y = 95;

  setColor(colors.textMuted);
  doc.setFontSize(fontSize.body);
  doc.setFont('helvetica', 'normal');
  doc.text('Complete record of your responses for reference and follow-up discussions.', margin, y);

  y += spacing.lg;

  visibleQuestions.forEach(q => {
    if (q.isRoutingQuestion) return;

    const answer = answers[q.id];
    if (answer === undefined) return;

    // Check page break
    if (y > pageHeight - 110) {
      addFooter(7);
      doc.addPage();
      addHeader('Your Assessment Responses (continued)');
      y = 95;
    }

    // Question - V4.9: Better visual hierarchy
    setColor(colors.textMuted);
    doc.setFontSize(fontSize.sm);
    doc.setFont('helvetica', 'normal');
    const qLines = doc.splitTextToSize(q.question, contentWidth - 15);
    doc.text(qLines, margin, y);
    y += qLines.length * 12 + 4;

    // Answer - V4.9: Larger font for emphasis
    setColor(colors.textDark);
    doc.setFontSize(fontSize.md);
    doc.setFont('helvetica', 'bold');
    let answerText;
    // V4.12.2: Removed orphaned payer_mix PDF formatting - question type removed in V4.11
    if (Array.isArray(answer)) {
      answerText = answer.join(', ');
    } else if (q.type === 'slider' && q.unit) {
      answerText = answer + q.unit;
    } else {
      answerText = String(answer);
    }
    const aLines = doc.splitTextToSize(answerText, contentWidth - 15);
    doc.text(aLines, margin, y);
    y += aLines.length * 14 + spacing.md;
  });

  // CTA Box - V4.9: Better visual design with improved proportions
  y = Math.max(y + spacing.lg, pageHeight - 155);
  setFillColor(colors.primary);
  doc.roundedRect(margin, y, contentWidth, 105, radius.xl, radius.xl, 'F');

  // Accent line at top (flat rect inset to stay within rounded corners)
  setFillColor(colors.accent);
  doc.rect(margin + radius.xl, y, contentWidth - radius.xl * 2, 4, 'F');

  // V4.15: Logo in CTA using image or text fallback
  drawLogo(margin + spacing.lg, y + 32, 'normal', true);

  setColor(colors.white);
  doc.setFontSize(fontSize.h1);
  doc.setFont('helvetica', 'bold');
  doc.text('Ready to Transform Your Payment Operations?', margin + spacing.lg, y + 58);

  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'normal');
  doc.text('Schedule a personalized demo to see how PatientPay integrates with PointClickCare.', margin + spacing.lg, y + 78);

  // V4.12.2: Updated CTAs with correct URLs
  // Contact URL button
  setFillColor(colors.accent);
  doc.roundedRect(margin + spacing.lg - 5, y + 85, 175, 18, radius.sm, radius.sm, 'F');
  setColor(colors.primary);
  doc.setFontSize(fontSize.md);
  doc.setFont('helvetica', 'bold');
  doc.text('www.patientpay.com/contact', margin + spacing.lg, y + 97);

  // PCC Marketplace text
  setColor(colors.white);
  doc.setFontSize(fontSize.sm);
  doc.setFont('helvetica', 'normal');
  doc.text('Find us on the PCC Marketplace', margin + spacing.lg + 190, y + 97);

  addFooter(7);

  return doc.output('blob');
}

/**
 * Download PDF report
 * @param {Object} formData - Contact/facility info
 * @param {Object} answers - User answers
 * @param {Object} scores - Calculated scores
 */
async function downloadPDFReport(formData, answers, scores) {
  try {
    const blob = await generatePDFReport(formData, answers, scores);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const segment = answers['facility_type'] || '';
    const orgName = (formData.organization || 'Assessment')
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 30);
    link.download = `PatientPay_Assessment_${segment}_${orgName}_${new Date().toISOString().split('T')[0]}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('PDF generation error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1, color2, factor) {
  const hex = (c) => parseInt(c.slice(1), 16);
  const r1 = (hex(color1) >> 16) & 255;
  const g1 = (hex(color1) >> 8) & 255;
  const b1 = hex(color1) & 255;
  const r2 = (hex(color2) >> 16) & 255;
  const g2 = (hex(color2) >> 8) & 255;
  const b2 = hex(color2) & 255;

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get gradient color based on percentage
 */
function getGradientColor(percentage, inverted = false) {
  const p = inverted ? 100 - percentage : percentage;
  const scale = AssessmentColors.tempScale;

  if (p >= 80) {
    const t = (p - 80) / 20;
    return interpolateColor(scale.cool, scale.freezing, t);
  } else if (p >= 60) {
    const t = (p - 60) / 20;
    return interpolateColor(scale.mild, scale.cool, t);
  } else if (p >= 40) {
    const t = (p - 40) / 20;
    return interpolateColor(scale.warm, scale.mild, t);
  } else if (p >= 20) {
    const t = (p - 20) / 20;
    return interpolateColor(scale.hot, scale.warm, t);
  } else {
    const t = p / 20;
    return interpolateColor(scale.burning, scale.hot, t);
  }
}

// ============================================
// EXPORTS
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AssessmentColors,
    FacilityTypes,
    IndustryStats,
    IndustryBenchmarks,
    Questions,
    CategoryNames,
    SNFCategoryNames,
    getCategoryName,
    ResultsFlow,
    ResultsFlowV47,
    SourceCitations,
    getVisibleQuestions,
    calculateQuestionScore,
    calculateScores,
    getScoreLevel,
    getScoreColor,
    calculateInsights,
    getActionableRecommendations,
    getGapAnalysis,
    generateResultsSummary,
    getPerformanceVsBenchmark,
    getStrengths,
    calculatePatientPayProjections,
    PatientPayProjectionConfig,
    prepareExportData,
    generateCSV,
    generatePDFReport,
    downloadPDFReport,
    interpolateColor,
    getGradientColor,
    sendWebhook,
  };
}

// For browser global access
if (typeof window !== 'undefined') {
  window.AssessmentEngine = {
    // V4.6: Added SNF-specific category names and getCategoryName function
    colors: AssessmentColors,
    facilityTypes: FacilityTypes,
    stats: IndustryStats,
    industryBenchmarks: IndustryBenchmarks,
    questions: Questions,
    categoryNames: CategoryNames,
    snfCategoryNames: SNFCategoryNames, // V4.6: SNF uses "Patient" not "Resident"
    getCategoryName, // V4.6: Get segment-appropriate category name
    resultsFlow: ResultsFlow,
    resultsFlowV47: ResultsFlowV47, // V4.7: New emotional arc flow
    sources: SourceCitations,
    // V4.13: webhookConfig removed from public export (security - prevents abuse)
    // Core calculations
    getVisibleQuestions,
    calculateQuestionScore,
    calculateScores,
    getScoreLevel,
    getScoreColor,
    calculateInsights,
    // V4.4: Recommendations engine
    getActionableRecommendations,
    getGapAnalysis,
    generateResultsSummary,
    getPerformanceVsBenchmark,
    // V4.7: Strengths and projections
    getStrengths,
    calculatePatientPayProjections,
    patientPayProjectionConfig: PatientPayProjectionConfig,
    // Export functions
    prepareExportData,
    generateCSV,
    generatePDFReport,
    downloadPDFReport,
    // Utilities
    interpolateColor,
    getGradientColor,
    sendWebhook,
  };
}
