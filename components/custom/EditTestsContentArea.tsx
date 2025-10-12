'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { TestCreateSchema } from '@/schemas';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

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

type EditablePricingOption = {
  installment: number | '';
  price: number | '';
  icreditText: string;
  icreditLink: string;
  iformsText: string;
  iformsLink: string;
};

// Custom schema for edit form (without pricingOptions validation since we handle it separately)
const EditTestSchema = z.object({
  name: z.string().trim().min(1, { message: "Test name is required" }),
  templateNamesCsv: z.string().min(1, { message: "At least one template name is required" }),
  emailCopiesCsv: z.string().min(1, { message: "At least one email copy is required" }),
});

type TestFormValues = z.infer<typeof EditTestSchema>;

const EditTestsContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [tests, setTests] = useState<PatientTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTest, setEditingTest] = useState<PatientTest | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<PatientTest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [pricingOptions, setPricingOptions] = useState<EditablePricingOption[]>([
    { installment: '', price: '', icreditText: '', icreditLink: '', iformsText: '', iformsLink: '' }
  ]);

  const form = useForm<TestFormValues>({
    resolver: zodResolver(EditTestSchema),
    defaultValues: {
      name: '',
      templateNamesCsv: '',
      emailCopiesCsv: '',
    },
    mode: 'onChange',
  });

  // Load tests on component mount
  useEffect(() => {
    const loadTests = async () => {
      try {
        const res = await fetch('/api/tests');
        const data = await res.json();
        if (res.ok) {
          setTests(data.tests);
        } else {
          setError(data?.error || 'Failed to load tests');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load tests');
      } finally {
        setLoading(false);
      }
    };
    loadTests();
  }, []);

  const addPricingOption = () => {
    setPricingOptions([...pricingOptions, { installment: '', price: '', icreditText: '', icreditLink: '', iformsText: '', iformsLink: '' }]);
  };

  const removePricingOption = (index: number) => {
    if (pricingOptions.length > 1) {
      setPricingOptions(pricingOptions.filter((_, i) => i !== index));
    }
  };

  const updatePricingOption = (index: number, field: keyof EditablePricingOption, value: any) => {
    const updated = [...pricingOptions];
    updated[index] = { ...updated[index], [field]: value };
    setPricingOptions(updated);
  };

  // Handle edit button click - populate form with test data
  const handleEditClick = (test: PatientTest) => {
    setEditingTest(test);
    setError(undefined);
    setSuccess(undefined);
    
    // Convert test data to form format
    form.reset({
      name: test.name,
      templateNamesCsv: test.templateNames.join(', '),
      emailCopiesCsv: test.emailCopies.join(', '),
    });

    // Set pricing options for the UI
    setPricingOptions(test.pricingOptions.map(opt => ({
      installment: opt.installment,
      price: opt.price,
      icreditText: opt.icreditText,
      icreditLink: opt.icreditLink,
      iformsText: opt.iformsText,
      iformsLink: opt.iformsLink,
    })));
  };

  // Handle form submission for update
  const onSubmit = async (values: TestFormValues) => {
    if (!editingTest) return;

    try {
      setSubmitting(true);
      setError(undefined);
      setSuccess(undefined);

      // Validate pricing options
      const validatedOptions = pricingOptions.map((opt, idx) => {
        if (opt.installment === '' || opt.price === '') {
          throw new Error(`Pricing option ${idx + 1}: Installment and Price are required`);
        }
        if (!opt.icreditText || !opt.icreditLink || !opt.iformsText || !opt.iformsLink) {
          throw new Error(`Pricing option ${idx + 1}: All link texts and URLs are required`);
        }
        return {
          installment: Number(opt.installment),
          price: Number(opt.price),
          icreditText: opt.icreditText,
          icreditLink: opt.icreditLink,
          iformsText: opt.iformsText,
          iformsLink: opt.iformsLink,
        };
      });

      const payload = {
        id: editingTest.id,
        name: values.name,
        templateNamesCsv: values.templateNamesCsv,
        emailCopiesCsv: values.emailCopiesCsv,
        pricingOptions: validatedOptions,
      };

      const res = await fetch('/api/tests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to update test');
        return;
      }

      setSuccess('Test updated successfully');
      
      // Update the test in the local state
      setTests(prev => prev.map(t => t.id === editingTest.id ? data.test : t));
      
      // Reset editing state
      setEditingTest(null);
      form.reset();
      setPricingOptions([{ installment: '', price: '', icreditText: '', icreditLink: '', iformsText: '', iformsLink: '' }]);
    } catch (e: any) {
      setError(e?.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditingTest(null);
    setError(undefined);
    setSuccess(undefined);
    form.reset();
    setPricingOptions([{ installment: '', price: '', icreditText: '', icreditLink: '', iformsText: '', iformsLink: '' }]);
  };

  // Handle delete button click
  const handleDeleteClick = (test: PatientTest) => {
    setTestToDelete(test);
    setDeleteDialogOpen(true);
  };

  // Handle confirmed deletion
  const handleConfirmDelete = async () => {
    if (!testToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch('/api/tests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testToDelete.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to delete test');
        return;
      }

      setSuccess(`Test "${testToDelete.name}" deleted successfully`);
      
      // Remove the test from local state
      setTests(prev => prev.filter(t => t.id !== testToDelete.id));
      
      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    } catch (e: any) {
      setError(e?.message || 'Unexpected error deleting test');
    } finally {
      setDeleting(false);
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
        {editingTest ? (
          // Edit form view
          <>
            {/* Page Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Edit Test: {editingTest.name}</h1>
                  <p className="text-indigo-100">Modify test configuration and pricing options</p>
                </div>
                <Button variant="secondary" onClick={handleCancelEdit}>
                  Back to List
                </Button>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-bold text-gray-800">Basic Test Information</h2>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. BRCA" {...field} />
                      </FormControl>
                      <FormDescriptionText>Only one name, must be unique.</FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templateNamesCsv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Name in the template</FormLabel>
                      <FormControl>
                        <Input placeholder="Comma delimited, e.g. BRCA, בדיקת BRCA" {...field} />
                      </FormControl>
                      <FormDescriptionText>Multiple values allowed. Comma delimited.</FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>
                </div>

                {/* Pricing & Payment Options */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Pricing & Payment Options</h2>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addPricingOption}
                        className="flex items-center gap-2"
                      >
                        <Image src="/images/plus.svg" alt="Add" width={16} height={16} />
                        Add Option
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {pricingOptions.map((option, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white relative">
                        {pricingOptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePricingOption(index)}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                            title="Remove this pricing option"
                          >
                            <Image src="/images/delete.svg" alt="Remove" width={20} height={20} />
                          </button>
                        )}
                        
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Pricing Option {index + 1}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Installments
                            </label>
                            <Input
                              type="number"
                              placeholder="e.g. 1, 3, 6, 12"
                              value={option.installment}
                              onChange={(e) => updatePricingOption(index, 'installment', e.target.value ? Number(e.target.value) : '')}
                              className="border-gray-300 rounded-md px-3 py-2"
                              min="1"
                              step="1"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Price
                            </label>
                            <Input
                              type="number"
                              placeholder="e.g. 100, 250.50"
                              value={option.price}
                              onChange={(e) => updatePricingOption(index, 'price', e.target.value ? Number(e.target.value) : '')}
                              className="border-gray-300 rounded-md px-3 py-2"
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              iCredit Link Text
                            </label>
                            <Input
                              type="text"
                              placeholder="e.g. Click here to pay"
                              value={option.icreditText}
                              onChange={(e) => updatePricingOption(index, 'icreditText', e.target.value)}
                              className="border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              iCredit Link URL
                            </label>
                            <Input
                              type="url"
                              placeholder="https://icredit.example.com"
                              value={option.icreditLink}
                              onChange={(e) => updatePricingOption(index, 'icreditLink', e.target.value)}
                              className="border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              iForms Link Text
                            </label>
                            <Input
                              type="text"
                              placeholder="e.g. Sign the form"
                              value={option.iformsText}
                              onChange={(e) => updatePricingOption(index, 'iformsText', e.target.value)}
                              className="border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              iForms Link URL
                            </label>
                            <Input
                              type="url"
                              placeholder="https://iforms.example.com"
                              value={option.iformsLink}
                              onChange={(e) => updatePricingOption(index, 'iformsLink', e.target.value)}
                              className="border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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

                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Update Test'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={submitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </>
        ) : (
          // List view
          <>
            {/* Page Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-md p-5">
              <h1 className="text-2xl font-bold mb-2">Edit Tests</h1>
              <p className="text-indigo-100">View and modify existing test configurations</p>
            </div>
            
            {/* Tests List Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Available Tests ({tests.length})</h2>
                </div>
              </div>
              
              <div className="p-4">
                {loading ? (
                  <div className="text-center py-8">
                    <svg className="animate-spin h-8 w-8 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600 mt-2">Loading tests...</p>
                  </div>
                ) : tests.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Tests Found</h3>
                    <p className="text-gray-600">Create your first test to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tests.map((test) => (
                      <div key={test.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <span className="text-indigo-700 font-bold text-lg">{test.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{test.name}</p>
                            <div className="text-xs text-gray-600 mt-1">
                              <p>Templates: {test.templateNames.join(', ')}</p>
                              {test.pricingOptions.length > 0 && (
                                <p className="mt-0.5">
                                  Pricing: {test.pricingOptions.map(opt => `${opt.installment}×${opt.price}₪`).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEditClick(test)} variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button onClick={() => handleDeleteClick(test)} variant="destructive" size="sm">
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Test"
        description={
          testToDelete
            ? `Are you sure you want to delete the test "${testToDelete.name}"? This action cannot be undone and will also delete any associated templates.`
            : "Are you sure you want to delete this test?"
        }
        isDeleting={deleting}
      />
    </div>
  );
};

const FormDescriptionText: FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[0.8rem] text-muted-foreground">{children}</p>
);

export default EditTestsContentArea;
