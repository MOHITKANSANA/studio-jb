"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  collection,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useUser,
  useMemoFirebase,
} from "@/firebase";
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Book, Users, DollarSign, Lock, Unlock, BarChart, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import type { Paper, Pdf } from "@/lib/types";

const paperSchema = z.object({
  name: z.string().min(1, "पेपर का नाम आवश्यक है।"),
  paperNumber: z.coerce.number().min(1, "पेपर नंबर आवश्यक है।"),
});

const pdfSchema = z.object({
  name: z.string().min(1, "PDF का नाम आवश्यक है।"),
  description: z.string().min(1, "PDF का विवरण आवश्यक है।"),
  googleDriveLink: z.string().url("कृपया एक मान्य गूगल ड्राइव लिंक डालें।"),
  paperId: z.string().min(1, "कृपया एक पेपर चुनें।"),
  accessType: z.enum(["Free", "Paid"]),
});

function AdminGate({ onVerified }: { onVerified: () => void }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const adminRef = useMemoFirebase(() => user ? doc(firestore, 'roles_admin', user.uid) : null, [firestore, user]);

  useEffect(() => {
    if (user && adminRef) {
      const checkAdmin = async () => {
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(adminRef);
        if (docSnap.exists()) {
            setIsAdmin(true);
            localStorage.setItem("admin_verified", "true");
            onVerified();
        }
      };
      checkAdmin();
    }
  }, [user, adminRef, onVerified]);

  if (isUserLoading) {
    return (
        <Dialog open={true}>
            <DialogContent><DialogTitle>Verifying...</DialogTitle></DialogContent>
        </Dialog>
    );
  }

  if (!isAdmin) {
      return (
        <Dialog open={true}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>एडमिन वेरिफिकेशन</DialogTitle>
              <DialogDescription>
                आप एडमिन नहीं हैं। यह क्षेत्र केवल एडमिन के लिए है।
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
  }

  return null;
}


function AdminDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const revenueChart = PlaceHolderImages.find(img => img.id === 'chart-placeholder-1');
  
  const papersRef = useMemoFirebase(() => collection(firestore, "papers"), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersRef);

  const usersRef = useMemoFirebase(() => collection(firestore, "users"), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection(usersRef);

  const allPdfsQuery = useMemoFirebase(() => papers ? papers.flatMap(p => collection(firestore, 'papers', p.id, 'pdfDocuments')) : null, [papers, firestore]);
  // This is not a proper way to query all subcollections, but for this case it can work as a mock
  const { data: pdfs, isLoading: pdfsLoading } = useCollection<Pdf>(allPdfsQuery ? allPdfsQuery[0] : null);


  const paperForm = useForm<z.infer<typeof paperSchema>>({
    resolver: zodResolver(paperSchema),
    defaultValues: { name: "", paperNumber: (papers?.length || 0) + 1 },
  });

  const pdfForm = useForm<z.infer<typeof pdfSchema>>({
    resolver: zodResolver(pdfSchema),
    defaultValues: {
        name: "",
        description: "",
        googleDriveLink: "",
        paperId: "",
        accessType: "Free",
    }
  });
  
  function onAddPaper(values: z.infer<typeof paperSchema>) {
    const newPaperRef = doc(papersRef);
    const newPaper = {
      ...values,
      id: newPaperRef.id,
      createdAt: serverTimestamp(),
    };
    addDocumentNonBlocking(papersRef, newPaper);
    toast({ title: "सफलता!", description: `पेपर "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    paperForm.reset({ name: "", paperNumber: (papers?.length || 0) + 2 });
  }

  function onAddPdf(values: z.infer<typeof pdfSchema>) {
    const pdfsCollectionRef = collection(firestore, "papers", values.paperId, "pdfDocuments");
    const newPdfRef = doc(pdfsCollectionRef);
    const newPdf = {
        ...values,
        id: newPdfRef.id,
        createdAt: serverTimestamp(),
    };
    addDocumentNonBlocking(pdfsCollectionRef, newPdf);
    toast({ title: "सफलता!", description: `PDF "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    pdfForm.reset();
  }

  const freePdfs = pdfs?.filter(p => p.accessType === 'Free').length || 0;
  const paidPdfs = pdfs?.filter(p => p.accessType === 'Paid').length || 0;


  const analytics = [
    { title: "कुल PDF", value: pdfs?.length ?? "...", icon: FileText, gradient: "from-blue-500 to-cyan-400" },
    { title: "कुल विषय / पेपर", value: papers?.length ?? "...", icon: Book, gradient: "from-purple-500 to-pink-500" },
    { title: "कुल यूज़र", value: users?.length ?? "...", icon: Users, gradient: "from-green-500 to-teal-400" },
    { title: "फ्री PDF", value: freePdfs, icon: Unlock, gradient: "from-yellow-500 to-amber-400" },
    { title: "पेड PDF", value: paidPdfs, icon: Lock, gradient: "from-red-500 to-orange-400" },
  ];

  const revenue = [
     { title: "आज की कमाई", value: "₹ 5,000", icon: DollarSign, color: "text-green-500" },
     { title: "महीने की कमाई", value: "₹ 75,000", icon: DollarSign, color: "text-blue-500" },
     { title: "कुल Revenue", value: "₹ 5,50,000", icon: BarChart, color: "text-purple-500" },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-muted/20">
      <h1 className="font-headline text-3xl font-bold text-foreground">Admin Dashboard – Smart Study MPSE</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {analytics.map(item => (
            <Card key={item.title} className={cn("text-white border-0 shadow-lg", item.gradient)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                    <item.icon className="h-5 w-5 opacity-80" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{item.value}</div>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>कमाई का विश्लेषण</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                {revenue.map(item => (
                     <div key={item.title} className="flex items-center p-4 bg-muted rounded-lg">
                        <div className={cn("p-3 rounded-full mr-4 bg-primary/10", item.color)}>
                            <item.icon className="h-6 w-6"/>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{item.title}</p>
                            <p className="text-2xl font-bold text-foreground">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>
          {revenueChart && <Image src={revenueChart.imageUrl} alt="Revenue Chart" width={800} height={400} data-ai-hint={revenueChart.imageHint} className="w-full h-auto rounded-lg"/>}
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
          <Card id="add-paper" className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Book/> पेपर / विषय बनाएं</CardTitle>
              </CardHeader>
              <CardContent>
                  <Form {...paperForm}>
                      <form onSubmit={paperForm.handleSubmit(onAddPaper)} className="space-y-4">
                          <FormField control={paperForm.control} name="name" render={({ field }) => (
                              <FormItem><FormLabel>Paper का नाम</FormLabel><FormControl><Input placeholder="जैसे: Paper 7" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                           <FormField control={paperForm.control} name="paperNumber" render={({ field }) => (
                              <FormItem><FormLabel>Paper नंबर</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <Button type="submit" className="w-full gradient-button">नया पेपर जोड़ें</Button>
                      </form>
                  </Form>
              </CardContent>
          </Card>
          <Card id="add-pdf" className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><PlusCircle/> नया PDF जोड़ें</CardTitle>
              </CardHeader>
              <CardContent>
                   <Form {...pdfForm}>
                      <form onSubmit={pdfForm.handleSubmit(onAddPdf)} className="space-y-4">
                          <FormField control={pdfForm.control} name="name" render={({ field }) => (
                              <FormItem><FormLabel>PDF का नाम</FormLabel><FormControl><Input placeholder="जैसे: इतिहास के नोट्स" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={pdfForm.control} name="description" render={({ field }) => (
                              <FormItem><FormLabel>PDF का डिस्क्रिप्शन</FormLabel><FormControl><Input placeholder="संक्षिप्त विवरण" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={pdfForm.control} name="googleDriveLink" render={({ field }) => (
                              <FormItem><FormLabel>Google Drive PDF Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                           <FormField control={pdfForm.control} name="paperId" render={({ field }) => (
                              <FormItem><FormLabel>Paper चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="एक पेपर चुनें" /></SelectTrigger></FormControl>
                                <SelectContent>{papers && papers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                              </Select><FormMessage /></FormItem>
                          )}/>
                          <FormField control={pdfForm.control} name="accessType" render={({ field }) => (
                              <FormItem><FormLabel>Access Type चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="एक्सेस प्रकार चुनें" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent>
                              </Select><FormMessage /></FormItem>
                          )}/>
                          <Button type="submit" className="w-full gradient-button">Save PDF</Button>
                      </form>
                  </Form>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [isVerified, setIsVerified] = useState(false);
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user && localStorage.getItem("admin_verified") === "true") {
      setIsVerified(true);
    }
  }, [user, isUserLoading]);

  if (isUserLoading) {
     return (
        <AppLayout>
            <div className="flex-1 bg-muted flex items-center justify-center">
                <p>Loading user...</p>
            </div>
        </AppLayout>
     )
  }

  if (!user || !isVerified) {
    return (
      <AppLayout>
        <div className="flex-1 bg-muted">
            <AdminGate onVerified={() => setIsVerified(true)} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="flex-1 overflow-y-auto">
        <AdminDashboard />
      </main>
    </AppLayout>
  );
}
