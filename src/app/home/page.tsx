
"use client";

import Link from "next/link";
import { Bell, Lock, File as FileIcon, Search as SearchIcon, LoaderCircle } from "lucide-react";
import {
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Paper, Pdf } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

function PaperItem({ paper }: { paper: Paper }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const pdfsRef = useMemoFirebase(
    () => collection(firestore, `papers/${paper.id}/pdfDocuments`),
    [firestore, paper.id]
  );
  const { data: pdfs, isLoading } = useCollection<Pdf>(pdfsRef);
  
  const handlePaidPdfClick = (e: React.MouseEvent, pdfName: string) => {
    e.preventDefault();
    toast({
      variant: "destructive",
      title: `"${pdfName}" एक पेड PDF है`,
      description: "यह PDF पेड है, खरीदने के लिए आगे बढ़ें।",
    });
  }

  return (
    <AccordionItem value={paper.id} className="border-b-0">
      <Card className="overflow-hidden shadow-md border-0 transition-all duration-300 ease-in-out hover:shadow-xl">
        <AccordionTrigger className={cn("p-6 text-white text-left hover:no-underline", paper.gradient || 'bg-gradient-to-r from-yellow-500 to-red-600')}>
          <h3 className="font-headline text-2xl font-bold">{paper.name}</h3>
        </AccordionTrigger>
        <AccordionContent className="p-4 bg-background">
          {isLoading && <div className="flex justify-center p-4"><LoaderCircle className="w-6 h-6 animate-spin" /></div>}
          {!isLoading && pdfs && pdfs.length > 0 ? (
            <div className="space-y-3">
              {pdfs.map((pdf) => (
                <Link 
                  href={pdf.accessType === 'Paid' ? "#" : pdf.googleDriveLink} 
                  key={pdf.id}
                  onClick={(e) => pdf.accessType === 'Paid' && handlePaidPdfClick(e, pdf.name)}
                  target={pdf.accessType === 'Free' ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className={cn("p-2 rounded-md mr-4", pdf.accessType === 'Paid' ? 'bg-amber-500/10' : 'bg-primary/10')}>
                      {pdf.accessType === 'Paid' 
                        ? <Lock className="h-6 w-6 text-amber-500" />
                        : <FileIcon className="h-6 w-6 text-primary" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{pdf.name}</p>
                      <p className="text-sm text-muted-foreground">{pdf.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            !isLoading && <p className="text-center text-muted-foreground p-4">इस पेपर के लिए अभी कोई मटेरियल उपलब्ध नहीं है।</p>
          )}
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}


export default function HomePage() {
  const firestore = useFirestore();

  const papersRef = useMemoFirebase(
    () => query(collection(firestore, "papers"), orderBy("paperNumber")),
    [firestore]
  );
  const { data: papers, isLoading } = useCollection<Paper>(papersRef);

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-gradient-to-b from-yellow-100 via-red-100 to-orange-100 dark:from-yellow-900/10 dark:via-red-900/10 dark:to-orange-900/10">
        <div className="bg-gradient-to-r from-yellow-500 via-red-600 to-orange-500 text-white p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
             <div>
                 <h1 className="font-headline text-3xl font-bold">Smart Study MPSE</h1>
                <p className="text-white/80">पढ़ाई अब और भी स्मार्ट</p>
             </div>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-200" />
            <Input
              placeholder="विषय, टॉपिक, नोट्स या वीडियो खोजें…"
              className="w-full h-14 pl-12 pr-4 rounded-full bg-white/20 text-white placeholder:text-white/70 border-0 focus-visible:ring-2 focus-visible:ring-white"
            />
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
           {isLoading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin" /></div>}
           {!isLoading && papers?.length === 0 && <p className="text-center text-muted-foreground p-8">अभी कोई पेपर उपलब्ध नहीं है। कृपया बाद में जांचें।</p>}
          <Accordion type="single" collapsible className="w-full space-y-4">
            {papers && papers.map((paper, index) => {
              const gradients = [
                'from-blue-500 to-indigo-600',
                'from-purple-500 to-pink-600',
                'from-green-500 to-teal-600',
                'from-orange-500 to-red-600',
                'from-cyan-500 to-light-blue-600',
                'from-rose-500 to-fuchsia-600',
              ];
              const paperWithGradient = { ...paper, gradient: gradients[index % gradients.length]};
              return <PaperItem key={paper.id} paper={paperWithGradient} />
            })}
          </Accordion>
        </div>
      </main>
    </AppLayout>
  );
}
