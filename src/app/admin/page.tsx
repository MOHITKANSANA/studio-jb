
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  collection,
  doc,
  serverTimestamp,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useUser,
  useMemoFirebase,
} from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Book, Users, DollarSign, Lock, Unlock, BarChart, PlusCircle, LoaderCircle, Send, Library, FilePlus, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import type { Paper, PdfDocument as Pdf, Tab, User as AppUser } from "@/lib/types";

const paperSchema = z.object({
  name: z.string().min(1, "पेपर का नाम आवश्यक है।"),
  description: z.string().max(60, "विवरण 60 अक्षरों से कम होना चाहिए।").min(1, "विवरण आवश्यक है।"),
});

const tabSchema = z.object({
  name: z.string().min(1, "टैब का नाम आवश्यक है।"),
  paperId: z.string().min(1, "कृपया एक पेपर चुनें।"),
});

const pdfSchema = z.object({
  name: z.string().min(1, "PDF का नाम आवश्यक है।"),
  description: z.string().min(1, "PDF का विवरण आवश्यक है।"),
  googleDriveLink: z.string().url("कृपया एक मान्य गूगल ड्राइव लिंक डालें।"),
  paperId: z.string().min(1, "कृपया एक पेपर चुनें।"),
  tabId: z.string().min(1, "कृपया एक टैब चुनें।"),
  accessType: z.enum(["Free", "Paid"], { required_error: "एक्सेस प्रकार चुनना आवश्यक है।" }),
});

const notificationSchema = z.object({
    title: z.string().min(1, "सूचना का शीर्षक आवश्यक है।"),
    message: z.string().min(1, "सूचना का संदेश आवश्यक है।"),
    imageUrl: z.string().url("कृपया एक मान्य इमेज URL डालें।").optional().or(z.literal('')),
});

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const verifyAdmin = useCallback(async () => {
    if (!user) {
      setIsVerifying(false);
      setIsAdmin(false);
      return;
    }
    setIsVerifying(true);
    try {
      const adminRef = doc(firestore, 'roles_admin', user.uid);
      const docSnap = await getDoc(adminRef);
      if (docSnap.exists()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setIsVerifying(false);
    }
  }, [user, firestore]);

  useEffect(() => {
    if (!isUserLoading) {
      verifyAdmin();
    }
  }, [isUserLoading, verifyAdmin]);

  if (isUserLoading || isVerifying) {
    return (
      <Dialog open={true}>
        <DialogContent className="flex items-center justify-center">
          <LoaderCircle className="w-8 h-8 animate-spin mr-2" />
          <DialogTitle>एडमिन स्थिति की जाँच हो रही है...</DialogTitle>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAdmin) {
    return (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>पहुंच प्रतिबंधित</DialogTitle>
            <DialogDescription>आप एडमिन नहीं हैं। यह क्षेत्र केवल एडमिन के लिए है।</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}


function AdminDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const revenueChart = PlaceHolderImages.find(img => img.id === 'chart-placeholder-1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const usersQuery = useMemoFirebase(() => query(collection(firestore, "users")), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

  // For PDF counts, you might need a more sophisticated approach like cloud functions for large datasets
  // This is a simplified client-side estimation.
  const [pdfCount, setPdfCount] = useState({ free: 0, paid: 0, total: 0 });

  const paperForm = useForm<z.infer<typeof paperSchema>>({
    resolver: zodResolver(paperSchema),
    defaultValues: { name: "", description: "" },
  });

  const tabForm = useForm<z.infer<typeof tabSchema>>({
    resolver: zodResolver(tabSchema),
    defaultValues: { name: "", paperId: "" },
  });

  const pdfForm = useForm<z.infer<typeof pdfSchema>>({
    resolver: zodResolver(pdfSchema),
    defaultValues: { name: "", description: "", googleDriveLink: "", paperId: "", tabId: "", accessType: "Free" }
  });
  
  const [selectedPaperForTabs, setSelectedPaperForTabs] = useState<string>("");
  const tabsForSelectedPaperQuery = useMemoFirebase(() => 
    selectedPaperForTabs ? query(collection(firestore, `papers/${selectedPaperForTabs}/tabs`), orderBy("name")) : null
  , [firestore, selectedPaperForTabs]);
  const { data: tabsForSelectedPaper, isLoading: tabsLoading } = useCollection<Tab>(tabsForSelectedPaperQuery);


  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { title: "", message: "", imageUrl: "" },
  });
  
  async function onAddPaper(values: z.infer<typeof paperSchema>) {
    setIsSubmitting(true);
    const newPaper = {
      ...values,
      paperNumber: (papers?.length || 0) + 1,
      createdAt: serverTimestamp(),
    };
    await addDocumentNonBlocking(collection(firestore, "papers"), newPaper);
    toast({ title: "सफलता!", description: `पेपर "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    paperForm.reset();
    setIsSubmitting(false);
  }

  async function onAddTab(values: z.infer<typeof tabSchema>) {
    setIsSubmitting(true);
    const tabsCollectionRef = collection(firestore, `papers/${values.paperId}/tabs`);
    const newTab = { ...values, createdAt: serverTimestamp() };
    await addDocumentNonBlocking(tabsCollectionRef, newTab);
    toast({ title: "सफलता!", description: `टैब "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    tabForm.reset();
    setIsSubmitting(false);
  }

  async function onAddPdf(values: z.infer<typeof pdfSchema>) {
    setIsSubmitting(true);
    const pdfsCollectionRef = collection(firestore, `papers/${values.paperId}/tabs/${values.tabId}/pdfDocuments`);
    const newPdf = { ...values, createdAt: serverTimestamp() };
    await addDocumentNonBlocking(pdfsCollectionRef, newPdf);
    toast({ title: "सफलता!", description: `PDF "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    pdfForm.reset();
    setIsSubmitting(false);
  }


  async function onSendNotification(values: z.infer<typeof notificationSchema>) {
    setIsSubmitting(true);
    console.log("Sending notification:", values);
    // Here you would integrate with a push notification service like FCM
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "सफलता!", description: `सूचना "${values.title}" भेज दी गई है।` });
    notificationForm.reset();
    setIsSubmitting(false);
  }
  
  const analytics = [
    { title: "कुल विषय / पेपर", value: papers?.length ?? "...", icon: Library, gradient: "from-blue-500 to-cyan-400" },
    { title: "कुल यूज़र", value: users?.length ?? "...", icon: Users, gradient: "from-green-500 to-teal-400" },
  ];

  const revenue = [
     { title: "आज की कमाई", value: "₹ 5,000", icon: DollarSign, color: "text-green-500" },
     { title: "महीने की कमाई", value: "₹ 75,000", icon: DollarSign, color: "text-blue-500" },
     { title: "कुल Revenue", value: "₹ 5,50,000", icon: BarChart, color: "text-purple-500" },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-muted/20">
      <h1 className="font-headline text-3xl font-bold text-foreground">Admin Dashboard – Smart Study MPSE</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
         {revenue.map(item => (
             <div key={item.title} className="flex items-center p-4 bg-card rounded-lg shadow-md">
                <div className={cn("p-3 rounded-full mr-4 bg-primary/10", item.color)}>
                    <item.icon className="h-6 w-6"/>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                </div>
            </div>
        )).slice(0, 2)}
      </div>

       <Card>
        <CardHeader>
          <CardTitle>कंटेंट मैनेजमेंट</CardTitle>
          <CardDescription>यहां से पेपर, टैब और PDF जोड़ें।</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="add-paper">
                <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                    <TabsTrigger value="add-paper" className="gradient-button text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-transform"><Book className="mr-2"/> पेपर / विषय</TabsTrigger>
                    <TabsTrigger value="add-tab" className="gradient-button text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-transform"><FolderPlus className="mr-2"/> टैब</TabsTrigger>
                    <TabsTrigger value="add-pdf" className="gradient-button text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-transform"><FilePlus className="mr-2"/> PDF</TabsTrigger>
                </TabsList>
                <TabsContent value="add-paper" className="mt-6">
                    <Form {...paperForm}>
                      <form onSubmit={paperForm.handleSubmit(onAddPaper)} className="space-y-4 max-w-lg mx-auto">
                          <FormField control={paperForm.control} name="name" render={({ field }) => (
                              <FormItem><FormLabel>Paper का नाम</FormLabel><FormControl><Input placeholder="जैसे: Paper 7, इतिहास" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                           <FormField control={paperForm.control} name="description" render={({ field }) => (
                              <FormItem><FormLabel>Paper का विवरण (संक्षेप में)</FormLabel><FormControl><Input placeholder="जैसे: मध्य प्रदेश का इतिहास" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <LoaderCircle className="animate-spin" /> : "नया पेपर सेव करें"}
                          </Button>
                      </form>
                  </Form>
                </TabsContent>
                 <TabsContent value="add-tab" className="mt-6">
                    <Form {...tabForm}>
                      <form onSubmit={tabForm.handleSubmit(onAddTab)} className="space-y-4 max-w-lg mx-auto">
                           <FormField control={tabForm.control} name="paperId" render={({ field }) => (
                              <FormItem><FormLabel>किस Paper में टैब जोड़ना है?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="एक पेपर चुनें" /></SelectTrigger></FormControl>
                                <SelectContent>{papers && papers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                              </Select><FormMessage /></FormItem>
                          )}/>
                          <FormField control={tabForm.control} name="name" render={({ field }) => (
                              <FormItem><FormLabel>टैब का नाम</FormLabel><FormControl><Input placeholder="जैसे: अध्याय 1, प्राचीन इतिहास" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <LoaderCircle className="animate-spin" /> : "नया टैब सेव करें"}
                          </Button>
                      </form>
                  </Form>
                </TabsContent>
                 <TabsContent value="add-pdf" className="mt-6">
                   <Form {...pdfForm}>
                      <form onSubmit={pdfForm.handleSubmit(onAddPdf)} className="space-y-4 max-w-lg mx-auto">
                          <FormField control={pdfForm.control} name="paperId" render={({ field }) => (
                              <FormItem><FormLabel>Paper चुनें</FormLabel><Select onValueChange={(value) => { field.onChange(value); setSelectedPaperForTabs(value); pdfForm.resetField("tabId"); }} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="पहले एक पेपर चुनें" /></SelectTrigger></FormControl>
                                <SelectContent>{papersLoading ? <SelectItem value="loading" disabled>लोड हो रहा है...</SelectItem> : papers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                              </Select><FormMessage /></FormItem>
                          )}/>
                           <FormField control={pdfForm.control} name="tabId" render={({ field }) => (
                              <FormItem><FormLabel>टैब चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedPaperForTabs || tabsLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder={tabsLoading ? "टैब लोड हो रहे हैं..." : "फिर एक टैब चुनें"} /></SelectTrigger></FormControl>
                                <SelectContent>{tabsForSelectedPaper?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                              </Select><FormMessage /></FormItem>
                          )}/>
                          <FormField control={pdfForm.control} name="name" render={({ field }) => (
                              <FormItem><FormLabel>PDF का नाम</FormLabel><FormControl><Input placeholder="जैसे: इतिहास के महत्वपूर्ण नोट्स" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={pdfForm.control} name="description" render={({ field }) => (
                              <FormItem><FormLabel>PDF का डिस्क्रिप्शन</FormLabel><FormControl><Input placeholder="इसमें महत्वपूर्ण तिथियां हैं" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={pdfForm.control} name="googleDriveLink" render={({ field }) => (
                              <FormItem><FormLabel>Google Drive PDF Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={pdfForm.control} name="accessType" render={({ field }) => (
                              <FormItem><FormLabel>Access Type चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="एक्सेस प्रकार चुनें" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent>
                              </Select><FormMessage /></FormItem>
                          )}/>
                          <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <LoaderCircle className="animate-spin" /> : "Save PDF"}
                          </Button>
                      </form>
                  </Form>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      <Card id="send-notification" className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send /> मैन्युअल नोटिफिकेशन भेजें</CardTitle>
          <CardDescription>सभी यूज़र्स को एक कस्टम नोटिफिकेशन भेजें।</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...notificationForm}>
            <form onSubmit={notificationForm.handleSubmit(onSendNotification)} className="space-y-4">
              <FormField control={notificationForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>नोटिफिकेशन का शीर्षक</FormLabel>
                  <FormControl><Input placeholder="नया स्टडी मटेरियल उपलब्ध है!" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={notificationForm.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>नोटिफिकेशन का संदेश</FormLabel>
                  <FormControl><Textarea placeholder="आज हमने इतिहास के नए नोट्स अपलोड किए हैं, अभी देखें।" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={notificationForm.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>इमेज URL (वैकल्पिक)</FormLabel>
                  <FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : "अभी भेजें"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <AppLayout>
        <div className="flex-1 bg-muted flex items-center justify-center">
          <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>पहुंच प्रतिबंधित</DialogTitle>
              <DialogDescription>इस पेज को देखने के लिए कृपया लॉगिन करें।</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="flex-1 overflow-y-auto">
        <AdminGate>
          <AdminDashboard />
        </AdminGate>
      </main>
    </AppLayout>
  );
}

    