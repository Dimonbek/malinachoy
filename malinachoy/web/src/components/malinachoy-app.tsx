"use client";

import { useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORIES, MENU_ITEMS, type CartItem, type MenuItem } from "@/lib/menu-data";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc } from "firebase/firestore";

// ============================================================
// TELEGRAM WEBAPP
// ============================================================
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        HapticFeedback: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
        };
        colorScheme: "light" | "dark";
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          setParams: (params: any) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        platform?: string;
      };
    };
  }
}

// ============================================================
// NAV PAGES
// ============================================================
type PageId = "home" | "menu" | "cart" | "about" | "contact";
const NAV_ITEMS: { id: PageId; label: string; emoji: string }[] = [
  { id: "home", label: "Bosh sahifa", emoji: "🏠" },
  { id: "menu", label: "Menyu", emoji: "🍽" },
  { id: "cart", label: "Savat", emoji: "🛒" },
  { id: "about", label: "Haqida", emoji: "ℹ️" },
  { id: "contact", label: "Aloqa", emoji: "📞" },
];

// ============================================================
// SIDEBAR MENU ITEMS
// ============================================================
const SIDEBAR_ITEMS = [
  { icon: "👤", label: "Shaxsiy ma'lumotlarim", action: "profile" },
  { icon: "📋", label: "Buyurtmalarim", action: "orders" },
  { icon: "❤️", label: "Sevimlilar", action: "favorites" },
  { icon: "📍", label: "Manzillarim", action: "addresses" },
  { icon: "🔔", label: "Bildirishmalar", action: "notifications" },
  { icon: "🌐", label: "Til", action: "language" },
  { icon: "ℹ️", label: "Biz haqimizda", action: "about" },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MalinachoyApp() {
  const [page, setPage] = useState<PageId>("home");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("all");

  const [categories, setCategories] = useState<any[]>(CATEGORIES);
  const [menuItems, setMenuItems] = useState<any[]>(MENU_ITEMS);
  const [toast, setToast] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDelivery, setFormDelivery] = useState("delivery");
  const [formAddress, setFormAddress] = useState("");
  const [formNote, setFormNote] = useState("");

  // Haptic
  const haptic = useCallback((style: string = "light") => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style); } catch {}
  }, []);

  // Cart helpers
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const addToCart = useCallback((item: MenuItem) => {
    haptic("medium");
    setCart((prev) => {
      const exist = prev.find((c) => c.id === item.id);
      if (exist) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { ...item, qty: 1 }];
    });
    showToast(`✅ ${item.name} savatga qo'shildi`);
  }, [haptic]);

  const updateQty = useCallback((id: number, delta: number) => {
    haptic("light");
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c)).filter((c) => c.qty > 0)
    );
  }, [haptic]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const getQty = (id: number) => cart.find((c) => c.id === id)?.qty || 0;

  const filteredMenu = category === "all" ? menuItems : menuItems.filter((m) => m.category === category);

  // Firebase realtime mappings
  useEffect(() => {
    const unsubMenu = onSnapshot(collection(db, "menu_items"), snap => {
      const dbItems: any[] = [];
      snap.forEach(d => dbItems.push({ ...d.data(), id: d.data().id || Date.now(), docId: d.id }));
      if (dbItems.length > 0) setMenuItems(dbItems);
    });

    const unsubCats = onSnapshot(collection(db, "categories"), snap => {
      const dbCats: any[] = [];
      snap.forEach(d => dbCats.push({ ...d.data(), id: d.id }));
      const allCat = { id: "all", label: "Barchasi", image: "🍽" };
      if (dbCats.length > 0) setCategories([allCat, ...dbCats]);
    });

    return () => {
      unsubMenu();
      unsubCats();
    };
  }, []);

  // Check if WebApp exists safely
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  const isTelegram = tg && (tg as any).platform && (tg as any).platform !== "unknown" && (tg as any).platform !== "";

  // Initialize Telegram WebApp on Mount
  useEffect(() => {
    if (isTelegram && tg) {
      tg.ready();
      tg.expand();
      // Configure MainButton appearance
      tg.MainButton.color = "#E51E44"; // malina color
      tg.MainButton.textColor = "#FFFFFF";
    }
  }, [tg, isTelegram]);

  // Handle Back Button navigation
  useEffect(() => {
    if (!tg) return;
    
    const handleBack = () => {
      if (checkoutOpen) {
        setCheckoutOpen(false);
      } else if (page !== "home") {
        setPage("home");
      }
    };

    if (page !== "home" || checkoutOpen) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } else {
      tg.BackButton.hide();
    }

    return () => {
      tg.BackButton.offClick(handleBack);
    };
  }, [page, checkoutOpen, tg]);

  // Handle MainButton visibility dynamically based on state
  useEffect(() => {
    if (!tg) return;

    if (checkoutOpen && cartCount > 0) {
      tg.MainButton.text = `Tasdiqlash (${cartTotal.toLocaleString()} so'm)`;
      tg.MainButton.show();
      // Important to remove old listeners before adding new one
      tg.MainButton.offClick(submitOrder);
      tg.MainButton.onClick(submitOrder);
    } else {
      tg.MainButton.hide();
      tg.MainButton.offClick(submitOrder);
    }
    
    return () => {
      tg.MainButton.offClick(submitOrder);
    };
  }, [checkoutOpen, cartTotal, formName, formPhone, formDelivery, formAddress, formNote]);


  // Sidebar action handler

  const handleSidebarAction = (action: string) => {
    setSidebarOpen(false);
    haptic();
    switch (action) {
      case "about": setPage("about"); break;
      case "profile": showToast("👤 Shaxsiy ma'lumotlar"); break;
      case "orders": showToast("📋 Buyurtmalar tarixi"); break;
      case "favorites": showToast("❤️ Sevimlilar ro'yxati"); break;
      case "addresses": showToast("📍 Saqlangan manzillar"); break;
      case "notifications": showToast("🔔 Bildirishmalar"); break;
      case "language": showToast("🌐 Til: O'zbekcha"); break;
      default: break;
    }
  };

  // Order submit
  const submitOrder = async () => {
    if (!formName || !formPhone) {
      showToast("❌ Ism va telefon to'ldiring!");
      return;
    }
    const orderNum = Math.floor(1000 + Math.random() * 9000).toString();
    const orderData = {
      orderNum,
      name: formName,
      phone: formPhone,
      delivery: formDelivery,
      address: formAddress,
      note: formNote,
      items: cart.map((c) => ({ name: c.name, price: c.price, qty: c.qty })),
      total: cartTotal,
      time: new Date().toISOString(),
      status: "new"
    };

    setCheckoutOpen(false);
    setSuccessOpen(true);
    setCart([]);
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setFormNote("");

    try {
      await addDoc(collection(db, "orders"), orderData);
    } catch (e: any) {
      console.error("Firebase Xatosi:", e);
      alert("⚠️ Firebase Xatosi: Bazaga ulanishda xato (Lekin buyurtma yaratildi deb hisoblang). " + e.message);
    }

    try {
      if (isTelegram && window.Telegram?.WebApp) {
         window.Telegram.WebApp.sendData(JSON.stringify(orderData));
      }
    } catch (e) {
      console.log("Telegram sendData xatosi:", e);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen pb-24 relative">
      {/* Toast */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999] bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-medium shadow-lg transition-all duration-400 ${
          toast ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
        }`}
      >
        {toast}
      </div>

      {/* Background gradient */}
      <div className="absolute top-0 left-0 right-0 h-[380px] bg-gradient-to-b from-malina-light to-transparent -z-10" />

      {/* =========== SIDEBAR MENU (Sheet) =========== */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[300px] p-0">
          {/* Header with logo */}
          <div className="px-6 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 flex items-center justify-center">
                <img 
                   src="/logo.png" 
                   alt="Malinachoy" 
                   className="w-full h-full object-contain" 
                 />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Malinachoy</h3>
                <p className="text-xs text-muted-foreground">Kafe & Restoran</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Menu items */}
          <div className="py-4">
            {SIDEBAR_ITEMS.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSidebarAction(item.action)}
                className="w-full flex items-center gap-4 px-6 py-3.5 text-left hover:bg-muted/50 transition-colors group"
              >
                <span className="text-xl w-7 text-center opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">{item.label}</span>
              </button>
            ))}
          </div>

          <Separator />

          {/* Language selector */}
          <div className="px-6 py-4">
            <button className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5 text-sm font-medium border border-border hover:bg-muted transition-colors">
              <span className="text-base">🇺🇿</span>
              O&apos;zbekcha
              <span className="text-muted-foreground ml-1">›</span>
            </button>
          </div>

          {/* Social links */}
          <div className="px-6 pb-6 mt-auto">
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-lg hover:bg-malina hover:text-white transition-all">📸</a>
              <a href="#" className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-lg hover:bg-[#229ED9] hover:text-white transition-all">✈️</a>
            </div>
            <p className="text-[10px] text-muted-foreground mt-4">Yaratuvchi: @MalinachoyDev</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* =========== HOME PAGE =========== */}
      {page === "home" && (
        <div className="max-w-lg mx-auto px-5 animate-slide-up">
          {/* Top bar with menu button */}
          <div className="flex justify-between items-center pt-4 mb-2">
            <button
              onClick={() => { setSidebarOpen(true); haptic(); }}
              className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center border border-border/50 shadow-sm hover:bg-white transition-all active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <section className="text-center pt-8 pb-10">
            {/* Logo with Glow */}
            <div className="relative inline-block mb-10">
              <div className="absolute inset-0 bg-malina/40 blur-[40px] rounded-full animate-pulse" />
              <div className="relative inline-flex items-center justify-center w-32 h-32 animate-float">
                <img 
                   src="/logo.png" 
                   alt="Malinachoy" 
                   className="w-full h-full object-contain" 
                 />
              </div>
            </div>

            <h1 className="text-5xl font-black tracking-tighter mb-3 text-balance">
              Malinachoy <span className="text-malina underline decoration-malina/20">Kafe</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-xs mx-auto leading-relaxed font-medium">
              Eng mazali milliy taomlar va xushbo&apos;y choylar maskani. 
            </p>

            {/* Info chips */}
            <div className="flex justify-center gap-2 mt-6">
              <span className="glass px-4 py-1.5 rounded-full text-[11px] font-bold text-foreground">
                🕐 09:00 – 23:00
              </span>
              <span className="glass px-4 py-1.5 rounded-full text-[11px] font-bold text-foreground uppercase tracking-widest">
                📍 Qo&apos;qon shahri
              </span>
            </div>

            {/* Stats Glass Card */}
            <div className="glass-dark rounded-[2rem] mt-10 p-6 flex justify-around border-white/10">
              <div className="text-center">
                <span className="text-2xl font-black text-malina block">HALOL</span>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tighter uppercase opacity-60">Sifat</span>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <span className="text-2xl font-black text-malina block">50+</span>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tighter uppercase opacity-60">Menyu</span>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <span className="text-2xl font-black text-malina block">20m</span>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tighter uppercase opacity-60">Yetkazish</span>
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={() => { setPage("menu"); haptic("medium"); }}
              className="mt-10 bg-malina hover:bg-malina-dark text-white rounded-full px-12 py-7 text-lg font-black shadow-2xl shadow-malina/40 hover:scale-105 active:scale-95 transition-all w-full"
            >
              🍽 Buyurtma berish
            </Button>
          </section>
        </div>
      )}

      {/* =========== MENU PAGE =========== */}
      {page === "menu" && (
        <div className="max-w-lg mx-auto px-5 animate-slide-up">
          {/* Top bar */}
          <div className="flex justify-between items-center pt-4 mb-2">
            <button
              onClick={() => { setSidebarOpen(true); haptic(); }}
              className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center border border-border/50 shadow-sm hover:bg-white transition-all active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="18" y2="18" />
              </svg>
            </button>
            <h2 className="text-xl font-bold">Menyu</h2>
            <div className="w-10" /> {/* spacer */}
          </div>

          {/* Category pills */}
          <ScrollArea className="w-full">
            <div className="flex gap-2.5 pb-4 pr-5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); haptic(); }}
                  className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                    category === cat.id
                      ? "bg-malina text-white border-malina shadow-lg shadow-malina/20 scale-105"
                      : "bg-card text-muted-foreground border-border hover:border-malina/30"
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center text-lg">
                    {cat.image && (cat.image.startsWith('http') || cat.image.startsWith('/') || cat.image.startsWith('data:image')) 
                      ? <img src={cat.image} alt={cat.label} className="w-full h-full object-cover rounded-full" /> 
                      : (cat.image || "🍽")}
                  </div>
                  {cat.label}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Bento Menu Grid */}
          <div className="grid grid-cols-6 auto-rows-[160px] gap-3 pb-6">
            {filteredMenu.map((item, idx) => {
              const qty = getQty(item.id);
              // Staggered layout logic: 1st card 3 cols, 2nd 3 cols, 3rd 4 cols, 4th 2 cols, etc.
              const colSpan = (idx % 4 === 0 || idx % 4 === 1) ? "col-span-3" : (idx % 4 === 2 ? "col-span-4" : "col-span-2");
              const rowSpan = (idx % 3 === 0) ? "row-span-2" : "row-span-1";
              
              return (
                <div
                  key={item.id}
                  className={`${colSpan} ${rowSpan} bento-card glass-dark p-4 flex flex-col group`}
                >
                  {qty > 0 && (
                    <Badge className="absolute top-3 right-3 z-10 bg-malina text-white border-0 text-[10px] h-5 w-5 flex items-center justify-center p-0 rounded-full animate-scale-in">
                      {qty}
                    </Badge>
                  )}

                  <div className="w-full h-20 mb-3 rounded-xl overflow-hidden shrink-0">
                    {item.image && (item.image.startsWith('http') || item.image.startsWith('/') || item.image.startsWith('data:image'))
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">{item.image || "🍲"}</div>
                    }
                  </div>

                  <div className="mt-auto">
                    <h3 className="font-bold text-sm tracking-tight leading-tight mb-1 group-hover:text-malina transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-malina text-xs">
                        {item.price.toLocaleString()} so&apos;m
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                        className="w-8 h-8 rounded-full bg-malina/10 text-malina flex items-center justify-center text-lg font-bold hover:bg-malina hover:text-white transition-all active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========== CART PAGE =========== */}
      {page === "cart" && (
        <div className="max-w-lg mx-auto px-5 animate-slide-up">
          <h2 className="text-3xl font-black mt-6 mb-6 tracking-tight text-balance">🛒 Savatingiz</h2>

          {cart.length === 0 ? (
            <div className="text-center py-20 glass-dark rounded-[2.5rem] border border-white/5 shadow-2xl">
              <span className="text-6xl block mb-6 animate-float">🛒</span>
              <h3 className="text-xl font-bold mb-2">Hozircha bo&apos;sh!</h3>
              <p className="text-muted-foreground text-sm mb-8 font-medium">Lekin menyuni ko&apos;rish bilan buni o&apos;zgartirish oson 😉</p>
              <Button onClick={() => setPage("menu")} className="bg-malina hover:bg-malina-dark text-white rounded-full px-10 py-6 font-bold shadow-xl shadow-malina/30 active:scale-95 transition-all">
                Menyuga o&apos;tish
              </Button>
            </div>
          ) : (
            <div className="glass-dark rounded-[2rem] p-4 mb-20 shadow-2xl border border-white/10">
              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="relative glass border border-white/40 rounded-[1.5rem] p-4 flex items-center gap-4 animate-scale-in group">
                    <div className="w-16 h-16 bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                      {item.image && (item.image.startsWith('http') || item.image.startsWith('/') || item.image.startsWith('data:image')) 
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> 
                        : (item.image || "🍲")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm mb-1 text-foreground leading-tight">{item.name}</h4>
                      <span className="text-xs font-black text-malina">{item.price.toLocaleString()} so&apos;m</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/60 dark:bg-black/20 rounded-2xl px-2 py-1.5 border border-white/50 shadow-inner shrink-0">
                      <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-black/40 rounded-xl text-foreground font-bold text-lg shadow-sm hover:text-malina active:scale-90 transition-all">−</button>
                      <span className="w-4 text-center text-sm font-black">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-malina text-white rounded-xl font-bold text-lg shadow-md shadow-malina/40 active:scale-90 transition-all">+</button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-5 bg-border/50" />

              <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Jami Summa:</span>
                <span className="text-3xl font-black text-foreground">{cartTotal.toLocaleString()} <span className="text-malina text-lg">so&apos;m</span></span>
              </div>

              <Button
                onClick={() => setCheckoutOpen(true)}
                className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-2xl py-7 text-lg font-black shadow-xl active:scale-[0.98] transition-all"
              >
                📋 Rasmiylashtirish
              </Button>
            </div>
          )}
        </div>
      )}

      {/* =========== ABOUT PAGE =========== */}
      {page === "about" && (
        <div className="max-w-lg mx-auto px-5 animate-slide-up">
          <div className="text-center pt-10 pb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-malina/10 text-malina rounded-[2rem] text-4xl mb-4 shadow-xl border border-malina/20">ℹ️</div>
            <h2 className="text-3xl font-black mb-2 tracking-tight">Biz haqimizda</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">Malinachoy — sizning sevimli kafeyingiz. Mehringiz uchun rahmat!</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            {[
              { emoji: "🍳", title: "Yangi taomlar", desc: "Har kuni maxsus retseptlar asosida." },
              { emoji: "🚗", title: "Tez yetkazish", desc: "Buyurtmalar 15 daqiqada sizda." },
              { emoji: "💰", title: "Arzon narxlar", desc: "Hamyonbop va adolatli." },
              { emoji: "⭐", title: "Sifat kafolati", desc: "100% tabiiy va xalal" },
            ].map((f, i) => (
              <div key={i} className="bento-card glass-dark p-5 text-center group">
                <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform origin-bottom">{f.emoji}</span>
                <h4 className="font-bold text-sm mb-1.5">{f.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-tight">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="glass rounded-[2rem] p-6 mt-6 mb-20 border border-white/40 shadow-xl shadow-black/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-malina/10 blur-[40px] rounded-full" />
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">📖 Bizning hikoyamiz</h3>
            <p className="text-sm font-medium text-foreground/80 leading-relaxed text-balance">
              Malinachoy Kafe 2020-yilda Toshkent shahrida o&apos;z faoliyatini boshlagan. Bugungi kunga kelib minglab mijozlarga haqiqiy, eng toza va xushbo&apos;y taomlarni taqdim etib kelmoqdamiz.
            </p>
          </div>
        </div>
      )}

      {/* =========== CONTACT PAGE =========== */}
      {page === "contact" && (
        <div className="max-w-lg mx-auto px-5 animate-slide-up">
          <div className="text-center pt-10 pb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 text-white rounded-[2rem] text-4xl mb-4 shadow-2xl border border-white/10">📞</div>
            <h2 className="text-3xl font-black mb-2 tracking-tight">Aloqa</h2>
            <p className="text-muted-foreground text-sm font-medium">Biz bilan bog&apos;lanish imkoniyatlari</p>
          </div>

          <div className="space-y-4 mt-2 mb-20">
            {[
              { emoji: "📍", title: "Manzil", info: "Toshkent sh., Chilonzor tumani, Oqtepa" },
              { emoji: "📞", title: "Telefon", info: "+998 90 123 45 67" },
              { emoji: "🕐", title: "Ish vaqti", info: "Har kuni 09:00 — 23:00" },
              { emoji: "📱", title: "Telegram", info: "@MalinachoyKafe" },
            ].map((c, i) => (
              <div key={i} className="glass border border-white/40 rounded-[1.5rem] p-4 flex items-center gap-5 hover:scale-[1.02] transition-transform active:scale-95 cursor-default">
                <div className="w-14 h-14 bg-malina/10 rounded-[1.2rem] flex items-center justify-center text-2xl shrink-0 border border-malina/20">
                  {c.emoji}
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-tight mb-0.5">{c.title}</h4>
                  <p className="text-xs font-semibold text-muted-foreground">{c.info}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========== CHECKOUT DRAWER =========== */}
      <Drawer open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DrawerContent className="max-h-[92vh] z-[200]">
          <DrawerHeader>
            <DrawerTitle className="text-center text-xl">📋 Buyurtma berish</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-20 space-y-4 overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Ismingiz *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ismingiz"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:border-malina focus:ring-2 focus:ring-malina/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Telefon *</label>
              <input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:border-malina focus:ring-2 focus:ring-malina/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Yetkazish turi</label>
              <select
                value={formDelivery}
                onChange={(e) => setFormDelivery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:border-malina outline-none appearance-none cursor-pointer"
              >
                <option value="delivery">🚗 Yetkazib berish</option>
                <option value="pickup">🏃 Olib ketish</option>
                <option value="here">☕ Kafeda</option>
              </select>
            </div>
            {formDelivery === "delivery" && (
              <div className="animate-slide-up">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Manzil</label>
                <input
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="To'liq manzil"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:border-malina focus:ring-2 focus:ring-malina/20 outline-none transition-all"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Izoh</label>
              <input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Qo'shimcha izoh..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:border-malina focus:ring-2 focus:ring-malina/20 outline-none transition-all"
              />
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Jami:</span>
              <span className="text-xl font-bold">{cartTotal.toLocaleString()} so&apos;m</span>
            </div>


            {/* Fallback button object (If user opens outside Telegram) */}
            {!isTelegram && (
              <Button
                onClick={submitOrder}
                className="w-full bg-malina hover:bg-malina-dark text-white rounded-2xl py-6 text-base font-bold shadow-lg shadow-malina/25 mt-6"
              >
                ✅ Buyurtmani tasdiqlash
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* =========== SUCCESS SCREEN =========== */}
      {successOpen && (
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center text-center px-10 animate-fade-in">
          <span className="text-7xl mb-6 animate-scale-in">🎉</span>
          <h2 className="text-2xl font-bold mb-3">Buyurtma qabul qilindi!</h2>
          <p className="text-muted-foreground text-sm max-w-[260px] mb-8">
            Tez orada operatorimiz siz bilan bog&apos;lanadi. Rahmat!
          </p>
          <Button
            onClick={() => { setSuccessOpen(false); setPage("home"); }}
            className="bg-malina hover:bg-malina-dark text-white rounded-full px-10 py-5"
          >
            Bosh sahifaga
          </Button>
        </div>
      )}

      {/* =========== FLOATING CART =========== */}
      {cartCount > 0 && page === "menu" && (
        <button
          onClick={() => setPage("cart")}
          className="fixed bottom-24 right-5 w-16 h-16 bg-malina text-white rounded-full flex items-center justify-center text-2xl shadow-xl shadow-malina/30 border-4 border-white z-50 active:scale-90 transition-all animate-scale-in hover:scale-110"
        >
          🛒
          <span className="absolute -top-1 -right-1 bg-foreground text-background text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md">
            {cartCount}
          </span>
        </button>
      )}

      {/* =========== BOTTOM NAV =========== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-[100] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around max-w-lg mx-auto py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { setPage(item.id); haptic(); }}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all relative ${
                page === item.id ? "text-malina" : "text-muted-foreground"
              }`}
            >
              {page === item.id && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-malina rounded-b" />
              )}
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span>
              {item.id === "cart" && cartCount > 0 && (
                <Badge className="absolute -top-1 right-0 bg-malina text-white border-0 text-[9px] px-1.5 min-w-[18px] h-[18px]">
                  {cartCount}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
