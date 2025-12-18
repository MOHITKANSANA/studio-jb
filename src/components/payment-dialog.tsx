"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/firebase';
import type { Combo, PdfDocument } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useRazorpay } from '@/hooks/use-razorpay';


interface PaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: Combo | PdfDocument;
  itemType: 'combo' | 'pdf';
}

export default function PaymentDialog({ isOpen, setIsOpen, item, itemType }: PaymentDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const isRazorpayLoaded = useRazorpay();

  const isFree = item.accessType === 'Free' || !item.price || item.price <= 0;
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  const handleFreeAccess = () => {
    setIsOpen(false);
    if (itemType === 'pdf') {
      router.push(`/ad-gateway?url=${encodeURIComponent((item as PdfDocument).googleDriveLink)}`);
    } else {
      router.push(`/combos/${item.id}`);
    }
  };

  const handlePayment = async () => {
    if (!item.price || !isRazorpayLoaded) return;
    
    if (!razorpayKey) {
        toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: 'Razorpay Key ID is not configured. Please contact support.',
        });
        return;
    }

    setIsProcessingPayment(true);

    try {
        const options = {
            key: razorpayKey,
            amount: item.price * 100, // amount in the smallest currency unit
            currency: "INR",
            name: 'MPPSC & Civil Notes',
            description: `Payment for ${item.name}`,
            receipt: `receipt_${item.id}_${uuidv4()}`,
            handler: function (response: any) {
                toast({
                    title: 'Payment Successful!',
                    description: `Payment ID: ${response.razorpay_payment_id}`,
                });
                // Here you would typically verify the payment on your backend
                // and grant access to the content.
                setIsProcessingPayment(false);
                setIsOpen(false);
                 if (itemType === 'combo') {
                    router.push(`/combos/${item.id}`);
                 } else {
                    router.push(`/ad-gateway?url=${encodeURIComponent((item as PdfDocument).googleDriveLink)}`);
                 }
            },
            prefill: {
                name: user?.displayName || 'Student',
                email: user?.email,
                contact: ''
            },
            notes: {
                itemId: item.id,
                itemType: itemType,
                userId: user?.uid
            },
            theme: {
                color: '#6366f1',
            },
            modal: {
                ondismiss: function() {
                    setIsProcessingPayment(false);
                }
            }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
             toast({
                variant: 'destructive',
                title: 'Payment Failed',
                description: response.error.description,
            });
            setIsProcessingPayment(false);
        });

        rzp.open();

    } catch (error) {
        console.error("Payment initiation failed", error);
        toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: 'Could not initiate payment. Please try again.',
        });
        setIsProcessingPayment(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p>
            <span className="font-semibold">Access Type: </span>{item.accessType}
          </p>
          {!isFree && (
            <p className="text-2xl font-bold mt-2">
              Price: ₹{item.price}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">रद्द करें</Button>
          </DialogClose>
          {isFree ? (
            <Button onClick={handleFreeAccess}>
              एक्सेस करें
            </Button>
          ) : (
            <Button onClick={handlePayment} disabled={isProcessingPayment || !isRazorpayLoaded || !razorpayKey}>
              {isProcessingPayment || !isRazorpayLoaded ? <LoaderCircle className="animate-spin" /> : !razorpayKey ? 'Not Configured' : `₹${item.price} में खरीदें`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
