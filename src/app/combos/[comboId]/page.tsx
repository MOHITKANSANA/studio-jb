"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, query, where, orderBy, doc, getDoc, getDocs, DocumentData } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoaderCircle, FileText, Lock, Unlock, Home, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Combo, PdfDocument } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import PaymentDialog from '@/components/payment-dialog';

const pdfGradients = [
    'dark:from-sky-900/70 dark:to-blue-900/70',
    'dark:from-fuchsia-900/70 dark:to-purple-900/70',
    'dark:from-emerald-900/70 dark:to-green-900/70',
    'dark:from-amber-900/70 dark:to-yellow-900/70',
    'dark:from-rose-900/70 dark:to-red-900/70',
    'dark:from-violet-900/70 dark:to-indigo-900/70',
];

function PdfItem({ pdf, index }: { pdf: PdfDocument; index: number }) {
    const { toast } = useToast();
    const router = useRouter();
    const isPaid = pdf.accessType === 'Paid';
    const [dialogOpen, setDialogOpen] = useState(false);
    
    const gradientClass = `bg-gradient-to-r ${pdfGradients[index % pdfGradients.length]}`;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isPaid) {
            setDialogOpen(true);
        } else {
            router.push(`/ad-gateway?url=${encodeURIComponent(pdf.googleDriveLink)}`);
        }
    }

    return (
        <>
        <a href="#" onClick={handleClick} className="block">
          <div className={cn("flex items-center p-3 rounded-lg hover:shadow-md transition-all duration-200", gradientClass)}>
            <div className={cn("p-2 rounded-md mr-4", isPaid ? 'bg-amber-500/20' : 'bg-green-500/20')}>
              {isPaid 
                ? <Lock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                : <Unlock className="h-5 w-5 text-green-600 dark:text-green-400" />
              }
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">{pdf.name}</p>
              <p className="text-xs text-muted-foreground">{pdf.description}</p>
            </div>
          </div>
        </a>
         <PaymentDialog 
            isOpen={dialogOpen} 
            setIsOpen={setDialogOpen} 
            item={pdf}
            itemType="pdf"
        />
        </>
    )
}

export default function ComboDetailPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const comboId = params.comboId as string;
    
    const comboRef = useMemoFirebase(() => doc(firestore, 'combos', comboId), [firestore, comboId]);
    const { data: combo, isLoading: isLoadingCombo } = useDoc<Combo>(comboRef);

    const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
    const [isLoadingPdfs, setIsLoadingPdfs] = useState(true);

    useEffect(() => {
        const fetchPdfs = async () => {
            if (!combo || !combo.pdfIds || combo.pdfIds.length === 0) {
                setIsLoadingPdfs(false);
                return;
            }

            setIsLoadingPdfs(true);
            const fetchedPdfs: PdfDocument[] = [];
            
            // Firestore 'in' query supports up to 30 items. We need to batch.
            const batchSize = 30;
            for (let i = 0; i < combo.pdfIds.length; i += batchSize) {
                const batchIds = combo.pdfIds.slice(i, i + batchSize);
                const pdfsQuery = query(
                    collection(firestore, 'papers'), // This is a bit tricky, we need to search across all pdfs
                    // We can't query subcollections directly with 'in'. This requires a change in data structure.
                    // For now, let's fetch one by one, which is inefficient but works for smaller sets.
                );

                // This is a workaround. A better data structure would be a root-level `pdfs` collection.
                const paperSnapshot = await getDocs(collection(firestore, 'papers'));
                for (const paperDoc of paperSnapshot.docs) {
                    const tabSnapshot = await getDocs(collection(paperDoc.ref, 'tabs'));
                    for (const tabDoc of tabSnapshot.docs) {
                        for(const pdfId of batchIds) {
                            try {
                                const pdfRef = doc(tabDoc.ref, 'pdfDocuments', pdfId);
                                const pdfSnap = await getDoc(pdfRef);
                                if(pdfSnap.exists()){
                                    const pdfData = { ...pdfSnap.data(), id: pdfSnap.id } as PdfDocument;
                                    // avoid duplicates
                                    if(!fetchedPdfs.find(p => p.id === pdfData.id)) {
                                       fetchedPdfs.push(pdfData);
                                    }
                                }
                            } catch(e) {
                                // doc might not exist in this path, ignore.
                            }
                        }
                    }
                }
            }
            
            setPdfs(fetchedPdfs);
            setIsLoadingPdfs(false);
        };

        if (combo) {
            fetchPdfs();
        }
    }, [combo, firestore]);
    
    const isLoading = isLoadingCombo;

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">
                    <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!combo) {
        return (
             <AppLayout>
                <div className="flex flex-col h-full items-center justify-center text-center p-4">
                    <FileText className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold">कॉम्बो नहीं मिला</h1>
                    <p className="text-muted-foreground">यह कॉम्बो मौजूद नहीं है या हटा दिया गया है।</p>
                    <Button onClick={() => router.push('/home')} className="mt-4">
                        <Home className="mr-2 h-4 w-4" /> होम पर वापस जाएं
                    </Button>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex-1 flex flex-col p-4 sm:p-6">
                 <div className="flex items-center mb-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="font-headline text-2xl sm:text-3xl font-bold gradient-text">{combo.name}</h1>
                </div>
                <p className="text-muted-foreground mb-6">{combo.description}</p>
                
                {isLoadingPdfs ? (
                    <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>
                ) : !pdfs || pdfs.length === 0 ? (
                     <p className="text-center text-muted-foreground p-8">इस कॉम्बो में अभी कोई PDF नहीं है।</p>
                ) : (
                   <div className="space-y-2">
                       {pdfs.map((pdf, pdfIndex) => <PdfItem key={pdf.id} pdf={pdf} index={pdfIndex} />)}
                   </div>
                )}
            </main>
        </AppLayout>
    );
}
