
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Recipe, Order, Language, Ingredient, Unit } from './types.ts';
import { TRANSLATIONS, CATEGORY_OPTIONS, UNIT_OPTIONS, LOGO_DATA_URL } from './constants.tsx';
import { 
  BookOpen, 
  ShoppingCart, 
  ListChecks, 
  Minus,
  Plus, 
  Globe, 
  Trash2, 
  Edit3, 
  X,
  Calculator,
  Search,
  Sparkles,
  Loader2,
  Upload,
  ChefHat,
  Camera,
  Flame,
  Utensils,
  Timer,
  Wand2,
  ArrowDownAZ,
  RotateCcw,
  CheckCircle2,
  Circle,
  MessageCircle,
  Archive,
  ChefHat as CookingIcon,
  ClipboardList,
  Check
} from 'lucide-react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const DEFAULT_PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1505935428862-770b6f24f629?auto=format&fit=crop&q=80&w=1200";

const runAIScan = async (base64Image: string, lang: Language) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts = base64Image.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const data = parts[1];
  const targetLang = lang === 'he' ? 'Hebrew' : 'English';
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { inlineData: { mimeType, data } },
          { text: `TASK: Extract the recipe from this image and translate it to ${targetLang}. 
          Normalize units to: grams, kg, units, liters, cans, packs. 
          Respond with ONLY valid JSON.` }
        ] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            prepTime: { type: Type.NUMBER },
            cookTime: { type: Type.NUMBER },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING }
                },
                required: ["name", "quantity", "unit"]
              }
            }
          },
          required: ["name", "category", "ingredients"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("AI Scan Error:", error);
    throw error;
  }
};

const RecipeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  editingRecipe: Recipe | null;
  t: any;
  lang: Language;
}> = ({ isOpen, onClose, onSave, onDelete, editingRecipe, t, lang }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [prepTime, setPrepTime] = useState<number | undefined>(undefined);
  const [cookTime, setCookTime] = useState<number | undefined>(undefined);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingRecipe) {
        setName(editingRecipe.name);
        setCategory(editingRecipe.category || 'other');
        setPrepTime(editingRecipe.prepTime);
        setCookTime(editingRecipe.cookTime);
        setIngredients(editingRecipe.ingredients || []);
        setImageUrl(editingRecipe.imageUrl);
      } else {
        setName('');
        setCategory('other');
        setPrepTime(undefined);
        setCookTime(undefined);
        setIngredients([{ id: Date.now().toString(), name: '', quantity: 1, unit: 'kg' }]);
        setImageUrl(undefined);
      }
    }
  }, [editingRecipe, isOpen]);

  if (!isOpen) return null;

  const performAiAnalysis = async (base64: string) => {
    setIsAiScanning(true);
    try {
      const result = await runAIScan(base64, lang);
      if (result.name) setName(result.name);
      if (result.category) setCategory(result.category.toLowerCase());
      if (result.prepTime) setPrepTime(result.prepTime);
      if (result.cookTime) setCookTime(result.cookTime);
      if (result.ingredients) {
        setIngredients(result.ingredients.map((ing: any) => ({
          id: (Date.now() + Math.random()).toString(),
          name: ing.name || '',
          quantity: Number(ing.quantity) || 1,
          unit: (ing.unit?.toLowerCase() as Unit) || 'kg'
        })));
      }
      setImageUrl(base64);
    } catch (err) {
      alert(t.aiScanError || "AI Scan failed");
    } finally {
      setIsAiScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#FEF9F3]">
      {isAiScanning && (
        <div className="absolute inset-0 z-[110] bg-[#3D2B1F]/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
          <Loader2 size={48} className="animate-spin mb-4 text-[#FF8A3D]" />
          <p className="text-xl font-bold">{t.aiScanning}</p>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); onSave({ id: editingRecipe?.id || Date.now().toString(), name: name.trim(), category, prepTime, cookTime, ingredients: ingredients.filter(i => i.name.trim() !== ''), imageUrl }); }} className="flex flex-col h-full">
        <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-[#3D2B1F]/5">
          <button type="button" onClick={onClose} className="p-2"><X size={24} /></button>
          <h2 className="font-bold text-lg">{editingRecipe ? t.edit : t.addRecipe}</h2>
          <div className="flex gap-2">
            {editingRecipe && (
              <button type="button" onClick={() => onDelete(editingRecipe.id)} className="text-red-500 p-2 active:scale-90 transition-transform">
                <Trash2 size={22} />
              </button>
            )}
            <button type="submit" className="text-[#FF8A3D] font-bold p-2">{t.save}</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          <button type="button" onClick={() => aiFileInputRef.current?.click()} className="w-full bg-gradient-to-r from-[#FF8A3D] to-[#FF6B3D] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Sparkles size={20} /> {t.aiScan}
          </button>
          <input type="file" ref={aiFileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => performAiAnalysis(r.result as string); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.recipeImage}</label>
            <div className="w-full h-64 bg-white rounded-[2.5rem] border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center justify-center overflow-hidden relative shadow-inner group">
              <img src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE} className={`w-full h-full object-cover ${!imageUrl ? 'opacity-30' : 'opacity-100'}`} />
              <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                {!imageUrl && <Camera size={36} className="text-[#FF8A3D]" />}
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setImageUrl(r.result as string); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.recipeName}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white rounded-2xl p-4 text-lg font-medium shadow-sm outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.prepTime} ({t.minutes})</label>
              <input type="number" value={prepTime || ''} onChange={e => setPrepTime(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full bg-white rounded-2xl p-4 text-lg font-medium shadow-sm outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.cookTime} ({t.minutes})</label>
              <input type="number" value={cookTime || ''} onChange={e => setCookTime(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full bg-white rounded-2xl p-4 text-lg font-medium shadow-sm outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.category}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => setCategory(opt)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${category === opt ? 'bg-[#FF8A3D] text-white shadow-md' : 'bg-white text-[#3D2B1F]/60 border border-[#3D2B1F]/5'}`}>
                  {(t.categories as any)[opt]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase text-[#3D2B1F]/40 tracking-wider">{t.addIngredient}</h3>
              <button type="button" onClick={() => setIngredients([...ingredients, { id: Date.now().toString(), name: '', quantity: 1, unit: 'kg' }])} className="text-[#FF8A3D] font-black text-xs uppercase flex items-center gap-1.5 bg-[#FF8A3D]/10 px-3 py-1.5 rounded-full">
                <Plus size={14} /> {t.addIngredient}
              </button>
            </div>
            {ingredients.map((ing, i) => (
              <div key={ing.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3 relative border border-[#3D2B1F]/5 animate-fade-in">
                <button type="button" onClick={() => setIngredients(prev => prev.filter(item => item.id !== ing.id))} className="absolute top-2 right-2 text-red-400 p-1.5"><Trash2 size={16} /></button>
                <input type="text" value={ing.name} placeholder={t.ingredientName} onChange={e => setIngredients(prev => prev.map(item => item.id === ing.id ? { ...item, name: e.target.value } : item))} className="w-full bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none" />
                <div className="flex gap-2">
                  <input type="number" step="any" value={ing.quantity} onChange={e => setIngredients(prev => prev.map(item => item.id === ing.id ? { ...item, quantity: parseFloat(e.target.value) || 0 } : item))} className="w-24 bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none" />
                  <select value={ing.unit} onChange={e => setIngredients(prev => prev.map(item => item.id === ing.id ? { ...item, unit: e.target.value as Unit } : item))} className="flex-1 bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none">
                    {Object.keys(t.units).map(u => <option key={u} value={u}>{(t.units as any)[u]}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('smart_pantry_lang') as Language) || 'he');
  const [recipes, setRecipes] = useState<Recipe[]>(() => JSON.parse(localStorage.getItem('smart_pantry_recipes') || '[]'));
  const [orders, setOrders] = useState<Order>(() => JSON.parse(localStorage.getItem('smart_pantry_orders') || '{}'));
  const [inventory, setInventory] = useState<Ingredient[]>(() => JSON.parse(localStorage.getItem('smart_pantry_inventory') || '[]'));
  const [activeTab, setActiveTab] = useState('recipes');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isShoppingListSorted, setIsShoppingListSorted] = useState(() => localStorage.getItem('smart_pantry_shopping_sorted') === 'true');
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem('smart_pantry_recipes', JSON.stringify(recipes));
    localStorage.setItem('smart_pantry_orders', JSON.stringify(orders));
    localStorage.setItem('smart_pantry_inventory', JSON.stringify(inventory));
    localStorage.setItem('smart_pantry_lang', lang);
    localStorage.setItem('smart_pantry_shopping_sorted', String(isShoppingListSorted));
    document.body.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [recipes, orders, inventory, lang, isShoppingListSorted]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMarkAsCooked = (recipeId: string) => {
    const recipe = recipes.find(r => String(r.id) === String(recipeId));
    if (!recipe) return;

    // Deduct from inventory (Deduct for ONE batch)
    setInventory(prev => {
      const next = [...prev];
      recipe.ingredients.forEach(neededIng => {
        const matchIndex = next.findIndex(pantryIng => 
          pantryIng.name.toLowerCase().trim() === neededIng.name.toLowerCase().trim() &&
          pantryIng.unit === neededIng.unit
        );
        if (matchIndex > -1) {
          next[matchIndex] = {
            ...next[matchIndex],
            quantity: Math.max(0, next[matchIndex].quantity - neededIng.quantity)
          };
        }
      });
      return next;
    });

    // Mark as completed for today
    setCompletedToday(prev => [recipeId, ...prev]);
    
    // Decrement order quantity by 1
    setOrders(prev => {
      const next = { ...prev };
      if (next[recipeId] > 0) {
        next[recipeId] -= 1;
      }
      return next;
    });

    showToast(t.ingredientsDeducted);
  };

  const handleSave = useCallback((recipe: Recipe) => {
    setRecipes(prev => {
      const exists = prev.some(r => String(r.id) === String(recipe.id));
      return exists ? prev.map(r => String(r.id) === String(recipe.id) ? recipe : r) : [...prev, recipe];
    });
    setIsModalOpen(false);
    setEditingRecipe(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm(lang === 'en' ? "Delete this recipe?" : "למחוק את המתכון הזה?")) {
      const safeId = String(id);
      setRecipes(prev => prev.filter(r => String(r.id) !== safeId));
      setOrders(prev => {
        const next = { ...prev };
        delete next[safeId];
        return next;
      });
      setIsModalOpen(false);
      setEditingRecipe(null);
    }
  }, [lang]);

  const filteredRecipes = useMemo(() => recipes.filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase())), [recipes, recipeSearch]);

  const shoppingList = useMemo(() => {
    const totals: Record<string, { name: string; totalNeeded: number; unit: Unit }> = {};
    Object.entries(orders).forEach(([id, qty]) => {
      const r = recipes.find(rcp => String(rcp.id) === String(id));
      if (!r || (qty as number) <= 0) return;
      r.ingredients.forEach(ing => {
        const key = `${ing.name.toLowerCase().trim()}_${ing.unit}`;
        if (totals[key]) totals[key].totalNeeded += ing.quantity * (qty as number);
        else totals[key] = { name: ing.name, totalNeeded: ing.quantity * (qty as number), unit: ing.unit };
      });
    });

    const finalItems = Object.values(totals).map(item => {
      const pantryItem = inventory.find(inv => 
        inv.name.toLowerCase().trim() === item.name.toLowerCase().trim() && 
        inv.unit === item.unit
      );
      const inPantry = pantryItem ? pantryItem.quantity : 0;
      const netToBuy = Math.max(0, item.totalNeeded - inPantry);
      return { ...item, inPantry, netToBuy };
    });

    if (isShoppingListSorted) finalItems.sort((a, b) => a.name.localeCompare(b.name, lang === 'he' ? 'he' : 'en'));
    return finalItems;
  }, [recipes, orders, inventory, isShoppingListSorted, lang]);

  const toBuyItems = useMemo(() => shoppingList.filter(i => i.netToBuy > 0), [shoppingList]);
  const stockedItems = useMemo(() => shoppingList.filter(i => i.netToBuy === 0), [shoppingList]);

  const cookingBatchList = useMemo(() => {
    return Object.entries(orders).flatMap(([id, qty]) => {
      const r = recipes.find(rcp => String(rcp.id) === String(id));
      if (!r || !qty) return [];
      return Array.from({ length: qty }).map((_, idx) => ({ id, r, batchIndex: idx }));
    });
  }, [orders, recipes]);

  return (
    <div className="min-h-screen pb-32 flex flex-col">
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-[#3D2B1F] text-[#FF8A3D] px-6 py-3 rounded-full shadow-2xl font-black text-sm animate-fade-in flex items-center gap-3">
          <Sparkles size={18} />
          {toastMessage}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#FEF9F3]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-[#3D2B1F]/5">
        <div className="flex items-center gap-3">
            <img src={LOGO_DATA_URL} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm" />
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
        </div>
        <button onClick={() => setLang(lang === 'en' ? 'he' : 'en')} className="bg-white shadow-sm border border-[#3D2B1F]/10 rounded-full px-4 py-2 flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform">
          <Globe size={18} className="text-[#FF8A3D]" /> {lang === 'en' ? '🇮🇱 HE' : '🇺🇸 EN'}
        </button>
      </header>

      <main className="px-6 py-4 flex-1">
        {activeTab === 'recipes' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">{t.recipes}</h2>
              <button onClick={() => { setEditingRecipe(null); setIsModalOpen(true); }} className="bg-[#FF8A3D] text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-transform"><Plus size={24} /></button>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D2B1F]/30" size={20} />
              <input type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-white rounded-2xl pl-12 pr-4 py-4 shadow-sm outline-none border border-transparent focus:border-[#FF8A3D]/10" />
            </div>

            {recipes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center gap-4">
                <ChefHat size={64} className="text-[#FF8A3D]/20" />
                <p className="text-[#3D2B1F]/40">{t.emptyRecipes}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredRecipes.map(r => (
                  <div key={r.id} onClick={() => { setEditingRecipe(r); setIsModalOpen(true); }} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col border border-[#3D2B1F]/5 active:scale-[0.98] transition-all group">
                    <div className="h-48 bg-[#FEF9F3] relative overflow-hidden">
                      <img src={r.imageUrl || DEFAULT_PLACEHOLDER_IMAGE} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ${!r.imageUrl ? 'opacity-40' : 'opacity-100'}`} />
                      <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-xl text-[10px] font-black uppercase text-[#FF8A3D] shadow-sm">{(t.categories as any)[r.category]}</div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-xl text-[#3D2B1F]">{r.name}</h3>
                      <div className="flex gap-4 mt-3 text-[#3D2B1F]/40 text-xs font-bold uppercase tracking-widest">
                         <span className="flex items-center gap-1.5"><Timer size={14} /> {r.prepTime || 0}{t.minutes}</span>
                         <span className="flex items-center gap-1.5"><Utensils size={14} /> {r.ingredients.length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">{t.orders}</h2>
              <div className="flex bg-white/80 p-1 rounded-2xl shadow-sm border border-[#3D2B1F]/5 backdrop-blur-md">
                <button onClick={() => setIsCookingMode(false)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${!isCookingMode ? 'bg-[#3D2B1F] text-white shadow-lg' : 'text-[#3D2B1F]/40'}`}>
                  <ClipboardList size={14} /> {t.planningMode}
                </button>
                <button onClick={() => setIsCookingMode(true)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${isCookingMode ? 'bg-[#FF8A3D] text-white shadow-lg' : 'text-[#3D2B1F]/40'}`}>
                  <CookingIcon size={14} /> {t.cookingMode}
                </button>
              </div>
            </div>

            <div className="space-y-3 pb-32">
              {!isCookingMode ? (
                // PLANNING MODE
                recipes.map(r => (
                  <div key={r.id} className="bg-white rounded-[2.25rem] p-4 shadow-sm flex items-center gap-4 border border-[#3D2B1F]/5 animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-[#FEF9F3] overflow-hidden flex-shrink-0">
                      <img src={r.imageUrl || DEFAULT_PLACEHOLDER_IMAGE} className={`w-full h-full object-cover ${!r.imageUrl ? 'opacity-40' : 'opacity-100'}`} />
                    </div>
                    <span className="flex-1 font-bold truncate">{r.name}</span>
                    <div className="flex items-center gap-3 bg-[#FEF9F3] p-1.5 rounded-[1.25rem] shadow-inner">
                      <button onClick={() => setOrders(prev => ({ ...prev, [String(r.id)]: Math.max(0, (Number(prev[String(r.id)]) || 0) - 1) }))} className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm active:scale-90 transition-transform"><Minus size={18} /></button>
                      <span className="w-6 text-center font-bold">{orders[String(r.id)] || 0}</span>
                      <button onClick={() => setOrders(prev => ({ ...prev, [String(r.id)]: (Number(prev[String(r.id)]) || 0) + 1 }))} className="w-9 h-9 flex items-center justify-center bg-[#FF8A3D] text-white rounded-xl shadow-sm active:scale-90 transition-transform"><Plus size={18} /></button>
                    </div>
                  </div>
                ))
              ) : (
                // COOKING MODE
                <div className="space-y-6">
                  {cookingBatchList.map(({ id, r, batchIndex }) => (
                    <div key={`${id}-${batchIndex}`} className="bg-white rounded-[2.25rem] p-6 shadow-sm border-l-4 border-[#FF8A3D] flex items-center justify-between animate-fade-in">
                      <div className="flex flex-col">
                        <span className="font-black text-xl text-[#3D2B1F]">{r.name}</span>
                        <span className="text-[10px] font-bold text-[#FF8A3D] uppercase tracking-widest">{t.cookingMode} - #{batchIndex + 1}</span>
                      </div>
                      <button onClick={() => handleMarkAsCooked(id)} className="bg-[#3D2B1F] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-90 transition-all flex items-center gap-2">
                        <Check size={16} /> {t.markAsCooked}
                      </button>
                    </div>
                  ))}
                  
                  {cookingBatchList.length === 0 && completedToday.length === 0 && (
                    <div className="text-center py-20 opacity-20"><ClipboardList size={64} className="mx-auto mb-4" /><p>{t.emptyOrders}</p></div>
                  )}

                  {completedToday.length > 0 && (
                    <div className="pt-8 space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-[#3D2B1F]/30 tracking-widest text-center">{t.completedToday}</h3>
                      <div className="space-y-2">
                        {completedToday.map((id, idx) => {
                          const r = recipes.find(rcp => String(rcp.id) === String(id));
                          return (
                            <div key={`${id}-${idx}`} className="bg-white/40 p-4 rounded-2xl flex items-center gap-4 border border-dashed border-[#3D2B1F]/10 opacity-60">
                              <CheckCircle2 className="text-green-500" size={18} />
                              <span className="font-bold line-through text-sm">{r?.name || 'Unknown'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!isCookingMode && recipes.length > 0 && (
              <div className="fixed bottom-[112px] left-6 right-6 z-40">
                <button onClick={() => setActiveTab('shopping')} className="w-full bg-[#3D2B1F] text-white py-5 rounded-[2.25rem] font-bold shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  <Calculator size={20} className="text-[#FF8A3D]" /> {t.calculate}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">{t.inventory}</h2>
              <button onClick={() => setInventory([...inventory, { id: Date.now().toString(), name: '', quantity: 0, unit: 'kg' }])} className="text-[#FF8A3D] font-bold text-sm uppercase flex items-center gap-2 bg-[#FF8A3D]/10 px-4 py-2 rounded-full active:scale-90 transition-transform">
                <Plus size={16} /> {t.addIngredient}
              </button>
            </div>
            
            {inventory.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center gap-4">
                <Archive size={64} className="text-[#3D2B1F]/10" />
                <p className="text-[#3D2B1F]/40">{t.emptyInventory}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventory.map((ing, i) => (
                  <div key={ing.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3 border border-[#3D2B1F]/5 animate-fade-in">
                    <div className="flex gap-2">
                      <input type="text" value={ing.name} placeholder={t.ingredientName} onChange={e => setInventory(prev => prev.map(item => item.id === ing.id ? { ...item, name: e.target.value } : item))} className="flex-1 bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none font-bold" />
                      <button onClick={() => setInventory(prev => prev.filter(item => item.id !== ing.id))} className="text-red-400 p-2 active:scale-90 transition-transform"><Trash2 size={18} /></button>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" step="any" value={ing.quantity || ''} onChange={e => setInventory(prev => prev.map(item => item.id === ing.id ? { ...item, quantity: parseFloat(e.target.value) || 0 } : item))} className="w-24 bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none font-bold" />
                      <select value={ing.unit} onChange={e => setInventory(prev => prev.map(item => item.id === ing.id ? { ...item, unit: e.target.value as Unit } : item))} className="flex-1 bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none font-bold">
                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{(t.units as any)[u]}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">{t.shopping}</h2>
              {toBuyItems.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={() => {
                    let msg = `🛒 *${t.shopping}*\n\n`;
                    toBuyItems.forEach(i => msg += `• ${i.name}: *${i.netToBuy} ${(t.units as any)[i.unit]}*\n`);
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
                  }} className="bg-[#25D366] text-white p-2.5 rounded-2xl active:scale-90 transition-transform"><MessageCircle size={20} /></button>
                  <button onClick={() => setIsShoppingListSorted(!isShoppingListSorted)} className={`p-2.5 rounded-2xl active:scale-90 transition-transform ${isShoppingListSorted ? 'bg-[#FF8A3D] text-white' : 'bg-white border border-[#3D2B1F]/10'}`}><ArrowDownAZ size={20} /></button>
                  <button onClick={() => { if(confirm("Clear current orders?")) setOrders({}); }} className="bg-red-50 text-red-500 p-2.5 rounded-2xl active:scale-90 transition-transform"><RotateCcw size={20} /></button>
                </div>
              )}
            </div>

            {shoppingList.length === 0 ? (
              <div className="text-center py-20 opacity-20"><ShoppingCart size={64} className="mx-auto mb-4" /><p>{t.emptyOrders}</p></div>
            ) : (
              <div className="space-y-6 pb-32">
                {/* TO BUY SECTION */}
                {toBuyItems.length > 0 && (
                  <div className="bg-white rounded-[2.5rem] shadow-sm divide-y divide-[#3D2B1F]/5 overflow-hidden border border-[#3D2B1F]/5">
                    {toBuyItems.map(item => {
                      const key = `${item.name}_${item.unit}`;
                      const isChecked = checkedItems.has(key);
                      return (
                        <div key={key} onClick={() => setCheckedItems(prev => { const n = new Set(prev); if(n.has(key)) n.delete(key); else n.add(key); return n; })} className={`flex items-center justify-between p-6 transition-all ${isChecked ? 'bg-gray-50' : 'bg-white'}`}>
                          <div className="flex items-center gap-4">
                            {isChecked ? <CheckCircle2 className="text-[#FF8A3D]" /> : <Circle className="text-[#3D2B1F]/10" />}
                            <div className="flex flex-col">
                              <span className={`font-bold ${isChecked ? 'line-through text-[#3D2B1F]/30' : ''}`}>{item.name}</span>
                              <span className="text-[10px] text-[#3D2B1F]/40 font-bold uppercase tracking-wider">
                                {t.need} {item.totalNeeded} {(t.units as any)[item.unit]} 
                                {item.inPantry > 0 && ` (-${item.inPantry} ${t.inPantry})`}
                              </span>
                            </div>
                          </div>
                          <span className={`font-black text-lg ${isChecked ? 'text-[#FF8A3D]/40' : 'text-[#FF8A3D]'}`}>{item.netToBuy} {(t.units as any)[item.unit]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* FULLY STOCKED SECTION */}
                {stockedItems.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#3D2B1F]/40 px-2">{t.fullyStocked}</h3>
                    <div className="bg-white/50 rounded-[2.5rem] shadow-sm divide-y divide-[#3D2B1F]/5 overflow-hidden border border-[#3D2B1F]/5">
                      {stockedItems.map(item => (
                        <div key={item.name} className="flex items-center justify-between p-6 opacity-50 grayscale">
                          <div className="flex items-center gap-4">
                            <CheckCircle2 className="text-[#3D2B1F]/20" />
                            <div className="flex flex-col">
                              <span className="font-bold line-through">{item.name}</span>
                              <span className="text-[10px] font-bold uppercase">{t.need} {item.totalNeeded} {(t.units as any)[item.unit]} ({t.inPantry} {t.inPantry})</span>
                            </div>
                          </div>
                          <span className="font-black text-lg">0 {(t.units as any)[item.unit]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-[#3D2B1F]/5 pb-8 pt-5 px-6 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('recipes')} className={`flex flex-col items-center gap-1 ${activeTab === 'recipes' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/20'} active:scale-90 transition-transform`}>
          <BookOpen size={24} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t.recipes}</span>
        </button>
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 ${activeTab === 'orders' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/20'} active:scale-90 transition-transform`}>
          <ListChecks size={24} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t.orders}</span>
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 ${activeTab === 'inventory' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/20'} active:scale-90 transition-transform`}>
          <Archive size={24} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t.inventory}</span>
        </button>
        <button onClick={() => setActiveTab('shopping')} className={`flex flex-col items-center gap-1 ${activeTab === 'shopping' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/20'} active:scale-90 transition-transform`}>
          <ShoppingCart size={24} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t.shopping}</span>
        </button>
      </nav>

      <RecipeModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingRecipe(null); }} 
        onSave={handleSave} 
        onDelete={handleDelete}
        editingRecipe={editingRecipe} 
        t={t} 
        lang={lang} 
      />
    </div>
  );
};

export default App;
