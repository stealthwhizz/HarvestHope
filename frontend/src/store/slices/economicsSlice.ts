/**
 * Redux slice for economics data management
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { EconomicsData, LoanData, TransactionData, GovernmentBenefitData } from '../../../../shared/types/game-state';

const initialState: EconomicsData = {
  bankAccount: 50000, // Starting bank balance
  loans: [],
  income: [],
  expenses: [],
  creditScore: 750, // Starting credit score
  governmentBenefits: [],
};

const economicsSlice = createSlice({
  name: 'economics',
  initialState,
  reducers: {
    setEconomicsData: (_state, action: PayloadAction<EconomicsData>) => {
      return action.payload;
    },
    updateBankAccount: (state, action: PayloadAction<number>) => {
      state.bankAccount += action.payload;
    },
    setBankAccount: (state, action: PayloadAction<number>) => {
      state.bankAccount = action.payload;
    },
    addLoan: (state, action: PayloadAction<LoanData>) => {
      state.loans.push(action.payload);
    },
    updateLoan: (state, action: PayloadAction<{ id: string; updates: Partial<LoanData> }>) => {
      const loanIndex = state.loans.findIndex(loan => loan.id === action.payload.id);
      if (loanIndex !== -1) {
        state.loans[loanIndex] = { ...state.loans[loanIndex], ...action.payload.updates };
      }
    },
    repayLoan: (state, action: PayloadAction<{ id: string; amount: number }>) => {
      const loanIndex = state.loans.findIndex(loan => loan.id === action.payload.id);
      if (loanIndex !== -1) {
        state.loans[loanIndex].remainingAmount -= action.payload.amount;
        if (state.loans[loanIndex].remainingAmount <= 0) {
          state.loans.splice(loanIndex, 1);
        }
      }
    },
    addIncome: (state, action: PayloadAction<TransactionData>) => {
      state.income.push(action.payload);
    },
    addExpense: (state, action: PayloadAction<TransactionData>) => {
      state.expenses.push(action.payload);
    },
    updateCreditScore: (state, action: PayloadAction<number>) => {
      state.creditScore = Math.max(300, Math.min(850, action.payload)); // Keep within valid range
    },
    addGovernmentBenefit: (state, action: PayloadAction<GovernmentBenefitData>) => {
      state.governmentBenefits.push(action.payload);
    },
    resetEconomics: () => initialState,
  },
});

export const {
  setEconomicsData,
  updateBankAccount,
  setBankAccount,
  addLoan,
  updateLoan,
  repayLoan,
  addIncome,
  addExpense,
  updateCreditScore,
  addGovernmentBenefit,
  resetEconomics,
} = economicsSlice.actions;

export const economicsReducer = economicsSlice.reducer;