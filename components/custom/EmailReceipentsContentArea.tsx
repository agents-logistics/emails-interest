'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FormError } from '../form-error';
import { FormSuccess } from '../form-success';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type CCDefaultEmail = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

const EmailReceipentsContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [ccDefaultEmails, setCcDefaultEmails] = useState<CCDefaultEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CCDefaultEmail | null>(null);

  // Load CC default emails on mount
  useEffect(() => {
    loadCCDefaultEmails();
  }, []);

  const loadCCDefaultEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ccDefaultEmails');
      const data = await res.json();
      if (res.ok) {
        setCcDefaultEmails(data.ccDefaultEmails);
      } else {
        setError(data.error || 'Failed to load CC default emails');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load CC default emails');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    setError(undefined);
    setSuccess(undefined);

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/ccDefaultEmails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add CC default email');
        return;
      }
      
      setSuccess('CC default email added successfully');
      setName('');
      setEmail('');
      await loadCCDefaultEmails();
    } catch (e: any) {
      setError(e?.message || 'Failed to add CC default email');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CCDefaultEmail) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setError(undefined);
    setSuccess(undefined);
    
    try {
      setDeleting(itemToDelete.id);
      const res = await fetch(`/api/ccDefaultEmails/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete CC default email');
        return;
      }
      
      setSuccess('CC default email deleted successfully');
      await loadCCDefaultEmails();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete CC default email');
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
          <h1 className="text-2xl font-bold mb-2">CC Default Emails</h1>
          <p className="text-indigo-100">Manage preset CC email addresses for quick selection when sending emails</p>
        </div>

        {/* Add New CC Default Email */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Add New CC Default Email</h2>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Name
                </label>
                <Input
                  placeholder="e.g., Dror"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                />
              </div>
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
            </div>
            
            <Button
              onClick={handleAdd}
              disabled={saving || !name.trim() || !email.trim()}
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
                  Add CC Default Email
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Feedback Messages */}
        <FormError message={error} />
        <FormSuccess message={success} />

        {/* CC Default Emails List */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Preset CC Emails ({ccDefaultEmails.length})</h2>
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
            ) : ccDefaultEmails.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No CC Default Emails</h3>
                <p className="text-gray-600">Add your first preset CC email above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ccDefaultEmails.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-700 font-bold text-lg">{item.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
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
        title="Delete CC Default Email"
        description={`Are you sure you want to delete "${itemToDelete?.name}" (${itemToDelete?.email})? This action cannot be undone.`}
      />
    </div>
  );
};

export default EmailReceipentsContentArea;
