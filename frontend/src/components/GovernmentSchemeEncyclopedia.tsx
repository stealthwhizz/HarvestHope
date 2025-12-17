/**
 * Government Scheme Encyclopedia Component
 * Comprehensive searchable database of government schemes with detailed information
 */

import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { GovernmentSchemeService, type GovernmentScheme, type EligibilityResult } from '../services/governmentSchemeService';

interface GovernmentSchemeEncyclopediaProps {
  className?: string;
  onSchemeSelect?: (scheme: GovernmentScheme) => void;
  onApplyForScheme?: (schemeId: string) => void;
}

export const GovernmentSchemeEncyclopedia: React.FC<GovernmentSchemeEncyclopediaProps> = ({
  className = '',
  onSchemeSelect,
  onApplyForScheme
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedScheme, setSelectedScheme] = useState<GovernmentScheme | null>(null);
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'eligibility' | 'benefit' | 'launch_year'>('eligibility');

  const gameState = useSelector((state: RootState) => ({
    farm: state.farm,
    economics: state.economics
  }));

  // Get all schemes and calculate eligibility
  const allSchemes = GovernmentSchemeService.getAllSchemes();
  const schemeEligibility = useMemo(() => {
    const eligibilityMap = new Map<string, EligibilityResult>();
    allSchemes.forEach(scheme => {
      try {
        const eligibility = GovernmentSchemeService.checkEligibility(
          scheme.id, 
          gameState.farm, 
          gameState.economics
        );
        eligibilityMap.set(scheme.id, eligibility);
      } catch (error) {
        console.error(`Error checking eligibility for ${scheme.id}:`, error);
      }
    });
    return eligibilityMap;
  }, [allSchemes, gameState.farm, gameState.economics]);

  // Filter and sort schemes
  const filteredSchemes = useMemo(() => {
    let filtered = allSchemes.filter(scheme => {
      const matchesSearch = searchTerm === '' || 
        scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scheme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scheme.shortName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || scheme.category === selectedCategory;
      
      const eligibility = schemeEligibility.get(scheme.id);
      const matchesEligibility = !showEligibleOnly || (eligibility?.isEligible || false);
      
      return matchesSearch && matchesCategory && matchesEligibility;
    });

    // Sort schemes
    filtered.sort((a, b) => {
      const aEligibility = schemeEligibility.get(a.id);
      const bEligibility = schemeEligibility.get(b.id);
      
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'eligibility':
          return (bEligibility?.eligibilityScore || 0) - (aEligibility?.eligibilityScore || 0);
        case 'benefit':
          return (bEligibility?.estimatedBenefit || 0) - (aEligibility?.estimatedBenefit || 0);
        case 'launch_year':
          return b.launchYear - a.launchYear;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allSchemes, searchTerm, selectedCategory, showEligibleOnly, sortBy, schemeEligibility]);

  const categories = [
    { value: 'all', label: 'All Categories', icon: '📋' },
    { value: 'income_support', label: 'Income Support', icon: '💰' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'credit', label: 'Credit & Loans', icon: '🏦' },
    { value: 'subsidy', label: 'Subsidies', icon: '💸' },
    { value: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
    { value: 'technology', label: 'Technology', icon: '💻' }
  ];

  const handleSchemeClick = (scheme: GovernmentScheme) => {
    setSelectedScheme(scheme);
    onSchemeSelect?.(scheme);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getEligibilityBadge = (scheme: GovernmentScheme) => {
    const eligibility = schemeEligibility.get(scheme.id);
    if (!eligibility) return null;

    if (eligibility.isEligible) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Eligible
        </span>
      );
    } else if (eligibility.eligibilityScore >= 60) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⚠ Partially Eligible
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ✗ Not Eligible
        </span>
      );
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || '📄';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Government Scheme Encyclopedia</h1>
          <p className="text-gray-600">
            Discover and learn about government schemes that can support your farming journey
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search schemes by name, description, or benefits..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
              </div>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="eligibility">Sort by Eligibility</option>
              <option value="benefit">Sort by Benefit Amount</option>
              <option value="name">Sort by Name</option>
              <option value="launch_year">Sort by Launch Year</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showEligibleOnly}
                  onChange={(e) => setShowEligibleOnly(e.target.checked)}
                  className="mr-2 rounded"
                />
                <span className="text-sm text-gray-700">Show only eligible schemes</span>
              </label>
            </div>
            
            <div className="text-sm text-gray-500">
              Showing {filteredSchemes.length} of {allSchemes.length} schemes
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scheme List */}
          <div className="lg:col-span-2">
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredSchemes.map(scheme => {
                const eligibility = schemeEligibility.get(scheme.id);
                return (
                  <div
                    key={scheme.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedScheme?.id === scheme.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSchemeClick(scheme)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getCategoryIcon(scheme.category)}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{scheme.name}</h3>
                          <p className="text-sm text-gray-500">{scheme.shortName}</p>
                        </div>
                      </div>
                      {getEligibilityBadge(scheme)}
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">{scheme.description}</p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500 capitalize">
                          {scheme.category.replace('_', ' ')}
                        </span>
                        <span className="text-gray-500">
                          Since {scheme.launchYear}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {eligibility?.estimatedBenefit && (
                          <span className="font-semibold text-green-600">
                            {formatCurrency(eligibility.estimatedBenefit)}
                          </span>
                        )}
                        <span className="text-blue-600">
                          {eligibility?.eligibilityScore || 0}% match
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSchemes.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No schemes found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or filters to find relevant schemes.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Scheme Details */}
          <div className="lg:col-span-1">
            {selectedScheme ? (
              <SchemeDetailPanel
                scheme={selectedScheme}
                eligibility={schemeEligibility.get(selectedScheme.id)}
                onApply={() => onApplyForScheme?.(selectedScheme.id)}
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Scheme</h3>
                <p className="text-gray-600">
                  Click on any scheme from the list to view detailed information, eligibility requirements, and application process.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Scheme Detail Panel Component
interface SchemeDetailPanelProps {
  scheme: GovernmentScheme;
  eligibility?: EligibilityResult;
  onApply: () => void;
}

const SchemeDetailPanel: React.FC<SchemeDetailPanelProps> = ({
  scheme,
  eligibility,
  onApply
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'eligibility' | 'process' | 'education'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📄' },
    { id: 'eligibility', label: 'Eligibility', icon: '✓' },
    { id: 'process', label: 'Process', icon: '📋' },
    { id: 'education', label: 'Learn', icon: '📚' }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg sticky top-4">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{scheme.name}</h3>
        <p className="text-sm text-gray-500">{scheme.shortName}</p>
        
        {eligibility && (
          <div className="mt-3">
            {eligibility.isEligible ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm font-medium text-green-800">You are eligible!</span>
                </div>
                {eligibility.estimatedBenefit && (
                  <p className="text-sm text-green-700 mt-1">
                    Estimated benefit: {formatCurrency(eligibility.estimatedBenefit)}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-red-600">✗</span>
                  <span className="text-sm font-medium text-red-800">Not currently eligible</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  Eligibility score: {eligibility.eligibilityScore}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-3 py-2 text-sm font-medium text-center ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{scheme.detailedDescription}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Benefits</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium capitalize">{scheme.benefitDetails.type.replace('_', ' ')}</span>
                  </div>
                  {scheme.benefitDetails.amount && (
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium text-green-600">{formatCurrency(scheme.benefitDetails.amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Frequency:</span>
                    <span className="font-medium capitalize">{scheme.benefitDetails.frequency.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {scheme.successStories && scheme.successStories.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Success Story</h4>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-sm">
                    <p className="font-medium text-green-800">{scheme.successStories[0].farmerName}</p>
                    <p className="text-green-700 italic mb-2">"{scheme.successStories[0].quote}"</p>
                    <p className="text-green-600">{scheme.successStories[0].impact}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'eligibility' && eligibility && (
          <div className="space-y-4">
            {eligibility.metRequirements.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-700 mb-2">✓ Requirements Met</h4>
                <ul className="space-y-1">
                  {eligibility.metRequirements.map((req, index) => (
                    <li key={index} className="text-sm text-green-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{req.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {eligibility.unmetRequirements.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">✗ Requirements Not Met</h4>
                <ul className="space-y-1">
                  {eligibility.unmetRequirements.map((req, index) => (
                    <li key={index} className="text-sm text-red-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{req.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {eligibility.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">💡 Recommendations</h4>
                <ul className="space-y-1">
                  {eligibility.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'process' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Application Steps</h4>
              <div className="space-y-3">
                {scheme.applicationProcess.map((step, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4">
                    <h5 className="font-medium text-gray-800">
                      Step {step.stepNumber}: {step.title}
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    <div className="text-xs text-gray-500 mt-2 space-x-4">
                      <span>⏱️ {step.timeRequired}</span>
                      <span>📍 {step.location}</span>
                      {step.cost > 0 && <span>💰 ₹{step.cost}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Required Documents</h4>
              <ul className="space-y-1">
                {scheme.documents.map((doc, index) => (
                  <li key={index} className={`text-sm flex items-start ${doc.isOptional ? 'text-gray-500' : 'text-gray-700'}`}>
                    <span className="mr-2">{doc.isOptional ? '○' : '●'}</span>
                    <div>
                      <span className="font-medium">{doc.name}</span>
                      {doc.isOptional && <span className="text-gray-400"> (Optional)</span>}
                      <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'education' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What Problem Does This Solve?</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{scheme.educationalContent.problemItSolves}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Real-World Impact</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{scheme.educationalContent.realWorldImpact}</p>
            </div>

            {scheme.educationalContent.tips.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-700 mb-2">💡 Pro Tips</h4>
                <ul className="space-y-1">
                  {scheme.educationalContent.tips.map((tip, index) => (
                    <li key={index} className="text-sm text-green-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scheme.educationalContent.commonMistakes.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">⚠️ Common Mistakes</h4>
                <ul className="space-y-1">
                  {scheme.educationalContent.commonMistakes.map((mistake, index) => (
                    <li key={index} className="text-sm text-red-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onApply}
          disabled={!eligibility?.isEligible}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            eligibility?.isEligible
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {eligibility?.isEligible ? 'Apply for This Scheme' : 'Not Eligible to Apply'}
        </button>
      </div>
    </div>
  );
};

export default GovernmentSchemeEncyclopedia;