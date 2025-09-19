'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import Image from 'next/image';
import Link from 'next/link';

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
      setSuccess(`Stubbed send OK. To: ${data.to}, CC: ${Array.isArray(data.cc) ? data.cc.join(', ') : ''}`);
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

      <div className="w-full max-w-5xl space-y-6">
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
            <h2 className="text-xl font-semibold">Send Email</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Test</label>
                <select
                  className="w-full border rounded px-3 py-2"
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
                <label className="block text-sm font-medium mb-1">Template Status</label>
                <div className="w-full border rounded px-3 py-2 bg-gray-50 text-sm">
                  {templates.length > 0 ? (
                    <span className="text-green-600">✓ Template available</span>
                  ) : (
                    <span className="text-red-600">⚠ No template found</span>
                  )}
                </div>
              </div>
            </div>

            {selectedTest && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name on Template</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={nameOnTemplate}
                    onChange={(e) => setNameOnTemplate(e.target.value)}
                  >
                    {selectedTest.templateNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Installments</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={installment}
                    onChange={(e) => setInstallment(Number(e.target.value))}
                  >
                    {selectedTest.installments.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  >
                    {selectedTest.prices.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Patient Name</label>
                <Input
                  placeholder="Patient full name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Send To (email)</label>
                <Input
                  placeholder="patient@example.com"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                />
                <p className="text-[0.8rem] text-muted-foreground mt-1">
                  Email will be sent to this address and CC the email copy list stored with the test.
                </p>
              </div>
            </div>

            <FormError message={error} />
            <FormSuccess message={success} />

            <div className="flex gap-3">
              <Button onClick={handleGeneratePreview} disabled={previewing || loading || !selectedTestId || !templates.length}>
                {previewing ? 'Generating...' : 'Generate Email'}
              </Button>
              <Button onClick={handleSend} disabled={sending || loading || !selectedTestId || !templates.length} variant="outline">
                {sending ? 'Sending...' : 'Send Email (stub)'}
              </Button>
            </div>

            {preview && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Preview</label>
                <div
                  dir={previewRTL ? 'rtl' : 'ltr'}
                  className="border rounded p-3 whitespace-pre-wrap text-right"
                >
                  {preview}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default IndexContentArea;
