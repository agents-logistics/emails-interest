'use client';
import React, { FC, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { REQUIRED_TEMPLATE_TOKENS } from '@/schemas';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

type PricingOption = {
  id: string;
  installment: number;
  price: number;
  icreditText: string;
  icreditLink: string;
  iformsText: string;
  iformsLink: string;
};

type EmailAttachment = {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
};

type PatientTest = {
  id: string;
  name: string;
  templateNames: string[];
  emailCopies: string[];
  pricingOptions: PricingOption[];
};

type TemplateEditorProps = {
  body: string;
  onBodyChange: (body: string) => void;
  isRTL: boolean;
  onIsRTLChange: (isRTL: boolean) => void;
  selectedTest?: PatientTest | null;
  templateId?: string;
  previewNameOnTemplate?: string;
  previewPricingOptionId?: string;
  className?: string;
  showPreviewSection?: boolean;
  showConfigurationSection?: boolean;
  showAttachmentsSection?: boolean;
  attachments?: EmailAttachment[];
  onAttachmentsChange?: (attachments: EmailAttachment[]) => void;
};

const TemplateEditor: FC<TemplateEditorProps> = ({
  body,
  onBodyChange,
  isRTL,
  onIsRTLChange,
  selectedTest,
  templateId,
  previewNameOnTemplate = '',
  previewPricingOptionId = '',
  className = '',
  showPreviewSection = true,
  showConfigurationSection = true,
  showAttachmentsSection = true,
  attachments = [],
  onAttachmentsChange,
}) => {
  // Link dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [previewRTL, setPreviewRTL] = useState<boolean>(true);
  const [previewAttachments, setPreviewAttachments] = useState<any[]>([]);
  const [localPreviewNameOnTemplate, setLocalPreviewNameOnTemplate] = useState<string>(previewNameOnTemplate || '');
  const [localPreviewPricingOptionId, setLocalPreviewPricingOptionId] = useState<string>(previewPricingOptionId || '');
  const [previewPatientName, setPreviewPatientName] = useState<string>('');

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Get selected pricing option for preview
  const selectedPreviewPricingOption = useMemo(() => {
    if (!selectedTest || !localPreviewPricingOptionId) return null;
    return selectedTest.pricingOptions.find(opt => opt.id === localPreviewPricingOptionId);
  }, [selectedTest, localPreviewPricingOptionId]);

  // Check if all required tokens are present
  const allTokensPresent = useMemo(() => {
    return REQUIRED_TEMPLATE_TOKENS.every((t) => body.includes(t));
  }, [body]);

  const missingTokens = useMemo(() => {
    return REQUIRED_TEMPLATE_TOKENS.filter((t) => !body.includes(t));
  }, [body]);

  // Sync preview props with local state
  useEffect(() => {
    setLocalPreviewNameOnTemplate(previewNameOnTemplate || '');
  }, [previewNameOnTemplate]);

  useEffect(() => {
    setLocalPreviewPricingOptionId(previewPricingOptionId || '');
  }, [previewPricingOptionId]);

  // Configure custom font sizes with inline styles (email-compatible)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const Quill = require('react-quill').Quill;
      const Size = Quill.import('attributors/style/size');
      Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];
      Quill.register(Size, true);
    }
  }, []);

  // Image upload handler
  const imageHandler = useCallback(function(this: any) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    // Store reference to the Quill editor instance
    // In Quill toolbar handlers, 'this' is the Quill instance
    const quill = this.quill || this;

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setUploadingImage(true);

      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data = await res.json();

        // Try multiple ways to get the Quill instance
        let editorInstance = quill;
        
        // If quill doesn't have getSelection, try to find it in the DOM
        if (!editorInstance || typeof editorInstance.getSelection !== 'function') {
          const quillContainer = document.querySelector('.ql-container');
          if (quillContainer && (quillContainer as any).__quill) {
            editorInstance = (quillContainer as any).__quill;
          }
        }

        // Use the Quill editor instance
        if (editorInstance && typeof editorInstance.getSelection === 'function') {
          // Get current selection or default to end of document
          const range = editorInstance.getSelection(true);
          const insertIndex = range ? range.index : editorInstance.getLength();
          // Insert image at cursor position
          editorInstance.insertEmbed(insertIndex, 'image', data.url, 'user');
          // Move cursor after the image
          editorInstance.setSelection(insertIndex + 1);
        } else {
          console.error('Quill editor instance not available');
          alert('Could not insert image into editor. The image was uploaded to: ' + data.url);
        }
      } catch (error: any) {
        console.error('Image upload error:', error);
        alert('Failed to upload image: ' + (error.message || 'Unknown error'));
      } finally {
        setUploadingImage(false);
      }
    };
  }, []);

  // Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'size': ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
      },
    },
    clipboard: {
      matchVisual: false,
    }
  }), [imageHandler]);

  // Quill formats
  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet',
    'indent',
    'direction', 'align',
    'link', 'image',
  ];

  const insertToken = (token: string) => {
    // Simply append to the current body content
    // The user can then position it where they want in the editor
    const currentBody = body || '';
    const newBody = currentBody + (currentBody ? ' ' : '') + token;
    onBodyChange(newBody);
  };

  const handlePreview = async () => {
    if (!selectedTest) {
      alert('Please select a test');
      return;
    }
    if (!localPreviewNameOnTemplate || !localPreviewPricingOptionId || !previewPatientName) {
      alert('Please pick preview values for name, pricing option, and patient name');
      return;
    }
    if (!selectedPreviewPricingOption) {
      alert('Please select a valid pricing option');
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
          nameOnTemplate: localPreviewNameOnTemplate,
          installment: selectedPreviewPricingOption.installment,
          price: selectedPreviewPricingOption.price,
          patientName: previewPatientName,
          toEmail: 'preview@example.com',
          icreditText: selectedPreviewPricingOption.icreditText,
          icreditLink: selectedPreviewPricingOption.icreditLink,
          iformsText: selectedPreviewPricingOption.iformsText,
          iformsLink: selectedPreviewPricingOption.iformsLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Failed to generate preview');
        return;
      }
      setPreview(data.preview);
      setPreviewRTL(Boolean(data.isRTL));
      setPreviewAttachments(data.attachments || []);
    } catch (e: any) {
      alert(e?.message || 'Unexpected error generating preview');
    } finally {
      setPreviewing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!templateId) {
      setUploadError('Please save the template first before uploading attachments');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('templateId', templateId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (onAttachmentsChange) {
        onAttachmentsChange([...attachments, data.attachment]);
      }
    } catch (error: any) {
      setUploadError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete attachment');
      }

      if (onAttachmentsChange) {
        onAttachmentsChange(attachments.filter(att => att.id !== attachmentId));
      }
    } catch (error: any) {
      alert('Failed to delete attachment: ' + error.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={className}>
      {/* Configuration Section */}
      {showConfigurationSection && selectedTest && (
        <div className="border border-gray-200 rounded-lg p-6 bg-white mb-6">
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
                value={selectedTest.id}
                disabled
              >
                <option value={selectedTest.id}>{selectedTest.name}</option>
              </select>
            </div>

            <div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="rtl"
                  checked={isRTL}
                  onChange={(e) => onIsRTLChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="rtl" className="text-sm font-medium text-gray-700">
                  Right-to-Left Mode (Hebrew)
                </label>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                ℹ️ Enable for Hebrew content. Use the toolbar direction button to mix RTL/LTR text.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Attachments Section */}
      {showAttachmentsSection && selectedTest && (
        <div className="border border-gray-200 rounded-lg p-6 bg-white mb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-900 border-b border-gray-100 pb-2">
            File Attachments
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload files to attach to emails sent using this template
          </p>

          {!templateId && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                💡 Please save the template first before uploading attachments
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Upload File
            </label>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading || !templateId}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {uploading && (
              <p className="text-sm text-blue-600 mt-1">Uploading...</p>
            )}
            {uploadError && (
              <p className="text-sm text-red-600 mt-1">{uploadError}</p>
            )}
          </div>

          {attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Attached Files</h4>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{attachment.originalName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)} • {attachment.mimeType}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

        {/* Token Insertion Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Insert Placeholders
          </h4>
          <div className="flex gap-2 flex-wrap">
            {REQUIRED_TEMPLATE_TOKENS.map((token) => (
              <button
                key={token}
                type="button"
                className="px-3 py-2 text-xs bg-blue-600 text-white border border-blue-700 rounded hover:bg-blue-700 transition-colors font-medium"
                onClick={() => insertToken(token)}
                title={`Insert ${token} placeholder`}
              >
                {token}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Click to insert placeholders at cursor position. These will be replaced with actual values when sending emails.
          </p>
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-800">
              💡 <strong>Tip:</strong> Use the toolbar to format text and insert images. The 🖼️ image button lets you upload images (like signatures). All formatting will be preserved in emails.
            </p>
          </div>
        </div>

        {/* Quill Editor */}
        <div className="px-6 py-4">
          {uploadingImage && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">📤 Uploading image...</p>
            </div>
          )}
          <div 
            className="quill-wrapper"
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
              minHeight: '400px',
            }}
          >
            <ReactQuill
              theme="snow"
              value={body}
              onChange={onBodyChange}
              modules={modules}
              formats={formats}
              placeholder={`Write your email template here...\n\nAvailable placeholders: ${REQUIRED_TEMPLATE_TOKENS.join(', ')}`}
              style={{
                height: '350px',
                marginBottom: '50px'
              }}
            />
          </div>

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
      {showPreviewSection && selectedTest && (
        <div className="border border-gray-200 rounded-lg p-6 bg-white mt-6">
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
                value={localPreviewNameOnTemplate}
                onChange={(e) => setLocalPreviewNameOnTemplate(e.target.value)}
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
                value={localPreviewPricingOptionId}
                onChange={(e) => setLocalPreviewPricingOptionId(e.target.value)}
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

          <div className="flex justify-center mt-4">
            <Button
              onClick={handlePreview}
              disabled={previewing || !localPreviewNameOnTemplate || !localPreviewPricingOptionId || !previewPatientName}
              variant="outline"
            >
              {previewing ? 'Generating...' : 'Preview Template'}
            </Button>
          </div>
        </div>
      )}

      {preview && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Template Preview</h3>
          <div
            dir={previewRTL ? 'rtl' : 'ltr'}
            className="bg-white border border-gray-200 rounded p-4 min-h-[200px]"
            style={{ fontFamily: previewRTL ? 'Arial, sans-serif' : 'inherit' }}
            dangerouslySetInnerHTML={{ __html: preview }}
          />

          {/* Attachments Preview */}
          {previewAttachments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Attachments</h4>
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
        </div>
      )}

      {/* Custom Quill Styles */}
      <style jsx global>{`
        .quill-wrapper .ql-container {
          font-size: 16px;
          font-family: Arial, sans-serif;
        }
        
        .quill-wrapper .ql-editor {
          min-height: 300px;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .quill-wrapper .ql-editor.ql-blank::before {
          font-style: italic;
          color: #9ca3af;
        }
        
        /* RTL support for Quill */
        .quill-wrapper[dir="rtl"] .ql-editor {
          text-align: right;
          direction: rtl;
        }
        
        .quill-wrapper[dir="rtl"] .ql-editor p {
          text-align: right;
        }
        
        /* Ensure consistent line spacing */
        .quill-wrapper .ql-editor p {
          margin-bottom: 0.5em;
          line-height: 1.6;
        }
        
        /* Link styles */
        .quill-wrapper .ql-editor a {
          color: #0066cc;
          text-decoration: underline;
        }
        
        /* Image styles */
        .quill-wrapper .ql-editor img {
          max-width: 100%;
          height: auto;
          display: inline-block;
          margin: 10px 0;
        }
        
        /* Fix link tooltip positioning - ensure it stays visible */
        .ql-snow .ql-tooltip {
          position: absolute !important;
          z-index: 9999 !important;
          background-color: white;
          border: 1px solid #ccc;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          padding: 8px 12px;
          margin-top: 10px;
          left: 0 !important;
          transform: none !important;
        }
        
        .ql-snow .ql-tooltip::before {
          content: "Visit URL:" !important;
          margin-right: 8px;
          color: #444;
        }
        
        .ql-snow .ql-tooltip input[type="text"] {
          border: 1px solid #ccc;
          padding: 4px 8px;
          width: 200px;
          margin-right: 8px;
        }
        
        .ql-snow .ql-tooltip a.ql-action::after {
          content: "Edit" !important;
          border-right: 1px solid #ccc;
          padding-right: 8px;
          margin-right: 8px;
        }
        
        .ql-snow .ql-tooltip a.ql-remove::before {
          content: "Remove" !important;
          margin-left: 8px;
        }
        
        .ql-snow .ql-tooltip.ql-editing a.ql-action::after {
          content: "Save" !important;
        }
        
        /* Fix dropdown arrows */
        .ql-snow .ql-picker {
          display: inline-block;
          font-size: 14px;
          font-weight: 500;
          color: #444;
          position: relative;
        }
        
        .ql-snow .ql-picker-label {
          cursor: pointer;
          display: inline-block;
          height: 100%;
          padding-left: 8px;
          padding-right: 2px;
          position: relative;
          width: 100%;
        }
        
        /* Fix picker arrow icon */
        .ql-snow .ql-picker-label::before {
          display: inline-block;
          line-height: 22px;
        }
        
        .ql-snow .ql-picker-label svg {
          position: absolute;
          margin-top: -9px;
          right: 0;
          top: 50%;
          width: 18px;
          height: 18px;
        }
        
        .ql-snow .ql-picker.ql-expanded .ql-picker-label svg {
          transform: rotate(180deg);
        }
        
        .ql-snow .ql-picker-options {
          background-color: white;
          border: 1px solid #ccc;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          display: none;
          min-width: 100%;
          padding: 4px 8px;
          position: absolute;
          white-space: nowrap;
          z-index: 1000;
        }
        
        .ql-snow .ql-picker.ql-expanded .ql-picker-options {
          display: block;
          margin-top: 2px;
        }
        
        .ql-snow .ql-picker-item {
          cursor: pointer;
          display: block;
          padding: 4px 8px;
        }
        
        .ql-snow .ql-picker-item:hover {
          background-color: #f0f0f0;
        }
        
        /* Font size picker styles - show actual sizes */
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before {
          content: '10px';
          font-size: 10px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before {
          content: '12px';
          font-size: 12px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before {
          content: '14px';
          font-size: 14px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before {
          content: '16px';
          font-size: 16px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before {
          content: '18px';
          font-size: 18px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before {
          content: '20px';
          font-size: 20px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before {
          content: '24px';
          font-size: 24px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="28px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="28px"]::before {
          content: '28px';
          font-size: 28px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before {
          content: '32px';
          font-size: 32px !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="36px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="36px"]::before {
          content: '36px';
          font-size: 36px !important;
        }
      `}</style>
    </div>
  );
};

export default TemplateEditor;
