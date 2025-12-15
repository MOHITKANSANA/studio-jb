
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Unlock, Search as SearchIcon, LoaderCircle, Cloud } from "lucide-react";
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Paper, PdfDocument as Pdf, Tab, Combo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const pdfGradients = [
    'from-sky-200 to-blue-200 dark:from-sky-900/70 dark:to-blue-900/70',
    'from-fuchsia-200 to-purple-200 dark:from-fuchsia-900/70 dark:to-purple-900/70',
    'from-emerald-200 to-green-200 dark:from-emerald-900/70 dark:to-green-900/70',
    'from-amber-200 to-yellow-200 dark:from-amber-900/70 dark:to-yellow-900/70',
    'from-rose-200 to-red-200 dark:from-rose-900/70 dark:to-red-900/70',
    'from-violet-200 to-indigo-200 dark:from-violet-900/70 dark:to-indigo-900/70',
];

const tabGradients = [
  "dark:bg-blue-900/50 bg-blue-100 data-[state=active]:bg-blue-600",
  "dark:bg-purple-900/50 bg-purple-100 data-[state=active]:bg-purple-600",
  "dark:bg-green-900/50 bg-green-100 data-[state=active]:bg-green-600",
  "dark:bg-pink-900/50 bg-pink-100 data-[state=active]:bg-pink-600",
  "dark:bg-orange-900/50 bg-orange-100 data-[state=active]:bg-orange-600",
];

function PdfItem({ pdf, index }: { pdf: Pdf; index: number }) {
    const { toast } = useToast();
    const router = useRouter();
    const isPaid = pdf.accessType === 'Paid';
    
    const gradientClass = pdfGradients[index % pdfGradients.length];

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isPaid) {
            toast({
                variant: "destructive",
                title: `"${pdf.name}" एक पेड PDF है`,
                description: "यह PDF पेड है, खरीदने के लिए आगे बढ़ें।",
            });
            // Future: router.push(`/payment?pdfId=${pdf.id}`);
        } else {
            router.push(`/ad-gateway?url=${encodeURIComponent(pdf.googleDriveLink)}`);
        }
    }

    return (
        <a 
          href="#"
          onClick={handleClick}
          className="block"
        >
          <div className={cn("flex items-center p-3 rounded-lg hover:shadow-md transition-all duration-200", `bg-gradient-to-r ${gradientClass}`)}>
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
          className={cn("p-4 text-white text-left hover:no-underline bg-gradient-to-r", paper.gradient)}
        >
          <div className="flex-1">
            <h3 className="font-headline text-xl font-bold">{paper.name}</h3>
            <p className="text-xs text-white/80 font-normal mt-1">{paper.description}</p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-0 bg-card">
          {!paper.tabs || paper.tabs.length === 0 ? (
            <p className="text-center text-muted-foreground p-4">इस पेपर के लिए अभी कोई टैब उपलब्ध नहीं है।</p>
          ) : (
             <Tabs defaultValue={paper.tabs[0].id} className="w-full">
                <TabsList className="m-2 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-transparent p-0">
                    {paper.tabs.map((tab, index) => (
                        <TabsTrigger 
                           key={tab.id} 
                           value={tab.id}
                           className={cn(
                            "data-[state=active]:shadow-lg data-[state=active]:text-white data-[state=active]:scale-105 transition-transform",
                            tabGradients[index % tabGradients.length]
                           )}
                        >
                          {tab.name}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {paper.tabs.map(tab => (
                     <TabsContent key={tab.id} value={tab.id} className="p-2">
                        {tab.pdfs && tab.pdfs.length > 0 ? (
                             <div className="space-y-2">
                                {tab.pdfs.map((pdf, index) => <PdfItem key={pdf.id} pdf={pdf} index={index} />)}
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

function ComboItem({ combo, index }: { combo: Combo; index: number }) {
    const { toast } = useToast();
    const router = useRouter();
    const isPaid = combo.accessType === 'Paid';

    const comboGradients = [
        'from-blue-400 to-indigo-500',
        'from-yellow-400 to-amber-500',
        'from-green-400 to-teal-500',
        'from-pink-400 to-rose-500',
        'from-sky-400 to-cyan-500',
        'from-violet-400 to-purple-500',
    ];
    const gradientClass = comboGradients[index % comboGradients.length];

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isPaid) {
            toast({
                variant: "destructive",
                title: `"${combo.name}" एक पेड कॉम्बो है`,
                description: `कीमत: ₹${combo.price || 0}. खरीदने के लिए आगे बढ़ें।`,
            });
            // Future: router.push(`/payment?comboId=${combo.id}`);
        } else {
            toast({
                title: "कॉम्बो खोला जा रहा है",
                description: "आप जल्द ही इस कॉम्बो के सभी PDFs को एक्सेस कर पाएंगे।",
            });
            // Future: redirect to a combo detail page
        }
    };

    return (
        <a href="#" onClick={handleClick} className="block group">
            <Card className={cn("text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-105", gradientClass)}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-bold flex items-center gap-2"><Cloud className="w-6 h-6"/>{combo.name}</CardTitle>
                        {isPaid 
                            ? <Lock className="h-5 w-5 text-white/80" />
                            : <Unlock className="h-5 w-5 text-white/80" />
                        }
                    </div>
                    <CardDescription className="text-white/80 text-xs pt-2">{combo.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isPaid && (
                        <div className="text-xl font-bold">
                            ₹{combo.price}
                        </div>
                    )}
                </CardContent>
            </Card>
        </a>
    );
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { papers, loading } = usePapersWithContent();
  const firestore = useFirestore();
  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc"), limit(4)), [firestore]);
  const { data: allCombos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);
  const [openAccordion, setOpenAccordion] = useState<string>("");

  const filteredPapers = useMemo(() => {
    if (!papers) return [];
    if (!searchTerm) return papers;

    const lowercasedFilter = searchTerm.toLowerCase();

    return papers.map(paper => {
        if (paper.name.toLowerCase().includes(lowercasedFilter) || paper.description.toLowerCase().includes(lowercasedFilter)) {
            return paper;
        }
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
  
  const filteredCombos = useMemo(() => {
    if (!allCombos) return [];
    if (!searchTerm) return allCombos;
    const lowercasedFilter = searchTerm.toLowerCase();
    return allCombos.filter(combo => 
        combo.name.toLowerCase().includes(lowercasedFilter) ||
        combo.description.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, allCombos]);

  useEffect(() => {
    if (searchTerm && filteredPapers.length > 0) {
      setOpenAccordion(filteredPapers[0].id);
    } else {
      setOpenAccordion("");
    }
  }, [searchTerm, filteredPapers]);
  
  const paperGradients = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-light-blue-600',
    'from-rose-500 to-fuchsia-600',
  ];

  const papersWithGradients = filteredPapers.map((paper, index) => ({
    ...paper,
    gradient: paperGradients[index % paperGradients.length],
  }));

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-background">
        <div className="p-6">
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  placeholder="विषय, टॉपिक, या PDF कॉम्बो खोजें…"
                  className="w-full h-14 pl-12 pr-4 rounded-full bg-card border-2 focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 pt-0 overflow-y-auto">
           {loading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
           
           {!loading && papersWithGradients.length === 0 && !combosLoading && (!filteredCombos || filteredCombos.length === 0) && (
             <p className="text-center text-muted-foreground p-8">
               {searchTerm ? `"${searchTerm}" के लिए कोई परिणाम नहीं मिला।` : "अभी कोई कंटेंट उपलब्ध नहीं है। कृपया बाद में जांचें।"}
             </p>
           )}

          <Accordion type="single" collapsible className="w-full space-y-4" value={openAccordion} onValueChange={setOpenAccordion}>
            {papersWithGradients.map((paper) => (
              <PaperItem key={paper.id} paper={paper} openAccordion={openAccordion} setOpenAccordion={setOpenAccordion} />
            ))}
          </Accordion>

          {filteredCombos && filteredCombos.length > 0 && (
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-headline font-bold gradient-text">Important PDF Combos</h2>
                    <Link href="/combos">
                        <Button className="gradient-button text-white font-bold">सभी कॉम्बो देखें</Button>
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredCombos.map((combo, index) => (
                        <ComboItem key={combo.id} combo={combo} index={index} />
                    ))}
                </div>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}

    