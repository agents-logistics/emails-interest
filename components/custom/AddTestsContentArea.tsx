'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useState } from 'react';
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

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type PricingOption = {
  installment: number | '';
  price: number | '';
  icreditText: string;
  icreditLink: string;
  iformsText: string;
  iformsLink: string;
};

// Custom schema for add form (without pricingOptions validation since we handle it separately)
const AddTestSchema = z.object({
  name: z.string().trim().min(1, { message: "Test name is required" }),
  templateNamesCsv: z.string().min(1, { message: "At least one template name is required" }),
});

type TestFormValues = z.infer<typeof AddTestSchema>;

const AddTestsContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const form = useForm<TestFormValues>({
    resolver: zodResolver(AddTestSchema),
    defaultValues: {
      name: '',
      templateNamesCsv: '',
    },
    mode: 'onChange',
  });

  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([
    { installment: '', price: '', icreditText: '', icreditLink: '', iformsText: '', iformsLink: '' }
  ]);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const addPricingOption = () => {
    setPricingOptions([...pricingOptions, { installment: '', price: '', icreditText: '', icreditLink: '', iformsText: '', iformsLink: '' }]);
  };

  const removePricingOption = (index: number) => {
    if (pricingOptions.length > 1) {
      setPricingOptions(pricingOptions.filter((_, i) => i !== index));
    }
  };

  const updatePricingOption = (index: number, field: keyof PricingOption, value: any) => {
    const updated = [...pricingOptions];
    updated[index] = { ...updated[index], [field]: value };
    setPricingOptions(updated);
  };

  const onSubmit = async (values: TestFormValues) => {
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
        name: values.name,
        templateNamesCsv: values.templateNamesCsv,
        pricingOptions: validatedOptions,
      };

      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to create test');
        return;
      }

      setSuccess('Test saved successfully');
      form.reset();
      setPricingOptions([{ installment: '', price: '', icreditText: '', icreditLink: '', iformsText: '', iformsLink: '' }]);
    } catch (e: any) {
      setError(e?.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
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
          <h1 className="text-2xl font-bold mb-2">Create New Test</h1>
          <p className="text-indigo-100">Set up a new medical test with all the necessary details for email communication and patient management</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
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
              <div className="p-6 space-y-6">
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

              <div className="p-6 space-y-6">
                {pricingOptions.map((option, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
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
                    
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      Pricing Option {index + 1}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Installments
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
                        <p className="text-[0.8rem] text-muted-foreground mt-1">
                          Positive integer only
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <p className="text-[0.8rem] text-muted-foreground mt-1">
                          Decimal values allowed
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          iCredit Link Text
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. Click here to pay"
                          value={option.icreditText}
                          onChange={(e) => updatePricingOption(index, 'icreditText', e.target.value)}
                          className="border-gray-300 rounded-md px-3 py-2"
                        />
                        <p className="text-[0.8rem] text-muted-foreground mt-1">
                          Text shown in email (e.g. &quot;here&quot;)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          iCredit Payment Link URL
                        </label>
                        <Input
                          type="url"
                          placeholder="https://icredit.example.com/payment"
                          value={option.icreditLink}
                          onChange={(e) => updatePricingOption(index, 'icreditLink', e.target.value)}
                          className="border-gray-300 rounded-md px-3 py-2"
                        />
                        <p className="text-[0.8rem] text-muted-foreground mt-1">
                          Valid URL required
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          iForms Link Text
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. Sign the form"
                          value={option.iformsText}
                          onChange={(e) => updatePricingOption(index, 'iformsText', e.target.value)}
                          className="border-gray-300 rounded-md px-3 py-2"
                        />
                        <p className="text-[0.8rem] text-muted-foreground mt-1">
                          Text shown in email (e.g. &quot;here&quot;)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          iForms Document Link URL
                        </label>
                        <Input
                          type="url"
                          placeholder="https://iforms.example.com/document"
                          value={option.iformsLink}
                          onChange={(e) => updatePricingOption(index, 'iformsLink', e.target.value)}
                          className="border-gray-300 rounded-md px-3 py-2"
                        />
                        <p className="text-[0.8rem] text-muted-foreground mt-1">
                          Valid URL required
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <FormError message={error} />
            {success && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-green-800">Test Created Successfully</h3>
                </div>
                <div className="mt-2 text-sm text-green-700 ml-11">
                  {success}
                </div>
                <p className="mt-2 text-sm text-green-600 ml-11">
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
