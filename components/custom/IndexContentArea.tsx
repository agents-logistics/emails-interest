'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import Image from 'next/image';
import Link from 'next/link';
import SendEmailConfirmationDialogBox from './SendEmailConfirmationDialogBox';

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type PatientTest = {
  id: string;
  name: string;
  templateNames: string[];
  installments: number[];
  prices: number[];
  emailCopies: string[];
  icreditLink: string;
  iformsLink: string;
};

type EmailTemplate = {
  id: string;
  testId: string;
  body: string;
  isRTL: boolean;
};

type ApiListTestsResp = { tests: PatientTest[] };
type ApiListTemplatesResp = { templates: EmailTemplate[] };
type PreviewResp = { preview: string; isRTL: boolean; to: string; cc: string[] };

const IndexContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  // Data lists
  const [tests, setTests] = useState<PatientTest[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  // Selections/inputs
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [nameOnTemplate, setNameOnTemplate] = useState<string>('');
  const [installment, setInstallment] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [patientName, setPatientName] = useState<string>('');
  const [toEmail, setToEmail] = useState<string>('');

  // Preview state
  const [preview, setPreview] = useState<string>('');
  const [previewRTL, setPreviewRTL] = useState<boolean>(true);

  // UI feedback
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId),
    [tests, selectedTestId]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/tests');
        const data: ApiListTestsResp = await res.json();
        if (!res.ok) {
          setError((data as any)?.error || 'Failed to load tests');
          return;
        }
        setTests(data.tests);
        if (data.tests.length > 0) {
          const first = data.tests[0];
          setSelectedTestId(first.id);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load tests');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Initialize dependent fields when test changes
  useEffect(() => {
    const initForTest = async () => {
      if (!selectedTestId) {
        setTemplates([]);
        setNameOnTemplate('');
        setInstallment('');
        setPrice('');
        return;
      }
      try {
        const res = await fetch(`/api/templates?testId=${encodeURIComponent(selectedTestId)}`);
        const data: ApiListTemplatesResp = await res.json();
        if (!res.ok) {
          setError((data as any)?.error || 'Failed to load templates');
          return;
        }
        setTemplates(data.templates);

        const t = tests.find((x) => x.id === selectedTestId);
        if (t) {
          setNameOnTemplate(t.templateNames[0] || '');
          setInstallment(t.installments[0] ?? '');
          setPrice(t.prices[0] ?? '');
        } else {
          setNameOnTemplate('');
          setInstallment('');
          setPrice('');
        }
        setPreview('');
        setSuccess(undefined);
        setError(undefined);
      } catch (e: any) {
        setError(e?.message || 'Failed to load templates');
      }
    };
    initForTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestId]);

  const handleGeneratePreview = async () => {
    setError(undefined);
    setSuccess(undefined);
    setPreview('');

    if (!selectedTest) {
      setError('Please select a test');
      return;
    }
    if (!templates.length) {
      setError('No template found for this test. Please add a template first.');
      return;
    }
    if (!nameOnTemplate || installment === '' || price === '') {
      setError('Please select Name on Template, Installment, and Price');
      return;
    }
    if (!patientName) {
      setError('Please enter patient name');
      return;
    }
    if (!toEmail) {
      setError('Please enter recipient email');
      return;
    }

    try {
      setPreviewing(true);
      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: selectedTest.id,
          templateId: templates[0]?.id,
          nameOnTemplate,
          installment: Number(installment),
          price: Number(price),
          toEmail,
          patientName,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to generate preview');
        return;
      }
      setPreview(data.preview);
      setPreviewRTL(Boolean(data.isRTL));
    } catch (e: any) {
      setError(e?.message || 'Unexpected error generating preview');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    setError(undefined);
    setSuccess(undefined);
    setShowSendConfirmation(false); // Close the confirmation dialog

    if (!selectedTest) {
      setError('Please select a test');
      return;
    }
    if (!templates.length) {
      setError('No template found for this test. Please add a template first.');
      return;
    }
    if (!nameOnTemplate || installment === '' || price === '' || !toEmail) {
      setError('Please fill all fields before sending');
      return;
    }

    try {
      setSending(true);
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: selectedTest.id,
          templateId: templates[0]?.id,
          nameOnTemplate,
          installment: Number(installment),
          price: Number(price),
          toEmail,
          patientName,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to send email');
        return;
      }
      
      // Enhanced success message with more details
      const allRecipients = data.recipients || [data.to, ...(data.cc || [])];
      
      setSuccess(
        `Email sent successfully via Amazon SES!\n` +
        `Subject: ${selectedTest.name}\n` +
        `To: ${allRecipients.join(', ')}\n` +
        `Email delivered successfully!`
      );
      
      // Clear form after successful send
      setPatientName('');
      setToEmail('');
      setPreview('');
    } catch (e: any) {
      setError(e?.message || 'Unexpected error sending email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${styles.customRounded} flex flex-col items-center p-4 bg-white shadow-lg rounded-lg w-full h-full overflow-auto`}>
      <div className="w-full flex items-start mb-4">
        {!showNavigation && (
          <div>
            <Button variant="secondary" onClick={onShowNavigation}>Show Navigation</Button>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl space-y-8">
        {(!loading && !error && tests.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Image src="/images/conversation.svg" alt="No tests" width={64} height={64} className="mb-4 opacity-80" />
            <h2 className="text-lg font-semibold mb-3">There are no tests</h2>
            <Button asChild>
              <Link href="/addtests">Add test</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Email Communication Center</h2>
              <p className="text-gray-600">Generate and send personalized emails to patients with test information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Test Selection
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loading}
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                >
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Template Status
                </label>
                <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-sm">
                  {templates.length > 0 ? (
                    <span className="text-green-600">
                      Template available
                    </span>
                  ) : (
                    <span className="text-red-600">
                      No template found
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedTest && (
              <div className="border border-gray-200 rounded-lg p-5 bg-white">
                <h3 className="text-base font-medium mb-4 text-gray-900 border-b border-gray-100 pb-2">
                  Test Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Name on Template
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      value={nameOnTemplate}
                      onChange={(e) => setNameOnTemplate(e.target.value)}
                    >
                      {selectedTest.templateNames.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Installments
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      value={installment}
                      onChange={(e) => setInstallment(Number(e.target.value))}
                    >
                      {selectedTest.installments.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Price
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                    >
                      {selectedTest.prices.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-5 bg-white">
              <h3 className="text-base font-medium mb-4 text-gray-900 border-b border-gray-100 pb-2">
                Patient Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Patient Name
                  </label>
                  <Input
                    placeholder="Enter patient full name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Send To (Email)
                  </label>
                  <Input
                    placeholder="patient@example.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    type="email"
                  />
                  <p className="text-[0.8rem] text-gray-600 mt-2">
                    Email will be sent to this address and CC the email copy list stored with the test.
                  </p>
                </div>
              </div>
            </div>

            <FormError message={error} />
            {success && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="text-sm font-medium text-green-800">Email Sent Successfully</h3>
                <div className="mt-1 text-sm text-green-700 whitespace-pre-line">
                  {success}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleGeneratePreview} 
                disabled={previewing || loading || !selectedTestId || !templates.length}
                variant="outline"
              >
                {previewing ? 'Generating...' : 'Preview Email'}
              </Button>
              <Button 
                onClick={() => setShowSendConfirmation(true)} 
                disabled={sending || loading || !selectedTestId || !templates.length || !patientName || !toEmail}
              >
                {sending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>

            {preview && (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Email Preview</h3>
                <div
                  dir={previewRTL ? 'rtl' : 'ltr'}
                  className="bg-white border border-gray-200 rounded p-4 whitespace-pre-wrap min-h-[200px]"
                  style={{ fontFamily: previewRTL ? 'Arial, sans-serif' : 'inherit' }}
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <SendEmailConfirmationDialogBox
        open={showSendConfirmation}
        onOpenChange={setShowSendConfirmation}
        onConfirm={handleSend}
        title="Confirm Email Send"
        description={`Are you sure you want to send the email for "${selectedTest?.name}" to ${toEmail}?${selectedTest?.emailCopies?.length ? `\n\nThe email will also be sent to CC: ${selectedTest.emailCopies.join(', ')}` : ''}\n\nThis action will send the email immediately via Amazon SES.`}
        isSending={sending}
      />
    </div>
  );
};

export default IndexContentArea;
