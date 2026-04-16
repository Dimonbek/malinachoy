"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type MenuItem } from "@/lib/menu-data";
import { db, storage } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ============================================================
// TYPES
// ============================================================
type OrderStatus = "new" | "accepted" | "delivering" | "done" | "cancelled";

interface Order {
  id: string;
  orderNum: string;
  name: string;
  phone: string;
  delivery: "delivery" | "pickup" | "here";
  address?: string;
  note?: string;
  items: { name: string; price: number; qty: number }[];
  total: number;
  time: string;
  status: OrderStatus;
}

type AdminTab = "dashboard" | "orders" | "menu" | "settings";

// ============================================================
// HELPERS
// ============================================================
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  new:        { label: "🆕 Yangi",      color: "text-blue-600",  bg: "bg-blue-50 border-blue-200" },
  accepted:   { label: "✅ Qabul",      color: "text-green-600", bg: "bg-green-50 border-green-200" },
  delivering: { label: "🚗 Yo'lda",     color: "text-orange-600",bg: "bg-orange-50 border-orange-200" },
  done:       { label: "✔️ Yetkazildi", color: "text-gray-500",  bg: "bg-gray-50 border-gray-200" },
  cancelled:  { label: "❌ Bekor",      color: "text-red-500",   bg: "bg-red-50 border-red-200" },
};

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

function isWorkingHours() {
  const uzbTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
  const h = uzbTime.getHours();
  return h >= 9 && h < 23;
}

function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = Math.min(img.width, img.height);
      const outputSize = 300; // Standart kichik o'lcham
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;
      
      ctx.drawImage(img, x, y, size, size, 0, 0, outputSize, outputSize);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Blob conversion failed"));
      }, "image/webp", 0.7);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOpen, setIsOpen] = useState(isWorkingHours());
  const [notification, setNotification] = useState<string | null>(null);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // New Item Form
  const [newItem, setNewItem] = useState({ name: "", desc: "", price: "", category: "" });
  const [newCat, setNewCat] = useState({ id: "", label: "" });
  
  const itemFileRef = useRef<HTMLInputElement>(null);
  const catFileRef = useRef<HTMLInputElement>(null);

  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");

  // Auth
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const ADMIN_PIN = "1234";

  const showNotif = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setIsOpen(isWorkingHours()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Firebase Real-time listeners
  useEffect(() => {
    if (!authed) return;

    const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
      const ords: Order[] = [];
      snap.forEach(d => ords.push({ ...d.data(), id: d.id } as Order));
      ords.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setOrders(ords);
    });

    const unsubMenu = onSnapshot(collection(db, "menu_items"), (snap) => {
      const items: any[] = [];
      snap.forEach(d => items.push({ ...d.data(), docId: d.id }));
      setMenuItems(items);
    });

    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      const cats: any[] = [];
      snap.forEach(d => cats.push({ ...d.data(), id: d.id }));
      setCategories(cats);
    });

    return () => {
      unsubOrders();
      unsubMenu();
      unsubCats();
    };
  }, [authed]);

  // ANALYTICS
  const doneOrders = orders.filter(o => o.status === "done");
  const totalRevenue = doneOrders.reduce((s, o) => s + o.total, 0);
  const newOrdersCount = orders.filter(o => o.status === "new").length;

  const uploadAndGetUrl = async (file: File, path: string) => {
    const blob = await cropToSquare(file);
    // Firebase Storage pulli bo'lib qolmasligi uchun uni to'g'ridan-to'g'ri base64 qilib bazaga saqlaymiz:
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Faylni o'qishda xatolik"));
      reader.readAsDataURL(blob);
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = itemFileRef.current?.files?.[0];
    if (!file) return showNotif("❌ Iltimos, taom rasmini yuklang!");
    
    setUploading(true);
    try {
      const imageUrl = await uploadAndGetUrl(file, "menu_images");
      await addDoc(collection(db, "menu_items"), {
        id: Date.now(),
        name: newItem.name,
        desc: newItem.desc,
        price: Number(newItem.price),
        image: imageUrl,
        category: newItem.category || (categories[0]?.id || "milliy"),
        isAvailable: true,
        isNew: true,
        isSale: false
      });
      showNotif("✅ Taom qoshildi!");
      setShowAddModal(false);
      setNewItem({ name: "", desc: "", price: "", category: "" });
      if (itemFileRef.current) itemFileRef.current.value = '';
    } catch(err) {
      console.error(err);
      showNotif("❌ Xatolik yuz berdi");
    }
    setUploading(false);
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = catFileRef.current?.files?.[0];
    if (!file) return showNotif("❌ Iltimos, kategoriya rasmini yuklang!");

    setUploading(true);
    try {
      const imageUrl = await uploadAndGetUrl(file, "cat_images");
      const catId = newCat.label.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, "categories", catId), {
        label: newCat.label,
        image: imageUrl
      });
      showNotif("✅ Kategoriya yaratildi!");
      setShowCatModal(false);
      setNewCat({ id: "", label: "" });
      if (catFileRef.current) catFileRef.current.value = '';
    } catch(err) {
      console.error(err);
      showNotif("❌ Xatolik yuz berdi");
    }
    setUploading(false);
  };

  const toggleAvailable = async (item: any) => {
    await updateDoc(doc(db, "menu_items", item.docId), { isAvailable: !item.isAvailable });
    showNotif("✅ Holat yangilandi");
  };

  const toggleNew = async (item: any) => {
    await updateDoc(doc(db, "menu_items", item.docId), { isNew: !item.isNew });
  };
  
  const toggleSale = async (item: any) => {
    await updateDoc(doc(db, "menu_items", item.docId), { isSale: !item.isSale });
  };

  const deleteItem = async (item: any) => {
    if (confirm(`Rostdan ham "${item.name}" ni o'chirib tashlaysizmi?`)) {
      await deleteDoc(doc(db, "menu_items", item.docId));
      showNotif("🗑️ Taom o'chirildi");
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    await updateDoc(doc(db, "orders", id), { status });
    setSelectedOrder(prev => prev?.id === id ? { ...prev, status } : prev);
    showNotif(`Status: ${STATUS_CONFIG[status].label}`);
  };

  const filteredOrders = filterStatus === "all" ? orders : orders.filter(o => o.status === filterStatus);

  // AUTH SCREEN
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-malina-light to-background px-6">
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            if (pin.trim() === ADMIN_PIN) setAuthed(true); 
          }}
          className="w-full max-w-sm glass rounded-[2rem] p-8 text-center"
        >
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-black mb-1">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mb-6">Malinachoy Kafe</p>

          <div className="space-y-3">
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="PIN kiriting"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-center text-2xl tracking-[0.5em] font-bold focus:border-malina outline-none"
            />
            {pin.length > 0 && pin.trim() !== ADMIN_PIN && (
              <p className="text-xs text-red-500">❌ Noto'g'ri PIN-kod (1234)</p>
            )}
            <button type="submit" className="w-full py-3 bg-malina text-white rounded-xl font-bold">
              Kirish →
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-malina-light/30 via-background to-background">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] bg-foreground text-background px-6 py-3 rounded-full text-sm font-semibold shadow-xl">
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-black text-sm">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isOpen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {isOpen ? "Ochiq" : "Yopiq"}
            </div>
            <button onClick={() => setAuthed(false)} className="text-xs font-bold hover:underline">Chiqish</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: "dashboard", label: "Dashboard", emoji: "📊" },
            { id: "orders",    label: "Buyurtmalar", emoji: "📋", badge: newOrdersCount },
            { id: "menu",      label: "Menyu", emoji: "🍽" },
            { id: "settings",  label: "Sozlamalar", emoji: "⚙️" },
          ].map((t: any) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border relative ${
                tab === t.id ? "bg-malina text-white border-malina" : "bg-white/80 text-foreground"
              }`}
            >
              {t.emoji} {t.label}
              {t.badge > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">{t.badge}</span>}
            </button>
          ))}
        </nav>

        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-[1.5rem] p-5">
                <div className="text-2xl">💰</div>
                <div className="text-xl font-black text-malina">{formatPrice(totalRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">Jami daromad</div>
              </div>
              <div className="glass rounded-[1.5rem] p-5">
                <div className="text-2xl">🆕</div>
                <div className="text-xl font-black text-blue-600">{newOrdersCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Yangi buyurtmalar</div>
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-4">
             <div className="flex gap-2 overflow-x-auto pb-1">
              {(["all", "new", "accepted", "delivering", "done", "cancelled"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border ${filterStatus === s ? "bg-malina text-white border-malina" : "glass"}`}
                >
                  {s === "all" ? "Barchasi" : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {filteredOrders.length === 0 && <p className="text-muted-foreground text-sm col-span-2 text-center py-10">Bunday statusdagi buyurtmalar yo'q.</p>}
              {filteredOrders.map(order => (
                <div key={order.id} onClick={() => setSelectedOrder(order)} className={`glass rounded-[1.5rem] p-5 border cursor-pointer ${order.status === "new" ? "border-blue-300 ring-2 ring-blue-200" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-black">#{order.orderNum}</span>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${STATUS_CONFIG[order.status].bg} ${STATUS_CONFIG[order.status].color}`}>
                      {STATUS_CONFIG[order.status].label}
                    </span>
                  </div>
                  <p className="text-sm font-bold">{order.name}</p>
                  <p className="text-xs text-muted-foreground">{order.phone}</p>
                  <p className="font-black text-malina mt-3">{formatPrice(order.total)}</p>
                </div>
              ))}
            </div>
            
            {/* Order Details Modal */}
            {selectedOrder && (
               <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                 <div className="glass w-full max-w-md rounded-[2rem] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between mb-5">
                      <h3 className="font-black text-xl">Buyurtma #{selectedOrder.orderNum}</h3>
                      <button onClick={() => setSelectedOrder(null)} className="font-black text-2xl text-muted-foreground hover:text-black">✕</button>
                    </div>

                    <div className="space-y-2 text-sm max-h-[50vh] overflow-y-auto mb-4 p-2 bg-white/40 rounded-xl">
                      {selectedOrder.items.map((it, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg">
                           <span className="font-bold">{it.qty}x {it.name}</span>
                           <span className="text-malina font-black text-xs">{formatPrice(it.price * it.qty)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status tugmalari */}
                    <div className="grid grid-cols-2 gap-2 mt-6">
                      {selectedOrder.status === "new" && (
                        <>
                          <button onClick={() => updateOrderStatus(selectedOrder.id, "accepted")} className="py-3 bg-green-500 text-white rounded-xl font-bold">✅ Qabul</button>
                          <button onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")} className="py-3 bg-red-500 text-white rounded-xl font-bold">❌ Bekor</button>
                        </>
                      )}
                      {selectedOrder.status === "accepted" && (
                         <button onClick={() => updateOrderStatus(selectedOrder.id, "delivering")} className="col-span-2 py-3 bg-orange-500 text-white rounded-xl font-bold">🚗 Yo'lga chikarish</button>
                      )}
                      {selectedOrder.status === "delivering" && (
                         <button onClick={() => updateOrderStatus(selectedOrder.id, "done")} className="col-span-2 py-3 bg-green-600 text-white rounded-xl font-bold">✔️ Yetkazildi qilib belgilash</button>
                      )}
                    </div>
                 </div>
               </div>
            )}
          </div>
        )}

        {/* ====== MENU MANAGEMENT ====== */}
        {tab === "menu" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if(categories.length === 0) {
                     return showNotif("❌ Avval kamida bitta Kategoriya qo'shing!");
                  }
                  setNewItem({...newItem, category: categories[0].id});
                  setShowAddModal(true);
                }} 
                className="flex-1 py-3 bg-malina text-white rounded-xl font-bold shadow-lg shadow-malina/30 active:scale-95 transition-all">
                ➕ Taom qo'shish
              </button>
              <button onClick={() => setShowCatModal(true)} className="flex-1 py-3 glass rounded-xl font-bold active:scale-95 transition-all">📂 Kategoriya yaratish</button>
            </div>

            {categories.length === 0 && (
              <div className="text-center py-10 bg-white/30 rounded-3xl border border-white/50">
                <span className="text-4xl mb-3 block">📂</span>
                <p className="text-muted-foreground font-medium">Hech qanday kategoriya yo'q</p>
                <p className="text-xs mt-1">Avval kategoriya yarating.</p>
              </div>
            )}

            {categories.map(cat => {
              const catItems = menuItems.filter(m => m.category === cat.id);
              return (
                <div key={cat.id} className="mb-6">
                  <h3 className="font-bold text-sm text-muted-foreground uppercase mb-3 flex items-center gap-2">
                    {cat.image && (cat.image.startsWith('http') || cat.image.startsWith('/') || cat.image.startsWith('data:image')) ? <img src={cat.image} className="w-6 h-6 object-cover rounded-md shadow-sm" /> : null}
                    {cat.label}
                  </h3>
                  
                  {catItems.length === 0 && (
                    <p className="text-xs text-muted-foreground bg-black/5 p-3 rounded-xl italic">Bu kategoriyada taomlar yo'q</p>
                  )}

                  <div className="grid gap-3">
                    {catItems.map(item => (
                      <div key={item.docId} className={`glass rounded-[1.5rem] px-4 py-3 flex justify-between items-center transition-all ${!item.isAvailable ? "opacity-50 grayscale" : ""}`}>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            {item.image && (item.image.startsWith('http') || item.image.startsWith('/') || item.image.startsWith('data:image')) ? <img src={item.image} className="w-12 h-12 object-cover rounded-xl shadow-sm" /> : <div className="w-12 h-12 bg-black/10 rounded-xl" />}
                            <div>
                               <p className="font-black text-sm">{item.name}</p>
                               <p className="text-malina font-black text-sm">{formatPrice(item.price)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => toggleAvailable(item)} className="px-3 py-1.5 bg-foreground/5 rounded-lg text-xs font-bold hover:bg-black/10">
                             {item.isAvailable ? "✅ Bor" : "❌ Tugadi"}
                           </button>
                           <button onClick={() => toggleNew(item)} className={`px-2 py-1.5 rounded-lg text-xs font-bold ${item.isNew ? "bg-blue-500 text-white shadow-md shadow-blue-500/40" : "bg-foreground/5"}`}>N</button>
                           <button onClick={() => toggleSale(item)} className={`px-2 py-1.5 rounded-lg text-xs font-bold ${item.isSale ? "bg-red-500 text-white shadow-md shadow-red-500/40" : "bg-foreground/5"}`}>%</button>
                           <button onClick={() => deleteItem(item)} className="px-2 py-1.5 rounded-lg text-xs font-black bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors">🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "settings" && (
          <div className="glass rounded-[2rem] p-6 space-y-4">
             <h2 className="font-black text-lg">⚙️ Sozlamalar</h2>
             <p className="text-sm font-medium">Barcha ma'lumotlar jonli (real-time) ravishda Firebase Firestore bazasiga bog'langan.</p>
             <p className="text-sm font-bold mt-4">Bot ish vaqti: 09:00 - 23:00</p>
             <p className="text-xs text-muted-foreground">O'zbekiston ko'cha vaqti bo'yicha avtomatlashgan.</p>
          </div>
        )}

      </div>

      {/* MODALS */}
      {showAddModal && (
        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left">
          <form onSubmit={handleAddItem} className="glass bg-white/90 dark:bg-black/80 w-full max-w-md rounded-[2.5rem] p-7 shadow-2xl relative">
            <button type="button" onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-black/5 rounded-full font-black text-muted-foreground hover:text-black">✕</button>
            <h3 className="font-black text-2xl mb-6">🍽 Yangi taom</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold ml-2 text-muted-foreground uppercase">Taom nomi</label>
                <input required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Pitsabek" className="w-full bg-white px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-malina shadow-sm font-medium mt-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold ml-2 text-muted-foreground uppercase">Narxi (so'm)</label>
                    <input required type="number" min="0" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="45000" className="w-full bg-white px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-malina shadow-sm font-medium mt-1" />
                 </div>
                 <div>
                    <label className="text-xs font-bold ml-2 text-muted-foreground uppercase">Kategoriya</label>
                    <select required value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-white px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-malina shadow-sm font-medium mt-1">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold ml-2 text-muted-foreground uppercase">Taom rasmi (Kvadrat shaklda kesiladi)</label>
                <div className="w-full bg-white rounded-2xl outline-none focus-within:ring-2 focus-within:ring-malina shadow-sm mt-1 p-2 relative">
                   <input required type="file" accept="image/*" ref={itemFileRef} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-malina/10 file:text-malina hover:file:bg-malina hover:file:text-white transition-all cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold ml-2 text-muted-foreground uppercase">Ta'rifi (Ixtiyoriy)</label>
                <textarea value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} placeholder="Mazali va h.k..." rows={2} className="w-full bg-white px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-malina shadow-sm font-medium mt-1 resize-none" />
              </div>
            </div>
            
            <button disabled={uploading} type="submit" className="w-full mt-6 py-4 font-black text-lg rounded-2xl bg-malina text-white shadow-xl shadow-malina/30 disabled:opacity-50 active:scale-[0.98] transition-all">
              {uploading ? "⏳ Yuklanmoqda..." : "Yaratish"}
            </button>
          </form>
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left">
          <form onSubmit={handleAddCat} className="glass bg-white/90 dark:bg-black/80 w-full max-w-md rounded-[2.5rem] p-7 shadow-2xl relative">
            <button type="button" onClick={() => setShowCatModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-black/5 rounded-full font-black text-muted-foreground hover:text-black">✕</button>
            <h3 className="font-black text-2xl mb-6">📂 Yangi Kategoriya</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold ml-2 text-muted-foreground uppercase">Kategoriya nomi</label>
                <input required value={newCat.label} onChange={e => setNewCat({...newCat, label: e.target.value})} placeholder="Ichimliklar" className="w-full bg-white px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-malina shadow-sm font-medium mt-1" />
              </div>
              
              <div>
                <label className="text-xs font-bold ml-2 text-muted-foreground uppercase">Kategoriya rasmi (1:1 formatda kesiladi)</label>
                <div className="w-full bg-white rounded-2xl outline-none focus-within:ring-2 focus-within:ring-malina shadow-sm mt-1 p-2 relative">
                   <input required type="file" accept="image/*" ref={catFileRef} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-malina/10 file:text-malina hover:file:bg-malina hover:file:text-white transition-all cursor-pointer" />
                </div>
              </div>
            </div>
            
            <button disabled={uploading} type="submit" className="w-full mt-6 py-4 font-black text-lg rounded-2xl bg-malina text-white shadow-xl shadow-malina/30 disabled:opacity-50 active:scale-[0.98] transition-all">
              {uploading ? "⏳ Yuklanmoqda..." : "Saqlash"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
