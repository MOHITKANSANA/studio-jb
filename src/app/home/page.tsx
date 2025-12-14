import Link from "next/link";
import { Bell, Lock, File, Search as SearchIcon } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { mockPapers } from "@/lib/data";
import { cn } from "@/lib/utils";

// Shuffle papers and take first 5
const papersToShow = [...mockPapers].sort(() => 0.5 - Math.random()).slice(0, 5);

export default function HomePage() {
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
          <Accordion type="single" collapsible className="w-full space-y-4">
            {papersToShow.map((paper) => (
              <AccordionItem key={paper.id} value={paper.id} className="border-b-0">
                <Card className="overflow-hidden shadow-md border-0 transition-all duration-300 ease-in-out hover:shadow-xl">
                  <AccordionTrigger className={cn("p-6 text-white text-left hover:no-underline bg-gradient-to-r", paper.gradient)}>
                    <h3 className="font-headline text-2xl font-bold">{paper.name}</h3>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-background">
                    {paper.pdfs.length > 0 ? (
                      <div className="space-y-3">
                        {paper.pdfs.map((pdf) => (
                          <Link href={pdf.url} key={pdf.id}>
                            <div className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors">
                              <div className="p-2 bg-primary/10 rounded-md mr-4">
                                <File className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">{pdf.name}</p>
                                <p className="text-sm text-muted-foreground">{pdf.description}</p>
                              </div>
                              {pdf.access === 'paid' && (
                                <Lock className="h-5 w-5 text-amber-500 ml-4" />
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground p-4">इस पेपर के लिए अभी कोई मटेरियल उपलब्ध नहीं है।</p>
                    )}
                  </AccordionContent>
                </Card>
              </AccordionItem>
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
