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

      <div className="w-full max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Add Test</h2>

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
                {submitting ? 'Saving...' : 'Save Test'}
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset()} disabled={submitting}>
                Reset
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
