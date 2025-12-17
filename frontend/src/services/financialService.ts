/**
 * Financial Service for Harvest Hope
 * Handles loan calculations, EMI computations, and financial operations
 */

import type { LoanData, TransactionData, GovernmentBenefitData } from '../../../shared/types/game-state';

export interface LoanApplication {
  type: 'bank' | 'moneylender' | 'government';
  principal: number;
  interestRate: number;
  durationMonths: number;
  collateral?: string;
  purpose: string;
}

export interface LoanOffer {
  type: 'bank' | 'moneylender' | 'government';
  maxAmount: number;
  interestRate: number;
  maxDurationMonths: number;
  requirements: string[];
  processingTime: number; // in days
  collateralRequired: boolean;
}

export interface EMICalculation {
  emiAmount: number;
  totalAmount: number;
  totalInterest: number;
  schedule: EMIScheduleEntry[];
}

export interface EMIScheduleEntry {
  month: number;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  remainingBalance: number;
}

export interface GovernmentScheme {
  id: string;
  name: string;
  description: string;
  eligibilityRequirements: string[];
  benefitAmount: number;
  benefitType: 'direct_payment' | 'insurance' | 'subsidy' | 'loan_waiver';
  applicationProcess: string[];
  isActive: boolean;
}

export class FinancialService {
  
  /**
   * Calculate EMI using the standard formula: P * r * (1+r)^n / ((1+r)^n - 1)
   * Where P = Principal, r = monthly interest rate, n = number of months
   */
  static calculateEMI(principal: number, annualInterestRate: number, durationMonths: number): number {
    if (principal <= 0 || annualInterestRate < 0 || durationMonths <= 0) {
      throw new Error('Invalid loan parameters');
    }
    
    // Handle zero interest case (some government schemes)
    if (annualInterestRate === 0) {
      return principal / durationMonths;
    }
    
    const monthlyRate = annualInterestRate / (12 * 100);
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, durationMonths);
    const denominator = Math.pow(1 + monthlyRate, durationMonths) - 1;
    
    return Math.round(numerator / denominator);
  }

  /**
   * Generate complete EMI schedule with principal and interest breakdown
   */
  static generateEMISchedule(principal: number, annualInterestRate: number, durationMonths: number): EMICalculation {
    const emiAmount = this.calculateEMI(principal, annualInterestRate, durationMonths);
    const schedule: EMIScheduleEntry[] = [];
    let remainingBalance = principal;
    const monthlyRate = annualInterestRate / (12 * 100);

    for (let month = 1; month <= durationMonths; month++) {
      const interestComponent = Math.round(remainingBalance * monthlyRate);
      const principalComponent = emiAmount - interestComponent;
      remainingBalance = Math.max(0, remainingBalance - principalComponent);

      schedule.push({
        month,
        emiAmount,
        principalComponent,
        interestComponent,
        remainingBalance
      });
    }

    const totalAmount = emiAmount * durationMonths;
    const totalInterest = totalAmount - principal;

    return {
      emiAmount,
      totalAmount,
      totalInterest,
      schedule
    };
  }

  /**
   * Get available loan offers based on credit score and collateral
   */
  static getAvailableLoanOffers(creditScore: number, hasCollateral: boolean): LoanOffer[] {
    const offers: LoanOffer[] = [];

    // Bank KCC Loan (Kisan Credit Card)
    if (creditScore >= 650) {
      offers.push({
        type: 'bank',
        maxAmount: hasCollateral ? 500000 : 200000,
        interestRate: 7.0, // Subsidized rate for agriculture
        maxDurationMonths: 60,
        requirements: [
          'Valid land documents',
          'Aadhaar card',
          'Bank account',
          'Credit score >= 650'
        ],
        processingTime: 7,
        collateralRequired: true
      });
    }

    // Moneylender (always available but expensive)
    offers.push({
      type: 'moneylender',
      maxAmount: 100000,
      interestRate: 36.0, // High interest rate
      maxDurationMonths: 12,
      requirements: [
        'Local reference',
        'Identity proof'
      ],
      processingTime: 1,
      collateralRequired: false
    });

    // Government schemes (if eligible)
    if (creditScore >= 600) {
      offers.push({
        type: 'government',
        maxAmount: 300000,
        interestRate: 4.0, // Highly subsidized
        maxDurationMonths: 84,
        requirements: [
          'Small/marginal farmer certificate',
          'Land ownership proof',
          'Income certificate'
        ],
        processingTime: 14,
        collateralRequired: false
      });
    }

    return offers;
  }

  /**
   * Calculate penalty for missed EMI payments
   */
  static calculatePenalty(emiAmount: number, daysOverdue: number, loanType: 'bank' | 'moneylender' | 'government'): number {
    const penaltyRates = {
      bank: 0.02, // 2% per month
      moneylender: 0.05, // 5% per month
      government: 0.01 // 1% per month
    };

    const monthlyPenaltyRate = penaltyRates[loanType];
    const dailyPenaltyRate = monthlyPenaltyRate / 30;
    
    return Math.round(emiAmount * dailyPenaltyRate * daysOverdue);
  }

  /**
   * Update credit score based on payment history
   */
  static updateCreditScore(currentScore: number, paymentStatus: 'on_time' | 'late' | 'missed', daysLate: number = 0): number {
    let scoreChange = 0;

    switch (paymentStatus) {
      case 'on_time':
        scoreChange = 2; // Small positive impact
        break;
      case 'late':
        scoreChange = daysLate <= 30 ? -5 : -15; // Moderate negative impact
        break;
      case 'missed':
        scoreChange = -25; // Significant negative impact
        break;
    }

    return Math.max(300, Math.min(850, currentScore + scoreChange));
  }

  /**
   * Get available government schemes based on farmer profile
   */
  static getAvailableGovernmentSchemes(landArea: number, annualIncome: number, hasInsurance: boolean): GovernmentScheme[] {
    const schemes: GovernmentScheme[] = [];

    // PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)
    if (landArea <= 2.0) { // Small and marginal farmers
      schemes.push({
        id: 'pm-kisan',
        name: 'PM-KISAN',
        description: 'Direct income support of ₹6000 per year to small and marginal farmers',
        eligibilityRequirements: [
          'Land holding up to 2 hectares',
          'Valid Aadhaar card',
          'Bank account linked to Aadhaar'
        ],
        benefitAmount: 6000,
        benefitType: 'direct_payment',
        applicationProcess: [
          'Visit PM-KISAN portal',
          'Fill application form',
          'Upload required documents',
          'Submit for verification'
        ],
        isActive: true
      });
    }

    // Pradhan Mantri Fasal Bima Yojana (Crop Insurance)
    if (!hasInsurance) {
      schemes.push({
        id: 'pmfby',
        name: 'Pradhan Mantri Fasal Bima Yojana',
        description: 'Comprehensive crop insurance scheme covering yield losses',
        eligibilityRequirements: [
          'Farmer with insurable interest in crop',
          'Valid land documents',
          'Crop loan account (for loanee farmers)'
        ],
        benefitAmount: 0, // Variable based on crop value
        benefitType: 'insurance',
        applicationProcess: [
          'Apply through bank or CSC',
          'Pay farmer premium (2% for Kharif, 1.5% for Rabi)',
          'Submit land and crop details',
          'Get policy document'
        ],
        isActive: true
      });
    }

    // Interest Subvention Scheme
    schemes.push({
      id: 'interest-subvention',
      name: 'Interest Subvention Scheme',
      description: 'Interest subsidy on crop loans up to ₹3 lakh',
      eligibilityRequirements: [
        'Crop loan from scheduled bank',
        'Loan amount up to ₹3 lakh',
        'Timely repayment'
      ],
      benefitAmount: 0, // Percentage of interest
      benefitType: 'subsidy',
      applicationProcess: [
        'Apply for crop loan',
        'Ensure timely repayment',
        'Subsidy credited automatically'
      ],
      isActive: true
    });

    return schemes;
  }

  /**
   * Process government scheme application
   */
  static processSchemeApplication(schemeId: string, farmerData: any): { approved: boolean; reason: string; processingTime: number } {
    // Simplified approval logic - in real implementation, this would involve complex eligibility checks
    const approvalChance = Math.random();
    
    if (approvalChance > 0.8) {
      return {
        approved: false,
        reason: 'Incomplete documentation or eligibility criteria not met',
        processingTime: 7
      };
    }

    return {
      approved: true,
      reason: 'Application approved successfully',
      processingTime: schemeId === 'pm-kisan' ? 30 : 14
    };
  }

  /**
   * Create a new loan record
   */
  static createLoan(application: LoanApplication): LoanData {
    const emiAmount = this.calculateEMI(application.principal, application.interestRate, application.durationMonths);
    
    return {
      id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: application.type,
      principal: application.principal,
      interestRate: application.interestRate,
      emiAmount,
      remainingAmount: application.principal,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      penalties: 0
    };
  }

  /**
   * Create transaction record
   */
  static createTransaction(type: string, amount: number, description: string, category: string): TransactionData {
    return {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      amount,
      date: new Date().toISOString(),
      description,
      category
    };
  }

  /**
   * Create government benefit record
   */
  static createGovernmentBenefit(schemeId: string, schemeName: string, amount: number): GovernmentBenefitData {
    return {
      schemeId,
      schemeName,
      amount,
      receivedDate: new Date().toISOString(),
      eligibilityStatus: 'approved'
    };
  }
}