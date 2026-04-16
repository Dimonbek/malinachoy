export interface MenuItem {
  id: number;
  name: string;
  desc: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  isAvailable?: boolean;  // false = tugadi
  isNew?: boolean;        // Yangi taom
  isSale?: boolean;       // Chegirma
}

export interface CartItem extends MenuItem {
  qty: number;
}

export const CATEGORIES = [
  { id: "all", label: "Hammasi", image: "✨" }, // All tab can still have a logical emoji/icon
  { id: "milliy", label: "Milliy", image: "https://images.unsplash.com/photo-1594943916943-2287f394f71a?w=100&q=80" },
  { id: "kabob", label: "Kabob", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=100&q=80" },
  { id: "grill", label: "Grill", image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=100&q=80" },
  { id: "fastfood", label: "Fast Food", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&q=80" },
  { id: "ichimlik", label: "Ichimliklar", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=100&q=80" },
  { id: "shirinlik", label: "Shirinliklar", image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=100&q=80" },
];

export const MENU_ITEMS: MenuItem[] = [
  // Milliy
  { id: 1, name: "Osh (Palov)", desc: "An'anaviy o'zbek pilovi, barra sabzi va mol go'sht bilan.", price: 45000, image: "https://images.unsplash.com/photo-1594943916943-2287f394f71a?w=400&q=80", category: "milliy" },
  { id: 2, name: "Manti", desc: "Piyozli va go'shtli bug'da pishirilgan manti, saryog' bilan.", price: 35000, image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80", category: "milliy" },
  { id: 3, name: "Lag'mon", desc: "Qo'lda cho'zilgan uzen, suyuq yoki qovurilgan.", price: 32000, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80", category: "milliy" },
  { id: 4, name: "Shurva", desc: "Mol go'shtli, sabzavotli an'anaviy sho'rva.", price: 28000, image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80", category: "milliy" },
  { id: 5, name: "Chuchvara", desc: "Mayda go'shtli chuchvara, qaymog'li sho'rva ichida.", price: 30000, image: "https://images.unsplash.com/photo-1560159955-46736ce87569?w=400&q=80", category: "milliy" },
  { id: 6, name: "Somsa", desc: "Tandirda pishirilgan somsa, go'sht va piyozli.", price: 15000, image: "https://images.unsplash.com/photo-1626074964464-f6556e07661b?w=400&q=80", category: "milliy" },

  // Kabob
  { id: 7, name: "Tanodir Kabob", desc: "Tandirda sekin pishirilgan yumshoq kabob.", price: 55000, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80", category: "kabob" },
  { id: 8, name: "Qo'y Kabob", desc: "Qo'y go'shtidan tayyorlangan an'anaviy kabob.", price: 48000, image: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80", category: "kabob" },
  { id: 9, name: "Mol Kabob", desc: "Mol go'shtidan, piyoz va ziravorlar bilan.", price: 42000, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80", category: "kabob" },
  { id: 10, name: "Tovuq Kabob", desc: "Marinatlangan tovuq, ko'mirda pishirilgan.", price: 35000, image: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&q=80", category: "kabob" },

  // Grill
  { id: 11, name: "Steak", desc: "Premium mol go'sht steyk, maxsus soslar bilan.", price: 75000, image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80", category: "grill" },
  { id: 12, name: "Grill Mix", desc: "Har xil go'sht va sabzavotlardan iborat tarelka.", price: 85000, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80", category: "grill" },
  { id: 13, name: "Baliq Grill", desc: "Oqbaliq grill, limon va o'tlar bilan.", price: 65000, image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80", category: "grill" },
  { id: 14, name: "Jigar Grill", desc: "Yangi jigar, ko'mirda pishirilgan.", price: 38000, image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80", category: "grill" },

  // Fast Food
  { id: 15, name: "Burger Classic", desc: "Mol go'shtli kotlet, salat va maxsus sous bilan.", price: 35000, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80", category: "fastfood" },
  { id: 16, name: "Hot Dog", desc: "Klassik hot dog, gorchitsa va ketchup bilan.", price: 20000, image: "https://images.unsplash.com/photo-1615814589201-9a74feacb5ed?w=400&q=80", category: "fastfood" },
  { id: 17, name: "Lavash", desc: "Go'sht, sabzavot va sous bilan o'ralgan lavash.", price: 28000, image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80", category: "fastfood" },
  { id: 18, name: "Fri Kartoshka", desc: "Tuzlangan, qarsillagan kartoshka fri.", price: 15000, image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&q=80", category: "fastfood" },

  // Ichimliklar
  { id: 19, name: "Coca-Cola", desc: "Sovuq 0.5l Coca-Cola.", price: 10000, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80", category: "ichimlik" },
  { id: 20, name: "Limonad", desc: "Uy sharoitida tayyorlangan limonad.", price: 18000, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80", category: "ichimlik" },
  { id: 21, name: "Choy (Qora)", desc: "An'anaviy qora choy, qand bilan.", price: 8000, image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80", category: "ichimlik" },
  { id: 22, name: "Kompot", desc: "Mevali uy kompoti.", price: 12000, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80", category: "ichimlik" },

  // Shirinliklar
  { id: 23, name: "Medovik", desc: "Ko'p qatlamli asal torti.", price: 25000, image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80", category: "shirinlik" },
  { id: 24, name: "Chak-chak", desc: "An'anaviy asal shirinligi.", price: 20000, image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&q=80", category: "shirinlik" },
];
