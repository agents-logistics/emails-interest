'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { TestCreateSchema } from '@/schemas';

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type TestFormValues = z.input<typeof TestCreateSchema>;

const AddTestsContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
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

  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: TestFormValues) => {
    try {
      setSubmitting(true);
      setError(undefined);
      setSuccess(undefined);

      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to create test');
        return;
      }

      setSuccess('Test saved successfully');
      form.reset();
    } catch (e: any) {
      setError(e?.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
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

      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Create New Test
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Set up a new medical test with all the necessary details for email communication and patient management.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Basic Information */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-medium mb-6 text-gray-900 border-b border-gray-100 pb-2">
                Basic Test Information
              </h3>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Test Name
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. BRCA, Signatera, etc." 
                          {...field} 
                          className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </FormControl>
                      <FormDescriptionText>
                        Only one name, must be unique across all tests.
                      </FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templateNamesCsv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Test Name in Templates
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. BRCA, בדיקת BRCA, Genetic Test" 
                          {...field}
                          className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </FormControl>
                      <FormDescriptionText>
                        Multiple variations allowed (comma separated). Used in email templates.
                      </FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pricing Information */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-medium mb-6 text-gray-900 border-b border-gray-100 pb-2">
                Pricing & Payment Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="installmentsCsv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Number of Installments
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. 1,3,6,12" 
                          {...field}
                          className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </FormControl>
                      <FormDescriptionText>
                        Positive integers only (comma separated).
                      </FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricesCsv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Test Prices
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. 100,250.5,400,1500" 
                          {...field}
                          className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </FormControl>
                      <FormDescriptionText>
                        Numbers ≥ 0 (comma separated). Decimal values allowed.
                      </FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Email Configuration */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-medium mb-6 text-gray-900 border-b border-gray-100 pb-2">
                Email Configuration
              </h3>
              <FormField
                control={form.control}
                name="emailCopiesCsv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      CC Email Addresses
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. admin@clinic.com, supervisor@hospital.com" 
                        {...field}
                        className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </FormControl>
                    <FormDescriptionText>
                      These emails will be copied on all patient communications (comma separated).
                    </FormDescriptionText>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* External Links */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-medium mb-6 text-gray-900 border-b border-gray-100 pb-2">
                External Links & Forms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="icreditLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        iCredit Payment Link
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://icredit.example.com/payment" 
                          {...field}
                          className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </FormControl>
                      <FormDescriptionText>
                        Must be a valid URL starting with http:// or https://
                      </FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="iformsLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        iForms Document Link
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://iforms.example.com/document" 
                          {...field}
                          className="border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </FormControl>
                      <FormDescriptionText>
                        Must be a valid URL starting with http:// or https://
                      </FormDescriptionText>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormError message={error} />
            {success && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="text-sm font-medium text-green-800">Test Created Successfully</h3>
                <div className="mt-1 text-sm text-green-700">
                  {success}
                </div>
                <p className="mt-2 text-sm text-green-600">
                  You can now create email templates for this test.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={submitting}
              >
                {submitting ? 'Creating Test...' : 'Create Test'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => form.reset()} 
                disabled={submitting}
              >
                Reset Form
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

const FormDescriptionText: FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[0.8rem] text-muted-foreground">{children}</p>
);

export default AddTestsContentArea;
