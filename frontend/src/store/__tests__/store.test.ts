/**
 * Tests for Redux store configuration
 */

import { store } from '../index';
import { updateMoney, plantCrop } from '../slices/farmSlice';
import { addLoan } from '../slices/economicsSlice';
import { advanceDay } from '../slices/seasonSlice';

describe('Redux Store', () => {
  test('should have initial state', () => {
    const state = store.getState();
    
    expect(state.player.id).toBe('');
    expect(state.farm.money).toBe(50000);
    expect(state.farm.season).toBe('Kharif');
    expect(state.economics.bankAccount).toBe(50000);
    expect(state.season.current).toBe('Kharif');
    expect(state.season.day).toBe(1);
    expect(state.npcs).toEqual([]);
  });

  test('should update farm money', () => {
    const initialMoney = store.getState().farm.money;
    
    store.dispatch(updateMoney(10000));
    
    const newMoney = store.getState().farm.money;
    expect(newMoney).toBe(initialMoney + 10000);
  });

  test('should plant crops', () => {
    const initialCropsCount = store.getState().farm.crops.length;
    
    const newCrop = {
      id: 'test-crop-1',
      type: 'wheat',
      plantedDate: 1,
      growthStage: 'seedling' as const,
      health: 100,
      expectedYield: 500,
      area: 0.5,
    };
    
    store.dispatch(plantCrop(newCrop));
    
    const newCropsCount = store.getState().farm.crops.length;
    expect(newCropsCount).toBe(initialCropsCount + 1);
    
    const addedCrop = store.getState().farm.crops.find(crop => crop.id === 'test-crop-1');
    expect(addedCrop).toBeDefined();
    expect(addedCrop?.type).toBe('wheat');
  });

  test('should add loans', () => {
    const initialLoansCount = store.getState().economics.loans.length;
    
    const newLoan = {
      id: 'test-loan-1',
      type: 'bank' as const,
      principal: 50000,
      interestRate: 7,
      emiAmount: 2500,
      remainingAmount: 50000,
      dueDate: new Date().toISOString(),
      penalties: 0,
    };
    
    store.dispatch(addLoan(newLoan));
    
    const newLoansCount = store.getState().economics.loans.length;
    expect(newLoansCount).toBe(initialLoansCount + 1);
    
    const addedLoan = store.getState().economics.loans.find(loan => loan.id === 'test-loan-1');
    expect(addedLoan).toBeDefined();
    expect(addedLoan?.principal).toBe(50000);
  });

  test('should advance season day', () => {
    const initialDay = store.getState().season.day;
    const initialDaysRemaining = store.getState().season.daysRemaining;
    
    store.dispatch(advanceDay());
    
    const newDay = store.getState().season.day;
    const newDaysRemaining = store.getState().season.daysRemaining;
    
    expect(newDay).toBe(initialDay + 1);
    expect(newDaysRemaining).toBe(initialDaysRemaining - 1);
  });

  test('should advance to next season when days remaining reaches 0', () => {
    // Reset to known state by setting season data
    // Note: Using advanceDay which is already imported instead of setSeason
    
    const initialSeason = store.getState().season.current;
    const initialDaysRemaining = store.getState().season.daysRemaining;
    
    // Advance exactly the remaining days plus one more to trigger season change
    // We need to advance through all remaining days to reach day 120, then one more to transition
    for (let i = 0; i <= initialDaysRemaining; i++) {
      store.dispatch(advanceDay());
    }
    
    const newSeason = store.getState().season.current;
    const newDay = store.getState().season.day;
    const newDaysRemaining = store.getState().season.daysRemaining;
    
    expect(newSeason).not.toBe(initialSeason);
    expect(newSeason).toBe('Rabi'); // Kharif should advance to Rabi
    expect(newDay).toBe(1); // Should reset to day 1 of new season
    expect(newDaysRemaining).toBe(119); // Should reset to 119 days remaining
  });
});