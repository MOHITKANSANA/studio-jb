
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  collection,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  writeBatch,
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Book, Users, DollarSign, Package, BarChart, PlusCircle, LoaderCircle, Send, Library, FilePlus, FolderPlus, ShieldCheck, KeyRound, PackagePlus, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Paper, PdfDocument as Pdf, Tab, User as AppUser, Combo } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

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

const comboSchema = z.object({
  name: z.string().min(1, "कॉम्बो का नाम आवश्यक है।"),
  description: z.string().min(1, "कॉम्बो का विवरण आवश्यक है।"),
  accessType: z.enum(["Free", "Paid"], { required_error: "एक्सेस प्रकार चुनना आवश्यक है।" }),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("कीमत 0 से ज़्यादा होनी चाहिए।").optional()
  ),
}).refine(data => data.accessType === 'Free' || (data.price !== undefined && data.price > 0), {
  message: "पेड कॉम्बो के लिए कीमत डालना आवश्यक है।",
  path: ["price"],
});

const addPdfToComboSchema = z.object({
  pdfIds: z.array(z.string()).min(1, "कम से कम एक PDF चुनें।"),
});

const notificationSchema = z.object({
    title: z.string().min(1, "सूचना का शीर्षक आवश्यक है।"),
    message: z.string().min(1, "सूचना का संदेश आवश्यक है।"),
    imageUrl: z.string().url("कृपया एक मान्य इमेज URL डालें।").optional().or(z.literal('')),
});

const securityCodeSchema = z.object({
  code: z.string().min(1, "कृपया सिक्योरिटी कोड डालें।"),
});

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const [isSecurityVerified, setSecurityVerified] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  
  const securityCodeForm = useForm<z.infer<typeof securityCodeSchema>>({
    resolver: zodResolver(securityCodeSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    const sessionVerified = localStorage.getItem('admin_security_verified');
    if (sessionVerified === 'true') {
      setSecurityVerified(true);
    }
    setIsCheckingSession(false);
  }, []);

  async function onSecurityCodeSubmit(values: z.infer<typeof securityCodeSchema>) {
    setIsVerifyingCode(true);
    securityCodeForm.clearErrors("code");
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (values.code !== "Learnx") {
        securityCodeForm.setError("code", { type: "manual", message: "गलत सिक्योरिटी कोड। कृपया पुनः प्रयास करें।" });
        setIsVerifyingCode(false);
        return;
    }
    localStorage.setItem('admin_security_verified', 'true');
    setSecurityVerified(true);
    setIsVerifyingCode(false);
  }

  if (isUserLoading || isCheckingSession) {
    return (
      <Dialog open={true}>
        <DialogContent className="flex items-center justify-center">
          <LoaderCircle className="w-8 h-8 animate-spin mr-2" />
          <DialogTitle>लोड हो रहा है...</DialogTitle>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isSecurityVerified) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-muted/20 p-4">
        <Card className="w-full max-w-md shadow-2xl bg-gradient-to-br from-blue-900 via-purple-900 to-teal-900 text-white border-white/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4"><ShieldCheck className="w-12 h-12" /></div>
            <CardTitle className="text-2xl">एडमिन सिक्योरिटी चेक</CardTitle>
            <CardDescription className="text-white/80">
              यह क्षेत्र सुरक्षित है। आगे बढ़ने के लिए कृपया सीक्रेट कोड डालें।
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...securityCodeForm}>
              <form onSubmit={securityCodeForm.handleSubmit(onSecurityCodeSubmit)} className="space-y-6">
                <FormField
                  control={securityCodeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>सीक्रेट कोड</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                           <Input type="password" placeholder="••••••••" {...field} className="bg-black/30 border-white/30 text-white pl-10 h-12"/>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-lg font-bold bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600" disabled={isVerifyingCode}>
                  {isVerifyingCode ? <><LoaderCircle className="animate-spin mr-2" /> वेरिफाई हो रहा है...</> : 'एक्सेस करें'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}


function AdminDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addPdfComboDialog, setAddPdfComboDialog] = useState<{ open: boolean; combo: Combo | null }>({ open: false, combo: null });
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const usersQuery = useMemoFirebase(() => query(collection(firestore, "users")), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);
  
  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("name")), [firestore]);
  const { data: combos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);
  
  const [allPdfs, setAllPdfs] = useState<Pdf[]>([]);
  const [loadingAllPdfs, setLoadingAllPdfs] = useState(false);

  const fetchAllPdfs = useCallback(async () => {
    if (!papers || papers.length === 0) return;
    setLoadingAllPdfs(true);
    let pdfs: Pdf[] = [];
    for (const paper of papers) {
        const tabsQuery = query(collection(firestore, `papers/${paper.id}/tabs`));
        const tabsSnapshot = await getDocs(tabsQuery);
        for (const tabDoc of tabsSnapshot.docs) {
            const pdfsQuery = query(collection(firestore, `papers/${paper.id}/tabs/${tabDoc.id}/pdfDocuments`));
            const pdfsSnapshot = await getDocs(pdfsQuery);
            pdfs = [...pdfs, ...pdfsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Pdf))];
        }
    }
    setAllPdfs(pdfs);
    setLoadingAllPdfs(false);
  }, [firestore, papers]);

  useEffect(() => {
    if(addPdfComboDialog.open) {
      fetchAllPdfs();
    }
  }, [addPdfComboDialog.open, fetchAllPdfs]);

  const [selectedPaperForTabs, setSelectedPaperForTabs] = useState<string>("");
  const tabsForSelectedPaperQuery = useMemoFirebase(() => 
    selectedPaperForTabs ? query(collection(firestore, `papers/${selectedPaperForTabs}/tabs`), orderBy("name")) : null
  , [firestore, selectedPaperForTabs]);
  const { data: tabsForSelectedPaper, isLoading: tabsLoading } = useCollection<Tab>(tabsForSelectedPaperQuery);
  
  const paperForm = useForm<z.infer<typeof paperSchema>>({ resolver: zodResolver(paperSchema), defaultValues: { name: "", description: "" } });
  const tabForm = useForm<z.infer<typeof tabSchema>>({ resolver: zodResolver(tabSchema), defaultValues: { name: "", paperId: "" } });
  const pdfForm = useForm<z.infer<typeof pdfSchema>>({ resolver: zodResolver(pdfSchema), defaultValues: { name: "", description: "", googleDriveLink: "", paperId: "", tabId: "", accessType: "Free" } });
  const comboForm = useForm<z.infer<typeof comboSchema>>({ resolver: zodResolver(comboSchema), defaultValues: { name: "", description: "", accessType: "Free", price: 0 } });
  const addPdfToComboForm = useForm<z.infer<typeof addPdfToComboSchema>>({ resolver: zodResolver(addPdfToComboSchema), defaultValues: { pdfIds: [] } });
  const notificationForm = useForm<z.infer<typeof notificationSchema>>({ resolver: zodResolver(notificationSchema), defaultValues: { title: "", message: "", imageUrl: "" } });
  
  const selectedComboAccessType = comboForm.watch("accessType");

  async function onAddPaper(values: z.infer<typeof paperSchema>) {
    setIsSubmitting(true);
    const newPaper = { ...values, paperNumber: (papers?.length || 0) + 1, createdAt: serverTimestamp() };
    await addDocumentNonBlocking(collection(firestore, "papers"), newPaper);
    toast({ title: "सफलता!", description: `पेपर "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    paperForm.reset();
    setIsSubmitting(false);
  }

  async function onAddTab(values: z.infer<typeof tabSchema>) {
    setIsSubmitting(true);
    const newTab = { ...values, createdAt: serverTimestamp() };
    await addDocumentNonBlocking(collection(firestore, `papers/${values.paperId}/tabs`), newTab);
    toast({ title: "सफलता!", description: `टैब "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    tabForm.reset();
    setIsSubmitting(false);
  }

  async function onAddPdf(values: z.infer<typeof pdfSchema>) {
    setIsSubmitting(true);
    const newPdf = { ...values, createdAt: serverTimestamp() };
    await addDocumentNonBlocking(collection(firestore, `papers/${values.paperId}/tabs/${values.tabId}/pdfDocuments`), newPdf);
    toast({ title: "सफलता!", description: `PDF "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    pdfForm.reset();
    setIsSubmitting(false);
  }

  async function onAddCombo(values: z.infer<typeof comboSchema>) {
    setIsSubmitting(true);
    const newCombo = { ...values, price: values.accessType === 'Paid' ? values.price : 0, pdfIds: [], createdAt: serverTimestamp() };
    const docRef = await addDocumentNonBlocking(collection(firestore, "combos"), newCombo);
    toast({ title: "सफलता!", description: `कॉम्बो "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
    comboForm.reset();
    setIsSubmitting(false);
  }

  async function onAddPdfToCombo(values: z.infer<typeof addPdfToComboSchema>) {
    if (!addPdfComboDialog.combo) return;
    setIsSubmitting(true);
    const comboRef = doc(firestore, "combos", addPdfComboDialog.combo.id);
    const existingPdfIds = addPdfComboDialog.combo.pdfIds || [];
    const newPdfIds = [...new Set([...existingPdfIds, ...values.pdfIds])];
    await setDocumentNonBlocking(comboRef, { pdfIds: newPdfIds }, { merge: true });
    toast({ title: "सफलता!", description: `PDFs को कॉम्बो में सफलतापूर्वक जोड़ दिया गया है।` });
    setAddPdfComboDialog({ open: false, combo: null });
    addPdfToComboForm.reset();
    setIsSubmitting(false);
  }

  async function onSendNotification(values: z.infer<typeof notificationSchema>) {
    setIsSubmitting(true);
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
     { title: "आज की कमाई", value: "₹ 0", icon: DollarSign, color: "text-green-500" },
     { title: "महीने की कमाई", value: "₹ 0", icon: DollarSign, color: "text-blue-500" },
  ];

  return (
    <>
    <div className="p-4 sm:p-6 space-y-6 bg-muted/20">
      <h1 className="font-headline text-3xl font-bold text-foreground">Admin Dashboard – Smart Study MPSE</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analytics.map(item => <Card key={item.title} className={cn("text-white border-0 shadow-lg", item.gradient)}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{item.title}</CardTitle><item.icon className="h-5 w-5 opacity-80" /></CardHeader><CardContent><div className="text-3xl font-bold">{item.value}</div></CardContent></Card>)}
        {revenue.map(item => <div key={item.title} className="flex items-center p-4 bg-card rounded-lg shadow-md"><div className={cn("p-3 rounded-full mr-4 bg-primary/10", item.color)}><item.icon className="h-6 w-6"/></div><div><p className="text-sm text-muted-foreground">{item.title}</p><p className="text-2xl font-bold text-foreground">{item.value}</p></div></div>)}
      </div>

       <Card>
        <CardHeader><CardTitle>कंटेंट मैनेजमेंट</CardTitle><CardDescription>यहां से पेपर, टैब, PDF और कॉम्बो जोड़ें।</CardDescription></CardHeader>
        <CardContent>
            <Tabs defaultValue="add-paper">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-muted/50">
                    <TabsTrigger value="add-paper" className="data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-transform text-white bg-gradient-to-r from-blue-500 to-indigo-600"><Book className="mr-2"/>पेपर/विषय</TabsTrigger>
                    <TabsTrigger value="add-tab" className="data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-transform text-white bg-gradient-to-r from-purple-500 to-pink-600"><FolderPlus className="mr-2"/>नया टैब</TabsTrigger>
                    <TabsTrigger value="add-pdf" className="data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-transform text-white bg-gradient-to-r from-green-500 to-teal-600"><FilePlus className="mr-2"/>नया PDF</TabsTrigger>
                    <TabsTrigger value="add-combo" className="data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-transform text-white bg-gradient-to-r from-orange-500 to-red-600"><PackagePlus className="mr-2"/>PDF कॉम्बो</TabsTrigger>
                </TabsList>
                <TabsContent value="add-paper" className="mt-6"><Form {...paperForm}><form onSubmit={paperForm.handleSubmit(onAddPaper)} className="space-y-4 max-w-lg mx-auto"><FormField control={paperForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Paper का नाम</FormLabel><FormControl><Input placeholder="जैसे: Paper 7, इतिहास" {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={paperForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Paper का विवरण (संक्षेप में)</FormLabel><FormControl><Input placeholder="जैसे: मध्य प्रदेश का इतिहास" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : "नया पेपर सेव करें"}</Button></form></Form></TabsContent>
                <TabsContent value="add-tab" className="mt-6"><Form {...tabForm}><form onSubmit={tabForm.handleSubmit(onAddTab)} className="space-y-4 max-w-lg mx-auto"><FormField control={tabForm.control} name="paperId" render={({ field }) => (<FormItem><FormLabel>किस Paper में टैब जोड़ना है?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="एक पेपर चुनें" /></SelectTrigger></FormControl><SelectContent>{papers && papers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/><FormField control={tabForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>टैब का नाम</FormLabel><FormControl><Input placeholder="जैसे: अध्याय 1, प्राचीन इतिहास" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : "नया टैब सेव करें"}</Button></form></Form></TabsContent>
                <TabsContent value="add-pdf" className="mt-6"><Form {...pdfForm}><form onSubmit={pdfForm.handleSubmit(onAddPdf)} className="space-y-4 max-w-lg mx-auto"><FormField control={pdfForm.control} name="paperId" render={({ field }) => (<FormItem><FormLabel>Paper चुनें</FormLabel><Select onValueChange={(value) => { field.onChange(value); setSelectedPaperForTabs(value); pdfForm.resetField("tabId"); }} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="पहले एक पेपर चुनें" /></SelectTrigger></FormControl><SelectContent>{papersLoading ? <SelectItem value="loading" disabled>लोड हो रहा है...</SelectItem> : papers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/><FormField control={pdfForm.control} name="tabId" render={({ field }) => (<FormItem><FormLabel>टैब चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedPaperForTabs || tabsLoading}><FormControl><SelectTrigger><SelectValue placeholder={tabsLoading ? "टैब लोड हो रहे हैं..." : "फिर एक टैब चुनें"} /></SelectTrigger></FormControl><SelectContent>{tabsForSelectedPaper?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                          <FormField control={pdfForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>PDF का नाम</FormLabel><FormControl><Input placeholder="जैसे: इतिहास के महत्वपूर्ण नोट्स" {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={pdfForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>PDF का डिस्क्रिप्शन</FormLabel><FormControl><Input placeholder="इसमें महत्वपूर्ण तिथियां हैं" {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={pdfForm.control} name="googleDriveLink" render={({ field }) => (<FormItem><FormLabel>Google Drive PDF Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                          <FormField control={pdfForm.control} name="accessType" render={({ field }) => (<FormItem><FormLabel>Access Type चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="एक्सेस प्रकार चुनें" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : "Save PDF"}</Button></form></Form></TabsContent>
                <TabsContent value="add-combo" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-bold text-lg mb-4">नया कॉम्बो बनाएं</h3>
                      <Form {...comboForm}><form onSubmit={comboForm.handleSubmit(onAddCombo)} className="space-y-4">
                        <FormField control={comboForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>कॉम्बो का नाम</FormLabel><FormControl><Input placeholder="जैसे: MPSE प्रीलिम्स क्रैश कोर्स" {...field}/></FormControl><FormMessage/></FormItem>)}/>
                        <FormField control={comboForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>कॉम्बो का विवरण</FormLabel><FormControl><Textarea placeholder="इस कॉम्बो में सभी महत्वपूर्ण विषयों के नोट्स हैं।" {...field}/></FormControl><FormMessage/></FormItem>)}/>
                        <FormField control={comboForm.control} name="accessType" render={({ field }) => (<FormItem><FormLabel>एक्सेस प्रकार</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/>
                        {selectedComboAccessType === 'Paid' && <FormField control={comboForm.control} name="price" render={({ field }) => (<FormItem><FormLabel>कीमत (₹ में)</FormLabel><FormControl><Input type="number" placeholder="जैसे: 499" {...field} /></FormControl><FormMessage/></FormItem>)} />}
                        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin"/> : "नया कॉम्बो सेव करें"}</Button>
                      </form></Form>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-4">मौजूदा कॉम्बो</h3>
                      {combosLoading ? <LoaderCircle className="animate-spin"/> :
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {combos?.map(c => (
                            <Card key={c.id} className="flex items-center justify-between p-3">
                              <div><p className="font-semibold">{c.name}</p><p className="text-sm text-muted-foreground">{c.pdfIds?.length || 0} PDFs</p></div>
                              <Button size="sm" onClick={() => { addPdfToComboForm.setValue("pdfIds", c.pdfIds || []); setAddPdfComboDialog({ open: true, combo: c }); }}>
                                <LinkIcon className="mr-2 h-4 w-4"/> PDFs जोड़ें
                              </Button>
                            </Card>
                          ))}
                        </div>
                      }
                    </div>
                  </div>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      <Card id="send-notification" className="shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2"><Send /> मैन्युअल नोटिफिकेशन भेजें</CardTitle><CardDescription>सभी यूज़र्स को एक कस्टम नोटिफिकेशन भेजें।</CardDescription></CardHeader><CardContent><Form {...notificationForm}><form onSubmit={notificationForm.handleSubmit(onSendNotification)} className="space-y-4"><FormField control={notificationForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>नोटिफिकेशन का शीर्षक</FormLabel><FormControl><Input placeholder="नया स्टडी मटेरियल उपलब्ध है!" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={notificationForm.control} name="message" render={({ field }) => (<FormItem><FormLabel>नोटिफिकेशन का संदेश</FormLabel><FormControl><Textarea placeholder="आज हमने इतिहास के नए नोट्स अपलोड किए हैं, अभी देखें।" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={notificationForm.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>इमेज URL (वैकल्पिक)</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : "अभी भेजें"}</Button></form></Form></CardContent></Card>
    </div>
    <Dialog open={addPdfComboDialog.open} onOpenChange={(open) => setAddPdfComboDialog({ open, combo: open ? addPdfComboDialog.combo : null })}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>कॉम्बो में PDFs जोड़ें: {addPdfComboDialog.combo?.name}</DialogTitle><DialogDescription>इस कॉम्बो में शामिल करने के लिए PDFs चुनें।</DialogDescription></DialogHeader>
        <Form {...addPdfToComboForm}><form onSubmit={addPdfToComboForm.handleSubmit(onAddPdfToCombo)}>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto my-4 pr-4">
              {loadingAllPdfs ? <LoaderCircle className="animate-spin"/> : allPdfs.map(pdf => (
                  <FormField key={pdf.id} control={addPdfToComboForm.control} name="pdfIds" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value?.includes(pdf.id)} onCheckedChange={(checked) => {
                          return checked ? field.onChange([...field.value, pdf.id]) : field.onChange(field.value?.filter(value => value !== pdf.id))
                      }}/></FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{pdf.name}</FormLabel>
                        <p className="text-sm text-muted-foreground">{pdf.description}</p>
                      </div>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>रद्द करें</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin"/> : "PDFs सेव करें"}</Button>
            </DialogFooter>
        </form></Form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default function AdminPage() {
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

    