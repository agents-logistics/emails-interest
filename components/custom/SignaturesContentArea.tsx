'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FormError } from '../form-error';
import { FormSuccess } from '../form-success';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import TemplateEditor from './TemplateEditor';

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type Signature = {
  id: string;
  email: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const SignaturesContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  
  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isRTL, setIsRTL] = useState(true); // Default to RTL for Hebrew signatures
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Signature | null>(null);

  // Load signatures on mount
  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/signatures');
      const data = await res.json();
      if (res.ok) {
        setSignatures(data.signatures);
      } else {
        setError(data.error || 'Failed to load signatures');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load signatures');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    setError(undefined);
    setSuccess(undefined);

    if (!email.trim() || !name.trim()) {
      setError('Email and name are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!content.trim()) {
      setError('Signature content is required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          name: name.trim(),
          content: content 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add signature');
        return;
      }
      
      setSuccess('Signature added successfully');
      setEmail('');
      setName('');
      setContent('');
      await loadSignatures();
    } catch (e: any) {
      setError(e?.message || 'Failed to add signature');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Signature) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setError(undefined);
    setSuccess(undefined);
    
    try {
      setDeleting(itemToDelete.id);
      const res = await fetch(`/api/signatures/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete signature');
        return;
      }
      
      setSuccess('Signature deleted successfully');
      await loadSignatures();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete signature');
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
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
          <h1 className="text-2xl font-bold mb-2">Email Signatures</h1>
          <p className="text-indigo-100">Manage email signatures for different email addresses. The signature will automatically be used when sending emails from the matching address.</p>
        </div>

        {/* Add New Signature */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Add New Signature</h2>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="e.g., dror@progenetics.co.il"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Display Name
                </label>
                <Input
                  placeholder="e.g., Default Signature"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Signature Content
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rtl-toggle"
                    checked={isRTL}
                    onChange={(e) => setIsRTL(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="rtl-toggle" className="text-sm font-medium text-gray-700">
                    Right-to-Left (Hebrew)
                  </label>
                </div>
              </div>
              <TemplateEditor
                body={content}
                onBodyChange={setContent}
                isRTL={isRTL}
                onIsRTLChange={setIsRTL}
                showPreviewSection={false}
                showConfigurationSection={false}
                showAttachmentsSection={false}
                showPlaceholdersSection={false}
                showRTLToggle={false}
                placeholder="Write your email signature here... Use the toolbar to format text, add links, and insert images."
                className="border-2 border-gray-300 rounded-lg"
              />
            </div>
            
            <Button
              onClick={handleAdd}
              disabled={saving || !email.trim() || !name.trim() || !content.trim()}
              className="w-full md:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Signature
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Feedback Messages */}
        <FormError message={error} />
        <FormSuccess message={success} />

        {/* Signatures List */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Saved Signatures ({signatures.length})</h2>
            </div>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <svg className="animate-spin h-8 w-8 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 mt-2">Loading...</p>
              </div>
            ) : signatures.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Signatures</h3>
                <p className="text-gray-600">Add your first signature above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {signatures.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-700 font-bold text-lg">{item.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDelete(item)}
                      disabled={deleting === item.id}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      {deleting === item.id ? (
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
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDelete}
        title="Delete Signature"
        description={`Are you sure you want to delete the signature for "${itemToDelete?.email}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default SignaturesContentArea;

