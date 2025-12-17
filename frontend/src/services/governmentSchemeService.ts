/**
 * Government Scheme Education Service for Harvest Hope
 * Handles scheme information, eligibility checking, educational content, and benefit tracking
 */

import type { GovernmentBenefitData, FarmData, EconomicsData } from '../../../shared/types/game-state';

export interface GovernmentScheme {
  id: string;
  name: string;
  shortName: string;
  description: string;
  detailedDescription: string;
  category: 'income_support' | 'insurance' | 'credit' | 'subsidy' | 'infrastructure' | 'technology';
  eligibilityRequirements: EligibilityRequirement[];
  benefitDetails: BenefitDetails;
  applicationProcess: ApplicationStep[];
  documents: RequiredDocument[];
  educationalContent: EducationalContent;
  isActive: boolean;
  launchYear: number;
  targetBeneficiaries: string[];
  budgetAllocation?: number;
  successStories?: SuccessStory[];
}

export interface EligibilityRequirement {
  id: string;
  type: 'land_size' | 'income' | 'age' | 'crop_type' | 'location' | 'farmer_category' | 'loan_status' | 'insurance_status';
  operator: 'lte' | 'gte' | 'eq' | 'in' | 'not_in' | 'has' | 'not_has';
  value: number | string | string[];
  description: string;
  priority: 'mandatory' | 'preferred' | 'optional';
}

export interface BenefitDetails {
  type: 'direct_payment' | 'insurance_coverage' | 'interest_subsidy' | 'input_subsidy' | 'loan_waiver' | 'infrastructure';
  amount?: number;
  percentage?: number;
  frequency: 'one_time' | 'annual' | 'seasonal' | 'monthly' | 'on_claim';
  maxBenefit?: number;
  conditions: string[];
  paymentMethod: 'direct_transfer' | 'bank_account' | 'cooperative' | 'in_kind';
}

export interface ApplicationStep {
  stepNumber: number;
  title: string;
  description: string;
  timeRequired: string;
  location: string;
  cost: number;
  tips: string[];
}

export interface RequiredDocument {
  name: string;
  description: string;
  isOptional: boolean;
  alternativeDocuments?: string[];
}

export interface EducationalContent {
  overview: string;
  problemItSolves: string;
  realWorldImpact: string;
  commonMistakes: string[];
  tips: string[];
  faqs: FAQ[];
  relatedSchemes: string[];
}

export interface FAQ {
  question: string;
  answer: string;
  category: 'eligibility' | 'application' | 'benefits' | 'process' | 'troubleshooting';
}

export interface SuccessStory {
  farmerName: string;
  location: string;
  farmSize: number;
  beforeSituation: string;
  afterSituation: string;
  benefitReceived: number;
  impact: string;
  quote: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  eligibilityScore: number; // 0-100
  metRequirements: EligibilityRequirement[];
  unmetRequirements: EligibilityRequirement[];
  recommendations: string[];
  estimatedBenefit?: number;
}

export interface SchemeApplication {
  schemeId: string;
  applicationId: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  submittedDate?: string;
  approvalDate?: string;
  rejectionReason?: string;
  estimatedProcessingTime: number;
  documentsSubmitted: string[];
  missingDocuments: string[];
  benefitAmount?: number;
}

export class GovernmentSchemeService {
  
  /**
   * Get comprehensive database of all government schemes
   */
  static getAllSchemes(): GovernmentScheme[] {
    return [
      // PM-KISAN - Income Support
      {
        id: 'pm-kisan',
        name: 'Pradhan Mantri Kisan Samman Nidhi',
        shortName: 'PM-KISAN',
        description: 'Direct income support of ₹6000 per year to small and marginal farmers',
        detailedDescription: 'PM-KISAN provides direct income support to small and marginal farmer families having combined land holding/ownership of up to 2 hectares. Under the scheme, an amount of ₹6000 per year is transferred in three equal installments of ₹2000 each every four months into the bank accounts of the beneficiaries.',
        category: 'income_support',
        eligibilityRequirements: [
          {
            id: 'land_size',
            type: 'land_size',
            operator: 'lte',
            value: 2.0,
            description: 'Land holding should be up to 2 hectares',
            priority: 'mandatory'
          },
          {
            id: 'farmer_category',
            type: 'farmer_category',
            operator: 'in',
            value: ['small', 'marginal'],
            description: 'Must be classified as small or marginal farmer',
            priority: 'mandatory'
          }
        ],
        benefitDetails: {
          type: 'direct_payment',
          amount: 6000,
          frequency: 'annual',
          conditions: ['Valid Aadhaar card', 'Bank account linked to Aadhaar', 'Land ownership documents'],
          paymentMethod: 'direct_transfer'
        },
        applicationProcess: [
          {
            stepNumber: 1,
            title: 'Online Registration',
            description: 'Visit PM-KISAN portal and register with Aadhaar number',
            timeRequired: '15 minutes',
            location: 'Online/CSC',
            cost: 0,
            tips: ['Keep Aadhaar and bank details ready', 'Ensure mobile number is linked to Aadhaar']
          },
          {
            stepNumber: 2,
            title: 'Document Upload',
            description: 'Upload land ownership documents and bank account details',
            timeRequired: '20 minutes',
            location: 'Online/CSC',
            cost: 0,
            tips: ['Scan documents clearly', 'Ensure file size is under 1MB']
          },
          {
            stepNumber: 3,
            title: 'Verification',
            description: 'Wait for document verification by local authorities',
            timeRequired: '15-30 days',
            location: 'Automatic',
            cost: 0,
            tips: ['Check status regularly', 'Contact helpline if delayed']
          }
        ],
        documents: [
          { name: 'Aadhaar Card', description: 'Valid Aadhaar card of the farmer', isOptional: false },
          { name: 'Bank Account Details', description: 'Bank account number and IFSC code', isOptional: false },
          { name: 'Land Ownership Documents', description: 'Revenue records showing land ownership', isOptional: false },
          { name: 'Mobile Number', description: 'Active mobile number linked to Aadhaar', isOptional: false }
        ],
        educationalContent: {
          overview: 'PM-KISAN is the largest direct benefit transfer scheme for farmers in the world, covering over 11 crore farmers.',
          problemItSolves: 'Addresses the income uncertainty faced by small farmers and provides them with a predictable source of income to meet their agricultural and household needs.',
          realWorldImpact: 'Since 2019, over ₹2.2 lakh crore has been transferred to farmers, helping them invest in better seeds, fertilizers, and farming equipment.',
          commonMistakes: [
            'Not linking Aadhaar with bank account',
            'Providing incorrect land details',
            'Not updating mobile number',
            'Duplicate registrations'
          ],
          tips: [
            'Register early in the financial year',
            'Keep all documents updated',
            'Check payment status regularly',
            'Report any issues immediately'
          ],
          faqs: [
            {
              question: 'When will I receive the payment?',
              answer: 'Payments are made in three installments: April-July, August-November, and December-March.',
              category: 'benefits'
            },
            {
              question: 'What if my payment is delayed?',
              answer: 'Check your application status online. Contact the PM-KISAN helpline at 155261 or visit your nearest CSC.',
              category: 'troubleshooting'
            }
          ],
          relatedSchemes: ['pmfby', 'kisan-credit-card', 'soil-health-card']
        },
        isActive: true,
        launchYear: 2019,
        targetBeneficiaries: ['Small farmers', 'Marginal farmers'],
        budgetAllocation: 65000, // in crores
        successStories: [
          {
            farmerName: 'Ramesh Kumar',
            location: 'Uttar Pradesh',
            farmSize: 1.5,
            beforeSituation: 'Struggled to buy quality seeds and fertilizers due to cash flow issues',
            afterSituation: 'Uses PM-KISAN money to invest in better inputs, increased yield by 25%',
            benefitReceived: 18000,
            impact: 'Improved crop quality and family income',
            quote: 'PM-KISAN money comes exactly when I need it for sowing season'
          }
        ]
      },

      // PMFBY - Crop Insurance
      {
        id: 'pmfby',
        name: 'Pradhan Mantri Fasal Bima Yojana',
        shortName: 'PMFBY',
        description: 'Comprehensive crop insurance scheme covering yield losses due to natural calamities',
        detailedDescription: 'PMFBY provides insurance coverage and financial support to farmers in the event of failure of any of the notified crop as a result of natural calamities, pests & diseases. The scheme covers all food crops, oilseeds, and annual commercial/horticultural crops.',
        category: 'insurance',
        eligibilityRequirements: [
          {
            id: 'crop_cultivation',
            type: 'crop_type',
            operator: 'in',
            value: ['rice', 'wheat', 'cotton', 'sugarcane', 'pulses', 'oilseeds'],
            description: 'Must be cultivating notified crops',
            priority: 'mandatory'
          },
          {
            id: 'land_documents',
            type: 'farmer_category',
            operator: 'has',
            value: 'land_ownership',
            description: 'Valid land ownership or cultivation rights',
            priority: 'mandatory'
          }
        ],
        benefitDetails: {
          type: 'insurance_coverage',
          percentage: 100,
          frequency: 'on_claim',
          conditions: ['Premium payment', 'Crop loss due to insured perils', 'Timely reporting'],
          paymentMethod: 'direct_transfer'
        },
        applicationProcess: [
          {
            stepNumber: 1,
            title: 'Premium Payment',
            description: 'Pay farmer share of premium (2% for Kharif, 1.5% for Rabi crops)',
            timeRequired: '10 minutes',
            location: 'Bank/CSC/Online',
            cost: 0, // Variable based on crop value
            tips: ['Pay before cut-off date', 'Keep premium receipt safe']
          },
          {
            stepNumber: 2,
            title: 'Crop Declaration',
            description: 'Declare crop details, area, and expected yield',
            timeRequired: '15 minutes',
            location: 'Bank/Insurance company',
            cost: 0,
            tips: ['Provide accurate crop details', 'Keep sowing certificate']
          },
          {
            stepNumber: 3,
            title: 'Loss Reporting',
            description: 'Report crop loss within 72 hours of occurrence',
            timeRequired: '30 minutes',
            location: 'Nearest center/Mobile app',
            cost: 0,
            tips: ['Take photos of damaged crops', 'Get village officer verification']
          }
        ],
        documents: [
          { name: 'Land Records', description: 'Revenue records showing cultivation rights', isOptional: false },
          { name: 'Aadhaar Card', description: 'Identity proof', isOptional: false },
          { name: 'Bank Account Details', description: 'For premium deduction and claim settlement', isOptional: false },
          { name: 'Sowing Certificate', description: 'Proof of crop sowing from village officer', isOptional: false }
        ],
        educationalContent: {
          overview: 'PMFBY is the world\'s largest crop insurance scheme, covering over 5.5 crore farmers with a sum insured of ₹1.8 lakh crore.',
          problemItSolves: 'Protects farmers from financial losses due to crop failure caused by natural disasters, pests, and diseases.',
          realWorldImpact: 'Has paid over ₹1.3 lakh crore in claims since 2016, helping farmers recover from crop losses and continue farming.',
          commonMistakes: [
            'Missing premium payment deadline',
            'Not reporting losses within 72 hours',
            'Incorrect crop area declaration',
            'Not maintaining proper records'
          ],
          tips: [
            'Enroll early in the season',
            'Keep all farming records updated',
            'Use mobile app for quick loss reporting',
            'Understand coverage and exclusions'
          ],
          faqs: [
            {
              question: 'What is covered under PMFBY?',
              answer: 'Natural calamities, pests, diseases, and post-harvest losses due to cyclones and unseasonal rains.',
              category: 'benefits'
            },
            {
              question: 'How is claim amount calculated?',
              answer: 'Based on yield loss assessment and sum insured for the crop.',
              category: 'process'
            }
          ],
          relatedSchemes: ['pm-kisan', 'weather-based-insurance', 'kisan-credit-card']
        },
        isActive: true,
        launchYear: 2016,
        targetBeneficiaries: ['All farmers', 'Sharecroppers', 'Tenant farmers'],
        budgetAllocation: 15695, // in crores
        successStories: [
          {
            farmerName: 'Sunita Devi',
            location: 'Bihar',
            farmSize: 2.0,
            beforeSituation: 'Lost entire cotton crop to floods, had to take high-interest loans',
            afterSituation: 'Received ₹45,000 insurance claim, could replant and recover',
            benefitReceived: 45000,
            impact: 'Avoided debt trap and continued farming',
            quote: 'PMFBY saved my family from financial ruin after the floods'
          }
        ]
      },

      // Kisan Credit Card
      {
        id: 'kisan-credit-card',
        name: 'Kisan Credit Card',
        shortName: 'KCC',
        description: 'Credit facility for farmers to meet their cultivation and other needs',
        detailedDescription: 'KCC provides adequate and timely credit support from the banking system to farmers for their cultivation and other needs including post-harvest expenses, produce marketing loan, consumption requirements of farmer household, maintenance of farm assets and activities allied to agriculture.',
        category: 'credit',
        eligibilityRequirements: [
          {
            id: 'land_ownership',
            type: 'farmer_category',
            operator: 'has',
            value: 'cultivation_rights',
            description: 'Own land or have cultivation rights',
            priority: 'mandatory'
          },
          {
            id: 'credit_score',
            type: 'loan_status',
            operator: 'gte',
            value: 600,
            description: 'Minimum credit score of 600',
            priority: 'preferred'
          }
        ],
        benefitDetails: {
          type: 'interest_subsidy',
          percentage: 3,
          frequency: 'annual',
          maxBenefit: 300000,
          conditions: ['Timely repayment', 'Crop loan up to ₹3 lakh', 'Interest subvention of 3%'],
          paymentMethod: 'bank_account'
        },
        applicationProcess: [
          {
            stepNumber: 1,
            title: 'Bank Visit',
            description: 'Visit nearest bank branch with required documents',
            timeRequired: '1 hour',
            location: 'Bank branch',
            cost: 0,
            tips: ['Choose bank with good agricultural lending record', 'Carry all original documents']
          },
          {
            stepNumber: 2,
            title: 'Application Form',
            description: 'Fill KCC application form with crop and land details',
            timeRequired: '30 minutes',
            location: 'Bank branch',
            cost: 0,
            tips: ['Provide accurate crop planning', 'Include allied activities if applicable']
          },
          {
            stepNumber: 3,
            title: 'Verification',
            description: 'Bank verification of documents and field inspection',
            timeRequired: '7-15 days',
            location: 'Bank and field',
            cost: 0,
            tips: ['Be available for field visit', 'Maintain good relationship with bank officials']
          }
        ],
        documents: [
          { name: 'Land Documents', description: 'Revenue records, land ownership papers', isOptional: false },
          { name: 'Identity Proof', description: 'Aadhaar card, voter ID, or passport', isOptional: false },
          { name: 'Address Proof', description: 'Utility bill, ration card, or Aadhaar', isOptional: false },
          { name: 'Income Proof', description: 'Previous year\'s income certificate or ITR', isOptional: true }
        ],
        educationalContent: {
          overview: 'KCC is available to all farmers including sharecroppers and tenant farmers. Over 7 crore farmers have active KCC accounts.',
          problemItSolves: 'Provides timely and adequate credit for agricultural activities, reducing dependence on informal credit sources.',
          realWorldImpact: 'Has disbursed over ₹7 lakh crore in agricultural credit, enabling farmers to adopt modern farming practices.',
          commonMistakes: [
            'Delayed loan repayment affecting credit score',
            'Using crop loan for non-agricultural purposes',
            'Not maintaining proper utilization records',
            'Missing renewal deadlines'
          ],
          tips: [
            'Repay loans on time to maintain good credit history',
            'Use funds only for intended agricultural purposes',
            'Renew KCC annually for continued benefits',
            'Maintain detailed records of fund utilization'
          ],
          faqs: [
            {
              question: 'What is the interest rate for KCC?',
              answer: 'Effective interest rate is 4% per annum for loans up to ₹3 lakh with timely repayment.',
              category: 'benefits'
            },
            {
              question: 'Can I get KCC without land ownership?',
              answer: 'Yes, tenant farmers and sharecroppers can also get KCC with proper documentation.',
              category: 'eligibility'
            }
          ],
          relatedSchemes: ['interest-subvention', 'pm-kisan', 'pmfby']
        },
        isActive: true,
        launchYear: 1998,
        targetBeneficiaries: ['All farmers', 'Tenant farmers', 'Sharecroppers', 'SHG members'],
        budgetAllocation: 1600000, // in crores (annual credit target)
        successStories: [
          {
            farmerName: 'Mohan Singh',
            location: 'Punjab',
            farmSize: 3.0,
            beforeSituation: 'Borrowed from moneylenders at 24% interest for farming needs',
            afterSituation: 'Gets KCC loan at 4% interest, saves ₹20,000 annually on interest',
            benefitReceived: 200000,
            impact: 'Reduced cost of cultivation and improved profitability',
            quote: 'KCC freed me from the clutches of moneylenders'
          }
        ]
      }
    ];
  }

  /**
   * Check eligibility for a specific scheme
   */
  static checkEligibility(schemeId: string, farmData: FarmData, economicsData: EconomicsData): EligibilityResult {
    const scheme = this.getAllSchemes().find(s => s.id === schemeId);
    if (!scheme) {
      throw new Error(`Scheme not found: ${schemeId}`);
    }

    const metRequirements: EligibilityRequirement[] = [];
    const unmetRequirements: EligibilityRequirement[] = [];
    let eligibilityScore = 0;

    for (const requirement of scheme.eligibilityRequirements) {
      const isMet = this.evaluateRequirement(requirement, farmData, economicsData);
      
      if (isMet) {
        metRequirements.push(requirement);
        eligibilityScore += requirement.priority === 'mandatory' ? 40 : 
                           requirement.priority === 'preferred' ? 20 : 10;
      } else {
        unmetRequirements.push(requirement);
      }
    }

    const isEligible = unmetRequirements.filter(r => r.priority === 'mandatory').length === 0;
    const recommendations = this.generateRecommendations(unmetRequirements, farmData);
    const estimatedBenefit = this.calculateEstimatedBenefit(scheme, farmData);

    return {
      isEligible,
      eligibilityScore: Math.min(100, eligibilityScore),
      metRequirements,
      unmetRequirements,
      recommendations,
      estimatedBenefit
    };
  }

  /**
   * Get schemes applicable to current farmer situation
   */
  static getApplicableSchemes(farmData: FarmData, economicsData: EconomicsData): GovernmentScheme[] {
    const allSchemes = this.getAllSchemes();
    const applicableSchemes: GovernmentScheme[] = [];

    for (const scheme of allSchemes) {
      const eligibility = this.checkEligibility(scheme.id, farmData, economicsData);
      if (eligibility.isEligible || eligibility.eligibilityScore >= 60) {
        applicableSchemes.push(scheme);
      }
    }

    return applicableSchemes.sort((a, b) => {
      const aEligibility = this.checkEligibility(a.id, farmData, economicsData);
      const bEligibility = this.checkEligibility(b.id, farmData, economicsData);
      return bEligibility.eligibilityScore - aEligibility.eligibilityScore;
    });
  }

  /**
   * Get educational content for contextual learning
   */
  static getEducationalContent(context: 'financial_crisis' | 'crop_loss' | 'low_income' | 'debt_burden' | 'general'): {
    relevantSchemes: GovernmentScheme[];
    educationalMessage: string;
    actionItems: string[];
  } {
    const allSchemes = this.getAllSchemes();
    let relevantSchemes: GovernmentScheme[] = [];
    let educationalMessage = '';
    let actionItems: string[] = [];

    switch (context) {
      case 'financial_crisis':
        relevantSchemes = allSchemes.filter(s => 
          s.category === 'income_support' || s.category === 'credit'
        );
        educationalMessage = 'During financial difficulties, government schemes can provide immediate relief and long-term support. PM-KISAN provides direct income support, while KCC offers affordable credit.';
        actionItems = [
          'Apply for PM-KISAN if you have less than 2 hectares',
          'Get a Kisan Credit Card for affordable farming loans',
          'Consider crop insurance to protect against future losses'
        ];
        break;

      case 'crop_loss':
        relevantSchemes = allSchemes.filter(s => s.category === 'insurance');
        educationalMessage = 'Crop losses can devastate farming families. PMFBY provides comprehensive insurance coverage against natural calamities, pests, and diseases.';
        actionItems = [
          'Enroll in PMFBY before the next sowing season',
          'Report any crop loss within 72 hours',
          'Keep detailed farming records for claims'
        ];
        break;

      case 'low_income':
        relevantSchemes = allSchemes.filter(s => 
          s.category === 'income_support' || s.category === 'subsidy'
        );
        educationalMessage = 'Low farm income is a common challenge. Government schemes provide direct income support and subsidies to improve farmer livelihoods.';
        actionItems = [
          'Register for PM-KISAN for guaranteed annual income',
          'Explore input subsidies to reduce farming costs',
          'Consider allied activities supported by government schemes'
        ];
        break;

      case 'debt_burden':
        relevantSchemes = allSchemes.filter(s => s.category === 'credit');
        educationalMessage = 'High-interest debt can trap farmers in poverty. Government credit schemes offer affordable alternatives to moneylenders.';
        actionItems = [
          'Replace high-interest loans with KCC',
          'Maintain good repayment record for continued benefits',
          'Avoid borrowing from informal sources'
        ];
        break;

      default:
        relevantSchemes = allSchemes;
        educationalMessage = 'Government schemes are designed to support farmers at every stage. Understanding and utilizing these schemes can significantly improve your farming success.';
        actionItems = [
          'Learn about all available schemes',
          'Check your eligibility regularly',
          'Apply for schemes that match your situation'
        ];
    }

    return {
      relevantSchemes,
      educationalMessage,
      actionItems
    };
  }

  /**
   * Process scheme application
   */
  static processSchemeApplication(
    schemeId: string, 
    farmData: FarmData, 
    economicsData: EconomicsData,
    documentsProvided: string[]
  ): SchemeApplication {
    const scheme = this.getAllSchemes().find(s => s.id === schemeId);
    if (!scheme) {
      throw new Error(`Scheme not found: ${schemeId}`);
    }

    const eligibility = this.checkEligibility(schemeId, farmData, economicsData);
    const requiredDocs = scheme.documents.filter(d => !d.isOptional).map(d => d.name);
    const missingDocuments = requiredDocs.filter(doc => !documentsProvided.includes(doc));

    const applicationId = `APP_${schemeId.toUpperCase()}_${Date.now()}`;
    
    let status: SchemeApplication['status'] = 'draft';
    if (documentsProvided.length > 0) {
      status = missingDocuments.length === 0 ? 'submitted' : 'draft';
    }

    return {
      schemeId,
      applicationId,
      status,
      submittedDate: status === 'submitted' ? new Date().toISOString() : undefined,
      estimatedProcessingTime: this.calculateProcessingTime(scheme),
      documentsSubmitted: documentsProvided,
      missingDocuments,
      benefitAmount: eligibility.estimatedBenefit
    };
  }

  /**
   * Track scheme benefit impact
   */
  static trackBenefitImpact(benefit: GovernmentBenefitData, farmData: FarmData): {
    impactCategory: string;
    impactDescription: string;
    quantifiedImpact: number;
    recommendations: string[];
  } {
    const scheme = this.getAllSchemes().find(s => s.id === benefit.schemeId);
    if (!scheme) {
      return {
        impactCategory: 'unknown',
        impactDescription: 'Unable to track impact for unknown scheme',
        quantifiedImpact: 0,
        recommendations: []
      };
    }

    let impactCategory = '';
    let impactDescription = '';
    let quantifiedImpact = 0;
    let recommendations: string[] = [];

    switch (scheme.category) {
      case 'income_support':
        impactCategory = 'Financial Stability';
        impactDescription = `Direct income support of ₹${benefit.amount} improved cash flow and reduced financial stress`;
        quantifiedImpact = (benefit.amount / farmData.money) * 100; // Percentage of current money
        recommendations = [
          'Use the money for productive investments like quality seeds',
          'Consider opening a separate savings account for farming expenses',
          'Plan expenditure across the entire season'
        ];
        break;

      case 'insurance':
        impactCategory = 'Risk Protection';
        impactDescription = `Insurance coverage protected against potential crop losses worth ₹${benefit.amount}`;
        quantifiedImpact = benefit.amount;
        recommendations = [
          'Continue insurance coverage for all seasons',
          'Report any crop damage immediately',
          'Maintain detailed farming records'
        ];
        break;

      case 'credit':
        impactCategory = 'Access to Finance';
        impactDescription = `Affordable credit access saved approximately ₹${benefit.amount} in interest costs`;
        quantifiedImpact = benefit.amount;
        recommendations = [
          'Maintain timely repayment for continued benefits',
          'Use credit only for productive agricultural activities',
          'Build good relationship with bank officials'
        ];
        break;

      default:
        impactCategory = 'General Support';
        impactDescription = `Government support of ₹${benefit.amount} contributed to farming operations`;
        quantifiedImpact = benefit.amount;
        recommendations = ['Continue utilizing government schemes for maximum benefit'];
    }

    return {
      impactCategory,
      impactDescription,
      quantifiedImpact,
      recommendations
    };
  }

  // Private helper methods
  private static evaluateRequirement(
    requirement: EligibilityRequirement, 
    farmData: FarmData, 
    economicsData: EconomicsData
  ): boolean {
    switch (requirement.type) {
      case 'land_size':
        return this.compareValue(farmData.landArea, requirement.operator, requirement.value);
      
      case 'income':
        const annualIncome = economicsData.income.reduce((sum, income) => sum + income.amount, 0);
        return this.compareValue(annualIncome, requirement.operator, requirement.value);
      
      case 'farmer_category':
        const category = farmData.landArea <= 2 ? 'small' : farmData.landArea <= 4 ? 'medium' : 'large';
        return this.compareValue(category, requirement.operator, requirement.value);
      
      case 'loan_status':
        return this.compareValue(economicsData.creditScore, requirement.operator, requirement.value);
      
      case 'insurance_status':
        const hasInsurance = economicsData.governmentBenefits.some(b => b.schemeId === 'pmfby');
        return requirement.operator === 'not_has' ? !hasInsurance : hasInsurance;
      
      default:
        return true; // Default to eligible for unknown requirements
    }
  }

  private static compareValue(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'lte': return actual <= expected;
      case 'gte': return actual >= expected;
      case 'eq': return actual === expected;
      case 'in': return Array.isArray(expected) && expected.includes(actual);
      case 'not_in': return Array.isArray(expected) && !expected.includes(actual);
      case 'has': return Boolean(actual);
      case 'not_has': return !Boolean(actual);
      default: return false;
    }
  }

  private static generateRecommendations(
    unmetRequirements: EligibilityRequirement[], 
    farmData: FarmData
  ): string[] {
    const recommendations: string[] = [];

    for (const requirement of unmetRequirements) {
      switch (requirement.type) {
        case 'land_size':
          if (requirement.operator === 'lte') {
            recommendations.push(`Consider schemes for larger farmers or explore land leasing options`);
          } else {
            recommendations.push(`Look into schemes that support your current land size`);
          }
          break;
        
        case 'farmer_category':
          recommendations.push(`Get proper farmer category certification from local authorities`);
          break;
        
        case 'loan_status':
          recommendations.push(`Improve credit score by timely loan repayments and maintaining good banking relationships`);
          break;
        
        default:
          recommendations.push(`Work on meeting the requirement: ${requirement.description}`);
      }
    }

    return recommendations;
  }

  private static calculateEstimatedBenefit(scheme: GovernmentScheme, farmData: FarmData): number {
    switch (scheme.benefitDetails.type) {
      case 'direct_payment':
        return scheme.benefitDetails.amount || 0;
      
      case 'insurance_coverage':
        // Estimate based on crop value (simplified)
        const cropValue = farmData.crops.reduce((sum, crop) => sum + (crop.expectedYield * 1000), 0);
        return Math.min(cropValue, 200000); // Cap at 2 lakh
      
      case 'interest_subsidy':
        // Estimate savings on a typical loan
        const typicalLoan = 100000;
        const subsidyRate = scheme.benefitDetails.percentage || 3;
        return (typicalLoan * subsidyRate) / 100;
      
      default:
        return 0;
    }
  }

  private static calculateProcessingTime(scheme: GovernmentScheme): number {
    // Return processing time in days based on scheme complexity
    const baseTime = scheme.applicationProcess.reduce((sum, step) => {
      const timeStr = step.timeRequired;
      if (timeStr.includes('day')) {
        const days = parseInt(timeStr.match(/\d+/)?.[0] || '0');
        return sum + days;
      }
      return sum;
    }, 0);

    return Math.max(baseTime, 7); // Minimum 7 days
  }
}