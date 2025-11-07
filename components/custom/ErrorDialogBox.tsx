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

interface ErrorDialogBoxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning';
}

const ErrorDialogBox: React.FC<ErrorDialogBoxProps> = ({
  open,
  onOpenChange,
  title,
  message,
  type = 'error',
}) => {
  const isError = type === 'error';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isError ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              {isError ? (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {title || (isError ? 'Error' : 'Warning')}
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="text-base text-gray-700 pt-2 whitespace-pre-line">
          {message}
        </DialogDescription>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button 
            onClick={() => onOpenChange(false)}
            className={`flex-1 sm:flex-1 ${
              isError 
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
            } text-white shadow-md`}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorDialogBox;

