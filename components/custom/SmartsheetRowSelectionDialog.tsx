'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '../ui/button';

interface SmartsheetMatch {
  patientName?: string;
  price?: number | null;
  clalitStatus?: boolean | null;
  testId?: string;
  unmappedTestName?: string;
  smartsheetTestName?: string;
  testMappingWarning?: string;
  emailSentDate?: string;
}

interface SmartsheetRowSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: SmartsheetMatch[];
  onSelect: (match: SmartsheetMatch) => void;
}

const SmartsheetRowSelectionDialog: React.FC<SmartsheetRowSelectionDialogProps> = ({
  open,
  onOpenChange,
  matches,
  onSelect,
}) => {
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Multiple Records Found
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="text-base text-gray-700 pt-2">
          We found multiple records in Smartsheet for this email address. Please select the one you want to use.
        </DialogDescription>

        <div className="mt-4 space-y-3">
          {matches.map((match, index) => (
            <div 
              key={index} 
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all bg-white shadow-sm"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {match.patientName || 'Unknown Patient'}
                    </span>
                    {match.smartsheetTestName && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        Test: {match.smartsheetTestName}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    {match.emailSentDate && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Sent: {match.emailSentDate}
                      </span>
                    )}
                    
                    {match.price !== undefined && match.price !== null && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Price: {match.price.toLocaleString()} ₪
                      </span>
                    )}
                  </div>

                  {match.testMappingWarning && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Warning: Test not mapped
                    </p>
                  )}
                </div>

                <Button 
                  onClick={() => onSelect(match)}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  Select
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartsheetRowSelectionDialog;


