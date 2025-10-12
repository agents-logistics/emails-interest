'use client';
import styles from '@/styles/ContentArea.module.css';  
import React, { FC, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type BloodTestLocation = {
  id: string;
  name: string;
  templateText: string;
  createdAt: string;
  updatedAt: string;
};

const BloodTestLocationContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [locations, setLocations] = useState<BloodTestLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formTemplateText, setFormTemplateText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bloodTestLocations');
      const data = await res.json();
      if (res.ok) {
        setLocations(data.locations);
      } else {
        setError(data.error || 'Failed to load locations');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);

    if (!formName.trim() || !formTemplateText.trim()) {
      setError('Both name and template text are required');
      return;
    }

    try {
      setSubmitting(true);
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId 
        ? { id: editingId, name: formName, templateText: formTemplateText }
        : { name: formName, templateText: formTemplateText };

      const res = await fetch('/api/bloodTestLocations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${editingId ? 'update' : 'create'} location`);
        return;
      }

      setSuccess(`Location ${editingId ? 'updated' : 'created'} successfully`);
      setFormName('');
      setFormTemplateText('');
      setEditingId(null);
      loadLocations();
    } catch (e: any) {
      setError(e?.message || `Failed to ${editingId ? 'update' : 'create'} location`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (location: BloodTestLocation) => {
    setEditingId(location.id);
    setFormName(location.name);
    setFormTemplateText(location.templateText);
    setError(undefined);
    setSuccess(undefined);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormName('');
    setFormTemplateText('');
    setError(undefined);
    setSuccess(undefined);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const res = await fetch(`/api/bloodTestLocations?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete location');
        return;
      }

      setSuccess('Location deleted successfully');
      loadLocations();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete location');
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
          <h1 className="text-2xl font-bold mb-2">Blood Test Locations</h1>
          <p className="text-indigo-100">Manage available locations for blood test scheduling</p>
        </div>
        
        <div className="space-y-6">
          {/* Add/Edit Form */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  {editingId ? 'Edit Location' : 'Add New Location'}
                </h2>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Location Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Tel Aviv Clinic"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Short label shown in dropdown menu
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Template Text <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Tel Aviv Clinic, 22 Herzl Street"
                    value={formTemplateText}
                    onChange={(e) => setFormTemplateText(e.target.value)}
                    className="border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Full text to appear in email
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={submitting || !formName.trim() || !formTemplateText.trim()}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {submitting ? 'Saving...' : (editingId ? 'Update Location' : 'Add Location')}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                )}
              </div>
              </form>
            </div>
          </div>

          {/* Feedback Messages */}
          <FormError message={error} />
          {success && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-green-800">{success}</p>
              </div>
            </div>
          )}

          {/* Locations List */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Existing Locations ({locations.length})</h2>
              </div>
            </div>
            
            <div className="p-4">
              {loading ? (
                <div className="text-center py-8">
                  <svg className="animate-spin h-8 w-8 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-600 mt-2">Loading locations...</p>
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Locations Found</h3>
                  <p className="text-gray-600">Add your first location above to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-indigo-700 font-bold text-lg">{location.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{location.name}</p>
                          <p className="text-sm text-gray-600">{location.templateText}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(location)}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(location.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BloodTestLocationContentArea;
