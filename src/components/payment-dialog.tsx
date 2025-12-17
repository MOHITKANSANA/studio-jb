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

declare const Razorpay: any;

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
  const [isLoading, setIsLoading] = React.useState(false);

  const isFree = item.accessType === 'Free' || !item.price || item.price <= 0;

  const handleFreeAccess = () => {
    setIsOpen(false);
    if (itemType === 'pdf') {
      router.push(`/ad-gateway?url=${encodeURIComponent((item as PdfDocument).googleDriveLink)}`);
    } else {
      router.push(`/combos/${item.id}`);
    }
  };

  const handlePayment = async () => {
    if (!item.price) return;
    setIsLoading(true);

    try {
        const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: item.price }),
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        const order = await response.json();

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            amount: order.amount,
            currency: order.currency,
            name: 'MPPSC Notes',
            description: `Payment for ${item.name}`,
            order_id: order.id,
            handler: function (response: any) {
                toast({
                    title: 'Payment Successful!',
                    description: `Payment ID: ${response.razorpay_payment_id}`,
                });
                // Here you would typically verify the payment on your backend
                // and grant access to the content.
                setIsLoading(false);
                setIsOpen(false);
            },
            prefill: {
                name: user?.displayName || 'Student',
                email: user?.email,
            },
            theme: {
                color: '#6366f1',
            },
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
             toast({
                variant: 'destructive',
                title: 'Payment Failed',
                description: response.error.description,
            });
            setIsLoading(false);
        });

        rzp.open();

    } catch (error) {
        console.error("Payment initiation failed", error);
        toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: 'Could not initiate payment. Please try again.',
        });
        setIsLoading(false);
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
            <Button onClick={handlePayment} disabled={isLoading}>
              {isLoading ? <LoaderCircle className="animate-spin" /> : `₹${item.price} में खरीदें`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
