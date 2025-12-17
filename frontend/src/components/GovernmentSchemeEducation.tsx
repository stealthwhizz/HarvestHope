/**
 * Government Scheme Education Component
 * Provides comprehensive information about government schemes, eligibility checking, and educational content
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { addGovernmentBenefit, addIncome } from '../store/slices/economicsSlice';
import { GovernmentSchemeService, type GovernmentScheme, type EligibilityResult, type SchemeApplication } from '../services/governmentSchemeService';

interface GovernmentSchemeEducationProps {
  context?: 'financial_crisis' | 'crop_loss' | 'low_income' | 'debt_burden' | 'general';
  onSchemeApply?: (schemeId: string) => void;
}

export const GovernmentSchemeEducation: React.FC<GovernmentSchemeEducationProps> = ({
  context = 'general',
  onSchemeApply
}) => {
  const dispatch = useDispatch();
  const farmData = useSelector((state: RootState) => state.farm);
  const economicsData = useSelector((state: RootState) => state.economics);
  
  const [selectedScheme, setSelectedScheme] = useState<GovernmentScheme | null>(null);
  const [eligibilityResults, setEligibilityResults] = useState<Map<string, EligibilityResult>>(new Map());
  const [applications, setApplications] = useState<SchemeApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);

  // Get educational content based on context
  const educationalContent = GovernmentSchemeService.getEducationalContent(context);
  
  // Get all schemes and filter based on user preferences
  const allSchemes = GovernmentSchemeService.getAllSchemes();
  const filteredSchemes = allSchemes.filter(scheme => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scheme.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || scheme.category === selectedCategory;
    const matchesEligibility = !showEligibleOnly || eligibilityResults.get(scheme.id)?.isEligible;
    
    return matchesSearch && matchesCategory && matchesEligibility;
  });

  // Calculate eligibility for all schemes
  useEffect(() => {
    const results = new Map<string, EligibilityResult>();
    allSchemes.forEach(scheme => {
      try {
        const eligibility = GovernmentSchemeService.checkEligibility(scheme.id, farmData, economicsData);
        results.set(scheme.id, eligibility);
      } catch (error) {
        console.error(`Error checking eligibility for ${scheme.id}:`, error);
      }
    });
    setEligibilityResults(results);
  }, [farmData, economicsData, allSchemes]);

  const handleSchemeSelect = (scheme: GovernmentScheme) => {
    setSelectedScheme(scheme);
  };

  const handleApplyForScheme = (schemeId: string) => {
    try {
      const scheme = allSchemes.find(s => s.id === schemeId);
      if (!scheme) return;

      const application = GovernmentSchemeService.processSchemeApplication(
        schemeId,
        farmData,
        economicsData,
        [] // No documents provided initially
      );
      setApplications(prev => [...prev, application]);

      // For demo purposes, simulate immediate approval for eligible schemes
      const eligibility = eligibilityResults.get(schemeId);
      if (eligibility?.isEligible && eligibility.estimatedBenefit) {
        // Add government benefit to economics
        const benefit = {
          schemeId: scheme.id,
          schemeName: scheme.name,
          amount: eligibility.estimatedBenefit,
          receivedDate: new Date().toISOString(),
          eligibilityStatus: 'approved'
        };
        dispatch(addGovernmentBenefit(benefit));

        // Add as income transaction
        const incomeTransaction = {
          id: `gov_benefit_${Date.now()}`,
          type: 'government_benefit',
          amount: eligibility.estimatedBenefit,
          date: new Date().toISOString(),
          description: `${scheme.name} benefit received`,
          category: 'government_support'
        };
        dispatch(addIncome(incomeTransaction));

        // Show success message (in a real app, this would be a toast notification)
        alert(`Successfully applied for ${scheme.name}! Benefit of ₹${eligibility.estimatedBenefit.toLocaleString()} has been credited to your account.`);
      }

      onSchemeApply?.(schemeId);
    } catch (error) {
      console.error('Error applying for scheme:', error);
      alert('Error applying for scheme. Please try again.');
    }
  };

  const getEligibilityBadge = (schemeId: string) => {
    const result = eligibilityResults.get(schemeId);
    if (!result) return null;

    if (result.isEligible) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Eligible</span>;
    } else if (result.eligibilityScore >= 60) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Partially Eligible</span>;
    } else {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Not Eligible</span>;
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'income_support', label: 'Income Support' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'credit', label: 'Credit' },
    { value: 'subsidy', label: 'Subsidies' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'technology', label: 'Technology' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Government Scheme Education</h1>
        <p className="text-gray-600">Learn about and apply for government schemes that can support your farming journey</p>
      </div>

      {/* Educational Context */}
      {context !== 'general' && (
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Relevant Support for Your Situation</h2>
          <p className="text-blue-800 mb-3">{educationalContent.educationalMessage}</p>
          <div className="space-y-1">
            <h3 className="font-medium text-blue-900">Recommended Actions:</h3>
            {educationalContent.actionItems.map((action, index) => (
              <div key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span className="text-blue-800">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search schemes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="eligible-only"
            checked={showEligibleOnly}
            onChange={(e) => setShowEligibleOnly(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="eligible-only" className="text-gray-700">Show only eligible schemes</label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheme List */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {filteredSchemes.map(scheme => {
              const eligibility = eligibilityResults.get(scheme.id);
              return (
                <div
                  key={scheme.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedScheme?.id === scheme.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSchemeSelect(scheme)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{scheme.name}</h3>
                    {getEligibilityBadge(scheme.id)}
                  </div>
                  <p className="text-gray-600 mb-2">{scheme.description}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 capitalize">{scheme.category.replace('_', ' ')}</span>
                    {eligibility && (
                      <span className="text-blue-600">
                        Eligibility Score: {eligibility.eligibilityScore}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scheme Details */}
        <div className="lg:col-span-1">
          {selectedScheme ? (
            <SchemeDetails
              scheme={selectedScheme}
              eligibility={eligibilityResults.get(selectedScheme.id)}
              onApply={() => handleApplyForScheme(selectedScheme.id)}
              applications={applications.filter(app => app.schemeId === selectedScheme.id)}
            />
          ) : (
            <div className="p-6 border border-gray-200 rounded-lg text-center text-gray-500">
              Select a scheme to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Scheme Details Component
interface SchemeDetailsProps {
  scheme: GovernmentScheme;
  eligibility?: EligibilityResult;
  onApply: () => void;
  applications: SchemeApplication[];
}

const SchemeDetails: React.FC<SchemeDetailsProps> = ({ scheme, eligibility, onApply, applications }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'eligibility' | 'application' | 'education'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'application', label: 'Application' },
    { id: 'education', label: 'Learn More' }
  ];

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">{scheme.name}</h3>
            <p className="text-gray-600">{scheme.detailedDescription}</p>
            
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-semibold mb-2">Benefits</h4>
              <div className="text-sm space-y-1">
                <p><strong>Type:</strong> {scheme.benefitDetails.type.replace('_', ' ')}</p>
                {scheme.benefitDetails.amount && (
                  <p><strong>Amount:</strong> ₹{scheme.benefitDetails.amount.toLocaleString()}</p>
                )}
                <p><strong>Frequency:</strong> {scheme.benefitDetails.frequency.replace('_', ' ')}</p>
              </div>
            </div>

            {scheme.successStories && scheme.successStories.length > 0 && (
              <div className="bg-green-50 p-3 rounded">
                <h4 className="font-semibold mb-2">Success Story</h4>
                <div className="text-sm">
                  <p className="font-medium">{scheme.successStories[0].farmerName} - {scheme.successStories[0].location}</p>
                  <p className="text-gray-600 italic">"{scheme.successStories[0].quote}"</p>
                  <p className="mt-2">{scheme.successStories[0].impact}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'eligibility' && eligibility && (
          <div className="space-y-4">
            <div className={`p-3 rounded ${eligibility.isEligible ? 'bg-green-50' : 'bg-red-50'}`}>
              <h4 className="font-semibold">
                {eligibility.isEligible ? 'You are eligible!' : 'Not currently eligible'}
              </h4>
              <p className="text-sm">Eligibility Score: {eligibility.eligibilityScore}%</p>
            </div>

            {eligibility.metRequirements.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-700 mb-2">✓ Requirements Met</h4>
                <ul className="space-y-1 text-sm">
                  {eligibility.metRequirements.map((req, index) => (
                    <li key={index} className="text-green-600">• {req.description}</li>
                  ))}
                </ul>
              </div>
            )}

            {eligibility.unmetRequirements.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">✗ Requirements Not Met</h4>
                <ul className="space-y-1 text-sm">
                  {eligibility.unmetRequirements.map((req, index) => (
                    <li key={index} className="text-red-600">• {req.description}</li>
                  ))}
                </ul>
              </div>
            )}

            {eligibility.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Recommendations</h4>
                <ul className="space-y-1 text-sm">
                  {eligibility.recommendations.map((rec, index) => (
                    <li key={index} className="text-blue-600">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {eligibility.estimatedBenefit && (
              <div className="bg-blue-50 p-3 rounded">
                <h4 className="font-semibold">Estimated Benefit</h4>
                <p className="text-lg font-bold text-blue-600">₹{eligibility.estimatedBenefit.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'application' && (
          <div className="space-y-4">
            <h4 className="font-semibold">Application Process</h4>
            <div className="space-y-3">
              {scheme.applicationProcess.map((step, index) => (
                <div key={index} className="border-l-4 border-blue-200 pl-4">
                  <h5 className="font-medium">Step {step.stepNumber}: {step.title}</h5>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>Time: {step.timeRequired}</span> | <span>Location: {step.location}</span>
                    {step.cost > 0 && <span> | Cost: ₹{step.cost}</span>}
                  </div>
                  {step.tips.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-blue-600">Tips:</p>
                      <ul className="text-xs text-blue-600">
                        {step.tips.map((tip, tipIndex) => (
                          <li key={tipIndex}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h5 className="font-medium mb-2">Required Documents</h5>
              <ul className="space-y-1 text-sm">
                {scheme.documents.map((doc, index) => (
                  <li key={index} className={doc.isOptional ? 'text-gray-500' : 'text-gray-700'}>
                    • {doc.name} {doc.isOptional && '(Optional)'}
                    <p className="text-xs text-gray-500 ml-2">{doc.description}</p>
                  </li>
                ))}
              </ul>
            </div>

            {applications.length > 0 ? (
              <div className="bg-yellow-50 p-3 rounded">
                <h5 className="font-medium">Your Application Status</h5>
                {applications.map(app => (
                  <div key={app.applicationId} className="text-sm mt-2">
                    <p><strong>Application ID:</strong> {app.applicationId}</p>
                    <p><strong>Status:</strong> {app.status.replace('_', ' ')}</p>
                    {app.submittedDate && (
                      <p><strong>Submitted:</strong> {new Date(app.submittedDate).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={onApply}
                disabled={!eligibility?.isEligible}
                className={`w-full py-2 px-4 rounded font-medium ${
                  eligibility?.isEligible
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {eligibility?.isEligible ? 'Apply for This Scheme' : 'Not Eligible to Apply'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'education' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">What Problem Does This Solve?</h4>
              <p className="text-sm text-gray-600">{scheme.educationalContent.problemItSolves}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Real-World Impact</h4>
              <p className="text-sm text-gray-600">{scheme.educationalContent.realWorldImpact}</p>
            </div>

            {scheme.educationalContent.commonMistakes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Common Mistakes to Avoid</h4>
                <ul className="space-y-1 text-sm">
                  {scheme.educationalContent.commonMistakes.map((mistake, index) => (
                    <li key={index} className="text-red-600">• {mistake}</li>
                  ))}
                </ul>
              </div>
            )}

            {scheme.educationalContent.tips.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Pro Tips</h4>
                <ul className="space-y-1 text-sm">
                  {scheme.educationalContent.tips.map((tip, index) => (
                    <li key={index} className="text-green-600">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {scheme.educationalContent.faqs.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Frequently Asked Questions</h4>
                <div className="space-y-3">
                  {scheme.educationalContent.faqs.map((faq, index) => (
                    <div key={index} className="border-l-4 border-gray-200 pl-3">
                      <p className="font-medium text-sm">{faq.question}</p>
                      <p className="text-sm text-gray-600">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};