"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Video,
  FileText,
  Library,
  Star,
  Download,
  Target,
  History,
  ClipboardCheck,
  Shield,
  PlusCircle,
  BarChart2,
  Settings,
  Moon,
  Sun,
  Bell,
  HelpCircle,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { mockUsers } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

const user = mockUsers[1]; // Assuming admin user
const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar-1');

const menuItems = [
  { icon: Home, label: "होम", href: "/home" },
  { icon: Search, label: "सर्च स्टडी मटेरियल", href: "#" },
  { icon: Video, label: "वीडियो क्लासेस", href: "#" },
  { icon: FileText, label: "पीडीएफ नोट्स", href: "#" },
  { icon: Library, label: "सभी विषय", href: "#" },
  { icon: Star, label: "सेव किए गए नोट्स", href: "#" },
  { icon: Download, label: "मेरे डाउनलोड", href: "#" },
  { icon: Target, label: "डेली स्टडी टारगेट", href: "#" },
  { icon: History, label: "पिछले वर्षों के प्रश्नपत्र", href: "#" },
  { icon: ClipboardCheck, label: "मॉक टेस्ट / प्रैक्टिस", href: "#" },
];

const adminItems = [
  { icon: Shield, label: "एडमिन पैनल", href: "/admin" },
  { icon: PlusCircle, label: "नया पीडीएफ जोड़ें", href: "/admin#add-pdf" },
  { icon: PlusCircle, label: "नया वीडियो जोड़ें", href: "#" },
  { icon: BarChart2, label: "यूज़र एनालिटिक्स", href: "/admin#analytics" },
];

const settingsItems = [
  { icon: Settings, label: "सेटिंग", href: "#" },
  { icon: Bell, label: "नोटिफिकेशन सेटिंग", href: "#" },
  { icon: HelpCircle, label: "हेल्प और सपोर्ट", href: "#" },
];

function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="bg-gradient-to-b from-blue-900 via-purple-900 to-teal-900 h-full flex flex-col">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-white/50">
            {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={user.name} data-ai-hint={userAvatar.imageHint}/>}
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-white">
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-white/70">{user.exam}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} className="w-full">
                <SidebarMenuButton
                  className="text-sidebar-foreground hover:bg-white/10 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  isActive={pathname === item.href}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {user.role === 'admin' && (
          <>
            <div className="px-4 my-2">
                <p className="text-xs font-semibold text-white/50 tracking-wider uppercase">एडमिन</p>
            </div>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href} className="w-full">
                    <SidebarMenuButton
                      className="text-sidebar-foreground hover:bg-white/10 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white"
                      isActive={pathname === item.href}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </>
        )}
        
        <div className="px-4 my-2">
            <p className="text-xs font-semibold text-white/50 tracking-wider uppercase">सेटिंग्स</p>
        </div>
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} className="w-full">
                <SidebarMenuButton className="text-sidebar-foreground hover:bg-white/10 hover:text-white">
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
           <SidebarMenuItem>
              <ThemeToggle />
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-white/10 mt-auto">
         <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/login" className="w-full">
                <SidebarMenuButton className="text-red-400 hover:bg-red-500/20 hover:text-red-300">
                    <LogOut className="w-5 h-5" />
                    <span>लॉगआउट</span>
                </SidebarMenuButton>
                 </Link>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="text-center text-xs text-white/50 mt-4">
          <p>Version 1.0.0</p>
          <p>आपकी सफलता का साथी</p>
        </div>
      </SidebarFooter>
    </div>
  );
}

function ThemeToggle() {
    const [isDark, setIsDark] = React.useState(false);
    
    React.useEffect(() => {
        const isCurrentlyDark = document.documentElement.classList.contains('dark');
        setIsDark(isCurrentlyDark);
    }, []);

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
        setIsDark(!isDark);
    }
    
    return (
        <SidebarMenuButton onClick={toggleTheme} className="text-sidebar-foreground hover:bg-white/10 hover:text-white">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </SidebarMenuButton>
    )
}

function TopBar() {
  const { isMobile } = useSidebar();
  
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className={cn(!isMobile && "hidden")}/>
      <div className="flex-1">
        {/* Placeholder for top bar content if needed */}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={user.name} data-ai-hint={userAvatar.imageHint}/>}
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>मेरा अकाउंट</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>सेटिंग्स</DropdownMenuItem>
          <DropdownMenuItem>सपोर्ट</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-500">लॉगआउट</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
     <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="offcanvas" className="w-72">
          <AppSidebar />
        </Sidebar>
        <div className="flex flex-col flex-1">
            <TopBar />
            <SidebarInset className="bg-transparent p-0 m-0 rounded-none shadow-none md:m-0 md:rounded-none md:shadow-none min-h-0">
                {children}
            </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
