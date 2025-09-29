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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isSending}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendEmailConfirmationDialogBox;
