'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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

type TestFormValues = z.input<typeof TestCreateSchema>;

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

  const form = useForm<TestFormValues>({
    resolver: zodResolver(TestCreateSchema),
    defaultValues: {
      name: '',
      templateNamesCsv: '',
      installmentsCsv: '',
      pricesCsv: '',
      emailCopiesCsv: '',
      icreditLink: '',
      iformsLink: '',
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

  // Handle edit button click - populate form with test data
  const handleEditClick = (test: PatientTest) => {
    setEditingTest(test);
    setError(undefined);
    setSuccess(undefined);
    
    // Convert arrays back to CSV format for the form
    form.reset({
      name: test.name,
      templateNamesCsv: test.templateNames.join(', '),
      installmentsCsv: test.installments.join(', '),
      pricesCsv: test.prices.join(', '),
      emailCopiesCsv: test.emailCopies.join(', '),
      icreditLink: test.icreditLink,
      iformsLink: test.iformsLink,
    });
  };

  // Handle form submission for update
  const onSubmit = async (values: TestFormValues) => {
    if (!editingTest) return;

    try {
      setSubmitting(true);
      setError(undefined);
      setSuccess(undefined);

      const res = await fetch('/api/tests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTest.id,
          ...values,
        }),
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
    <div className={`${styles.customRounded} flex flex-col items-center p-4 bg-white shadow-lg rounded-lg w-full h-full overflow-auto`}>
      <div className="w-full flex items-start mb-4">
        {!showNavigation && (
          <div>
            <Button variant="secondary" onClick={onShowNavigation}>Show Navigation</Button>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl">
        {editingTest ? (
          // Edit form view
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Test: {editingTest.name}</h2>
              <Button variant="outline" onClick={handleCancelEdit}>
                Back to List
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="installmentsCsv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>No. of installments</FormLabel>
                        <FormControl>
                          <Input placeholder="Comma delimited integers, e.g. 1,3,6" {...field} />
                        </FormControl>
                        <FormDescriptionText>Positive integers. Comma delimited.</FormDescriptionText>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pricesCsv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prices</FormLabel>
                        <FormControl>
                          <Input placeholder="Comma delimited numbers, e.g. 100,250.5,400" {...field} />
                        </FormControl>
                        <FormDescriptionText>Numbers ≥ 0. Comma delimited.</FormDescriptionText>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="emailCopiesCsv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email copy</FormLabel>
                      <FormControl>
                        <Input placeholder="Comma delimited emails, e.g. a@x.com,b@y.com" {...field} />
                      </FormControl>
                      <FormDescriptionText>We will CC these emails when sending.</FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="icreditLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>iCredit link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormDescriptionText>Must be a valid URL starting with http/https.</FormDescriptionText>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="iformsLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>iForms link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormDescriptionText>Must be a valid URL starting with http/https.</FormDescriptionText>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormError message={error} />
                <FormSuccess message={success} />

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
            <h2 className="text-xl font-semibold mb-4">Edit Tests</h2>
            
            {loading ? (
              <div className="text-center py-8">Loading tests...</div>
            ) : tests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tests found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tests.map((test) => (
                  <div key={test.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{test.name}</h3>
                        <div className="text-sm text-muted-foreground mt-1">
                          <p>Template Names: {test.templateNames.join(', ')}</p>
                          <p>Installments: {test.installments.join(', ')}</p>
                          <p>Prices: {test.prices.join(', ')}</p>
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
                  </div>
                ))}
              </div>
            )}

            <FormError message={error} />
            <FormSuccess message={success} />
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
