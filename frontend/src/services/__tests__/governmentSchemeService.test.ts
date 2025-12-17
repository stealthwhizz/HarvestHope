/**
 * Tests for Government Scheme Service
 * Validates scheme information, eligibility checking, and educational content
 */

import { GovernmentSchemeService } from '../governmentSchemeService';
import type { FarmData, EconomicsData } from '../../../../shared/types/game-state';

describe('GovernmentSchemeService', () => {
  // Mock farm data for testing
  const mockFarmData: FarmData = {
    money: 50000,
    day: 1,
    season: 'Kharif',
    year: 1,
    landArea: 1.5, // Small farmer
    soilQuality: 75,
    crops: [
      {
        id: 'crop1',
        type: 'rice',
        plantedDate: 1,
        growthStage: 'vegetative',
        health: 80,
        expectedYield: 2000,
        area: 1.0
      }
    ],
    storedCrops: [],
    livestock: [],
    equipment: [],
    storageCapacity: {
      farm: 1000,
      warehouse: 5000,
      cold_storage: 2000
    }
  };

  const mockEconomicsData: EconomicsData = {
    bankAccount: 25000,
    loans: [],
    income: [
      {
        id: 'income1',
        type: 'crop_sale',
        amount: 30000,
        date: '2024-01-01',
        description: 'Rice harvest',
        category: 'farming'
      }
    ],
    expenses: [],
    creditScore: 650,
    governmentBenefits: []
  };

  describe('getAllSchemes', () => {
    it('should return comprehensive scheme database', () => {
      const schemes = GovernmentSchemeService.getAllSchemes();
      
      expect(schemes).toBeDefined();
      expect(schemes.length).toBeGreaterThan(0);
      
      // Check for key schemes
      const pmKisan = schemes.find(s => s.id === 'pm-kisan');
      const pmfby = schemes.find(s => s.id === 'pmfby');
      const kcc = schemes.find(s => s.id === 'kisan-credit-card');
      
      expect(pmKisan).toBeDefined();
      expect(pmfby).toBeDefined();
      expect(kcc).toBeDefined();
      
      // Validate scheme structure
      schemes.forEach(scheme => {
        expect(scheme).toHaveProperty('id');
        expect(scheme).toHaveProperty('name');
        expect(scheme).toHaveProperty('description');
        expect(scheme).toHaveProperty('eligibilityRequirements');
        expect(scheme).toHaveProperty('benefitDetails');
        expect(scheme).toHaveProperty('applicationProcess');
        expect(scheme).toHaveProperty('educationalContent');
        expect(scheme.isActive).toBe(true);
      });
    });

    it('should include real program details', () => {
      const schemes = GovernmentSchemeService.getAllSchemes();
      const pmKisan = schemes.find(s => s.id === 'pm-kisan');
      
      expect(pmKisan?.benefitDetails.amount).toBe(6000);
      expect(pmKisan?.benefitDetails.frequency).toBe('annual');
      expect(pmKisan?.launchYear).toBe(2019);
      expect(pmKisan?.targetBeneficiaries).toContain('Small farmers');
    });
  });

  describe('checkEligibility', () => {
    it('should correctly check PM-KISAN eligibility for small farmers', () => {
      const result = GovernmentSchemeService.checkEligibility('pm-kisan', mockFarmData, mockEconomicsData);
      
      expect(result).toBeDefined();
      expect(result.isEligible).toBe(true); // 1.5 hectares <= 2 hectares
      expect(result.eligibilityScore).toBeGreaterThan(0);
      expect(result.estimatedBenefit).toBe(6000);
    });

    it('should reject PM-KISAN for large farmers', () => {
      const largeFarmData = { ...mockFarmData, landArea: 5.0 };
      const result = GovernmentSchemeService.checkEligibility('pm-kisan', largeFarmData, mockEconomicsData);
      
      expect(result.isEligible).toBe(false);
      expect(result.unmetRequirements.length).toBeGreaterThan(0);
    });

    it('should check PMFBY eligibility based on crop types', () => {
      const result = GovernmentSchemeService.checkEligibility('pmfby', mockFarmData, mockEconomicsData);
      
      expect(result).toBeDefined();
      expect(result.isEligible).toBe(true); // Rice is a notified crop
    });

    it('should provide recommendations for unmet requirements', () => {
      const largeFarmData = { ...mockFarmData, landArea: 5.0 };
      const result = GovernmentSchemeService.checkEligibility('pm-kisan', largeFarmData, mockEconomicsData);
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getApplicableSchemes', () => {
    it('should return schemes applicable to farmer situation', () => {
      const applicableSchemes = GovernmentSchemeService.getApplicableSchemes(mockFarmData, mockEconomicsData);
      
      expect(applicableSchemes).toBeDefined();
      expect(applicableSchemes.length).toBeGreaterThan(0);
      
      // Should include PM-KISAN for small farmer
      const pmKisan = applicableSchemes.find(s => s.id === 'pm-kisan');
      expect(pmKisan).toBeDefined();
    });

    it('should sort schemes by eligibility score', () => {
      const applicableSchemes = GovernmentSchemeService.getApplicableSchemes(mockFarmData, mockEconomicsData);
      
      // Check if sorted by eligibility score (descending)
      for (let i = 1; i < applicableSchemes.length; i++) {
        const prevEligibility = GovernmentSchemeService.checkEligibility(
          applicableSchemes[i-1].id, mockFarmData, mockEconomicsData
        );
        const currentEligibility = GovernmentSchemeService.checkEligibility(
          applicableSchemes[i].id, mockFarmData, mockEconomicsData
        );
        
        expect(prevEligibility.eligibilityScore).toBeGreaterThanOrEqual(currentEligibility.eligibilityScore);
      }
    });
  });

  describe('getEducationalContent', () => {
    it('should provide contextual educational content for financial crisis', () => {
      const content = GovernmentSchemeService.getEducationalContent('financial_crisis');
      
      expect(content).toBeDefined();
      expect(content.relevantSchemes.length).toBeGreaterThan(0);
      expect(content.educationalMessage).toContain('financial');
      expect(content.actionItems.length).toBeGreaterThan(0);
      
      // Should include income support and credit schemes
      const hasIncomeSupport = content.relevantSchemes.some(s => s.category === 'income_support');
      const hasCredit = content.relevantSchemes.some(s => s.category === 'credit');
      expect(hasIncomeSupport || hasCredit).toBe(true);
    });

    it('should provide contextual educational content for crop loss', () => {
      const content = GovernmentSchemeService.getEducationalContent('crop_loss');
      
      expect(content).toBeDefined();
      expect(content.educationalMessage).toContain('insurance');
      
      // Should focus on insurance schemes
      const hasInsurance = content.relevantSchemes.some(s => s.category === 'insurance');
      expect(hasInsurance).toBe(true);
    });

    it('should provide general educational content', () => {
      const content = GovernmentSchemeService.getEducationalContent('general');
      
      expect(content).toBeDefined();
      expect(content.relevantSchemes.length).toBeGreaterThan(0);
      expect(content.actionItems.length).toBeGreaterThan(0);
    });
  });

  describe('processSchemeApplication', () => {
    it('should create scheme application with correct status', () => {
      const application = GovernmentSchemeService.processSchemeApplication(
        'pm-kisan',
        mockFarmData,
        mockEconomicsData,
        ['Aadhaar Card', 'Bank Account Details']
      );
      
      expect(application).toBeDefined();
      expect(application.schemeId).toBe('pm-kisan');
      expect(application.applicationId).toContain('APP_PM-KISAN');
      expect(application.documentsSubmitted).toContain('Aadhaar Card');
      expect(application.estimatedProcessingTime).toBeGreaterThan(0);
    });

    it('should track missing documents', () => {
      const application = GovernmentSchemeService.processSchemeApplication(
        'pm-kisan',
        mockFarmData,
        mockEconomicsData,
        ['Aadhaar Card'] // Missing other required documents
      );
      
      expect(application.missingDocuments.length).toBeGreaterThan(0);
      expect(application.status).toBe('draft'); // Not submitted due to missing docs
    });

    it('should set submitted status when all documents provided', () => {
      const application = GovernmentSchemeService.processSchemeApplication(
        'pm-kisan',
        mockFarmData,
        mockEconomicsData,
        ['Aadhaar Card', 'Bank Account Details', 'Land Ownership Documents', 'Mobile Number']
      );
      
      expect(application.status).toBe('submitted');
      expect(application.submittedDate).toBeDefined();
    });
  });

  describe('trackBenefitImpact', () => {
    it('should track impact of income support schemes', () => {
      const benefit = {
        schemeId: 'pm-kisan',
        schemeName: 'PM-KISAN',
        amount: 6000,
        receivedDate: '2024-01-01',
        eligibilityStatus: 'approved'
      };
      
      const impact = GovernmentSchemeService.trackBenefitImpact(benefit, mockFarmData);
      
      expect(impact).toBeDefined();
      expect(impact.impactCategory).toBe('Financial Stability');
      expect(impact.quantifiedImpact).toBeGreaterThan(0);
      expect(impact.recommendations.length).toBeGreaterThan(0);
    });

    it('should track impact of insurance schemes', () => {
      const benefit = {
        schemeId: 'pmfby',
        schemeName: 'PMFBY',
        amount: 50000,
        receivedDate: '2024-01-01',
        eligibilityStatus: 'approved'
      };
      
      const impact = GovernmentSchemeService.trackBenefitImpact(benefit, mockFarmData);
      
      expect(impact.impactCategory).toBe('Risk Protection');
      expect(impact.quantifiedImpact).toBe(50000);
    });

    it('should handle unknown schemes gracefully', () => {
      const benefit = {
        schemeId: 'unknown-scheme',
        schemeName: 'Unknown',
        amount: 1000,
        receivedDate: '2024-01-01',
        eligibilityStatus: 'approved'
      };
      
      const impact = GovernmentSchemeService.trackBenefitImpact(benefit, mockFarmData);
      
      expect(impact.impactCategory).toBe('unknown');
      expect(impact.quantifiedImpact).toBe(0);
    });
  });

  describe('scheme data integrity', () => {
    it('should have valid application processes for all schemes', () => {
      const schemes = GovernmentSchemeService.getAllSchemes();
      
      schemes.forEach(scheme => {
        expect(scheme.applicationProcess.length).toBeGreaterThan(0);
        
        scheme.applicationProcess.forEach((step, index) => {
          expect(step.stepNumber).toBe(index + 1);
          expect(step.title).toBeTruthy();
          expect(step.description).toBeTruthy();
          expect(step.timeRequired).toBeTruthy();
          expect(step.location).toBeTruthy();
          expect(typeof step.cost).toBe('number');
        });
      });
    });

    it('should have educational content for all schemes', () => {
      const schemes = GovernmentSchemeService.getAllSchemes();
      
      schemes.forEach(scheme => {
        expect(scheme.educationalContent.overview).toBeTruthy();
        expect(scheme.educationalContent.problemItSolves).toBeTruthy();
        expect(scheme.educationalContent.realWorldImpact).toBeTruthy();
        expect(Array.isArray(scheme.educationalContent.commonMistakes)).toBe(true);
        expect(Array.isArray(scheme.educationalContent.tips)).toBe(true);
        expect(Array.isArray(scheme.educationalContent.faqs)).toBe(true);
      });
    });

    it('should have valid benefit details for all schemes', () => {
      const schemes = GovernmentSchemeService.getAllSchemes();
      
      schemes.forEach(scheme => {
        expect(scheme.benefitDetails.type).toBeTruthy();
        expect(scheme.benefitDetails.frequency).toBeTruthy();
        expect(scheme.benefitDetails.paymentMethod).toBeTruthy();
        expect(Array.isArray(scheme.benefitDetails.conditions)).toBe(true);
      });
    });
  });
});