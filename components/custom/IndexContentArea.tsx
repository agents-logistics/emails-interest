'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useMemo, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import Image from 'next/image';
import Link from 'next/link';
import SendEmailConfirmationDialogBox from './SendEmailConfirmationDialogBox';
import ErrorDialogBox from './ErrorDialogBox';
import SmartsheetRowSelectionDialog from './SmartsheetRowSelectionDialog';
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
  isGlobalDefault?: boolean;
  isPriceDefault?: boolean;
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
  // Helper function to convert English day names to Hebrew
  const getHebrewDayOfWeek = (englishDay: string): string => {
    const dayMapping: Record<string, string> = {
      'Sunday': 'ראשון',
      'Monday': 'שני',
      'Tuesday': 'שלישי',
      'Wednesday': 'רביעי',
      'Thursday': 'חמישי',
      'Friday': 'שישי',
      'Saturday': 'שבת'
    };
    return dayMapping[englishDay] || englishDay;
  };

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
  const [ccEmails, setCcEmails] = useState<string>('');
  const [ccDefaultEmails, setCcDefaultEmails] = useState<{id: string; name: string; email: string}[]>([]);
  const [sendClalitInfo, setSendClalitInfo] = useState<boolean>(false);
  const [clalitExplicitlyDisabled, setClalitExplicitlyDisabled] = useState<boolean>(false);
  
  // Verified emails state
  const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isCurrentUserVerified, setIsCurrentUserVerified] = useState<boolean>(true);
  
  // Signatures state
  const [signatures, setSignatures] = useState<{id: string; email: string; name: string}[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>('');
  
  // Blood test scheduling fields
  const [bloodTestDayOfWeek, setBloodTestDayOfWeek] = useState<string>('');
  const [bloodTestDate, setBloodTestDate] = useState<string>('');
  const [bloodTestHour, setBloodTestHour] = useState<string>('');
  const [bloodTestLocation, setBloodTestLocation] = useState<string>('');
  const [locations, setLocations] = useState<{id: string; name: string; templateText: string}[]>([]);

  // Email content state (populated when preview is generated)
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailIsRTL, setEmailIsRTL] = useState<boolean>(true);
  const [showTemplateEditor, setShowTemplateEditor] = useState<boolean>(false);

  // Preview state
  const [preview, setPreview] = useState<string>('');
  const [previewRTL, setPreviewRTL] = useState<boolean>(true);
  const [previewAttachments, setPreviewAttachments] = useState<any[]>([]);
  const [excludedAttachmentIds, setExcludedAttachmentIds] = useState<string[]>([]);
  
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
  const [loadingSmartsheet, setLoadingSmartsheet] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [showSmartsheetErrorDialog, setShowSmartsheetErrorDialog] = useState(false);
  const [smartsheetErrorMessage, setSmartsheetErrorMessage] = useState('');
  const [smartsheetErrorType, setSmartsheetErrorType] = useState<'error' | 'warning'>('error');
  const [showSmartsheetUpdateErrorDialog, setShowSmartsheetUpdateErrorDialog] = useState(false);
  const [smartsheetUpdateErrorMessage, setSmartsheetUpdateErrorMessage] = useState('');
  const [showRowSelectionDialog, setShowRowSelectionDialog] = useState(false);
  const [matchingRows, setMatchingRows] = useState<any[]>([]);
  const [smartsheetRowId, setSmartsheetRowId] = useState<string | number | null>(null);

  // Ref to track if we should preserve pricing option (e.g., from Smartsheet pre-population)
  const preservePricingOptionRef = useRef<string | null>(null);

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

  // Check if template contains blood test placeholders (check original template, not rendered content)
  const templateHasBloodTestFields = useMemo(() => {
    // Check the original template body, not the rendered emailContent
    const originalTemplate = templates.length > 0 ? templates[0].body : '';
    return originalTemplate.includes('#DayOfWeek') || 
           originalTemplate.includes('#Date') || 
           originalTemplate.includes('#Hour') || 
           originalTemplate.includes('#Location');
  }, [templates]);

  // Check if template contains Clalit insurance placeholder
  const templateHasClalitField = useMemo(() => {
    const originalTemplate = templates.length > 0 ? templates[0].body : '';
    return originalTemplate.includes('#ClalitText');
  }, [templates]);

  // Check if template contains Signature placeholder
  const templateHasSignatureField = useMemo(() => {
    const originalTemplate = templates.length > 0 ? templates[0].body : '';
    return originalTemplate.includes('#Signature');
  }, [templates]);

  // Reset form to defaults (used when email changes)
  const resetFormToDefaults = () => {
    // Reset to first test
    if (tests.length > 0) {
      setSelectedTestId(tests[0].id);
    }
    
    // Clear patient-specific data
    setPatientName('');
    setClalitExplicitlyDisabled(false);
    setSendClalitInfo(false);
    
    // Clear pricing option ref
    preservePricingOptionRef.current = null;
    setSmartsheetRowId(null);
    
    // Pricing option will be reset by the test change effect
    
    // Clear messages
    setSuccess(undefined);
    setError(undefined);
    
    // Clear preview
    setShowTemplateEditor(false);
    setEmailContent('');
    setPreview('');
  };

  // Load tests, locations, user session, and CC defaults on mount
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
    
    // Load blood test locations
    const loadLocations = async () => {
      try {
        const res = await fetch('/api/bloodTestLocations');
        const data = await res.json();
        if (res.ok) {
          setLocations(data.locations);
        }
      } catch (e: any) {
        console.error('Failed to load locations:', e);
      }
    };
    loadLocations();

    // Load user session to get email for reply-to default
    const loadUserSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.user?.email) {
          setCurrentUserEmail(session.user.email);
          // replyToEmail will be set by the verification check useEffect
        }
      } catch (e: any) {
        console.error('Failed to load user session:', e);
      }
    };
    loadUserSession();

    // Load CC default emails
    const loadCCDefaults = async () => {
      try {
        const res = await fetch('/api/ccDefaultEmails');
        const data = await res.json();
        if (res.ok) {
          setCcDefaultEmails(data.ccDefaultEmails);
        }
      } catch (e: any) {
        console.error('Failed to load CC default emails:', e);
      }
    };
    loadCCDefaults();

    // Load signatures
    const loadSignatures = async () => {
      try {
        const res = await fetch('/api/signatures');
        const data = await res.json();
        if (res.ok) {
          setSignatures(data.signatures);
        }
      } catch (e: any) {
        console.error('Failed to load signatures:', e);
      }
    };
    loadSignatures();

    // Load verified SES emails
    const loadVerifiedEmails = async () => {
      try {
        const res = await fetch('/api/verified-ses-emails');
        const data = await res.json();
        if (res.ok) {
          setVerifiedEmails(data.verifiedEmails);
        }
      } catch (e: any) {
        console.error('Failed to load verified emails:', e);
      }
    };
    loadVerifiedEmails();
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
          
          // Check if we have a preserved pricing option (e.g., from Smartsheet)
          if (preservePricingOptionRef.current) {
            // Use the preserved pricing option
            setSelectedPricingOptionId(preservePricingOptionRef.current);
            // Clear the ref after using it
            preservePricingOptionRef.current = null;
          } else {
            // Select the first pricing option by default
            setSelectedPricingOptionId(t.pricingOptions[0]?.id || '');
          }
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
        } else {
          // No template available, use empty content
          setEmailContent('');
          setEmailIsRTL(true);
          setEmailSubject('');
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

  // Check verification status
  useEffect(() => {
    if (currentUserEmail && verifiedEmails.length > 0) {
      const isVerified = verifiedEmails.includes(currentUserEmail);
      setIsCurrentUserVerified(isVerified);
    }
  }, [currentUserEmail, verifiedEmails]);

  // Reset preview when any form field changes (similar to test selection reset)
  useEffect(() => {
    setShowTemplateEditor(false);
    setEmailContent('');
  }, [
    nameOnTemplate,
    selectedPricingOptionId,
    patientName,
    toEmail,
    emailSubject,
    ccEmails,
    sendClalitInfo,
    selectedSignatureId,
    bloodTestDayOfWeek,
    bloodTestDate,
    bloodTestHour,
    bloodTestLocation
  ]);

  // Auto-select signature based on currentUserEmail
  useEffect(() => {
    if (currentUserEmail && signatures.length > 0) {
      const matchingSignature = signatures.find(sig => sig.email === currentUserEmail);
      if (matchingSignature) {
        setSelectedSignatureId(matchingSignature.id);
      } else {
        setSelectedSignatureId(''); // No signature for current user
      }
    }
  }, [currentUserEmail, signatures]);

  // Automatically determine day of week from selected date
  useEffect(() => {
    if (bloodTestDate) {
      const date = new Date(bloodTestDate + 'T00:00:00'); // Add time to avoid timezone issues
      const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setBloodTestDayOfWeek(dayNames[dayIndex]);
    }
  }, [bloodTestDate]);

  const handleGeneratePreview = async () => {
    setError(undefined);
    setSuccess(undefined);
    setPreview('');

    // Check if user email is verified first
    if (!isCurrentUserVerified) {
      setError('Your email is not verified. Unable to send emails');
      return;
    }

    if (!selectedTest) {
      setError('Please select a test');
      return;
    }
    if (!nameOnTemplate || !selectedPricingOptionId) {
      setError('Please select Name on Template and Pricing Option');
      return;
    }
    if (!toEmail) {
      setError('Please enter recipient email');
      return;
    }
    if (!currentUserEmail) {
      setError('User email not found');
      return;
    }

    // Validate blood test fields if template contains those placeholders
    if (templates.length > 0) {
      const originalTemplate = templates[0].body;
      
      if (originalTemplate.includes('#DayOfWeek') && !bloodTestDayOfWeek) {
        setError('Please select day of week - it is required by this template');
        return;
      }
      
      if (originalTemplate.includes('#Date') && !bloodTestDate) {
        setError('Please select date - it is required by this template');
        return;
      }
      
      if (originalTemplate.includes('#Hour') && !bloodTestHour) {
        setError('Please select time - it is required by this template');
        return;
      }
      
      if (originalTemplate.includes('#Location') && !bloodTestLocation) {
        setError('Please select location - it is required by this template');
        return;
      }
    }

    // Validate signature if template requires it
    if (templateHasSignatureField && !selectedSignatureId) {
      setError('Signature is required for this template. Please add a signature for your email.');
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

      // Always use the original template from templates, not the rendered emailContent
      // This ensures that when user changes values and clicks Preview again, new values are used
      let bodyToUse = '';
      let isRTLToUse = emailIsRTL;

      if (templates.length > 0) {
        bodyToUse = templates[0].body;
        isRTLToUse = templates[0].isRTL;
      } else {
        setError('No template found for this test');
        setPreviewing(false);
        return;
      }

      // Build CC list: always include current user email plus any user-specified CCs
      const ccList = ccEmails.trim() 
        ? `${currentUserEmail}, ${ccEmails}` 
        : currentUserEmail;

      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: selectedTest.id,
          body: bodyToUse,
          subject: emailSubject || undefined,
          isRTL: isRTLToUse,
          nameOnTemplate,
          installment: selectedPricingOption.installment,
          price: selectedPricingOption.price,
          toEmail,
          patientName,
          replyTo: currentUserEmail,
          ccEmails: ccList,
          icreditText: selectedPricingOption.icreditText,
          icreditLink: selectedPricingOption.icreditLink,
          iformsText: selectedPricingOption.iformsText,
          iformsLink: selectedPricingOption.iformsLink,
          sendClalitInfo,
          signatureId: selectedSignatureId || undefined,
          // Blood test scheduling fields (optional)
          dayOfWeek: bloodTestDayOfWeek ? getHebrewDayOfWeek(bloodTestDayOfWeek) : undefined,
          date: bloodTestDate || undefined,
          hour: bloodTestHour || undefined,
          location: bloodTestLocation || undefined,
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
      setExcludedAttachmentIds([]); // Reset excluded attachments on new preview
      setShowTemplateEditor(true);
    } catch (e: any) {
      setError(e?.message || 'Unexpected error generating preview');
    } finally {
      setPreviewing(false);
    }
  };

  const populateFormWithData = (data: any) => {
    // Clear previous data to avoid persistence issues
    setPatientName('');
    setClalitExplicitlyDisabled(false);
    setSendClalitInfo(false);
    setSmartsheetRowId(null);
    // Clear pricing option ref to prevent stale data
    preservePricingOptionRef.current = null;
    
    // Populate patient name if available
    if (data.patientName) {
      setPatientName(data.patientName);
    }

    // Store row ID if available
    if (data.rowId) {
      setSmartsheetRowId(data.rowId);
    }
    
    // Handle Clalit status if available
    if (data.clalitStatus !== undefined && data.clalitStatus !== null) {
      // If clalitStatus is true (Yes), show Clalit info and allow user to toggle
      if (data.clalitStatus === true) {
        setSendClalitInfo(true);
        setClalitExplicitlyDisabled(false);
      }
      // If clalitStatus is false (No), hide Clalit section completely (like when template has no tag)
      else if (data.clalitStatus === false) {
        setSendClalitInfo(false);
        setClalitExplicitlyDisabled(true); // This will hide the entire Clalit section
      }
    }
    // If clalitStatus is null/undefined (empty), default to true (include Clalit info) and allow toggle
    else {
      setSendClalitInfo(true);
      setClalitExplicitlyDisabled(false);
    }
    
    // Handle test name mapping
    let autoSelectedTest: PatientTest | undefined;
    
    if (data.testId) {
      // Mapping found - auto-select the test
      autoSelectedTest = tests.find(t => t.id === data.testId);
      
      if (autoSelectedTest) {
        // Logic for selecting pricing option
        let targetPricingOptionId: string | null = null;

        // Case 1: Smartsheet provides a Price
        if (data.price !== undefined && data.price !== null) {
          const smartsheetPrice = Number(data.price);
          
          // Find all options matching that price
          const matchingOptions = autoSelectedTest.pricingOptions.filter(
            opt => Number(opt.price) === smartsheetPrice
          );

          if (matchingOptions.length === 0) {
            // No match found for this price -> Warning + Global Default
            setSmartsheetErrorMessage(
              `Price "${smartsheetPrice}" found in Smartsheet but no matching option exists for test "${autoSelectedTest.name}".\n\n` +
              `Falling back to default pricing option.`
            );
            setSmartsheetErrorType('warning');
            setShowSmartsheetErrorDialog(true);

            // Fallback to global default
            const globalDefault = autoSelectedTest.pricingOptions.find(opt => opt.isGlobalDefault);
            targetPricingOptionId = globalDefault ? globalDefault.id : (autoSelectedTest.pricingOptions[0]?.id || null);
          } else if (matchingOptions.length === 1) {
            // Single match -> Select it
            targetPricingOptionId = matchingOptions[0].id;
          } else {
            // Multiple matches -> Look for isPriceDefault
            const priceDefault = matchingOptions.find(opt => opt.isPriceDefault);
            if (priceDefault) {
              targetPricingOptionId = priceDefault.id;
            } else {
              // No specific default for this price -> Select first match
              targetPricingOptionId = matchingOptions[0].id;
            }
          }
        } 
        // Case 2: Smartsheet provides NO Price
        else {
          // Select Global Default
          const globalDefault = autoSelectedTest.pricingOptions.find(opt => opt.isGlobalDefault);
          targetPricingOptionId = globalDefault ? globalDefault.id : (autoSelectedTest.pricingOptions[0]?.id || null);
        }

        if (targetPricingOptionId) {
          preservePricingOptionRef.current = targetPricingOptionId;
        }
      }
      
      // Now change the test - the useEffect will use the preserved pricing option or default to first
      setSelectedTestId(data.testId);
    } else if (data.unmappedTestName) {
      // No mapping found - show warning dialog
      setSmartsheetErrorMessage(
        `Test "${data.unmappedTestName}" found in Smartsheet but no mapping configured.\n\n` +
        `Please select the test manually or add a mapping in Smartsheet Maps page.`
      );
      setSmartsheetErrorType('warning');
      setShowSmartsheetErrorDialog(true);
      // Don't return here, still populate other fields
    } else {
      // No test mapping, but we might still have pricing data for current test
      if (selectedTest) {
        let targetPricingOptionId: string | null = null;

        if (data.price !== undefined && data.price !== null) {
          const smartsheetPrice = Number(data.price);
          const matchingOptions = selectedTest.pricingOptions.filter(
            opt => Number(opt.price) === smartsheetPrice
          );

          if (matchingOptions.length === 0) {
             // Warning already shown if unmapped, but if just no mapping found (and no unmapped name?), 
             // we might want to show warning about price mismatch on current test?
             // Let's just follow the selection logic.
             const globalDefault = selectedTest.pricingOptions.find(opt => opt.isGlobalDefault);
             targetPricingOptionId = globalDefault ? globalDefault.id : (selectedTest.pricingOptions[0]?.id || null);
          } else if (matchingOptions.length === 1) {
             targetPricingOptionId = matchingOptions[0].id;
          } else {
             const priceDefault = matchingOptions.find(opt => opt.isPriceDefault);
             targetPricingOptionId = priceDefault ? priceDefault.id : matchingOptions[0].id;
          }
        } else {
           // No price -> Global default
           const globalDefault = selectedTest.pricingOptions.find(opt => opt.isGlobalDefault);
           targetPricingOptionId = globalDefault ? globalDefault.id : (selectedTest.pricingOptions[0]?.id || null);
        }

        if (targetPricingOptionId) {
          setSelectedPricingOptionId(targetPricingOptionId);
        }
      }
    }
    
    // Show success message with what was loaded
    let successMsg = 'Data loaded from Smartsheet!';
    const loadedFields: string[] = [];
    if (data.patientName) loadedFields.push('Patient Name');
    if (data.testId) loadedFields.push('Test (auto-selected)');
    if (data.price !== undefined && data.price !== null) {
      loadedFields.push('Pricing Option (auto-selected)');
    }
    if (data.clalitStatus !== undefined && data.clalitStatus !== null) loadedFields.push('Clalit Status');
    
    if (loadedFields.length > 0) {
      successMsg += ' Loaded: ' + loadedFields.join(', ');
    }
    
    // Only set success if there's no error (from unmapped test)
    if (!data.unmappedTestName) {
      setSuccess(successMsg);
    }
  };

  const handleRowSelection = (match: any) => {
    setShowRowSelectionDialog(false);
    populateFormWithData(match);
  };

  const handleFetchFromSmartsheet = async () => {
    if (!toEmail) return;
    
    setLoadingSmartsheet(true);
    setError(undefined);
    setSuccess(undefined);
    
    try {
      const res = await fetch('/api/fetchPatientFromSmartsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: toEmail })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setSmartsheetErrorMessage(data.error || 'Failed to fetch from Smartsheet');
        setSmartsheetErrorType('error');
        setShowSmartsheetErrorDialog(true);
        return;
      }
      
      if (!data.found) {
        setSmartsheetErrorMessage(data.error || 'No patient found with this email in Smartsheet');
        setSmartsheetErrorType('error');
        setShowSmartsheetErrorDialog(true);
        return;
      }

      if (data.multipleMatches) {
        setMatchingRows(data.matches);
        setShowRowSelectionDialog(true);
        return;
      }
      
      populateFormWithData(data);
      
    } catch (e: any) {
      setSmartsheetErrorMessage(e?.message || 'Failed to connect to Smartsheet');
      setSmartsheetErrorType('error');
      setShowSmartsheetErrorDialog(true);
    } finally {
      setLoadingSmartsheet(false);
    }
  };

  const handleSend = async () => {
    setError(undefined);
    setSuccess(undefined);
    setShowSendConfirmation(false); // Close the confirmation dialog

    // Check if user email is verified first
    if (!isCurrentUserVerified) {
      setError('Your email is not verified. Unable to send emails');
      return;
    }

    if (!selectedTest) {
      setError('Please select a test');
      return;
    }
    if (!emailContent.trim()) {
      setError('Please generate the email preview first.');
      return;
    }
    if (!nameOnTemplate || !selectedPricingOptionId || !toEmail || !currentUserEmail) {
      setError('Please fill all required fields before sending');
      return;
    }

    // Validate blood test fields if template contains those placeholders
    if (templates.length > 0) {
      const originalTemplate = templates[0].body;
      
      if (originalTemplate.includes('#DayOfWeek') && !bloodTestDayOfWeek) {
        setError('Please select day of week - it is required by this template');
        return;
      }
      
      if (originalTemplate.includes('#Date') && !bloodTestDate) {
        setError('Please select date - it is required by this template');
        return;
      }
      
      if (originalTemplate.includes('#Hour') && !bloodTestHour) {
        setError('Please select time - it is required by this template');
        return;
      }
      
      if (originalTemplate.includes('#Location') && !bloodTestLocation) {
        setError('Please select location - it is required by this template');
        return;
      }
    }

    // Validate signature if template requires it
    if (templateHasSignatureField && !selectedSignatureId) {
      setError('Signature is required for this template. Please add a signature for your email.');
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
      
      // Build CC list: always include current user email plus any user-specified CCs
      const ccList = ccEmails.trim() 
        ? `${currentUserEmail}, ${ccEmails}` 
        : currentUserEmail;
      
      const requestBody = JSON.stringify({
        testId: selectedTest.id,
        smartsheetRowId,
        body: emailContent,
        subject: emailSubject || undefined,
        isRTL: emailIsRTL,
        nameOnTemplate,
        installment: selectedPricingOption.installment,
        price: selectedPricingOption.price,
        toEmail,
        patientName,
        replyTo: currentUserEmail,
        ccEmails: ccList,
        icreditText: selectedPricingOption.icreditText,
        icreditLink: selectedPricingOption.icreditLink,
        iformsText: selectedPricingOption.iformsText,
        iformsLink: selectedPricingOption.iformsLink,
        temporaryAttachmentIds: temporaryAttachments.map(att => att.id),
        excludedAttachmentIds: excludedAttachmentIds,
        sendClalitInfo,
        signatureId: selectedSignatureId || undefined,
        // Blood test scheduling fields (optional)
        dayOfWeek: bloodTestDayOfWeek ? getHebrewDayOfWeek(bloodTestDayOfWeek) : undefined,
        date: bloodTestDate || undefined,
        hour: bloodTestHour || undefined,
        location: bloodTestLocation || undefined,
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

      // Check if Smartsheet update failed
      if (data.smartsheetUpdateError) {
        setSmartsheetUpdateErrorMessage(data.smartsheetUpdateError);
        setShowSmartsheetUpdateErrorDialog(true);
      }

      // Enhanced success message with more details
      const toRecipient = data.to || toEmail;
      const ccRecipients = data.cc || (ccEmails.trim() ? ccEmails.split(',').map(e => e.trim()).filter(Boolean) : []);

      setSuccess(
        `Email sent successfully via Amazon SES!\n` +
        `Subject: ${data.subject || selectedTest.name}\n` +
        `To: ${toRecipient}\n` +
        `${ccRecipients.length > 0 ? `CC: ${ccRecipients.join(', ')}\n` : ''}` +
        `${data.attachmentsCount > 0 ? `Attachments: ${data.attachmentsCount} file(s)\n` : ''}` +
        `Email delivered successfully!`
      );

      // Clear form after successful send
      setPatientName('');
      setToEmail('');
      setEmailSubject('');
      setCcEmails('');
      setEmailContent('');
      setTemporaryAttachments([]);
      setExcludedAttachmentIds([]);
      setSendClalitInfo(false);
      setShowTemplateEditor(false);
      // Clear blood test fields
      setBloodTestDayOfWeek('');
      setBloodTestDate('');
      setBloodTestHour('');
      setBloodTestLocation('');
    } catch (e: any) {
      setError(e?.message || 'Unexpected error sending email');
    } finally {
      setSending(false);
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

      <div className="w-full max-w-6xl space-y-6">
        {(!loading && !error && tests.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl shadow-sm">
            <Image src="/images/conversation.svg" alt="No tests" width={64} height={64} className="mb-4 opacity-80" />
            <h2 className="text-lg font-semibold mb-3">There are no tests</h2>
            <Button asChild>
              <Link href="/addtests">Add test</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-md p-4 md:p-5 mb-4">
              <h1 className="text-xl font-bold mb-1">Send Emails to Patients</h1>
              <p className="text-blue-100 text-sm">Generate and send personalized emails to patients with test information</p>
            </div>

            {/* Two-column grid for main sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Test Selection & Status Card */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Test Selection &amp; Status</h2>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Test Selection
                      </label>
                      <select
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 font-medium"
                        disabled={loading}
                        value={selectedTestId}
                        onChange={(e) => setSelectedTestId(e.target.value)}
                      >
                        {[...tests].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Template Status
                        </span>
                      </label>
                      <div className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${
                        templates.length > 0 
                          ? 'bg-green-50 text-green-700 border-2 border-green-200' 
                          : 'bg-red-50 text-red-700 border-2 border-red-200'
                      }`}>
                        {templates.length > 0 ? (
                          <>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Template available
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            No template found
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Configuration Card */}
              {selectedTest && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-bold text-gray-800">Test Configuration</h2>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          Name on Template
                        </label>
                        <select
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white text-gray-900 font-medium"
                          value={nameOnTemplate}
                          onChange={(e) => setNameOnTemplate(e.target.value)}
                        >
                          {selectedTest.templateNames.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pricing Option
                          </span>
                        </label>
                        <select
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white text-gray-900 font-medium"
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
                          <p className="text-xs text-gray-600 mt-1 ml-1">
                            {selectedPricingOption.installment} payment{selectedPricingOption.installment !== 1 ? 's' : ''} of {(selectedPricingOption.price / selectedPricingOption.installment).toFixed(2)} ₪ each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Two-column grid for Patient Details and Email Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Patient Details Card */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Patient Details</h2>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Patient Name (Optional)
                      </label>
                      <Input
                        placeholder="Enter patient full name (optional)"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Send To (Email)
                      </label>
                      <Input
                        placeholder="patient@example.com"
                        value={toEmail}
                        onChange={(e) => {
                          const newEmail = e.target.value;
                          setToEmail(newEmail);
                          // Reset form immediately when email changes
                          if (newEmail !== toEmail) {
                            resetFormToDefaults();
                          }
                        }}
                        className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium h-11"
                        type="email"
                      />
                      <p className="text-xs text-gray-500 mt-2 ml-1">
                        Primary recipient email address. You can add CC recipients in the Email Settings section below.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFetchFromSmartsheet}
                        disabled={!toEmail || loadingSmartsheet}
                        className="mt-3 border-2 border-blue-300 hover:bg-blue-50 text-blue-700 font-semibold"
                      >
                        {loadingSmartsheet ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Fetching from Smartsheet...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Pre-populate from Smartsheet
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Settings Card */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Email Settings</h2>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Email Subject (Optional)
                    </label>
                    <Input
                      placeholder="Custom email subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium h-11"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Optional custom subject. If not provided, will use the template&apos;s subject or test name.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Reply-To Email (Your Email)
                    </label>
                    <div className={`w-full border-2 rounded-lg px-4 py-2.5 font-medium h-11 flex items-center ${
                      isCurrentUserVerified 
                        ? 'bg-green-50 border-green-300 text-green-800' 
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}>
                      <span className="flex items-center gap-2">
                        {isCurrentUserVerified ? (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        {currentUserEmail || 'Loading...'}
                      </span>
                    </div>
                    {!isCurrentUserVerified && currentUserEmail && (
                      <div className="mt-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                        <p className="text-xs text-red-700 font-semibold">
                          ⚠️ Your email ({currentUserEmail}) is not verified in AWS SES. 
                          Please verify it in the AWS SES dashboard before you can send emails.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Signature Status Display */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Email Signature Status
                    </label>
                    {templateHasSignatureField ? (
                      // Template requires signature
                      selectedSignatureId ? (
                        <div className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 bg-green-50 text-green-700 border-2 border-green-200">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Signature available for {currentUserEmail}
                        </div>
                      ) : (
                        <div className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 bg-red-50 text-red-700 border-2 border-red-200">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Signature needed for this template. Please make sure signature is added
                        </div>
                      )
                    ) : (
                      // Template doesn't require signature - check if user has one anyway
                      selectedSignatureId ? (
                        <div className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 bg-yellow-50 text-yellow-700 border-2 border-yellow-200">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Signature available but not needed in the template
                        </div>
                      ) : (
                        <div className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 bg-yellow-50 text-yellow-700 border-2 border-yellow-200">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Signature unavailable but not needed in the template
                        </div>
                      )
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      CC Emails (Optional)
                    </label>
                    <Input
                      type="text"
                      placeholder="email1@example.com, email2@example.com"
                      value={ccEmails}
                      onChange={(e) => setCcEmails(e.target.value)}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium h-11"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Enter email addresses separated by commas, or click preset buttons below. Note: Your email will be automatically CC&apos;d.
                    </p>
                    
                    {ccDefaultEmails.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ccDefaultEmails.map((preset) => {
                          const isActive = ccEmails.includes(preset.email);
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                // Add email to CC field if not already there
                                if (!isActive) {
                                  const newCC = ccEmails.trim() 
                                    ? `${ccEmails.trim()}, ${preset.email}` 
                                    : preset.email;
                                  setCcEmails(newCC);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-orange-600 text-white shadow-md'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {preset.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Blood Test Scheduling Section - Full Width - Conditionally Rendered */}
            {templateHasBloodTestFields && (() => {
                  // Use original template body to check which fields are needed
                  const originalTemplate = templates.length > 0 ? templates[0].body : '';
                  return (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-gray-800">Blood Test Scheduling</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-4">
                          This template includes blood test scheduling information. Please fill in the details below.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {originalTemplate.includes('#DayOfWeek') && (
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">
                              Day of Week <span className="text-blue-500 text-xs font-normal">(Auto-calculated)</span>
                            </label>
                            <Input
                              type="text"
                              readOnly
                              value={bloodTestDayOfWeek || 'Select a date first'}
                              className="border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 font-medium h-11 cursor-not-allowed"
                              placeholder="Auto-filled from date"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Automatically determined from the selected date
                            </p>
                          </div>
                        )}
                        
                        {originalTemplate.includes('#Date') && (
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">
                              Date <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="date"
                              value={bloodTestDate}
                              onChange={(e) => setBloodTestDate(e.target.value)}
                              className="border-2 border-gray-300 rounded-lg font-medium h-11"
                            />
                          </div>
                        )}
                        
                        {originalTemplate.includes('#Hour') && (
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">
                              Time <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="time"
                              value={bloodTestHour}
                              onChange={(e) => setBloodTestHour(e.target.value)}
                              className="border-2 border-gray-300 rounded-lg font-medium h-11"
                            />
                          </div>
                        )}
                        
                        {originalTemplate.includes('#Location') && (
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">
                              Location <span className="text-red-500">*</span>
                            </label>
                            <select
                              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-medium"
                              value={bloodTestLocation}
                              onChange={(e) => setBloodTestLocation(e.target.value)}
                            >
                              <option value="">Select location...</option>
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                            {locations.length === 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                No locations available. Please add locations in the Blood Test Locations page.
                              </p>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

            {/* Insurance Information Section - Full Width - Conditionally Rendered */}
            {templateHasClalitField && !clalitExplicitlyDisabled && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Insurance Information</h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sendClalitInfo"
                      checked={sendClalitInfo}
                      onChange={(e) => {
                        setSendClalitInfo(e.target.checked);
                        // Clear the preview when checkbox changes to force re-preview
                        if (showTemplateEditor) {
                          setShowTemplateEditor(false);
                          setEmailContent('');
                        }
                      }}
                      className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sendClalitInfo" className="text-sm font-semibold text-gray-700">
                      Send Clalit Information
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 ml-8">
                    Check this box if the patient has Clalit insurance. This will include Clalit-specific text in the email where #ClalitText appears in the template.
                    {showTemplateEditor && (
                      <span className="text-orange-600 font-medium"> Click &quot;Preview Email&quot; again to see the updated content.</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <FormError message={error} />
            {success && success.includes('Email sent successfully') && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-green-800">Email Sent Successfully!</h3>
                </div>
                <div className="mt-2 text-sm text-green-700 whitespace-pre-line ml-11">
                  {success}
                </div>
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => {
                      // Refresh the page to reset everything
                      window.location.reload();
                    }}
                    variant="outline"
                    size="lg"
                    className="px-8 border-2 border-green-600 text-green-700 hover:bg-green-50 font-semibold"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Send Another Email
                  </Button>
                </div>
              </div>
            )}
            {success && !success.includes('Email sent successfully') && (
              <FormSuccess message={success} />
            )}

            {!success && (
              <div className="flex justify-center">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={previewing || loading || !selectedTestId || !selectedPricingOptionId || !toEmail}
                  size="lg"
                  className="px-10 py-6 text-base font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {previewing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview Email
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Template Editor - shows after preview is generated */}
            {showTemplateEditor && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-50 to-teal-100 border-b border-teal-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Review &amp; Edit Email Content</h2>
                      <p className="text-xs text-teal-700">
                        Review and edit the email content before sending. This is exactly what will be sent to the patient.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">

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
                    showPlaceholdersSection={false}
                  />

                  {/* Template Attachments Preview */}
                  {previewAttachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <h4 className="text-sm font-bold text-gray-800">Template Attachments</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">These files are attached from the template. Click &quot;Remove&quot; to exclude from this email.</p>
                      <div className="space-y-2">
                        {previewAttachments.map((attachment) => {
                          const isExcluded = excludedAttachmentIds.includes(attachment.id);
                          return (
                            <div 
                              key={attachment.id} 
                              className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                                isExcluded 
                                  ? 'bg-gray-100 border-gray-300 opacity-60' 
                                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isExcluded ? 'bg-gray-400' : 'bg-blue-500'
                                }`}>
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className={`text-sm font-semibold ${isExcluded ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                    {attachment.originalName}
                                    {isExcluded && <span className="ml-2 text-xs text-red-600 font-normal">(Excluded)</span>}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {formatFileSize(attachment.fileSize)} • {attachment.mimeType}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`/api/email/preview?attachmentId=${attachment.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.open(`/api/email/preview?attachmentId=${attachment.id}`, '_blank');
                                  }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </a>
                                {isExcluded ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExcludedAttachmentIds(prev => prev.filter(id => id !== attachment.id));
                                    }}
                                    className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-semibold hover:underline"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Re-add
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExcludedAttachmentIds(prev => [...prev, attachment.id]);
                                    }}
                                    className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-semibold hover:underline"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add Temporary Attachments for This Email */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <h4 className="text-sm font-bold text-gray-800">Add Attachments for This Email</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      These files will only be attached to this email and won&apos;t be saved to the template
                    </p>
                    
                    <div className="mb-3">
                      <label className="flex items-center justify-center w-full px-4 py-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:from-green-100 hover:to-green-200 hover:border-green-400 transition-all">
                        <div className="flex flex-col items-center">
                          <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm font-semibold text-green-700">
                            {uploadingTemp ? 'Uploading files...' : 'Click to upload files'}
                          </p>
                          <p className="text-xs text-green-600 mt-1">or drag and drop</p>
                        </div>
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
                          className="hidden"
                        />
                      </label>
                    </div>

                    {temporaryAttachments.length > 0 && (
                      <div className="space-y-2">
                        {temporaryAttachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{file.originalName}</p>
                                <p className="text-xs text-gray-600">
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
                              className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-semibold hover:underline"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Send Button - at the bottom */}
            {showTemplateEditor && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setShowSendConfirmation(true)}
                  disabled={sending || !selectedTestId || !emailContent.trim() || !selectedPricingOptionId || !toEmail}
                  size="lg"
                  className="px-10 py-6 text-base font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Email
                    </>
                  )}
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
        description={`Are you sure you want to send the email for "${selectedTest?.name}" Test?\n\nTo: ${toEmail}${selectedPricingOption ? `\n\nPricing: ${selectedPricingOption.installment} installment${selectedPricingOption.installment !== 1 ? 's' : ''} - ${selectedPricingOption.price.toLocaleString()} ₪` : ''}${ccEmails.trim() ? `\n\nCC: ${currentUserEmail}, ${ccEmails}` : `\n\nCC: ${currentUserEmail}`}${currentUserEmail ? `\n\nReply-To: ${currentUserEmail}` : ''}${previewAttachments.length > 0 ? `\n\nTemplate Attachments: ${previewAttachments.filter(a => !excludedAttachmentIds.includes(a.id)).length} file(s)${excludedAttachmentIds.length > 0 ? ` (${excludedAttachmentIds.length} excluded)` : ''}` : ''}${temporaryAttachments.length > 0 ? `\n\nAdditional Attachments: ${temporaryAttachments.length} file(s)` : ''}`}
        isSending={sending}
      />

      <ErrorDialogBox
        open={showSmartsheetErrorDialog}
        onOpenChange={setShowSmartsheetErrorDialog}
        title={smartsheetErrorType === 'error' ? 'Smartsheet Error' : 'Smartsheet Warning'}
        message={smartsheetErrorMessage}
        type={smartsheetErrorType}
      />

      <SmartsheetRowSelectionDialog
        open={showRowSelectionDialog}
        onOpenChange={setShowRowSelectionDialog}
        matches={matchingRows}
        onSelect={handleRowSelection}
      />

      <ErrorDialogBox
        open={showSmartsheetUpdateErrorDialog}
        onOpenChange={setShowSmartsheetUpdateErrorDialog}
        title="Email Sent - Smartsheet Update Failed"
        message={smartsheetUpdateErrorMessage}
        type="warning"
      />
    </div>
  );
};

export default IndexContentArea;
