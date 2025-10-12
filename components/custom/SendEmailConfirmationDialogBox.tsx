'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '../ui/button';

interface SendEmailConfirmationDialogBoxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isSending?: boolean;
}

const SendEmailConfirmationDialogBox: React.FC<SendEmailConfirmationDialogBoxProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Send Email Confirmation",
  description = "Are you sure you want to send this email? This action will send the email immediately.",
  isSending = false,
}) => {
  // Parse description into sections for better readability
  const lines = description.split('\n').filter(line => line.trim());
  const mainMessage = lines[0] || '';
  const details = lines.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700 pt-2">
            {mainMessage}
          </DialogDescription>
        </DialogHeader>

        {details.length > 0 && (
          <div className="space-y-3 py-4 border-t border-b border-gray-200">
            {details.map((line, index) => {
              // Check if line contains a colon to format as label: value
              const colonIndex = line.indexOf(':');
              if (colonIndex > 0) {
                const label = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                
                return (
                  <div key={index} className="flex flex-col space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {value}
                    </span>
                  </div>
                );
              }
              return (
                <p key={index} className="text-sm text-gray-700">
                  {line}
                </p>
              );
            })}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-900">This action cannot be undone</p>
            <p className="text-xs text-amber-800 mt-0.5">The email will be sent immediately via Amazon SES</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSending}
            className="flex-1 sm:flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isSending}
            className="flex-1 sm:flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
          >
            {isSending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Email...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendEmailConfirmationDialogBox;
