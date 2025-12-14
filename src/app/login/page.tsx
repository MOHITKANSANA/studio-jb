
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, User, Lock, Mail, KeyRound, BookOpenCheck, LoaderCircle } from 'lucide-react';
import { useAuth, initiateEmailSignIn, initiateEmailSignUp, initiatePasswordReset } from '@/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const loginSchema = z.object({
  email: z.string().email({ message: 'कृपया एक मान्य ईमेल दर्ज करें।' }),
  password: z.string().min(1, { message: 'कृपया अपना पासवर्ड दर्ज करें।' }),
});

const signupSchema = z.object({
  fullName: z.string().min(2, { message: 'कृपया पूरा नाम दर्ज करें।' }),
  email: z.string().email({ message: 'कृपया एक मान्य ईमेल दर्ज करें।' }),
  password: z.string().min(6, { message: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' }),
  role: z.enum(['student', 'admin']),
  adminCode: z.string().optional(),
}).refine(data => {
  if (data.role === 'admin') {
    return data.adminCode === 'Smartjsram';
  }
  return true;
}, {
  message: 'अमान्य एडमिन कोड।',
  path: ['adminCode'],
});

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: 'कृपया एक मान्य ईमेल दर्ज करें।'})
});

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-yellow-400 via-red-500 to-orange-600 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-white text-center">
          <BookOpenCheck className="w-16 h-16 mb-4" />
          <h1 className="font-headline text-3xl font-bold">Smart Study MPSE में आपका स्वागत है</h1>
        </div>
        <AuthForm />
      </div>
    </main>
  );
}

function AuthForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', role: 'student', adminCode: '' },
  });
  
  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const selectedRole = signupForm.watch('role');

  function handleAuthError(error: any, formType: 'login' | 'signup' | 'reset') {
    let title = 'एक त्रुटि हुई';
    let description = error.message;

    if (error.code === 'auth/email-already-in-use') {
        title = 'साइन-अप विफल';
        description = 'यह ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें।';
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        title = 'लॉगिन विफल';
        description = 'अमान्य ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।';
    } else if (formType === 'reset' && error.code === 'auth/user-not-found'){
        title = 'रीसेट विफल';
        description = 'यह ईमेल पंजीकृत नहीं है। कृपया दोबारा जांचें।';
    }
    
    toast({
        variant: "destructive",
        title: title,
        description: description,
    });
  }

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      await initiateEmailSignIn(auth, values.email, values.password);
      toast({
        title: 'सफलतापूर्वक लॉगिन हुआ!',
        description: 'होमपेज पर रीडायरेक्ट किया जा रहा है...',
      });
      router.push('/home');
    } catch (error: any) {
      handleAuthError(error, 'login');
    } finally {
        setIsLoading(false);
    }
  }

  async function onSignup(values: z.infer<typeof signupSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await initiateEmailSignUp(auth, values.email, values.password);
      if (userCredential && userCredential.user) {
        const user = userCredential.user;
        const userRef = doc(firestore, "users", user.uid);
        const userData = {
          id: user.uid,
          fullName: values.fullName,
          email: values.email,
          role: values.role,
        };
        setDocumentNonBlocking(userRef, userData, { merge: true });

        if (values.role === 'admin') {
          const adminRef = doc(firestore, "roles_admin", user.uid);
          const adminData = { userId: user.uid };
          setDocumentNonBlocking(adminRef, adminData, { merge: true });
        }

        toast({
          title: 'अकाउंट सफलतापूर्वक बन गया!',
          description: 'होमपेज पर रीडायरेक्ट किया जा रहा है...',
        });
        
        router.push('/home');
      }
    } catch (error: any) {
      handleAuthError(error, 'signup');
    } finally {
        setIsLoading(false);
    }
  }
  
  async function onForgotPassword(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);
    try {
        await initiatePasswordReset(auth, values.email);
        toast({
            title: "पासवर्ड रीसेट ईमेल भेजा गया!",
            description: "अपना पासवर्ड रीसेट करने के लिए कृपया अपना इनबॉक्स जांचें।"
        });
        setForgotPasswordOpen(false);
        forgotPasswordForm.reset();
    } catch(error: any) {
        handleAuthError(error, 'reset');
    } finally {
        setIsLoading(false);
    }
  }
  
  return (
     <>
     <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-black/20 border border-white/20 h-12 p-1">
        <TabsTrigger value="login" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/80 h-full">लॉगिन</TabsTrigger>
        <TabsTrigger value="signup" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/80 h-full">साइन-अप</TabsTrigger>
      </TabsList>
      <div className="glass-card mt-4 p-6 sm:p-8">
        <TabsContent value="login">
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">ईमेल</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                        <Input placeholder="आपका ईमेल" {...field} className="bg-black/20 border-white/30 text-white pl-10 h-12"/>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">पासवर्ड</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                        <Input type={showPassword ? 'text' : 'password'} placeholder="आपका पासवर्ड" {...field} className="bg-black/20 border-white/30 text-white pl-10 h-12"/>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50">
                          {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-lg font-bold gradient-button transition-transform active:scale-[0.98]" disabled={isLoading}>
                 {isLoading ? <LoaderCircle className="animate-spin" /> : 'लॉगिन करें'}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => setForgotPasswordOpen(true)} className="text-sm text-white/70 hover:text-white hover:underline">पासवर्ड भूल गए?</button>
              </div>
            </form>
          </Form>
        </TabsContent>
        <TabsContent value="signup">
           <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
              <FormField control={signupForm.control} name="fullName" render={({ field }) => (
                  <FormItem><FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" /><Input placeholder="पूरा नाम" {...field} className="bg-black/20 border-white/30 text-white pl-10 h-12"/></div></FormControl><FormMessage /></FormItem>
                )}/>
              <FormField control={signupForm.control} name="email" render={({ field }) => (
                  <FormItem><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" /><Input placeholder="ईमेल" {...field} className="bg-black/20 border-white/30 text-white pl-10 h-12"/></div></FormControl><FormMessage /></FormItem>
                )}/>
              <FormField control={signupForm.control} name="password" render={({ field }) => (
                  <FormItem><FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" /><Input type={showPassword ? 'text' : 'password'} placeholder="पासवर्ड" {...field} className="bg-black/20 border-white/30 text-white pl-10 h-12"/><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50">{showPassword ? <EyeOff /> : <Eye />}</button></div></FormControl><FormMessage /></FormItem>
                )}/>
              <FormField control={signupForm.control} name="role" render={({ field }) => (
                  <FormItem><FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <SelectTrigger className="bg-black/20 border-white/30 text-white h-12">
                        <SelectValue placeholder="रोल चुनें" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-white/30">
                        <SelectItem value="student">विद्यार्थी</SelectItem>
                        <SelectItem value="admin">एडमिन</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )}/>
              {selectedRole === 'admin' && (
                <FormField control={signupForm.control} name="adminCode" render={({ field }) => (
                  <FormItem><FormControl><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" /><Input placeholder="सीक्रेट एडमिन कोड" {...field} className="bg-black/20 border-white/30 text-white pl-10 h-12"/></div></FormControl><FormMessage /></FormItem>
                )}/>
              )}

              <Button type="submit" className="w-full h-12 text-lg font-bold gradient-button transition-transform active:scale-[0.98]" disabled={isLoading}>
                 {isLoading ? <LoaderCircle className="animate-spin" /> : 'अकाउंट बनाएं'}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </div>
    </Tabs>
    <Dialog open={isForgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>पासवर्ड भूल गए?</DialogTitle>
                <DialogDescription>
                अपना पासवर्ड रीसेट करने के लिए कृपया अपना पंजीकृत ईमेल पता दर्ज करें। हम आपको एक रीसेट लिंक भेजेंगे।
                </DialogDescription>
            </DialogHeader>
            <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                    <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>ईमेल</FormLabel>
                        <FormControl>
                            <Input placeholder=" आपका@ईमेल.com" {...field} disabled={isLoading}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" disabled={isLoading}>रद्द करें</Button>
                        </DialogClose>
                        <Button type="submit" className="gradient-button" disabled={isLoading}>
                            {isLoading ? <LoaderCircle className="animate-spin" /> : 'रीसेट लिंक भेजें'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}

    