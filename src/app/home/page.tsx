
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Lock, File as FileIcon, Search as SearchIcon, LoaderCircle } from "lucide-react";
import { collection, query, orderBy } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Paper, Pdf } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

function PaperItem({ paper, pdfs, isLoading, open }: { paper: Paper; pdfs: Pdf[] | null; isLoading: boolean; open: boolean }) {
  const { toast } = useToast();
  
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

// Custom hook to fetch PDFs for all papers
function useAllPdfs(papers: Paper[] | null) {
    const firestore = useFirestore();
    const [allPdfs, setAllPdfs] = useState<Record<string, Pdf[]>>({});
    const [loading, setLoading] = useState(true);

    const pdfQueries = useMemo(() => {
        if (!papers) return [];
        return papers.map(paper => 
            query(collection(firestore, `papers/${paper.id}/pdfDocuments`), orderBy("name"))
        );
    }, [papers, firestore]);
    
    // This is not a real hook, but a way to use useCollection inside a loop
    const pdfCollections = pdfQueries.map(q => useCollection<Pdf>(useMemoFirebase(() => q, [q])));

    useEffect(() => {
        if (!papers) return;

        const isLoading = pdfCollections.some(c => c.isLoading);
        setLoading(isLoading);

        if (!isLoading) {
            const pdfsData: Record<string, Pdf[]> = {};
            papers.forEach((paper, index) => {
                pdfsData[paper.id] = pdfCollections[index].data || [];
            });
            setAllPdfs(pdfsData);
        }
    }, [papers, pdfCollections]);

    return { allPdfs, loading };
}


export default function HomePage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");

  const papersRef = useMemoFirebase(
    () => query(collection(firestore, "papers"), orderBy("paperNumber")),
    [firestore]
  );
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersRef);
  
  const { allPdfs, loading: pdfsLoading } = useAllPdfs(papers);

  const filteredData = useMemo(() => {
    if (!papers) return [];
    if (!searchTerm) return papers.map(p => ({ paper: p, pdfs: allPdfs[p.id] || [] }));

    const lowercasedFilter = searchTerm.toLowerCase();
    const result: { paper: Paper, pdfs: Pdf[] }[] = [];

    papers.forEach(paper => {
        const matchingPdfs = (allPdfs[paper.id] || []).filter(pdf => 
            pdf.name.toLowerCase().includes(lowercasedFilter) || 
            pdf.description.toLowerCase().includes(lowercasedFilter)
        );

        if (paper.name.toLowerCase().includes(lowercasedFilter) || matchingPdfs.length > 0) {
            result.push({
                paper: paper,
                pdfs: paper.name.toLowerCase().includes(lowercasedFilter) ? (allPdfs[paper.id] || []) : matchingPdfs
            });
        }
    });

    return result;
  }, [searchTerm, papers, allPdfs]);

  const isLoading = papersLoading || pdfsLoading;

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-gradient-to-b from-yellow-100 via-red-100 to-orange-100 dark:from-yellow-900/10 dark:via-red-900/10 dark:to-orange-900/10">
        <div className="p-6">
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  placeholder="विषय, टॉपिक, या PDF खोजें…"
                  className="w-full h-14 pl-12 pr-4 rounded-full bg-background border-2 focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 pt-0 overflow-y-auto">
           {isLoading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
           {!isLoading && filteredData.length === 0 && (
             <p className="text-center text-muted-foreground p-8">
               {searchTerm ? `"${searchTerm}" के लिए कोई परिणाम नहीं मिला।` : "अभी कोई पेपर उपलब्ध नहीं है। कृपया बाद में जांचें।"}
             </p>
           )}
          <Accordion type="multiple" className="w-full space-y-4">
            {filteredData.map(({ paper, pdfs }, index) => {
              const gradients = [
                'from-blue-500 to-indigo-600',
                'from-purple-500 to-pink-600',
                'from-green-500 to-teal-600',
                'from-orange-500 to-red-600',
                'from-cyan-500 to-light-blue-600',
                'from-rose-500 to-fuchsia-600',
              ];
              const paperWithGradient = { ...paper, gradient: gradients[index % gradients.length]};
              return <PaperItem key={paper.id} paper={paperWithGradient} pdfs={pdfs} isLoading={pdfsLoading} open={!!searchTerm} />
            })}
          </Accordion>
        </div>
      </main>
    </AppLayout>
  );
}
