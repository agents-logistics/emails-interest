'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import TemplateEditor from './TemplateEditor';

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type PricingOption = {
  id: string;
  installment: number;
  price: number;
  icreditText: string;
  icreditLink: string;
  iformsText: string;
  iformsLink: string;
};

type PatientTest = {
  id: string;
  name: string;
  templateNames: string[];
  emailCopies: string[];
  pricingOptions: PricingOption[];
};

type ApiListTestsResp = { tests: PatientTest[] };
type EmailAttachment = {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
};

type ApiListTemplatesResp = { templates: { id: string; testId: string; body: string; subject?: string; isRTL: boolean; reply_to?: string; clalitText?: string; attachments?: EmailAttachment[] }[] };

const AddTemplatesContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [tests, setTests] = useState<PatientTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [isRTL, setIsRTL] = useState<boolean>(true);
  const [clalitText, setClalitText] = useState<string>('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [existingTemplateId, setExistingTemplateId] = useState<string>('');

  // Preview controls (let user pick values from selected test)
  const [previewNameOnTemplate, setPreviewNameOnTemplate] = useState<string>('');
  const [previewPricingOptionId, setPreviewPricingOptionId] = useState<string>('');

  // UI feedback
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId),
    [tests, selectedTestId]
  );

  // Get selected pricing option for preview
  const selectedPreviewPricingOption = useMemo(() => {
    if (!selectedTest || !previewPricingOptionId) return null;
    return selectedTest.pricingOptions.find(opt => opt.id === previewPricingOptionId);
  }, [selectedTest, previewPricingOptionId]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tests');
        const data: ApiListTestsResp = await res.json();
        if (res.ok) {
          setTests(data.tests);
          if (data.tests.length > 0) {
            setSelectedTestId((prev) => prev || data.tests[0].id);
          }
        } else {
          setError(data as unknown as string);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load tests');
      }
    };
    load();
  }, []);

  // Initialize preview pickers and load existing template when test changes
  useEffect(() => {
    const loadTemplateForTest = async () => {
      if (selectedTest) {
        setPreviewNameOnTemplate(selectedTest.templateNames[0] || '');
        setPreviewPricingOptionId(selectedTest.pricingOptions[0]?.id || '');

        // Check if template already exists for this test
        try {
          const res = await fetch(`/api/templates?testId=${encodeURIComponent(selectedTest.id)}`);
          const data: ApiListTemplatesResp = await res.json();
          if (res.ok && data.templates.length > 0) {
            const existingTemplate = data.templates[0]; // Only one template per test
            setBody(existingTemplate.body);
            setSubject(existingTemplate.subject || '');
            setIsRTL(existingTemplate.isRTL);
            setClalitText(existingTemplate.clalitText || '');
            setAttachments(existingTemplate.attachments || []);
            setExistingTemplateId(existingTemplate.id);
          } else {
            // No existing template, reset to defaults
            setBody('');
            setSubject('');
            setIsRTL(true);
            setClalitText('');
            setAttachments([]);
            setExistingTemplateId('');
          }
        } catch (e) {
          // If error loading template, reset to defaults
          setBody('');
          setSubject('');
          setIsRTL(true);
          setClalitText('');
          setAttachments([]);
          setExistingTemplateId('');
        }
      } else {
        setPreviewNameOnTemplate('');
        setPreviewPricingOptionId('');
        setBody('');
        setSubject('');
        setIsRTL(true);
        setClalitText('');
        setAttachments([]);
        setExistingTemplateId('');
      }
    };

    loadTemplateForTest();
  }, [selectedTestId, selectedTest]);



  const handleSave = async () => {
    setError(undefined);
    setSuccess(undefined);

    if (!selectedTest) {
      setError('Please select a test');
      return;
    }
    try {
      setSaving(true);
      
      // If existing template, use PUT to update, otherwise POST to create
      const method = existingTemplateId ? 'PUT' : 'POST';
      const endpoint = existingTemplateId ? `/api/templates/${existingTemplateId}` : '/api/templates';
      
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: selectedTest.id,
          body,
          subject: subject || undefined,
          isRTL,
          clalitText: clalitText || undefined,
        }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        // Handle case where response is not JSON (e.g., HTML error page)
        console.error('Failed to parse response as JSON:', parseError);
        console.error('Response status:', res.status, res.statusText);
        setError(`Server error: ${res.status} ${res.statusText}. The server returned an unexpected response format.`);
        return;
      }
      
      if (!res.ok) {
        setError(data?.error || `Failed to ${existingTemplateId ? 'update' : 'save'} template`);
        return;
      }
      
      // If we created a new template, store its ID
      if (!existingTemplateId && data.template?.id) {
        setExistingTemplateId(data.template.id);
      }
      
      setSuccess(`Template ${existingTemplateId ? 'updated' : 'saved'} successfully`);
    } catch (e: any) {
      setError(e?.message || 'Unexpected error saving template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.customRounded} flex flex-col p-6 bg-gradient-to-br from-gray-50 to-gray-100 w-full h-full overflow-auto`}>
      <div className="w-full flex items-start mb-6">
        {!showNavigation && (
          <div>
            <Button variant="secondary" onClick={onShowNavigation}>Show Navigation</Button>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-md p-5">
          <h1 className="text-2xl font-bold mb-2">
            {existingTemplateId ? 'Edit Email Template' : 'Create Email Template'}
          </h1>
          <p className="text-indigo-100">
            Design and customize email templates with rich text formatting
          </p>
        </div>

        <div className="space-y-6">
          {tests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="p-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Tests Available</h3>
                <p className="text-gray-600 mb-4">You need to create a test before adding templates.</p>
                <Button asChild>
                  <a href="/addtests" className="inline-flex items-center justify-center">
                    Add Test First
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Configuration */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Template Configuration</h2>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Associated Test
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors bg-white"
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                    >
                      {tests.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Subject <span className="text-gray-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Signatera Test Onboarding"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="rtl"
                      checked={isRTL}
                      onChange={(e) => setIsRTL(e.target.checked)}
                      className="w-4 h-4 text-gray-900 bg-white border-gray-300 rounded focus:ring-gray-900"
                    />
                    <label htmlFor="rtl" className="text-sm font-medium text-gray-700">
                      Right-to-Left (Hebrew)
                    </label>
                  </div>

                  <div className="text-xs text-gray-500">
                    <p>• Subject: Optional - uses test name if empty</p>
                  </div>
                </div>
                </div>
              </div>

            {/* Template Editor Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <TemplateEditor
                body={body}
                onBodyChange={setBody}
                isRTL={isRTL}
                onIsRTLChange={setIsRTL}
                selectedTest={selectedTest}
                templateId={existingTemplateId}
                previewNameOnTemplate={previewNameOnTemplate}
                previewPricingOptionId={previewPricingOptionId}
                showConfigurationSection={false}
                showPreviewSection={true}
                showAttachmentsSection={true}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                clalitText={clalitText}
                onClalitTextChange={setClalitText}
              />
            </div>

            {/* Feedback Messages */}
            <FormError message={error} />
            {success && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-green-800">
                    Template {existingTemplateId ? 'Updated' : 'Saved'} Successfully
                  </h3>
                </div>
                <div className="mt-2 text-sm text-green-700 ml-11">
                  {success}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleSave}
                disabled={saving || !selectedTest || !body.trim()}
                size="lg"
                className="px-10 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Template...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {existingTemplateId ? 'Update Template' : 'Save Template'}
                  </>
                )}
              </Button>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddTemplatesContentArea;
