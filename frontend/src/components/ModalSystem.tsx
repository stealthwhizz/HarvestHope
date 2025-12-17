/**
 * Modal System Component
 * Centralized modal management for events, decisions, and scheme information
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import EventDialog from './EventDialog';
import { GovernmentSchemeEducation } from './GovernmentSchemeEducation';
import FinancialDashboard from './FinancialDashboard';
import { resolveEvent } from '../store/slices/eventSlice';
import { EventService } from '../services/eventService';

export type ModalType = 
  | 'none'
  | 'event'
  | 'financial_dashboard'
  | 'scheme_encyclopedia'
  | 'scheme_details'
  | 'decision_confirmation'
  | 'game_menu';

interface ModalSystemProps {
  activeModal: ModalType;
  onCloseModal: () => void;
  onOpenModal: (modal: ModalType) => void;
}

export const ModalSystem: React.FC<ModalSystemProps> = ({
  activeModal,
  onCloseModal,
  onOpenModal
}) => {
  const dispatch = useDispatch();
  const [isResolving, setIsResolving] = useState(false);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  const gameState = useSelector((state: RootState) => ({
    events: state.events,
    economics: state.economics,
    farm: state.farm,
    player: state.player
  }));

  // Get the current active event
  const currentEvent = gameState.events.activeEvents[0] || null;

  // Handle event choice selection
  const handleEventChoice = async (choiceId: string) => {
    if (!currentEvent || isResolving) return;

    setIsResolving(true);
    try {
      const resolution = await EventService.resolveEvent(currentEvent.id, choiceId);
      dispatch(resolveEvent(resolution));
      
      // Keep modal open to show consequences
      setTimeout(() => {
        setIsResolving(false);
      }, 1000);
    } catch (error) {
      console.error('Error resolving event:', error);
      setIsResolving(false);
    }
  };

  // Handle scheme application from encyclopedia
  const handleSchemeApplication = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    // Could trigger a confirmation modal or direct application
  };

  // Confirmation dialog helper
  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setConfirmationData({
      title,
      message,
      onConfirm,
      onCancel: onCancel || onCloseModal
    });
    onOpenModal('decision_confirmation');
  };

  // Auto-open event modal when new events arrive
  useEffect(() => {
    if (currentEvent && activeModal === 'none') {
      onOpenModal('event');
    }
  }, [currentEvent, activeModal, onOpenModal]);

  const renderModal = () => {
    switch (activeModal) {
      case 'event':
        return (
          <EventDialog
            event={currentEvent}
            isOpen={true}
            onClose={onCloseModal}
            onChoiceSelect={handleEventChoice}
            isResolving={isResolving}
            playerMoney={gameState.economics.bankAccount}
            consequences={gameState.events.pendingConsequences[0] || null}
          />
        );

      case 'financial_dashboard':
        return (
          <ModalWrapper title="Financial Dashboard" onClose={onCloseModal}>
            <FinancialDashboard className="max-h-[80vh] overflow-y-auto" />
          </ModalWrapper>
        );

      case 'scheme_encyclopedia':
        return (
          <ModalWrapper title="Government Scheme Encyclopedia" onClose={onCloseModal} size="large">
            <GovernmentSchemeEducation
              context="general"
              onSchemeApply={handleSchemeApplication}
            />
          </ModalWrapper>
        );

      case 'decision_confirmation':
        return confirmationData ? (
          <ConfirmationDialog
            title={confirmationData.title}
            message={confirmationData.message}
            onConfirm={() => {
              confirmationData.onConfirm();
              onCloseModal();
            }}
            onCancel={() => {
              confirmationData.onCancel();
              onCloseModal();
            }}
          />
        ) : null;

      case 'game_menu':
        return (
          <GameMenuModal
            onClose={onCloseModal}
            onOpenFinancialDashboard={() => onOpenModal('financial_dashboard')}
            onOpenSchemeEncyclopedia={() => onOpenModal('scheme_encyclopedia')}
          />
        );

      default:
        return null;
    }
  };

  if (activeModal === 'none') return null;

  return (
    <div className="fixed inset-0 z-50">
      {renderModal()}
    </div>
  );
};

// Modal Wrapper Component
interface ModalWrapperProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'small' | 'medium' | 'large' | 'full';
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  title,
  children,
  onClose,
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-6xl',
    full: 'max-w-full mx-4'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Confirmation Dialog Component
interface ConfirmationDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info'
}) => {
  const typeStyles = {
    info: 'text-blue-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };

  const buttonStyles = {
    info: 'bg-blue-600 hover:bg-blue-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    danger: 'bg-red-600 hover:bg-red-700'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${typeStyles[type]}`}>
            {title}
          </h3>
          <p className="text-gray-700 mb-6 leading-relaxed">
            {message}
          </p>
          <div className="flex space-x-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${buttonStyles[type]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Game Menu Modal Component
interface GameMenuModalProps {
  onClose: () => void;
  onOpenFinancialDashboard: () => void;
  onOpenSchemeEncyclopedia: () => void;
}

const GameMenuModal: React.FC<GameMenuModalProps> = ({
  onClose,
  onOpenFinancialDashboard,
  onOpenSchemeEncyclopedia
}) => {
  const gameState = useSelector((state: RootState) => ({
    player: state.player,
    season: state.season,
    stats: state.stats
  }));

  const menuItems = [
    {
      icon: '💰',
      title: 'Financial Dashboard',
      description: 'Manage loans, track expenses, and view financial health',
      action: onOpenFinancialDashboard
    },
    {
      icon: '🏛️',
      title: 'Government Schemes',
      description: 'Learn about and apply for government support programs',
      action: onOpenSchemeEncyclopedia
    },
    {
      icon: '📊',
      title: 'Farm Statistics',
      description: 'View your farming progress and achievements',
      action: () => console.log('Stats not implemented yet')
    },
    {
      icon: '⚙️',
      title: 'Settings',
      description: 'Game settings and preferences',
      action: () => console.log('Settings not implemented yet')
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Game Menu</h2>
              <p className="text-gray-600">
                {gameState.player.name} • {gameState.season.current} Season, Day {gameState.season.day}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
              <div>
                <p className="font-semibold text-gray-800">{gameState.stats.seasonsCompleted}</p>
                <p>Seasons Completed</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{gameState.stats.cropsHarvested}</p>
                <p>Crops Harvested</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  ₹{Math.round(gameState.stats.totalIncome).toLocaleString()}
                </p>
                <p>Total Income</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalSystem;