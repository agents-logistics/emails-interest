'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useMemo, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { REQUIRED_TEMPLATE_TOKENS } from '@/schemas';

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
type ApiListTemplatesResp = { templates: { id: string; testId: string; body: string; isRTL: boolean }[] };

const AddTemplatesContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [tests, setTests] = useState<PatientTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isRTL, setIsRTL] = useState<boolean>(true);
  const [existingTemplateId, setExistingTemplateId] = useState<string>('');

  // Preview controls (let user pick values from selected test)
  const [previewNameOnTemplate, setPreviewNameOnTemplate] = useState<string>('');
  const [previewPricingOptionId, setPreviewPricingOptionId] = useState<string>('');
  const [previewPatientName, setPreviewPatientName] = useState<string>('');

  // UI feedback
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [previewRTL, setPreviewRTL] = useState<boolean>(true);

  // Rich text editor state
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(14);
  const [fontColor, setFontColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  
  // Link dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);

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
        setPreviewPricingOptionId('');
        setBody('');
        setIsRTL(true);
        setExistingTemplateId('');
      }
    };

    loadTemplateForTest();
  }, [selectedTestId, selectedTest]);

  // Update editor when body changes (e.g., when loading template)
  useEffect(() => {
    updateEditorFromBody();
  }, [body]);

  // Initialize rich text editor
  useEffect(() => {
    if (editorRef.current) {
      // Enable rich text editing
      try {
        document.execCommand('defaultParagraphSeparator', false, 'div');
        document.execCommand('styleWithCSS', false, 'true');
        console.log('Rich text editor initialized');
      } catch (e) {
        console.warn('Failed to initialize rich text editor:', e);
      }
    }
  }, []);

  const allTokensPresent = useMemo(() => {
    // Check tokens in both HTML content and plain text
    const textContent = editorRef.current?.textContent || body;
    const htmlContent = body;
    return REQUIRED_TEMPLATE_TOKENS.every((t) => 
      textContent.includes(t) || htmlContent.includes(t)
    );
  }, [body]);
  
  const missingTokens = useMemo(() => {
    const textContent = editorRef.current?.textContent || body;
    const htmlContent = body;
    return REQUIRED_TEMPLATE_TOKENS.filter((t) => 
      !textContent.includes(t) && !htmlContent.includes(t)
    );
  }, [body]);

  // Rich text editor functions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateBodyFromEditor();
  };

  const updateBodyFromEditor = () => {
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  const updateEditorFromBody = () => {
    if (editorRef.current && editorRef.current.innerHTML !== body) {
      editorRef.current.innerHTML = body;
    }
  };

  const applyFormat = (format: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          // Text is selected, apply format only to selection
          execCommand(format, value);
          updateBodyFromEditor();
          return;
        }
      }
      // No text selected, execCommand will apply to future typed text
      execCommand(format, value);
    }
  };

  const applyColorToSelection = (color: string, isBackground: boolean = false) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      alert('Please select text first before applying color');
      return;
    }
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      alert('Please select text first before applying color');
      return;
    }
    
    try {
      // Method 1: Try execCommand first
      const command = isBackground ? 'backColor' : 'foreColor';
      console.log(`Trying to apply ${command} with color ${color}`);
      
      const success = document.execCommand(command, false, color);
      console.log(`execCommand ${command} success:`, success);
      
      if (success) {
        updateBodyFromEditor();
        return;
      }
      
      // Method 2: Manual DOM manipulation fallback
      console.log('execCommand failed, trying manual method');
      const selectedText = range.toString();
      const span = document.createElement('span');
      
      if (isBackground) {
        span.style.backgroundColor = color;
      } else {
        span.style.color = color;
      }
      
      span.innerHTML = selectedText;
      range.deleteContents();
      range.insertNode(span);
      
      // Clear selection and update
      selection.removeAllRanges();
      updateBodyFromEditor();
      console.log('Manual color application successful');
      
    } catch (error) {
      console.error('Color application failed:', error);
      alert('Failed to apply color. Please try again.');
    }
  };

  const applyFontSizeToSelection = (size: number) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      alert('Please select text first before applying font size');
      return;
    }
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      alert('Please select text first before applying font size');
      return;
    }
    
    try {
      console.log(`Applying font size ${size}px to selected text`);
      const selectedText = range.toString();
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.innerHTML = selectedText;
      
      range.deleteContents();
      range.insertNode(span);
      
      // Clear selection and update
      selection.removeAllRanges();
      updateBodyFromEditor();
      console.log('Font size application successful');
      
    } catch (error) {
      console.error('Font size application failed:', error);
      alert('Failed to apply font size. Please try again.');
    }
  };

  const insertToken = (token: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      execCommand('insertText', token);
    }
  };

  const openLinkDialog = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      alert('Please select text first before adding a link');
      return;
    }
    
    const range = selection.getRangeAt(0);
    setSavedSelection(range.cloneRange());
    
    // Check if selected text is already a link
    let parentElement = range.commonAncestorContainer as Node;
    if (parentElement.nodeType === Node.TEXT_NODE) {
      parentElement = parentElement.parentNode!;
    }
    
    const linkElement = (parentElement as Element).closest('a');
    if (linkElement) {
      // Editing existing link
      setIsEditingLink(true);
      setLinkText(linkElement.textContent || '');
      setLinkUrl(linkElement.getAttribute('href') || '');
    } else {
      // Creating new link
      setIsEditingLink(false);
      const selectedText = range.toString();
      if (!selectedText) {
        alert('Please select text first before adding a link');
        return;
      }
      setLinkText(selectedText);
      setLinkUrl('');
    }
    
    setShowLinkDialog(true);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) {
      alert('Please enter a URL');
      return;
    }
    
    // Validate URL format
    let finalUrl = linkUrl.trim();
    if (!finalUrl.match(/^https?:\/\//i)) {
      finalUrl = 'https://' + finalUrl;
    }
    
    try {
      new URL(finalUrl);
    } catch (e) {
      alert('Please enter a valid URL');
      return;
    }
    
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // Restore saved selection
    if (savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
        
        // Create the link
        const anchor = document.createElement('a');
        anchor.href = finalUrl;
        anchor.textContent = linkText || finalUrl;
        anchor.style.color = '#0066cc';
        anchor.style.textDecoration = 'underline';
        anchor.target = '_blank'; // Open in new tab
        anchor.rel = 'noopener noreferrer'; // Security best practice
        
        savedSelection.deleteContents();
        savedSelection.insertNode(anchor);
        
        // Move cursor after the link
        savedSelection.setStartAfter(anchor);
        savedSelection.collapse(true);
        selection.removeAllRanges();
        selection.addRange(savedSelection);
        
        updateBodyFromEditor();
      }
    }
    
    // Reset state
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
    setIsEditingLink(false);
    setSavedSelection(null);
  };

  const removeLink = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      alert('Please place cursor on a link first');
      return;
    }
    
    const range = selection.getRangeAt(0);
    let parentElement = range.commonAncestorContainer as Node;
    if (parentElement.nodeType === Node.TEXT_NODE) {
      parentElement = parentElement.parentNode!;
    }
    
    const linkElement = (parentElement as Element).closest('a');
    if (linkElement) {
      // Replace link with its text content
      const textNode = document.createTextNode(linkElement.textContent || '');
      linkElement.parentNode?.replaceChild(textNode, linkElement);
      updateBodyFromEditor();
    } else {
      alert('No link found at cursor position');
    }
  };

  const handlePreview = async () => {
    setError(undefined);
    setSuccess(undefined);
    setPreview('');
    setPreviewRTL(true);

    if (!selectedTest) {
      setError('Please select a test');
      return;
    }
    if (!previewNameOnTemplate || !previewPricingOptionId || !previewPatientName) {
      setError('Please pick preview values for name, pricing option, and patient name');
      return;
    }
    if (!selectedPreviewPricingOption) {
      setError('Please select a valid pricing option');
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
            installment: selectedPreviewPricingOption.installment,
            price: selectedPreviewPricingOption.price,
            patientName: previewPatientName,
            toEmail: 'preview@example.com', // preview only
            icreditText: selectedPreviewPricingOption.icreditText,
            icreditLink: selectedPreviewPricingOption.icreditLink,
            iformsText: selectedPreviewPricingOption.iformsText,
            iformsLink: selectedPreviewPricingOption.iformsLink,
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
    <div className={`${styles.customRounded} flex flex-col items-center p-4 bg-white shadow-lg rounded-lg w-full h-full overflow-auto`}>
      <div className="w-full flex items-start mb-4">
        {!showNavigation && (
          <div>
            <Button variant="secondary" onClick={onShowNavigation}>Show Navigation</Button>
          </div>
        )}
      </div>

      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            {existingTemplateId ? 'Edit Email Template' : 'Create Email Template'}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Design and customize email templates with rich text formatting. Use placeholders to personalize emails for each patient.
          </p>
        </div>

        {tests.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Available</h3>
            <p className="text-gray-600 mb-6">You need to create a test before adding templates.</p>
            <Button asChild>
              <a href="/addtests">
                Add Test First
              </a>
            </Button>
          </div>
        ) : (
          <>
            {/* Configuration Section */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-medium mb-4 text-gray-900 border-b border-gray-100 pb-2">
                Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Select Test
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    value={selectedTestId}
                    onChange={(e) => setSelectedTestId(e.target.value)}
                  >
                    {tests.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="rtl"
                      checked={isRTL}
                      onChange={(e) => setIsRTL(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="rtl" className="text-sm font-medium text-gray-700">
                      Right-to-Left (Hebrew)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Editor */}
            <div className="border border-gray-200 rounded-lg bg-white">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900">
                  Template Editor
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create your email template with rich text formatting and placeholders
                </p>
              </div>
              
              {/* Formatting Toolbar */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Formatting Tools
                </h4>
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Font Size */}
                  <div className="flex items-center gap-2 bg-white rounded px-3 py-2 border border-gray-300">
                    <span className="text-xs font-medium text-gray-700">Size:</span>
                    <select
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      title="Select text first, then choose size"
                    >
                      <option value={10}>10px</option>
                      <option value={12}>12px</option>
                      <option value={14}>14px</option>
                      <option value={16}>16px</option>
                      <option value={18}>18px</option>
                      <option value={20}>20px</option>
                      <option value={24}>24px</option>
                      <option value={28}>28px</option>
                      <option value={32}>32px</option>
                    </select>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        console.log('Font size button clicked, size:', fontSize);
                        applyFontSizeToSelection(fontSize);
                      }}
                      title="Apply selected font size to selected text"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Colors */}
                  <div className="flex items-center gap-2 bg-white rounded px-3 py-2 border border-gray-300">
                    <span className="text-xs font-medium text-gray-700">Colors:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        title="Select text first, then choose color"
                      />
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          console.log('Text color button clicked, color:', fontColor);
                          applyColorToSelection(fontColor, false);
                        }}
                        title="Apply text color to selected text"
                        style={{ backgroundColor: fontColor, color: fontColor === '#000000' ? '#ffffff' : '#000000' }}
                      >
                        A
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        title="Select text first, then choose highlight color"
                      />
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          console.log('Highlight button clicked, color:', backgroundColor);
                          applyColorToSelection(backgroundColor, true);
                        }}
                        title="Apply highlight color to selected text"
                        style={{ backgroundColor: backgroundColor, color: backgroundColor === '#ffffff' ? '#000000' : '#ffffff' }}
                      >
                        H
                      </button>
                    </div>
                  </div>

                  {/* Text Formatting */}
                  <div className="flex items-center gap-1 bg-white rounded px-3 py-2 border border-gray-300">
                    <span className="text-xs font-medium text-gray-700 mr-2">Format:</span>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors font-bold"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormat('bold')}
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors italic"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormat('italic')}
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors underline"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormat('underline')}
                      title="Underline"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormat('removeFormat')}
                      title="Clear Formatting"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Text Alignment */}
                  <div className="flex items-center gap-1 bg-white rounded px-3 py-2 border border-gray-300">
                    <span className="text-xs font-medium text-gray-700 mr-2">Align:</span>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormat('justifyLeft')}
                      title="Align Left"
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormat('justifyCenter')}
                      title="Align Center"
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormat('justifyRight')}
                      title="Align Right"
                    >
                      Right
                    </button>
                  </div>

                  {/* Link Tools */}
                  <div className="flex items-center gap-1 bg-white rounded px-3 py-2 border border-gray-300">
                    <span className="text-xs font-medium text-gray-700 mr-2">Link:</span>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs bg-blue-600 text-white border border-blue-700 rounded hover:bg-blue-700 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={openLinkDialog}
                      title="Add or Edit Link"
                    >
                      🔗 Add Link
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={removeLink}
                      title="Remove Link"
                    >
                      Unlink
                    </button>
                  </div>

                </div>
              </div>

              {/* Token Insertion Section */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Insert Placeholders (Optional)
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {REQUIRED_TEMPLATE_TOKENS.map((token) => (
                    <button
                      key={token}
                      type="button"
                      className="px-3 py-2 text-xs bg-blue-600 text-white border border-blue-700 rounded hover:bg-blue-700 transition-colors font-medium"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertToken(token)}
                      title={`Insert ${token} placeholder`}
                    >
                      {token}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Click to insert placeholders into your template. Placeholders will be replaced with actual values when sending emails.
                </p>
              </div>

              {/* Rich Text Editor */}
              <div className="px-6 py-4">
                <div
                  ref={editorRef}
                  className="w-full min-h-[300px] border-2 border-gray-300 rounded-lg px-4 py-4 outline-none rich-text-editor bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  contentEditable="true"
                  suppressContentEditableWarning={true}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                  onInput={updateBodyFromEditor}
                  onBlur={updateBodyFromEditor}
                  onPaste={(e) => {
                    setTimeout(updateBodyFromEditor, 10);
                  }}
                  data-placeholder={`Write your email template here...\n\nAvailable placeholders: ${REQUIRED_TEMPLATE_TOKENS.join(', ')}\n\nExample:\nשלום #nameontemplate,\nשם מטופל: #nameofpatient\nמספר תשלומים: #numinstallaments\nמחיר: #price\nתשלום: #icreditlink\nטופס: #iformslink`}
                />

                <style jsx>{`
                  .rich-text-editor:empty:before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                    white-space: pre-wrap;
                    pointer-events: none;
                    font-style: italic;
                  }
                  .rich-text-editor:focus:before {
                    display: none;
                  }
                `}</style>

                {missingTokens.length > 0 && body.trim() && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Info:</strong> Not using these placeholders: <span className="font-mono ml-1">{missingTokens.join(', ')}</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Placeholders are optional. You can add them if needed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Configuration */}
            {selectedTest && (
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <h3 className="text-lg font-medium mb-4 text-gray-900 border-b border-gray-100 pb-2">
                  Preview Configuration
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set sample values to test how your template will look when sent to patients
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Name on Template
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      value={previewNameOnTemplate}
                      onChange={(e) => setPreviewNameOnTemplate(e.target.value)}
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
                      value={previewPricingOptionId}
                      onChange={(e) => setPreviewPricingOptionId(e.target.value)}
                    >
                      {selectedTest.pricingOptions.map((opt, index) => (
                        <option key={opt.id} value={opt.id}>
                          Option {index + 1} ({opt.installment} × {opt.price} ₪)
                        </option>
                      ))}
                    </select>
                    {selectedPreviewPricingOption && (
                      <p className="text-[0.8rem] text-gray-600 mt-1">
                        {selectedPreviewPricingOption.installment} payment{selectedPreviewPricingOption.installment !== 1 ? 's' : ''} of {(selectedPreviewPricingOption.price / selectedPreviewPricingOption.installment).toFixed(2)} ₪
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Patient Name
                    </label>
                    <Input
                      placeholder="Enter patient name"
                      value={previewPatientName}
                      onChange={(e) => setPreviewPatientName(e.target.value)}
                      className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <FormError message={error} />
            {success && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="text-sm font-medium text-green-800">Template {existingTemplateId ? 'Updated' : 'Saved'} Successfully</h3>
                <div className="mt-1 text-sm text-green-700">
                  {success}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handlePreview} 
                disabled={previewing || !selectedTest || !body.trim()}
                variant="outline"
              >
                {previewing ? 'Generating...' : 'Preview Template'}
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || !selectedTest || !body.trim()}
              >
                {saving ? 'Saving...' : (existingTemplateId ? 'Update Template' : 'Save Template')}
              </Button>
            </div>

            {preview && (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Template Preview</h3>
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

      {/* Link Dialog Modal */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowLinkDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isEditingLink ? 'Edit Link' : 'Insert Link'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Text
                </label>
                <Input
                  type="text"
                  placeholder="Enter link text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">The text that will be displayed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL
                </label>
                <Input
                  type="text"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      insertLink();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">The URL the link will point to</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={insertLink}
                className="flex-1"
              >
                {isEditingLink ? 'Update Link' : 'Insert Link'}
              </Button>
              <Button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkText('');
                  setIsEditingLink(false);
                  setSavedSelection(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTemplatesContentArea;
