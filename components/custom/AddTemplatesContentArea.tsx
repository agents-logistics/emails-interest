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

type ApiListTemplatesResp = { templates: { id: string; testId: string; body: string; subject?: string; isRTL: boolean; reply_to?: string; attachments?: EmailAttachment[] }[] };

const AddTemplatesContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [tests, setTests] = useState<PatientTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [isRTL, setIsRTL] = useState<boolean>(true);
  const [reply_to, setReply_to] = useState<string>('');
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
            setReply_to(existingTemplate.reply_to || '');
            setAttachments(existingTemplate.attachments || []);
            setExistingTemplateId(existingTemplate.id);
          } else {
            // No existing template, reset to defaults
            setBody('');
            setSubject('');
            setIsRTL(true);
            setReply_to('');
            setAttachments([]);
            setExistingTemplateId('');
          }
        } catch (e) {
          // If error loading template, reset to defaults
          setBody('');
          setSubject('');
          setIsRTL(true);
          setReply_to('');
          setAttachments([]);
          setExistingTemplateId('');
        }
      } else {
        setPreviewNameOnTemplate('');
        setPreviewPricingOptionId('');
        setBody('');
        setSubject('');
        setIsRTL(true);
        setReply_to('');
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
          reply_to: reply_to || undefined,
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
    <div className={`${styles.customRounded} flex flex-col bg-white shadow-sm border border-gray-200 rounded-lg w-full h-full overflow-hidden`}>
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {existingTemplateId ? 'Edit Email Template' : 'Create Email Template'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Design and customize email templates with rich text formatting
            </p>
          </div>
          {!showNavigation && (
            <Button variant="outline" size="sm" onClick={onShowNavigation}>
              Show Navigation
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          {tests.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto max-w-md">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Available</h3>
                  <p className="text-gray-600 mb-4">You need to create a test before adding templates.</p>
                  <Button asChild>
                    <a href="/addtests" className="inline-flex items-center justify-center">
                      Add Test First
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Configuration */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Reply-To Email <span className="text-gray-400">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. support@clinic.com"
                      value={reply_to}
                      onChange={(e) => setReply_to(e.target.value)}
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

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Subject: Optional - uses test name if empty</p>
                    <p>• Reply-To: Optional - uses first BCC email if empty</p>
                  </div>
                </div>
              </div>

            {/* Template Editor Section */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                showAttachmentsSection={true}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
              />
            </div>

            {/* Feedback Messages */}
            <div className="space-y-3">
              <FormError message={error} />
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Template {existingTemplateId ? 'Updated' : 'Saved'} Successfully
                      </h3>
                      <div className="mt-1 text-sm text-green-700">
                        {success}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || !selectedTest || !body.trim()}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </div>
                  ) : (
                    existingTemplateId ? 'Update Template' : 'Save Template'
                  )}
                </Button>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddTemplatesContentArea;
