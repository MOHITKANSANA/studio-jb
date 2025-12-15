
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Search as SearchIcon, LoaderCircle, Cloud } from "lucide-react";
import { collection, query, orderBy } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Combo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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

export default function AllCombosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const firestore = useFirestore();
  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc")), [firestore]);
  const { data: allCombos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);

  const filteredCombos = useMemo(() => {
    if (!allCombos) return [];
    if (!searchTerm) return allCombos;
    const lowercasedFilter = searchTerm.toLowerCase();
    return allCombos.filter(combo => 
        combo.name.toLowerCase().includes(lowercasedFilter) ||
        combo.description.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, allCombos]);

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-background">
        <div className="p-6">
            <h1 className="font-headline text-3xl font-bold gradient-text mb-4">सभी PDF कॉम्बोज़</h1>
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  placeholder="कोई कॉम्बो खोजें…"
                  className="w-full h-14 pl-12 pr-4 rounded-full bg-card border-2 focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 pt-0 overflow-y-auto">
           {combosLoading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
           
           {!combosLoading && (!filteredCombos || filteredCombos.length === 0) && (
             <p className="text-center text-muted-foreground p-8">
               {searchTerm ? `"${searchTerm}" के लिए कोई परिणाम नहीं मिला।` : "अभी कोई कॉम्बो उपलब्ध नहीं है।"}
             </p>
           )}

          {filteredCombos && filteredCombos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredCombos.map((combo, index) => (
                    <ComboItem key={combo.id} combo={combo} index={index} />
                ))}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}

    