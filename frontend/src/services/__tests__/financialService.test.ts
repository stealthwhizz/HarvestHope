/**
 * Unit tests for Financial Service
 */

import { FinancialService } from '../financialService';

describe('FinancialService', () => {
  describe('calculateEMI', () => {
    it('should calculate EMI correctly for standard loan', () => {
      const emi = FinancialService.calculateEMI(100000, 12, 12);
      expect(emi).toBe(8885); // Expected EMI for 1L at 12% for 12 months
    });

    it('should handle zero interest rate', () => {
      const emi = FinancialService.calculateEMI(120000, 0, 12);
      expect(emi).toBe(10000); // 120000 / 12
    });

    it('should throw error for invalid parameters', () => {
      expect(() => FinancialService.calculateEMI(-1000, 12, 12)).toThrow('Invalid loan parameters');
      expect(() => FinancialService.calculateEMI(100000, -5, 12)).toThrow('Invalid loan parameters');
      expect(() => FinancialService.calculateEMI(100000, 12, 0)).toThrow('Invalid loan parameters');
    });
  });

  describe('generateEMISchedule', () => {
    it('should generate complete EMI schedule', () => {
      const schedule = FinancialService.generateEMISchedule(100000, 12, 12);
      
      expect(schedule.emiAmount).toBe(8885);
      expect(schedule.schedule).toHaveLength(12);
      expect(schedule.totalAmount).toBe(106620); // 8885 * 12
      expect(schedule.totalInterest).toBe(6620);
      
      // Check first month
      const firstMonth = schedule.schedule[0];
      expect(firstMonth.month).toBe(1);
      expect(firstMonth.emiAmount).toBe(8885);
      expect(firstMonth.interestComponent).toBe(1000); // 100000 * 0.01
      expect(firstMonth.principalComponent).toBe(7885);
      expect(firstMonth.remainingBalance).toBe(92115);
    });

    it('should handle zero interest schedule', () => {
      const schedule = FinancialService.generateEMISchedule(60000, 0, 6);
      
      expect(schedule.emiAmount).toBe(10000);
      expect(schedule.totalInterest).toBe(0);
      expect(schedule.schedule[0].interestComponent).toBe(0);
      expect(schedule.schedule[0].principalComponent).toBe(10000);
    });
  });

  describe('getAvailableLoanOffers', () => {
    it('should return bank loan for good credit score with collateral', () => {
      const offers = FinancialService.getAvailableLoanOffers(750, true);
      
      const bankOffer = offers.find(offer => offer.type === 'bank');
      expect(bankOffer).toBeDefined();
      expect(bankOffer?.maxAmount).toBe(500000);
      expect(bankOffer?.interestRate).toBe(7.0);
    });

    it('should return limited bank loan for good credit score without collateral', () => {
      const offers = FinancialService.getAvailableLoanOffers(750, false);
      
      const bankOffer = offers.find(offer => offer.type === 'bank');
      expect(bankOffer).toBeDefined();
      expect(bankOffer?.maxAmount).toBe(200000);
    });

    it('should not return bank loan for poor credit score', () => {
      const offers = FinancialService.getAvailableLoanOffers(600, true);
      
      const bankOffer = offers.find(offer => offer.type === 'bank');
      expect(bankOffer).toBeUndefined();
    });

    it('should always return moneylender option', () => {
      const offers = FinancialService.getAvailableLoanOffers(500, false);
      
      const moneylenderOffer = offers.find(offer => offer.type === 'moneylender');
      expect(moneylenderOffer).toBeDefined();
      expect(moneylenderOffer?.interestRate).toBe(36.0);
      expect(moneylenderOffer?.processingTime).toBe(1);
    });

    it('should return government loan for eligible farmers', () => {
      const offers = FinancialService.getAvailableLoanOffers(650, false);
      
      const govOffer = offers.find(offer => offer.type === 'government');
      expect(govOffer).toBeDefined();
      expect(govOffer?.interestRate).toBe(4.0);
    });
  });

  describe('calculatePenalty', () => {
    it('should calculate bank penalty correctly', () => {
      const penalty = FinancialService.calculatePenalty(10000, 30, 'bank');
      expect(penalty).toBe(200); // 10000 * 0.02
    });

    it('should calculate moneylender penalty correctly', () => {
      const penalty = FinancialService.calculatePenalty(5000, 15, 'moneylender');
      expect(penalty).toBe(125); // 5000 * 0.05 * 0.5
    });

    it('should calculate government penalty correctly', () => {
      const penalty = FinancialService.calculatePenalty(8000, 60, 'government');
      expect(penalty).toBe(160); // 8000 * 0.01 * 2
    });
  });

  describe('updateCreditScore', () => {
    it('should increase score for on-time payments', () => {
      const newScore = FinancialService.updateCreditScore(700, 'on_time');
      expect(newScore).toBe(702);
    });

    it('should decrease score for late payments', () => {
      const newScore = FinancialService.updateCreditScore(700, 'late', 15);
      expect(newScore).toBe(695);
    });

    it('should decrease score more for very late payments', () => {
      const newScore = FinancialService.updateCreditScore(700, 'late', 45);
      expect(newScore).toBe(685);
    });

    it('should significantly decrease score for missed payments', () => {
      const newScore = FinancialService.updateCreditScore(700, 'missed');
      expect(newScore).toBe(675);
    });

    it('should not go below 300 or above 850', () => {
      const lowScore = FinancialService.updateCreditScore(300, 'missed');
      expect(lowScore).toBe(300);
      
      const highScore = FinancialService.updateCreditScore(850, 'on_time');
      expect(highScore).toBe(850);
    });
  });

  describe('getAvailableGovernmentSchemes', () => {
    it('should return PM-KISAN for small farmers', () => {
      const schemes = FinancialService.getAvailableGovernmentSchemes(1.5, 50000, false);
      
      const pmKisan = schemes.find(scheme => scheme.id === 'pm-kisan');
      expect(pmKisan).toBeDefined();
      expect(pmKisan?.benefitAmount).toBe(6000);
    });

    it('should not return PM-KISAN for large farmers', () => {
      const schemes = FinancialService.getAvailableGovernmentSchemes(3.0, 50000, false);
      
      const pmKisan = schemes.find(scheme => scheme.id === 'pm-kisan');
      expect(pmKisan).toBeUndefined();
    });

    it('should return crop insurance for uninsured farmers', () => {
      const schemes = FinancialService.getAvailableGovernmentSchemes(1.0, 50000, false);
      
      const insurance = schemes.find(scheme => scheme.id === 'pmfby');
      expect(insurance).toBeDefined();
    });

    it('should not return crop insurance for already insured farmers', () => {
      const schemes = FinancialService.getAvailableGovernmentSchemes(1.0, 50000, true);
      
      const insurance = schemes.find(scheme => scheme.id === 'pmfby');
      expect(insurance).toBeUndefined();
    });

    it('should always return interest subvention scheme', () => {
      const schemes = FinancialService.getAvailableGovernmentSchemes(1.0, 50000, false);
      
      const subvention = schemes.find(scheme => scheme.id === 'interest-subvention');
      expect(subvention).toBeDefined();
    });
  });

  describe('createLoan', () => {
    it('should create loan with correct EMI calculation', () => {
      const application = {
        type: 'bank' as const,
        principal: 100000,
        interestRate: 12,
        durationMonths: 12,
        purpose: 'Crop cultivation'
      };

      const loan = FinancialService.createLoan(application);
      
      expect(loan.type).toBe('bank');
      expect(loan.principal).toBe(100000);
      expect(loan.interestRate).toBe(12);
      expect(loan.emiAmount).toBe(8885);
      expect(loan.remainingAmount).toBe(100000);
      expect(loan.penalties).toBe(0);
      expect(loan.id).toMatch(/^loan_/);
    });
  });

  describe('createTransaction', () => {
    it('should create transaction with correct structure', () => {
      const transaction = FinancialService.createTransaction(
        'loan_disbursement',
        100000,
        'Bank loan received',
        'loan'
      );

      expect(transaction.type).toBe('loan_disbursement');
      expect(transaction.amount).toBe(100000);
      expect(transaction.description).toBe('Bank loan received');
      expect(transaction.category).toBe('loan');
      expect(transaction.id).toMatch(/^txn_/);
      expect(new Date(transaction.date)).toBeInstanceOf(Date);
    });
  });

  describe('createGovernmentBenefit', () => {
    it('should create government benefit record', () => {
      const benefit = FinancialService.createGovernmentBenefit(
        'pm-kisan',
        'PM-KISAN',
        2000
      );

      expect(benefit.schemeId).toBe('pm-kisan');
      expect(benefit.schemeName).toBe('PM-KISAN');
      expect(benefit.amount).toBe(2000);
      expect(benefit.eligibilityStatus).toBe('approved');
      expect(new Date(benefit.receivedDate)).toBeInstanceOf(Date);
    });
  });
});