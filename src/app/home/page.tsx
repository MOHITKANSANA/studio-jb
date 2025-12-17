"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Unlock, Search as SearchIcon, LoaderCircle, Cloud, ChevronRight } from "lucide-react";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Paper, Combo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

function PaperItem({ paper, gradient }: { paper: Paper; gradient: string }) {
    const router = useRouter();

    return (
        <div 
            className={cn(
                "w-full rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer p-4 flex items-center justify-between text-white",
                gradient
            )}
            onClick={() => router.push(`/papers/${paper.id}`)}
        >
            <div>
                <h3 className="font-headline text-xl font-bold">{paper.name}</h3>
                <p className="text-xs text-white/80 font-normal mt-1">{paper.description}</p>
            </div>
            <ChevronRight className="w-8 h-8" />
        </div>
    );
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
        } else {
             router.push(`/combos/${combo.id}`);
        }
    };

    return (
        <a href="#" onClick={handleClick} className="block group">
            <Card className={cn("text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105 aspect-square flex flex-col justify-between p-4", gradientClass)}>
                <CardHeader className="p-0">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-bold flex items-center gap-2"><Cloud className="w-5 h-5"/>{combo.name}</CardTitle>
                        {isPaid 
                            ? <Lock className="h-4 w-4 text-white/80" />
                            : <Unlock className="h-4 w-4 text-white/80" />
                        }
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <CardDescription className="text-white/80 text-xs line-clamp-2">{combo.description}</CardDescription>
                    {isPaid && (
                        <div className="text-lg font-bold mt-2">
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
  const firestore = useFirestore();
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc"), limit(4)), [firestore]);
  const { data: recentCombos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);

  const filteredPapers = useMemo(() => {
    if (!papers) return [];
    if (!searchTerm) return papers;
    const lowercasedFilter = searchTerm.toLowerCase();
    return papers.filter(paper => 
        paper.name.toLowerCase().includes(lowercasedFilter) ||
        paper.description.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, papers]);
  
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

  const isLoading = papersLoading || combosLoading;

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-background">
        <div className="p-6">
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  placeholder="विषय या PDF कॉम्बो खोजें…"
                  className="w-full h-14 pl-12 pr-4 rounded-full bg-card border-2 focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 pt-0 overflow-y-auto">
           {isLoading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
           
           {!isLoading && papersWithGradients.length === 0 && (!recentCombos || recentCombos.length === 0) && (
             <p className="text-center text-muted-foreground p-8">
               {searchTerm ? `"${searchTerm}" के लिए कोई परिणाम नहीं मिला।` : "अभी कोई कंटेंट उपलब्ध नहीं है। कृपया बाद में जांचें।"}
             </p>
           )}

           {/* Papers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {papersWithGradients.map((paper) => (
                    <PaperItem key={paper.id} paper={paper} gradient={paper.gradient} />
                ))}
            </div>
            {papersWithGradients.length % 2 !== 0 && <div className="md:col-span-2"></div>}


          {/* Combos Section */}
          {recentCombos && recentCombos.length > 0 && (
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-headline font-bold gradient-text">Important PDF Combos</h2>
                    <Link href="/combos">
                        <Button className="gradient-button text-white font-bold">सभी कॉम्बो देखें</Button>
                    </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recentCombos.map((combo, index) => (
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
