"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, User, Lock, Mail, KeyRound, BookOpenCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
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
  const router = useRouter();
  const { toast } = useToast();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', role: 'student', adminCode: '' },
  });

  const selectedRole = signupForm.watch('role');

  function onLogin(values: z.infer<typeof loginSchema>) {
    console.log('Login attempt:', values);
    toast({
      title: 'सफलतापूर्वक लॉगिन हुआ!',
      description: 'होमपेज पर रीडायरेक्ट किया जा रहा है...',
    });
    router.push('/home');
  }

  function onSignup(values: z.infer<typeof signupSchema>) {
    console.log('Signup attempt:', values);
     toast({
      title: 'अकाउंट सफलतापूर्वक बन गया!',
      description: 'लॉगिन करने के लिए आगे बढ़ें।',
    });
    // In a real app, you might auto-login or switch to the login tab.
  }
  
  return (
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
              <Button type="submit" className="w-full h-12 text-lg font-bold gradient-button transition-transform active:scale-[0.98]">
                लॉगिन करें
              </Button>
              <div className="text-center">
                <a href="#" className="text-sm text-white/70 hover:text-white hover:underline">पासवर्ड भूल गए?</a>
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

              <Button type="submit" className="w-full h-12 text-lg font-bold gradient-button transition-transform active:scale-[0.98]">
                अकाउंट बनाएं
              </Button>
            </form>
          </Form>
        </TabsContent>
      </div>
    </Tabs>
  );
}