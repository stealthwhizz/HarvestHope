/**
 * Financial Dashboard Component for Harvest Hope
 * Provides UI for loan management, EMI tracking, and government schemes
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { 
  addLoan, 
  updateBankAccount, 
  addExpense, 
  addIncome, 
  updateCreditScore,
  addGovernmentBenefit,
  repayLoan
} from '../store/slices/economicsSlice';
import { 
  FinancialService, 
  type LoanOffer, 
  type LoanApplication, 
  type GovernmentScheme,
  type EMICalculation 
} from '../services/financialService';

interface FinancialDashboardProps {
  className?: string;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const economics = useSelector((state: RootState) => state.economics);
  const farm = useSelector((state: RootState) => state.farm);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'schemes'>('overview');
  const [showLoanApplication, setShowLoanApplication] = useState(false);
  const [selectedLoanOffer, setSelectedLoanOffer] = useState<LoanOffer | null>(null);
  const [loanAmount, setLoanAmount] = useState<number>(50000);
  const [loanDuration, setLoanDuration] = useState<number>(12);
  const [emiCalculation, setEmiCalculation] = useState<EMICalculation | null>(null);
  
  const [availableLoanOffers, setAvailableLoanOffers] = useState<LoanOffer[]>([]);
  const [availableSchemes, setAvailableSchemes] = useState<GovernmentScheme[]>([]);

  useEffect(() => {
    // Load available loan offers based on credit score
    const offers = FinancialService.getAvailableLoanOffers(economics.creditScore, farm.landArea > 0);
    setAvailableLoanOffers(offers);

    // Load available government schemes
    const schemes = FinancialService.getAvailableGovernmentSchemes(
      farm.landArea, 
      economics.bankAccount, 
      false // TODO: Check if farmer has insurance
    );
    setAvailableSchemes(schemes);
  }, [economics.creditScore, farm.landArea, economics.bankAccount]);

  useEffect(() => {
    // Recalculate EMI when loan parameters change
    if (selectedLoanOffer && loanAmount > 0 && loanDuration > 0) {
      try {
        const calculation = FinancialService.generateEMISchedule(
          loanAmount, 
          selectedLoanOffer.interestRate, 
          loanDuration
        );
        setEmiCalculation(calculation);
      } catch (error) {
        setEmiCalculation(null);
      }
    }
  }, [selectedLoanOffer, loanAmount, loanDuration]);

  const handleLoanApplication = () => {
    if (!selectedLoanOffer || !emiCalculation) return;

    const application: LoanApplication = {
      type: selectedLoanOffer.type,
      principal: loanAmount,
      interestRate: selectedLoanOffer.interestRate,
      durationMonths: loanDuration,
      purpose: 'Agricultural operations'
    };

    const newLoan = FinancialService.createLoan(application);
    dispatch(addLoan(newLoan));
    dispatch(updateBankAccount(loanAmount)); // Add loan amount to bank account
    
    // Create transaction record
    const transaction = FinancialService.createTransaction(
      'loan_disbursement',
      loanAmount,
      `${selectedLoanOffer.type} loan disbursement`,
      'loan'
    );
    dispatch(addIncome(transaction));

    setShowLoanApplication(false);
    setSelectedLoanOffer(null);
    setLoanAmount(50000);
    setLoanDuration(12);
  };

  const handleEMIPayment = (loanId: string, emiAmount: number) => {
    if (economics.bankAccount < emiAmount) {
      alert('Insufficient funds for EMI payment');
      return;
    }

    dispatch(repayLoan({ id: loanId, amount: emiAmount }));
    dispatch(updateBankAccount(-emiAmount));
    
    // Update credit score positively for on-time payment
    const newCreditScore = FinancialService.updateCreditScore(economics.creditScore, 'on_time');
    dispatch(updateCreditScore(newCreditScore));

    // Create expense transaction
    const transaction = FinancialService.createTransaction(
      'emi_payment',
      -emiAmount,
      `EMI payment for loan ${loanId}`,
      'loan_repayment'
    );
    dispatch(addExpense(transaction));
  };

  const handleSchemeApplication = (scheme: GovernmentScheme) => {
    const result = FinancialService.processSchemeApplication(scheme.id, {
      landArea: farm.landArea,
      income: economics.bankAccount
    });

    if (result.approved) {
      if (scheme.benefitType === 'direct_payment') {
        const benefit = FinancialService.createGovernmentBenefit(
          scheme.id,
          scheme.name,
          scheme.benefitAmount
        );
        dispatch(addGovernmentBenefit(benefit));
        dispatch(updateBankAccount(scheme.benefitAmount));
        
        const transaction = FinancialService.createTransaction(
          'government_benefit',
          scheme.benefitAmount,
          `${scheme.name} benefit received`,
          'government_scheme'
        );
        dispatch(addIncome(transaction));
      }
      alert(`${scheme.name} application approved! Processing time: ${result.processingTime} days`);
    } else {
      alert(`Application rejected: ${result.reason}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Bank Balance</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(economics.bankAccount)}</p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Credit Score</h3>
          <p className="text-2xl font-bold text-blue-600">{economics.creditScore}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="font-semibold text-red-800">Active Loans</h3>
          <p className="text-2xl font-bold text-red-600">{economics.loans.length}</p>
        </div>
      </div>

      {economics.loans.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Active Loans</h3>
          <div className="space-y-3">
            {economics.loans.map((loan) => (
              <div key={loan.id} className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold capitalize">{loan.type} Loan</h4>
                    <p className="text-sm text-gray-600">
                      Remaining: {formatCurrency(loan.remainingAmount)} | 
                      EMI: {formatCurrency(loan.emiAmount)} | 
                      Rate: {loan.interestRate}%
                    </p>
                    {loan.penalties > 0 && (
                      <p className="text-sm text-red-600">Penalties: {formatCurrency(loan.penalties)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEMIPayment(loan.id, loan.emiAmount)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    disabled={economics.bankAccount < loan.emiAmount}
                  >
                    Pay EMI
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderLoans = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Loan Management</h3>
        <button
          onClick={() => setShowLoanApplication(true)}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Apply for Loan
        </button>
      </div>

      {showLoanApplication && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="text-lg font-semibold mb-4">Loan Application</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold mb-3">Available Offers</h5>
              <div className="space-y-2">
                {availableLoanOffers.map((offer, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedLoanOffer === offer ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedLoanOffer(offer)}
                  >
                    <h6 className="font-semibold capitalize">{offer.type}</h6>
                    <p className="text-sm text-gray-600">
                      Max: {formatCurrency(offer.maxAmount)} | Rate: {offer.interestRate}%
                    </p>
                    <p className="text-xs text-gray-500">
                      Processing: {offer.processingTime} days
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {selectedLoanOffer && (
              <div>
                <h5 className="font-semibold mb-3">Loan Details</h5>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Loan Amount</label>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      max={selectedLoanOffer.maxAmount}
                      min={10000}
                      step={5000}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (months)</label>
                    <input
                      type="number"
                      value={loanDuration}
                      onChange={(e) => setLoanDuration(Number(e.target.value))}
                      max={selectedLoanOffer.maxDurationMonths}
                      min={6}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  {emiCalculation && (
                    <div className="bg-gray-50 p-3 rounded">
                      <h6 className="font-semibold mb-2">EMI Calculation</h6>
                      <p className="text-sm">Monthly EMI: {formatCurrency(emiCalculation.emiAmount)}</p>
                      <p className="text-sm">Total Amount: {formatCurrency(emiCalculation.totalAmount)}</p>
                      <p className="text-sm">Total Interest: {formatCurrency(emiCalculation.totalInterest)}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={handleLoanApplication}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      disabled={!emiCalculation}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setShowLoanApplication(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderSchemes = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Government Schemes</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableSchemes.map((scheme) => (
          <div key={scheme.id} className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-green-700">{scheme.name}</h4>
            <p className="text-sm text-gray-600 mb-2">{scheme.description}</p>
            
            {scheme.benefitAmount > 0 && (
              <p className="text-sm font-semibold text-green-600 mb-2">
                Benefit: {formatCurrency(scheme.benefitAmount)}
              </p>
            )}
            
            <div className="mb-3">
              <h6 className="text-xs font-semibold text-gray-700 mb-1">Eligibility:</h6>
              <ul className="text-xs text-gray-600 list-disc list-inside">
                {scheme.eligibilityRequirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
            
            <button
              onClick={() => handleSchemeApplication(scheme)}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
              disabled={!scheme.isActive}
            >
              Apply Now
            </button>
          </div>
        ))}
      </div>

      {economics.governmentBenefits.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">Received Benefits</h4>
          <div className="space-y-2">
            {economics.governmentBenefits.map((benefit, index) => (
              <div key={index} className="bg-green-50 p-3 rounded border">
                <div className="flex justify-between">
                  <span className="font-medium">{benefit.schemeName}</span>
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(benefit.amount)}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Received: {new Date(benefit.receivedDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-gray-50 p-6 rounded-lg ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Financial Dashboard</h2>
        
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
          {(['overview', 'loans', 'schemes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'loans' && renderLoans()}
      {activeTab === 'schemes' && renderSchemes()}
    </div>
  );
};

export default FinancialDashboard;