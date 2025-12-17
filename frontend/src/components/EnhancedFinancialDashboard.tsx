/**
 * Enhanced Financial Dashboard Component
 * Comprehensive financial tracking with income/expense analysis, loan management, and government schemes
 */

import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { FinancialService, type EMICalculation } from '../services/financialService';

interface EnhancedFinancialDashboardProps {
  className?: string;
}

export const EnhancedFinancialDashboard: React.FC<EnhancedFinancialDashboardProps> = ({ 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'loans' | 'schemes'>('overview');
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'season' | 'year'>('month');
  const [showLoanCalculator, setShowLoanCalculator] = useState(false);

  const gameState = useSelector((state: RootState) => ({
    economics: state.economics,
    farm: state.farm,
    season: state.season
  }));

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    const now = new Date();
    const filterDate = new Date();
    
    switch (timeFilter) {
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'season':
        filterDate.setMonth(now.getMonth() - 4);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredIncome = gameState.economics.income.filter(
      income => new Date(income.date) >= filterDate
    );
    const filteredExpenses = gameState.economics.expenses.filter(
      expense => new Date(expense.date) >= filterDate
    );

    const totalIncome = filteredIncome.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
    const netIncome = totalIncome - totalExpenses;

    const totalLoanAmount = gameState.economics.loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
    const monthlyEMI = gameState.economics.loans.reduce((sum, loan) => sum + loan.emiAmount, 0);

    // Categorize income and expenses
    const incomeByCategory = filteredIncome.reduce((acc, income) => {
      acc[income.category] = (acc[income.category] || 0) + income.amount;
      return acc;
    }, {} as Record<string, number>);

    const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + Math.abs(expense.amount);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      totalLoanAmount,
      monthlyEMI,
      incomeByCategory,
      expensesByCategory,
      cashFlow: totalIncome - totalExpenses - monthlyEMI
    };
  }, [gameState.economics, timeFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getHealthColor = (value: number, type: 'balance' | 'cashflow' | 'credit') => {
    switch (type) {
      case 'balance':
        if (value < 10000) return 'text-red-600';
        if (value < 50000) return 'text-yellow-600';
        return 'text-green-600';
      case 'cashflow':
        if (value < 0) return 'text-red-600';
        if (value < 10000) return 'text-yellow-600';
        return 'text-green-600';
      case 'credit':
        if (value < 600) return 'text-red-600';
        if (value < 750) return 'text-yellow-600';
        return 'text-green-600';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
          <h3 className="text-sm font-medium opacity-90">Bank Balance</h3>
          <p className="text-2xl font-bold">{formatCurrency(gameState.economics.bankAccount)}</p>
          <p className="text-xs opacity-75 mt-1">
            {gameState.economics.bankAccount > 50000 ? 'Healthy' : 'Needs Attention'}
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <h3 className="text-sm font-medium opacity-90">Net Income ({timeFilter})</h3>
          <p className={`text-2xl font-bold ${financialMetrics.netIncome >= 0 ? '' : 'text-red-200'}`}>
            {formatCurrency(financialMetrics.netIncome)}
          </p>
          <p className="text-xs opacity-75 mt-1">
            Income: {formatCurrency(financialMetrics.totalIncome)}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
          <h3 className="text-sm font-medium opacity-90">Credit Score</h3>
          <p className="text-2xl font-bold">{gameState.economics.creditScore}</p>
          <p className="text-xs opacity-75 mt-1">
            {gameState.economics.creditScore >= 750 ? 'Excellent' : 
             gameState.economics.creditScore >= 650 ? 'Good' : 'Needs Improvement'}
          </p>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
          <h3 className="text-sm font-medium opacity-90">Monthly EMI</h3>
          <p className="text-2xl font-bold">{formatCurrency(financialMetrics.monthlyEMI)}</p>
          <p className="text-xs opacity-75 mt-1">
            {gameState.economics.loans.length} active loan{gameState.economics.loans.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Cash Flow Analysis */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Cash Flow Analysis</h3>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="season">Last Season</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatCurrency(financialMetrics.totalIncome)}
            </div>
            <div className="text-sm text-gray-600">Total Income</div>
            <div className="mt-2 space-y-1">
              {Object.entries(financialMetrics.incomeByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between text-xs">
                  <span className="capitalize">{category.replace('_', ' ')}</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {formatCurrency(financialMetrics.totalExpenses)}
            </div>
            <div className="text-sm text-gray-600">Total Expenses</div>
            <div className="mt-2 space-y-1">
              {Object.entries(financialMetrics.expensesByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between text-xs">
                  <span className="capitalize">{category.replace('_', ' ')}</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${getHealthColor(financialMetrics.cashFlow, 'cashflow')}`}>
              {formatCurrency(financialMetrics.cashFlow)}
            </div>
            <div className="text-sm text-gray-600">Available Cash Flow</div>
            <div className="mt-2 text-xs text-gray-500">
              After EMI: {formatCurrency(financialMetrics.netIncome - financialMetrics.monthlyEMI)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowLoanCalculator(true)}
          className="bg-blue-50 border border-blue-200 p-4 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <div className="text-blue-600 text-2xl mb-2">🧮</div>
          <div className="font-semibold text-blue-800">Loan Calculator</div>
          <div className="text-sm text-blue-600">Calculate EMI and compare options</div>
        </button>

        <button
          onClick={() => setActiveTab('schemes')}
          className="bg-green-50 border border-green-200 p-4 rounded-lg hover:bg-green-100 transition-colors"
        >
          <div className="text-green-600 text-2xl mb-2">🏛️</div>
          <div className="font-semibold text-green-800">Government Schemes</div>
          <div className="text-sm text-green-600">Explore available benefits</div>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className="bg-orange-50 border border-orange-200 p-4 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <div className="text-orange-600 text-2xl mb-2">💳</div>
          <div className="font-semibold text-orange-800">Manage Loans</div>
          <div className="text-sm text-orange-600">View and pay EMIs</div>
        </button>
      </div>
    </div>
  );

  const renderIncomeAnalysis = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Income Analysis</h3>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as any)}
          className="px-3 py-1 border rounded"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="season">Last Season</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h4 className="font-semibold">Income by Category</h4>
        </div>
        <div className="p-4">
          {Object.entries(financialMetrics.incomeByCategory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(financialMetrics.incomeByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => {
                  const percentage = (amount / financialMetrics.totalIncome) * 100;
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="capitalize font-medium">{category.replace('_', ' ')}</span>
                          <span className="font-semibold">{formatCurrency(amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of total income</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No income recorded for the selected period
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h4 className="font-semibold">Recent Income Transactions</h4>
        </div>
        <div className="divide-y">
          {gameState.economics.income.slice(-10).reverse().map((income) => (
            <div key={income.id} className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">{income.description}</div>
                <div className="text-sm text-gray-500">
                  {new Date(income.date).toLocaleDateString()} • {income.category.replace('_', ' ')}
                </div>
              </div>
              <div className="text-green-600 font-semibold">
                +{formatCurrency(income.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderExpenseAnalysis = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Expense Analysis</h3>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as any)}
          className="px-3 py-1 border rounded"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="season">Last Season</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h4 className="font-semibold">Expenses by Category</h4>
        </div>
        <div className="p-4">
          {Object.entries(financialMetrics.expensesByCategory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(financialMetrics.expensesByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => {
                  const percentage = (amount / financialMetrics.totalExpenses) * 100;
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="capitalize font-medium">{category.replace('_', ' ')}</span>
                          <span className="font-semibold">{formatCurrency(amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of total expenses</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No expenses recorded for the selected period
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h4 className="font-semibold">Recent Expense Transactions</h4>
        </div>
        <div className="divide-y">
          {gameState.economics.expenses.slice(-10).reverse().map((expense) => (
            <div key={expense.id} className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">{expense.description}</div>
                <div className="text-sm text-gray-500">
                  {new Date(expense.date).toLocaleDateString()} • {expense.category.replace('_', ' ')}
                </div>
              </div>
              <div className="text-red-600 font-semibold">
                -{formatCurrency(Math.abs(expense.amount))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 rounded-lg ${className}`}>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Financial Dashboard</h2>
          
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
            {(['overview', 'income', 'expenses', 'loans', 'schemes'] as const).map((tab) => (
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
        {activeTab === 'income' && renderIncomeAnalysis()}
        {activeTab === 'expenses' && renderExpenseAnalysis()}
        {activeTab === 'loans' && <div className="p-8 text-center text-gray-500">Loan management coming soon...</div>}
        {activeTab === 'schemes' && <div className="p-8 text-center text-gray-500">Government schemes integration coming soon...</div>}
      </div>

      {/* Loan Calculator Modal */}
      {showLoanCalculator && (
        <LoanCalculatorModal onClose={() => setShowLoanCalculator(false)} />
      )}
    </div>
  );
};

// Loan Calculator Modal Component
interface LoanCalculatorModalProps {
  onClose: () => void;
}

const LoanCalculatorModal: React.FC<LoanCalculatorModalProps> = ({ onClose }) => {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [interestRate, setInterestRate] = useState(7);
  const [duration, setDuration] = useState(12);
  const [calculation, setCalculation] = useState<EMICalculation | null>(null);

  React.useEffect(() => {
    try {
      const calc = FinancialService.generateEMISchedule(loanAmount, interestRate, duration);
      setCalculation(calc);
    } catch (error) {
      setCalculation(null);
    }
  }, [loanAmount, interestRate, duration]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Loan Calculator</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loan Amount</label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full p-2 border rounded"
                min="10000"
                max="1000000"
                step="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full p-2 border rounded"
                min="1"
                max="36"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (months)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full p-2 border rounded"
                min="6"
                max="240"
              />
            </div>

            {calculation && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Calculation Results</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monthly EMI:</span>
                    <span className="font-semibold">{formatCurrency(calculation.emiAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-semibold">{formatCurrency(calculation.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Interest:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(calculation.totalInterest)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFinancialDashboard;