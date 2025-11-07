'use client';
import styles from '@/styles/ContentArea.module.css';  
import React, { FC, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type TestMapping = {
  id: string;
  smartsheetTestName: string;
  appTestId: string;
  appTestName: string;
};

type PatientTest = {
  id: string;
  name: string;
};

const SmartsheetMapsContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [sheetId, setSheetId] = useState('');
  const [emailColumnName, setEmailColumnName] = useState('');
  const [patientNameColumnName, setPatientNameColumnName] = useState('');
  const [testNameColumnName, setTestNameColumnName] = useState('');
  const [priceColumnName, setPriceColumnName] = useState('');
  const [installmentColumnName, setInstallmentColumnName] = useState('');
  const [clalitStatusColumnName, setClalitStatusColumnName] = useState('');
  const [clalitYesValue, setClalitYesValue] = useState('');
  const [clalitNoValue, setClalitNoValue] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  
  // Test mappings state
  const [showTestMappings, setShowTestMappings] = useState(false);
  const [testMappings, setTestMappings] = useState<TestMapping[]>([]);
  const [availableTests, setAvailableTests] = useState<PatientTest[]>([]);
  const [newSmartsheetName, setNewSmartsheetName] = useState('');
  const [newAppTestId, setNewAppTestId] = useState('');
  const [addingMapping, setAddingMapping] = useState(false);
  const [deletingMappingId, setDeletingMappingId] = useState<string | null>(null);

  // Load existing configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/emailToolSmartsheetConfig');
        const data = await res.json();
        
        if (res.ok && data.config) {
          setSheetId(data.config.sheetId || '');
          setEmailColumnName(data.config.emailColumnName || '');
          setPatientNameColumnName(data.config.patientNameColumnName || '');
          setTestNameColumnName(data.config.testNameColumnName || '');
          setPriceColumnName(data.config.priceColumnName || '');
          setInstallmentColumnName(data.config.installmentColumnName || '');
          setClalitStatusColumnName(data.config.clalitStatusColumnName || '');
          setClalitYesValue(data.config.clalitYesValue || '');
          setClalitNoValue(data.config.clalitNoValue || '');
        }
      } catch (e: any) {
        console.error('Failed to load configuration:', e);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Load test mappings when section is expanded
  useEffect(() => {
    if (showTestMappings) {
      loadTestMappings();
      loadAvailableTests();
    }
  }, [showTestMappings]);

  const loadTestMappings = async () => {
    try {
      const res = await fetch('/api/testNameMappings');
      const data = await res.json();
      if (res.ok) {
        setTestMappings(data.mappings || []);
      }
    } catch (e: any) {
      console.error('Failed to load test mappings:', e);
    }
  };

  const loadAvailableTests = async () => {
    try {
      const res = await fetch('/api/tests');
      const data = await res.json();
      if (res.ok) {
        setAvailableTests(data.tests || []);
      }
    } catch (e: any) {
      console.error('Failed to load available tests:', e);
    }
  };

  const handleAddMapping = async () => {
    if (!newSmartsheetName.trim() || !newAppTestId) {
      setError('Please fill in both Smartsheet test name and select an app test');
      return;
    }

    try {
      setAddingMapping(true);
      setError(undefined);
      setSuccess(undefined);

      const res = await fetch('/api/testNameMappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smartsheetTestName: newSmartsheetName.trim(),
          appTestId: newAppTestId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add mapping');
        return;
      }

      setSuccess('Test mapping added successfully!');
      setNewSmartsheetName('');
      setNewAppTestId('');
      loadTestMappings(); // Reload mappings
    } catch (e: any) {
      setError(e?.message || 'Failed to add mapping');
    } finally {
      setAddingMapping(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      setDeletingMappingId(id);
      setError(undefined);
      setSuccess(undefined);

      const res = await fetch('/api/testNameMappings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete mapping');
        return;
      }

      setSuccess('Test mapping deleted successfully!');
      loadTestMappings(); // Reload mappings
    } catch (e: any) {
      setError(e?.message || 'Failed to delete mapping');
    } finally {
      setDeletingMappingId(null);
    }
  };

  const handleSave = async () => {
    setError(undefined);
    setSuccess(undefined);

    if (!sheetId.trim()) {
      setError('Sheet ID is required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/emailToolSmartsheetConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: sheetId.trim(),
          emailColumnName: emailColumnName.trim() || null,
          patientNameColumnName: patientNameColumnName.trim() || null,
          testNameColumnName: testNameColumnName.trim() || null,
          priceColumnName: priceColumnName.trim() || null,
          installmentColumnName: installmentColumnName.trim() || null,
          clalitStatusColumnName: clalitStatusColumnName.trim() || null,
          clalitYesValue: clalitYesValue.trim() || null,
          clalitNoValue: clalitNoValue.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save configuration');
        return;
      }

      setSuccess('Configuration saved successfully!');
    } catch (e: any) {
      setError(e?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.customRounded} flex flex-col items-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 w-full h-full overflow-auto`}>
      <div className="w-full flex items-start mb-6">
        {!showNavigation && (
          <div>
            <Button variant="secondary" onClick={onShowNavigation}>Show Navigation</Button>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-md p-4 md:p-5 mb-4">
          <h1 className="text-xl font-bold mb-1">Smartsheet Configuration for Email Tool</h1>
          <p className="text-indigo-100 text-sm">Configure Smartsheet integration to auto-populate patient data in emails</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {/* Smartsheet ID Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Smartsheet ID</h2>
                </div>
              </div>
              <div className="p-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Sheet ID <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter Smartsheet ID"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium h-11"
                />
                <p className="text-xs text-gray-500 mt-2 ml-1">
                  Enter the Smartsheet ID to integrate with the email tool
                </p>
              </div>
            </div>

            {/* Column Mappings Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Column Mappings</h2>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Email Column Name
                  </label>
                  <Input
                    placeholder="e.g., Email Address"
                    value={emailColumnName}
                    onChange={(e) => setEmailColumnName(e.target.value)}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium h-11"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    Column name in Smartsheet that contains patient email addresses
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Patient Name Column Name
                  </label>
                  <Input
                    placeholder="e.g., Patient Name"
                    value={patientNameColumnName}
                    onChange={(e) => setPatientNameColumnName(e.target.value)}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium h-11"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    Column name in Smartsheet to pull patient names from
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Terms Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Payment Terms</h2>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Price Column Name
                  </label>
                  <Input
                    placeholder="e.g., Price"
                    value={priceColumnName}
                    onChange={(e) => setPriceColumnName(e.target.value)}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium h-11"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    Column name in Smartsheet containing the price value
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Installment Column Name
                  </label>
                  <Input
                    placeholder="e.g., Installments"
                    value={installmentColumnName}
                    onChange={(e) => setInstallmentColumnName(e.target.value)}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium h-11"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    Column name in Smartsheet containing the number of installments
                  </p>
                </div>
              </div>
            </div>

            {/* Insurance Information Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Insurance Information</h2>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Clalit Status Column Name
                  </label>
                  <Input
                    placeholder="e.g., Clalit Member"
                    value={clalitStatusColumnName}
                    onChange={(e) => setClalitStatusColumnName(e.target.value)}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium h-11"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    Column name in Smartsheet containing Clalit insurance status
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      "Yes" Value (Optional)
                    </label>
                    <Input
                      placeholder="e.g., Yes, Y, true"
                      value={clalitYesValue}
                      onChange={(e) => setClalitYesValue(e.target.value)}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium h-11"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Value indicating patient HAS Clalit insurance
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      "No" Value (Optional)
                    </label>
                    <Input
                      placeholder="e.g., No, N, false"
                      value={clalitNoValue}
                      onChange={(e) => setClalitNoValue(e.target.value)}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium h-11"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Value indicating patient DOES NOT have Clalit insurance
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Empty or Unmatched Values</p>
                      <p className="text-xs text-blue-800 mt-1">
                        If the Clalit status cell is empty or contains a value that doesn't match the configured Yes/No values, 
                        Clalit information WILL BE INCLUDED by default. Matching is case-insensitive.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Test Name Mappings Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-50 to-teal-100 border-b border-teal-200 px-4 py-3 cursor-pointer hover:from-teal-100 hover:to-teal-200 transition-colors"
                onClick={() => setShowTestMappings(!showTestMappings)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Test Name Mappings</h2>
                      <p className="text-xs text-teal-700">Map Smartsheet test names to app tests</p>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${showTestMappings ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {showTestMappings && (
                <div className="p-4 space-y-4">
                  {/* Test Name Column Configuration */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Test Name Column Name
                    </label>
                    <Input
                      placeholder="e.g., Test Name"
                      value={testNameColumnName}
                      onChange={(e) => setTestNameColumnName(e.target.value)}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium h-11"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Column name in Smartsheet containing the test/service name
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Existing Mappings ({testMappings.length})</h3>
                    
                    {testMappings.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-600 font-medium">No test mappings configured yet</p>
                        <p className="text-xs text-gray-500 mt-1">Add your first mapping below</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {testMappings.map((mapping) => (
                          <div 
                            key={mapping.id}
                            className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-md border border-gray-300">
                                  {mapping.smartsheetTestName}
                                </span>
                                <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <span className="text-sm font-semibold text-teal-800 bg-teal-200 px-3 py-1 rounded-md">
                                  {mapping.appTestName}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMapping(mapping.id)}
                              disabled={deletingMappingId === mapping.id}
                              className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-semibold hover:underline disabled:opacity-50 ml-4"
                            >
                              {deletingMappingId === mapping.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Add New Mapping</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          Smartsheet Test Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="e.g., Caris"
                          value={newSmartsheetName}
                          onChange={(e) => setNewSmartsheetName(e.target.value)}
                          className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium h-11"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Test name as it appears in Smartsheet
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          App Test <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newAppTestId}
                          onChange={(e) => setNewAppTestId(e.target.value)}
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-gray-900 font-medium h-11"
                        >
                          <option value="">Select a test...</option>
                          {availableTests.sort((a, b) => a.name.localeCompare(b.name)).map((test) => (
                            <option key={test.id} value={test.id}>
                              {test.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Select the corresponding test in the app
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={handleAddMapping}
                        disabled={addingMapping || !newSmartsheetName.trim() || !newAppTestId}
                        className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                      >
                        {addingMapping ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Adding Mapping...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Mapping
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error and Success Messages */}
            <FormError message={error} />
            <FormSuccess message={success} />

            {/* Save Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || !sheetId.trim()}
                size="lg"
                className="px-10 py-6 text-base font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Configuration...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SmartsheetMapsContentArea;
