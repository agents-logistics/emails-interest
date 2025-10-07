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

type EmailTemplate = {
  id: string;
  testId: string;
  body: string;
  subject?: string;
  isRTL: boolean;
  reply_to?: string;
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
  const [selectedPricingOptionId, setSelectedPricingOptionId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [toEmail, setToEmail] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [templateReplyTo, setTemplateReplyTo] = useState<string>('');

  // Email content state (populated when preview is generated)
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailIsRTL, setEmailIsRTL] = useState<boolean>(true);
  const [showTemplateEditor, setShowTemplateEditor] = useState<boolean>(false);

  // Preview state
  const [preview, setPreview] = useState<string>('');
  const [previewRTL, setPreviewRTL] = useState<boolean>(true);
  const [previewAttachments, setPreviewAttachments] = useState<any[]>([]);
  
  // Per-email attachments (temporary, not saved to template)
  type TempAttachment = {
    id: string;
    originalName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  };
  const [temporaryAttachments, setTemporaryAttachments] = useState<TempAttachment[]>([]);
  const [uploadingTemp, setUploadingTemp] = useState(false);

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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

  // Find the selected pricing option
  const selectedPricingOption = useMemo(() => {
    if (!selectedTest || !selectedPricingOptionId) return null;
    return selectedTest.pricingOptions.find(
      opt => opt.id === selectedPricingOptionId
    );
  }, [selectedTest, selectedPricingOptionId]);

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
        setSelectedPricingOptionId('');
        setEmailContent('');
        setEmailIsRTL(true);
        setShowTemplateEditor(false);
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
          // Select the first pricing option by default
          setSelectedPricingOptionId(t.pricingOptions[0]?.id || '');
        } else {
          setNameOnTemplate('');
          setSelectedPricingOptionId('');
        }

        // Load template content if available for later use
        if (data.templates.length > 0) {
          const template = data.templates[0];
          setEmailContent(template.body);
          setEmailIsRTL(template.isRTL);
          setEmailSubject(template.subject || '');
          setTemplateReplyTo(template.reply_to || '');
        } else {
          // No template available, use empty content
          setEmailContent('');
          setEmailIsRTL(true);
          setEmailSubject('');
          setTemplateReplyTo('');
        }

        setShowTemplateEditor(false);
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
    if (!nameOnTemplate || !selectedPricingOptionId) {
      setError('Please select Name on Template and Pricing Option');
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

      // Validate that we have a matching pricing option
      if (!selectedPricingOption) {
        setError('Please select a valid pricing option.');
        setPreviewing(false);
        return;
      }

      // Use existing emailContent if available, otherwise use stored template
      let bodyToUse = emailContent;
      let isRTLToUse = emailIsRTL;

      // If we don't have emailContent yet, try to get it from the stored template
      if (!bodyToUse && templates.length > 0) {
        bodyToUse = templates[0].body;
        isRTLToUse = templates[0].isRTL;
      }

      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: selectedTest.id,
          body: bodyToUse,
          isRTL: isRTLToUse,
          nameOnTemplate,
          installment: selectedPricingOption.installment,
          price: selectedPricingOption.price,
          toEmail,
          patientName,
          icreditText: selectedPricingOption.icreditText,
          icreditLink: selectedPricingOption.icreditLink,
          iformsText: selectedPricingOption.iformsText,
          iformsLink: selectedPricingOption.iformsLink,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to generate preview');
        return;
      }

      // Set the email content and show the template editor
      setEmailContent(data.preview);
      setEmailIsRTL(Boolean(data.isRTL));
      setPreviewAttachments(data.attachments || []);
      setShowTemplateEditor(true);
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
    if (!emailContent.trim()) {
      setError('Please generate the email preview first.');
      return;
    }
    if (!nameOnTemplate || !selectedPricingOptionId || !toEmail) {
      setError('Please fill all fields before sending');
      return;
    }

    try {
      setSending(true);

      // Validate that we have a matching pricing option
      if (!selectedPricingOption) {
        setError('Please select a valid pricing option.');
        setSending(false);
        return;
      }

      // Validate pricing option has required fields
      if (!selectedPricingOption.icreditText || !selectedPricingOption.icreditLink || 
          !selectedPricingOption.iformsText || !selectedPricingOption.iformsLink) {
        setError('Selected pricing option is missing required payment link information.');
        setSending(false);
        return;
      }

      // Always use JSON - temporary attachments are already uploaded
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const requestBody = JSON.stringify({
        testId: selectedTest.id,
        body: emailContent,
        subject: emailSubject || undefined,
        isRTL: emailIsRTL,
        nameOnTemplate,
        installment: selectedPricingOption.installment,
        price: selectedPricingOption.price,
        toEmail,
        patientName,
        icreditText: selectedPricingOption.icreditText,
        icreditLink: selectedPricingOption.icreditLink,
        iformsText: selectedPricingOption.iformsText,
        iformsLink: selectedPricingOption.iformsLink,
        temporaryAttachmentIds: temporaryAttachments.map(att => att.id),
      });

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers,
        body: requestBody,
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
        `Subject: ${data.subject || selectedTest.name}\n` +
        `To: ${allRecipients.join(', ')}\n` +
        `${data.attachmentsCount > 0 ? `Attachments: ${data.attachmentsCount} file(s)\n` : ''}` +
        `Email delivered successfully!`
      );

      // Clear form after successful send
      setPatientName('');
      setToEmail('');
      setEmailSubject('');
      setTemplateReplyTo('');
      setEmailContent('');
      setTemporaryAttachments([]);
      setShowTemplateEditor(false);
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Send Emails to Patients</h2>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Pricing Option
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      value={selectedPricingOptionId}
                      onChange={(e) => setSelectedPricingOptionId(e.target.value)}
                    >
                      {selectedTest.pricingOptions.map((opt, index) => (
                        <option key={opt.id} value={opt.id}>
                          Pricing Option {index + 1} ({opt.installment} installment{opt.installment !== 1 ? 's' : ''} - {opt.price.toLocaleString()} ₪)
                        </option>
                      ))}
                    </select>
                    {selectedPricingOption && (
                      <p className="text-[0.8rem] text-gray-600 mt-2">
                        {selectedPricingOption.installment} payment{selectedPricingOption.installment !== 1 ? 's' : ''} of {(selectedPricingOption.price / selectedPricingOption.installment).toFixed(2)} ₪ each
                      </p>
                    )}
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
                    Email will be sent to this address and BCC the email copy list stored with the test.
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-5 bg-white">
                <h3 className="text-base font-medium mb-4 text-gray-900 border-b border-gray-100 pb-2">
                  Email Settings
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Email Subject (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Test Results for John Doe"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-[0.8rem] text-gray-600 mt-2">
                    Optional custom subject. If not provided, will use the template&apos;s subject or test name.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Template Reply-To Email
                  </label>
                  <div className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-sm">
                    {templateReplyTo || 'No reply-to email set for template'}
                  </div>
                  <p className="text-[0.8rem] text-gray-600 mt-2">
                    This is the reply-to email address configured for this test&apos;s template.
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
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => {
                      // Reset form state for sending another email
                      setSuccess(undefined);
                      setError(undefined);
                      setShowTemplateEditor(false);
                      setPatientName('');
                      setToEmail('');
                      setEmailSubject('');
                      setTemplateReplyTo('');
                      setPreview('');
                      // Keep emailContent for potential reuse, but hide the editor
                    }}
                    variant="outline"
                    size="sm"
                    className="px-4"
                  >
                    Send Another Email
                  </Button>
                </div>
              </div>
            )}

            {!success && (
              <div className="flex justify-center">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={previewing || loading || !selectedTestId || !selectedPricingOptionId || !patientName || !toEmail}
                  size="lg"
                  className="px-8"
                >
                  {previewing ? 'Generating Preview...' : 'Preview Email'}
                </Button>
              </div>
            )}

            {/* Template Editor - shows after preview is generated */}
            {showTemplateEditor && (
              <div className="border border-gray-200 rounded-lg p-6 bg-white mt-6">
                <h3 className="text-lg font-medium mb-4 text-gray-900 border-b border-gray-100 pb-2">
                  Review & Edit Email Content
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Review and edit the email content before sending. This is exactly what will be sent to the patient.
                </p>

                <TemplateEditor
                  body={emailContent}
                  onBodyChange={setEmailContent}
                  isRTL={emailIsRTL}
                  onIsRTLChange={setEmailIsRTL}
                  selectedTest={selectedTest}
                  previewNameOnTemplate={nameOnTemplate}
                  previewPricingOptionId={selectedPricingOptionId}
                  showConfigurationSection={false}
                  showPreviewSection={false}
                  showAttachmentsSection={false}
                />

                {/* Template Attachments Preview */}
                {previewAttachments.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Template Attachments</h4>
                    <p className="text-xs text-gray-500 mb-2">These files are attached from the template</p>
                    <div className="space-y-2">
                      {previewAttachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              📎
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.originalName}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(attachment.fileSize)} • {attachment.mimeType}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`/api/email/preview?attachmentId=${attachment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(`/api/email/preview?attachmentId=${attachment.id}`, '_blank');
                            }}
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Temporary Attachments for This Email */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Add Attachments for This Email</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    These files will only be attached to this email and won&apos;t be saved to the template
                  </p>
                  
                  <div className="mb-4">
                    <input
                      type="file"
                      multiple
                      disabled={uploadingTemp}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;

                        setUploadingTemp(true);
                        try {
                          for (const file of files) {
                            const formData = new FormData();
                            formData.append('file', file);

                            const res = await fetch('/api/upload-temp', {
                              method: 'POST',
                              body: formData,
                            });

                            const data = await res.json();
                            if (!res.ok) {
                              throw new Error(data.error || 'Upload failed');
                            }

                            setTemporaryAttachments(prev => [...prev, data.tempFile]);
                          }
                        } catch (error: any) {
                          setError(error.message || 'Failed to upload attachments');
                        } finally {
                          setUploadingTemp(false);
                          e.target.value = '';
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
                    />
                    {uploadingTemp && (
                      <p className="text-sm text-blue-600 mt-1">Uploading files...</p>
                    )}
                  </div>

                  {temporaryAttachments.length > 0 && (
                    <div className="space-y-2">
                      {temporaryAttachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              📎
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.originalName}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.fileSize)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              // Delete temp file from server
                              try {
                                await fetch(`/api/delete-temp?id=${file.id}`, { method: 'DELETE' });
                              } catch (e) {
                                console.error('Failed to delete temp file:', e);
                              }
                              setTemporaryAttachments(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Send Button - at the bottom */}
            {showTemplateEditor && (
              <div className="flex justify-center pt-6">
                <Button
                  onClick={() => setShowSendConfirmation(true)}
                  disabled={sending || !selectedTestId || !emailContent.trim() || !selectedPricingOptionId || !patientName || !toEmail}
                  size="lg"
                  className="px-8 bg-green-600 hover:bg-green-700"
                >
                  {sending ? 'Sending Email...' : 'Send Email Now'}
                </Button>
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
        description={`Are you sure you want to send the email for "${selectedTest?.name}" to ${toEmail}?${selectedPricingOption ? `\n\nPricing: ${selectedPricingOption.installment} installment${selectedPricingOption.installment !== 1 ? 's' : ''} - ${selectedPricingOption.price.toLocaleString()} ₪` : ''}${selectedTest?.emailCopies?.length ? `\n\nThe email will also be sent to BCC: ${selectedTest.emailCopies.join(', ')}` : ''}${previewAttachments.length > 0 ? `\n\nTemplate Attachments: ${previewAttachments.length} file(s)` : ''}${temporaryAttachments.length > 0 ? `\n\nAdditional Attachments: ${temporaryAttachments.length} file(s)` : ''}\n\nThis action will send the email immediately via Amazon SES.`}
        isSending={sending}
      />
    </div>
  );
};

export default IndexContentArea;
