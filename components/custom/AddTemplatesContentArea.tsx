'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { REQUIRED_TEMPLATE_TOKENS } from '@/schemas';

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

type ApiListTestsResp = { tests: PatientTest[] };
type ApiListTemplatesResp = { templates: { id: string; testId: string; body: string; isRTL: boolean }[] };

const AddTemplatesContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [tests, setTests] = useState<PatientTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isRTL, setIsRTL] = useState<boolean>(true);
  const [existingTemplateId, setExistingTemplateId] = useState<string>('');

  // Preview controls (let user pick values from selected test)
  const [previewNameOnTemplate, setPreviewNameOnTemplate] = useState<string>('');
  const [previewInstallment, setPreviewInstallment] = useState<number | ''>('');
  const [previewPrice, setPreviewPrice] = useState<number | ''>('');
  const [previewPatientName, setPreviewPatientName] = useState<string>('');

  // UI feedback
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [previewRTL, setPreviewRTL] = useState<boolean>(true);

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId),
    [tests, selectedTestId]
  );

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
        setPreviewInstallment(selectedTest.installments[0] ?? '');
        setPreviewPrice(selectedTest.prices[0] ?? '');

        // Check if template already exists for this test
        try {
          const res = await fetch(`/api/templates?testId=${encodeURIComponent(selectedTest.id)}`);
          const data: ApiListTemplatesResp = await res.json();
          if (res.ok && data.templates.length > 0) {
            const existingTemplate = data.templates[0]; // Only one template per test
            setBody(existingTemplate.body);
            setIsRTL(existingTemplate.isRTL);
            setExistingTemplateId(existingTemplate.id);
          } else {
            // No existing template, reset to defaults
            setBody('');
            setIsRTL(true);
            setExistingTemplateId('');
          }
        } catch (e) {
          // If error loading template, reset to defaults
          setBody('');
          setIsRTL(true);
          setExistingTemplateId('');
        }
      } else {
        setPreviewNameOnTemplate('');
        setPreviewInstallment('');
        setPreviewPrice('');
        setBody('');
        setIsRTL(true);
        setExistingTemplateId('');
      }
    };

    loadTemplateForTest();
  }, [selectedTestId, selectedTest]);

  const allTokensPresent = useMemo(
    () => REQUIRED_TEMPLATE_TOKENS.every((t) => body.includes(t)),
    [body]
  );

  const handlePreview = async () => {
    setError(undefined);
    setSuccess(undefined);
    setPreview('');
    setPreviewRTL(true);

    if (!selectedTest) {
      setError('Please select a test');
      return;
    }
    if (!allTokensPresent) {
      setError(`Template must include all placeholders: ${REQUIRED_TEMPLATE_TOKENS.join(', ')}`);
      return;
    }
    if (!previewNameOnTemplate || previewInstallment === '' || previewPrice === '' || !previewPatientName) {
      setError('Please pick preview values for name, patient name, installment, and price');
      return;
    }

    try {
      setPreviewing(true);
      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: selectedTest.id,
            body,
            isRTL,
            nameOnTemplate: previewNameOnTemplate,
            installment: Number(previewInstallment),
            price: Number(previewPrice),
            patientName: previewPatientName,
            toEmail: 'preview@example.com', // preview only
          }),
      });
      const data = await res.json();
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

  const handleSave = async () => {
    setError(undefined);
    setSuccess(undefined);

    if (!selectedTest) {
      setError('Please select a test');
      return;
    }
    if (!allTokensPresent) {
      setError(`Template must include all placeholders: ${REQUIRED_TEMPLATE_TOKENS.join(', ')}`);
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
          isRTL,
        }),
      });
      const data = await res.json();
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
    <div className={`${styles.customRounded} flex flex-col items-center p-4 bg-white shadow-lg rounded-lg w-full h-full overflow-auto`}>
      <div className="w-full flex items-start mb-4">
        {!showNavigation && (
          <div>
            <Button variant="secondary" onClick={onShowNavigation}>Show Navigation</Button>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl space-y-6">
        <h2 className="text-xl font-semibold">
          {existingTemplateId ? 'Edit Template' : 'Add Template'}
        </h2>

        {tests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tests found. Please add a test first.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Test</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
            >
              {tests.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="rtl"
              checked={isRTL}
              onChange={(e) => setIsRTL(e.target.checked)}
            />
            <label htmlFor="rtl" className="text-sm">Render RTL (Hebrew)</label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Template Body</label>
          <textarea
            className="w-full min-h-[220px] border rounded px-3 py-2 whitespace-pre-wrap"
            placeholder={`Enter Hebrew template. Must include:\n${REQUIRED_TEMPLATE_TOKENS.join(', ')}\n\nExample:\nשלום #nameontemplate,\nשם מטופל: #nameofpatient\nמספר תשלומים: #numinstallaments\nמחיר: #price\nתשלום: #icreditlink\nטופס: #iformslink`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {!allTokensPresent && (
            <p className="text-[0.8rem] text-destructive mt-1">
              Missing one or more placeholders: {REQUIRED_TEMPLATE_TOKENS.join(', ')}
            </p>
          )}
        </div>

        {selectedTest && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Preview Name on Template</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={previewNameOnTemplate}
                onChange={(e) => setPreviewNameOnTemplate(e.target.value)}
              >
                {selectedTest.templateNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preview Installment</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={previewInstallment}
                onChange={(e) => setPreviewInstallment(Number(e.target.value))}
              >
                {selectedTest.installments.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preview Price</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={previewPrice}
                onChange={(e) => setPreviewPrice(Number(e.target.value))}
              >
                {selectedTest.prices.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preview Patient Name</label>
              <Input
                placeholder="Patient full name"
                value={previewPatientName}
                onChange={(e) => setPreviewPatientName(e.target.value)}
              />
            </div>
          </div>
        )}

        <FormError message={error} />
        <FormSuccess message={success} />

        <div className="flex gap-3">
          <Button onClick={handlePreview} disabled={previewing || !selectedTest}>
            {previewing ? 'Generating...' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedTest} variant="outline">
            {saving ? 'Saving...' : (existingTemplateId ? 'Update Template' : 'Save Template')}
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

export default AddTemplatesContentArea;
