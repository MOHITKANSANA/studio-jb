
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Lock, File as FileIcon, Search as SearchIcon, LoaderCircle } from "lucide-react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Paper, Pdf, Tab } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

function PdfItem({ pdf }: { pdf: Pdf }) {
    const { toast } = useToast();
    const isPaid = pdf.accessType === 'Paid';

    const handlePaidPdfClick = (e: React.MouseEvent) => {
        e.preventDefault();
        toast({
            variant: "destructive",
            title: `"${pdf.name}" एक पेड PDF है`,
            description: "यह PDF पेड है, खरीदने के लिए आगे बढ़ें।",
        });
    }

    return (
        <Link 
          href={isPaid ? "#" : pdf.googleDriveLink} 
          onClick={isPaid ? handlePaidPdfClick : undefined}
          target={isPaid ? '_self' : '_blank'}
          rel="noopener noreferrer"
          className="block"
        >
          <div className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors">
            <div className={cn("p-2 rounded-md mr-4", isPaid ? 'bg-amber-500/10' : 'bg-primary/10')}>
              {isPaid 
                ? <Lock className="h-5 w-5 text-amber-500" />
                : <FileIcon className="h-5 w-5 text-primary" />
              }
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">{pdf.name}</p>
              <p className="text-xs text-muted-foreground">{pdf.description}</p>
            </div>
          </div>
        </Link>
    )
}

function PaperItem({ paper, openAccordion, setOpenAccordion }: { paper: Paper; openAccordion: string; setOpenAccordion: (id: string) => void; }) {
  const isOpen = openAccordion === paper.id;

  const handleTriggerClick = () => {
    setOpenAccordion(isOpen ? "" : paper.id);
  }

  return (
    <AccordionItem value={paper.id} className="border-b-0">
      <Card className="overflow-hidden shadow-md border-0 transition-all duration-300 ease-in-out hover:shadow-xl">
        <AccordionTrigger 
          onClick={handleTriggerClick}
          className={cn("p-4 text-white text-left hover:no-underline", paper.gradient || 'bg-gradient-to-r from-yellow-500 to-red-600')}
        >
          <div className="flex-1">
            <h3 className="font-headline text-xl font-bold">{paper.name}</h3>
            <p className="text-xs text-white/80 font-normal mt-1">{paper.description}</p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-0 bg-background">
          {!paper.tabs || paper.tabs.length === 0 ? (
            <p className="text-center text-muted-foreground p-4">इस पेपर के लिए अभी कोई टैब उपलब्ध नहीं है।</p>
          ) : (
             <Tabs defaultValue={paper.tabs[0].id} className="w-full">
                <TabsList className="m-2">
                    {paper.tabs.map(tab => (
                        <TabsTrigger key={tab.id} value={tab.id}>{tab.name}</TabsTrigger>
                    ))}
                </TabsList>
                {paper.tabs.map(tab => (
                     <TabsContent key={tab.id} value={tab.id} className="p-2">
                        {tab.pdfs && tab.pdfs.length > 0 ? (
                             <div className="space-y-2">
                                {tab.pdfs.map(pdf => <PdfItem key={pdf.id} pdf={pdf} />)}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground p-4">इस टैब में कोई PDF नहीं है।</p>
                        )}
                    </TabsContent>
                ))}
             </Tabs>
          )}
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}


function usePapersWithContent() {
    const firestore = useFirestore();
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);

    const papersQuery = useMemoFirebase(
        () => query(collection(firestore, "papers"), orderBy("paperNumber")),
        [firestore]
    );

    const { data: initialPapers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

    const fetchContent = useCallback(async (papersToFetch: Paper[]) => {
        setLoading(true);
        const papersWithContent: Paper[] = [];

        for (const paper of papersToFetch) {
            const tabsQuery = query(collection(firestore, `papers/${paper.id}/tabs`), orderBy("name"));
            const tabsSnapshot = await getDocs(tabsQuery);
            const tabs: Tab[] = [];

            for (const tabDoc of tabsSnapshot.docs) {
                const tabData = { ...tabDoc.data(), id: tabDoc.id } as Tab;
                const pdfsQuery = query(collection(firestore, `papers/${paper.id}/tabs/${tabDoc.id}/pdfDocuments`), orderBy("name"));
                const pdfsSnapshot = await getDocs(pdfsQuery);
                const pdfs: Pdf[] = pdfsSnapshot.docs.map(pdfDoc => ({ ...pdfDoc.data(), id: pdfDoc.id } as Pdf));
                tabs.push({ ...tabData, pdfs });
            }
            papersWithContent.push({ ...paper, tabs });
        }
        setPapers(papersWithContent);
        setLoading(false);
    }, [firestore]);

    useEffect(() => {
        if (initialPapers) {
            fetchContent(initialPapers);
        }
    }, [initialPapers, fetchContent]);
    
    return { papers, loading: papersLoading || loading, refetch: () => initialPapers && fetchContent(initialPapers) };
}


export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { papers, loading } = usePapersWithContent();
  const [openAccordion, setOpenAccordion] = useState<string>("");


  const filteredPapers = useMemo(() => {
    if (!papers) return [];
    if (!searchTerm) return papers;

    const lowercasedFilter = searchTerm.toLowerCase();

    return papers.map(paper => {
        // If paper name matches, return it with all its content
        if (paper.name.toLowerCase().includes(lowercasedFilter) || paper.description.toLowerCase().includes(lowercasedFilter)) {
            return paper;
        }

        // Otherwise, filter tabs and pdfs
        const filteredTabs = paper.tabs?.map(tab => {
            if (tab.name.toLowerCase().includes(lowercasedFilter)) {
                return tab;
            }

            const matchingPdfs = tab.pdfs?.filter(pdf => 
                pdf.name.toLowerCase().includes(lowercasedFilter) || 
                pdf.description.toLowerCase().includes(lowercasedFilter)
            );
            
            if (matchingPdfs && matchingPdfs.length > 0) {
                return { ...tab, pdfs: matchingPdfs };
            }
            return null;
        }).filter((t): t is Tab => t !== null);

        if (filteredTabs && filteredTabs.length > 0) {
            return { ...paper, tabs: filteredTabs };
        }

        return null;
    }).filter((p): p is Paper => p !== null);

  }, [searchTerm, papers]);

  useEffect(() => {
    // Open the first search result automatically
    if (searchTerm && filteredPapers.length > 0) {
      setOpenAccordion(filteredPapers[0].id);
    } else {
      setOpenAccordion("");
    }
  }, [searchTerm, filteredPapers]);


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
           {loading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
           {!loading && filteredPapers.length === 0 && (
             <p className="text-center text-muted-foreground p-8">
               {searchTerm ? `"${searchTerm}" के लिए कोई परिणाम नहीं मिला।` : "अभी कोई पेपर उपलब्ध नहीं है। कृपया बाद में जांचें।"}
             </p>
           )}
          <Accordion type="single" collapsible className="w-full space-y-4" value={openAccordion} onValueChange={setOpenAccordion}>
            {filteredPapers.map((paper, index) => {
              const gradients = [
                'from-blue-500 to-indigo-600',
                'from-purple-500 to-pink-600',
                'from-green-500 to-teal-600',
                'from-orange-500 to-red-600',
                'from-cyan-500 to-light-blue-600',
                'from-rose-500 to-fuchsia-600',
              ];
              const paperWithGradient = { ...paper, gradient: gradients[index % gradients.length]};
              return <PaperItem key={paper.id} paper={paperWithGradient} openAccordion={openAccordion} setOpenAccordion={setOpenAccordion} />
            })}
          </Accordion>
        </div>
      </main>
    </AppLayout>
  );
}
