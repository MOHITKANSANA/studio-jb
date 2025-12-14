"use client";

import Link from "next/link";
import { Bell, Lock, File as FileIcon, Search as SearchIcon } from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
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
      title: `"${pdfName}" एक पेड PDF है`,
      description: "यह PDF पेड है, खरीदने के लिए आगे बढ़ें।",
    });
  }

  return (
    <AccordionItem value={paper.id} className="border-b-0">
      <Card className="overflow-hidden shadow-md border-0 transition-all duration-300 ease-in-out hover:shadow-xl">
        <AccordionTrigger className={cn("p-6 text-white text-left hover:no-underline bg-gradient-to-r", paper.gradient || 'from-gray-500 to-gray-600')}>
          <h3 className="font-headline text-2xl font-bold">{paper.name}</h3>
        </AccordionTrigger>
        <AccordionContent className="p-4 bg-background">
          {isLoading && <p className="text-center p-4">PDFs लोड हो रहे हैं...</p>}
          {!isLoading && pdfs && pdfs.length > 0 ? (
            <div className="space-y-3">
              {pdfs.map((pdf) => (
                <Link 
                  href={pdf.accessType === 'Paid' ? "#" : pdf.googleDriveLink} 
                  key={pdf.id}
                  onClick={(e) => pdf.accessType === 'Paid' && handlePaidPdfClick(e, pdf.name)}
                  target={pdf.accessType === 'Free' ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                >
                  <div className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="p-2 bg-primary/10 rounded-md mr-4">
                      <FileIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{pdf.name}</p>
                      <p className="text-sm text-muted-foreground">{pdf.description}</p>
                    </div>
                    {pdf.accessType === 'Paid' && (
                      <Lock className="h-5 w-5 text-amber-500 ml-4" />
                    )}
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
    () => query(collection(firestore, "papers"), orderBy("paperNumber"), limit(5)),
    [firestore]
  );
  const { data: papers, isLoading } = useCollection<Paper>(papersRef);

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-gradient-to-b from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10">
        <div className="bg-gradient-to-r from-blue-700 via-purple-600 to-pink-500 text-white p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
             <div>
                 <h1 className="font-headline text-3xl font-bold">Smart Study MPSE</h1>
                <p className="text-white/80">पढ़ाई अब और भी स्मार्ट</p>
             </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Bell />
            </Button>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="विषय, टॉपिक, नोट्स या वीडियो खोजें…"
              className="w-full h-14 pl-12 pr-4 rounded-full bg-white/20 text-white placeholder:text-white/70 border-0 focus-visible:ring-2 focus-visible:ring-white"
            />
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
           {isLoading && <p className="text-center p-8">पेपर्स लोड हो रहे हैं...</p>}
          <Accordion type="single" collapsible className="w-full space-y-4">
            {papers && papers.map((paper) => (
              <PaperItem key={paper.id} paper={paper} />
            ))}
          </Accordion>
        </div>

        <div className="p-6 mt-auto">
            <Link href="#">
              <Button size="lg" className="w-full h-14 text-lg font-bold gradient-button shadow-lg transition-transform hover:scale-105 active:scale-100">
                सभी स्टडी मटेरियल देखें
              </Button>
            </Link>
        </div>
      </main>
    </AppLayout>
  );
}
