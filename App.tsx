
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Recipe, Order, Language, Ingredient, Unit } from './types.ts';
import { TRANSLATIONS, CATEGORY_OPTIONS } from './constants.tsx';
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
  FileSpreadsheet,
  MessageCircle,
  Calculator,
  Image as ImageIcon,
  Search,
  Sparkles,
  Loader2,
  Upload,
  ChefHat
} from 'lucide-react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// --- AI Service ---

function parseBase64(dataUrl: string) {
  const parts = dataUrl.split(',');
  if (parts.length < 2) return { mimeType: 'image/jpeg', data: '' };
  const header = parts[0];
  const data = parts[1];
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  return { mimeType, data };
}

const runAIScan = async (base64Image: string, lang: Language) => {
  // Create instance right before call to ensure latest API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { mimeType, data } = parseBase64(base64Image);
  
  const targetLang = lang === 'he' ? 'Hebrew' : 'English';
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { inlineData: { mimeType, data } },
          { text: `Extract the recipe from this image. Provide the recipe name, its category, and a list of ingredients. Translate everything to ${targetLang}.` }
        ] 
      },
      config: {
        systemInstruction: `You are a professional chef's assistant. Your job is to extract recipe data from images. 
        Always respond in valid JSON. 
        Translate all output text into ${targetLang}.
        Valid categories: meat, dairy, pareve, dessert, other.
        Valid units: grams, kg, units, liters, cans, packs.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { 
              type: Type.STRING,
              description: "The name of the dish."
            },
            category: { 
              type: Type.STRING,
              description: "One of: meat, dairy, pareve, dessert, other"
            },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { 
                    type: Type.STRING,
                    description: "One of: grams, kg, units, liters, cans, packs"
                  }
                },
                required: ["name", "quantity", "unit"]
              }
            }
          },
          required: ["name", "category", "ingredients"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Scan Error Details:", error);
    const msg = error?.message || "";
    // If key not found or permission error, trigger key selector
    if (msg.includes("entity was not found") || msg.includes("API key") || msg.includes("403") || msg.includes("401")) {
      throw new Error("API_KEY_REQUIRED");
    }
    throw error;
  }
};

// --- Components ---

const RecipeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  editingRecipe: Recipe | null;
  t: any;
  lang: Language;
}> = ({ isOpen, onClose, onSave, editingRecipe, t, lang }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingRecipe) {
        setName(editingRecipe.name);
        setCategory(editingRecipe.category || 'other');
        setIngredients(editingRecipe.ingredients || []);
        setImageUrl(editingRecipe.imageUrl);
      } else {
        setName('');
        setCategory('other');
        setIngredients([{ id: Math.random().toString(), name: '', quantity: 1, unit: 'units' }]);
        setImageUrl(undefined);
      }
    }
  }, [editingRecipe, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert("Image too large (max 4MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAiScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setIsAiScanning(true);
        try {
          // Check for API key if environment supports it
          if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
            await window.aistudio.openSelectKey();
          }
          
          const result = await runAIScan(base64, lang);
          
          if (result.name) setName(result.name);
          
          const detectedCategory = result.category?.toLowerCase();
          if (detectedCategory && CATEGORY_OPTIONS.includes(detectedCategory as any)) {
            setCategory(detectedCategory);
          }
          
          if (result.ingredients && Array.isArray(result.ingredients)) {
            setIngredients(result.ingredients.map((ing: any) => ({
              id: Math.random().toString(),
              name: ing.name || '',
              quantity: typeof ing.quantity === 'number' ? ing.quantity : 1,
              unit: (ing.unit && ing.unit.toLowerCase()) as Unit || 'units'
            })));
          }
          
          setImageUrl(base64);
        } catch (err: any) {
          if (err.message === "API_KEY_REQUIRED" && window.aistudio) {
            await window.aistudio.openSelectKey();
          } else {
            console.error("Scan Failed:", err);
            alert(t.aiScanError || "Could not read recipe. Please try a clearer photo.");
          }
        } finally {
          setIsAiScanning(false);
          if (aiFileInputRef.current) aiFileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: editingRecipe?.id || Math.random().toString(),
      name: name.trim(),
      category,
      ingredients: ingredients.filter(i => i.name.trim() !== ''),
      imageUrl
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#FEF9F3]">
      {isAiScanning && (
        <div className="absolute inset-0 z-[110] bg-[#3D2B1F]/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
          <Loader2 size={48} className="animate-spin mb-4 text-[#FF8A3D]" />
          <p className="text-xl font-bold">{t.aiScanning}</p>
          <p className="mt-2 text-white/60 text-sm">{lang === 'en' ? 'Scanning ingredients & quantities...' : 'סורק מרכיבים וכמויות...'}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
        <header className="px-6 py-4 flex justify-between items-center border-b border-[#3D2B1F]/5 bg-white sticky top-0 z-10">
          <button type="button" onClick={onClose} className="text-[#3D2B1F]/60 p-2"><X size={24} /></button>
          <h2 className="font-bold text-lg">{editingRecipe ? t.edit : t.addRecipe}</h2>
          <button type="submit" className="text-[#FF8A3D] font-bold p-2">{t.save}</button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          <button 
            type="button"
            onClick={() => aiFileInputRef.current?.click()}
            className="w-full bg-gradient-to-r from-[#FF8A3D] to-[#FF6B3D] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Sparkles size={20} />
            {t.aiScan}
          </button>
          <input type="file" ref={aiFileInputRef} onChange={handleAiScan} accept="image/*" className="hidden" />

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40 px-1">{t.recipeImage}</label>
            <div className="w-full h-56 bg-white rounded-[2rem] shadow-sm border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center justify-center overflow-hidden relative">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#3D2B1F]/40">
                  <ImageIcon size={48} />
                </div>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border border-[#3D2B1F]/10 py-3 rounded-2xl font-bold text-[#3D2B1F]/60 flex items-center justify-center gap-2"
            >
              <Upload size={18} /> {lang === 'en' ? 'Upload Image' : 'העלה תמונה'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40 px-1">{t.recipeName}</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              className="w-full bg-white rounded-2xl p-4 text-lg font-medium shadow-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40 px-1">{t.category}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCategory(opt)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${category === opt ? 'bg-[#FF8A3D] text-white' : 'bg-white text-[#3D2B1F]/60'}`}
                >
                  {(t.categories as any)[opt]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.addIngredient}</h3>
              <button 
                type="button" 
                onClick={() => setIngredients([...ingredients, { id: Math.random().toString(), name: '', quantity: 1, unit: 'units' }])}
                className="text-[#FF8A3D] font-bold text-sm flex items-center gap-1"
              >
                <Plus size={16} /> {t.addIngredient}
              </button>
            </div>
            {ingredients.map(ing => (
              <div key={ing.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3 relative group">
                <button type="button" onClick={() => removeIngredient(ing.id)} className="absolute top-3 right-3 text-red-400 p-1"><Trash2 size={16} /></button>
                <input 
                  type="text" value={ing.name} placeholder={t.ingredientName}
                  onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                  className="w-full bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm font-medium outline-none"
                />
                <div className="flex gap-2">
                  <input 
                    type="number" step="any" value={ing.quantity}
                    onChange={e => updateIngredient(ing.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-20 bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm font-medium outline-none"
                  />
                  <select 
                    value={ing.unit} onChange={e => updateIngredient(ing.id, 'unit', e.target.value)}
                    className="flex-1 bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm font-medium outline-none"
                  >
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

// --- Main App ---

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('smart_pantry_lang');
      return (saved === 'en' || saved === 'he') ? saved : 'en';
    } catch {
      return 'en';
    }
  });
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem('smart_pantry_recipes');
      if (!saved || saved === 'null' || saved === 'undefined') return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [orders, setOrders] = useState<Order>(() => {
    try {
      const saved = localStorage.getItem('smart_pantry_orders');
      if (!saved || saved === 'null' || saved === 'undefined') return {};
      const parsed = JSON.parse(saved);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch {
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState('recipes');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const currentLang: Language = (lang === 'he') ? 'he' : 'en';
  const t = TRANSLATIONS[currentLang];

  useEffect(() => {
    try {
      localStorage.setItem('smart_pantry_recipes', JSON.stringify(recipes));
      localStorage.setItem('smart_pantry_orders', JSON.stringify(orders));
      localStorage.setItem('smart_pantry_lang', lang);
    } catch (e) {
      console.warn("Storage error:", e);
    }
    document.body.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [recipes, orders, lang]);

  const filteredRecipes = useMemo(() => {
    const list = Array.isArray(recipes) ? recipes : [];
    return list.filter(r => r && r.name && r.name.toLowerCase().includes(recipeSearch.toLowerCase()));
  }, [recipes, recipeSearch]);

  const shoppingList = useMemo(() => {
    const totals: Record<string, { name: string; quantity: number; unit: Unit }> = {};
    const safeOrders = orders && typeof orders === 'object' ? orders : {};
    
    Object.entries(safeOrders).forEach(([id, qty]) => {
      const numericQty = Number(qty);
      if (numericQty <= 0) return;
      const r = Array.isArray(recipes) ? recipes.find(rcp => rcp.id === id) : null;
      if (!r || !Array.isArray(r.ingredients)) return;
      
      r.ingredients.forEach(ing => {
        if (!ing || !ing.name) return;
        const key = `${ing.name.toLowerCase().trim()}_${ing.unit}`;
        if (totals[key]) {
          totals[key].quantity += (ing.quantity || 0) * numericQty;
        } else {
          totals[key] = { ...ing, quantity: (ing.quantity || 0) * numericQty };
        }
      });
    });
    return Object.values(totals);
  }, [recipes, orders]);

  const handleSave = (recipe: Recipe) => {
    setRecipes(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.some(r => r.id === recipe.id);
      return exists ? list.map(r => r.id === recipe.id ? recipe : r) : [...list, recipe];
    });
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen pb-32 flex flex-col">
      <header className="sticky top-0 z-40 bg-[#FEF9F3]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-[#3D2B1F]/5">
        <h1 className="text-xl font-bold text-[#3D2B1F]">{t.title}</h1>
        <button 
          onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
          className="bg-white shadow-sm border border-[#3D2B1F]/10 rounded-full px-3 py-1.5 flex items-center gap-2 text-sm font-medium"
        >
          <Globe size={16} className="text-[#FF8A3D]" />
          {lang === 'en' ? '🇮🇱 HE' : '🇺🇸 EN'}
        </button>
      </header>

      <main className="px-6 py-4 flex-1">
        {activeTab === 'recipes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t.recipes}</h2>
              <button onClick={() => { setEditingRecipe(null); setIsModalOpen(true); }} className="bg-[#FF8A3D] text-white p-3 rounded-2xl shadow-lg">
                <Plus size={24} />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D2B1F]/30" size={20} />
              <input 
                type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-white rounded-2xl pl-12 pr-4 py-4 shadow-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]"
              />
            </div>

            {(!Array.isArray(recipes) || recipes.length === 0) ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center gap-4 px-10 animate-fade-in">
                <ChefHat size={64} className="text-[#FF8A3D]/20" />
                <div className="space-y-2">
                  <p className="text-[#3D2B1F] font-bold text-lg">{lang === 'en' ? 'Welcome to Smart Pantry!' : 'ברוכים הבאים למזווה החכם!'}</p>
                  <p className="text-[#3D2B1F]/40 font-medium leading-relaxed">{t.emptyRecipes}</p>
                </div>
                <button 
                  onClick={() => { setEditingRecipe(null); setIsModalOpen(true); }}
                  className="mt-4 bg-[#FF8A3D] text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-[#FF8A3D]/20 active:scale-95 transition-transform"
                >
                  {t.addRecipe}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRecipes.map(r => (
                  <div 
                    key={r.id} onClick={() => { setEditingRecipe(r); setIsModalOpen(true); }}
                    className="bg-white rounded-[2rem] overflow-hidden shadow-sm flex flex-col border border-[#3D2B1F]/5 active:scale-[0.98] transition-transform"
                  >
                    <div className="h-40 bg-[#FEF9F3] relative overflow-hidden">
                      {r.imageUrl ? <img src={r.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon size={48} /></div>}
                      <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black uppercase text-[#FF8A3D]">{(t.categories as any)[r.category]}</span>
                      <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-xl text-[#3D2B1F]/60 shadow-sm"><Edit3 size={18} /></button>
                    </div>
                    <div className="p-5 flex justify-between items-center">
                      <h3 className="font-bold text-lg truncate">{r.name}</h3>
                      <span className="text-[#3D2B1F]/40 text-xs font-bold">{r.ingredients.length} {t.ingredientName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t.orders}</h2>
              <button onClick={() => setOrders({})} className="text-red-400 font-bold text-xs uppercase tracking-widest">{lang === 'en' ? 'Reset' : 'אפס'}</button>
            </div>
            {(!Array.isArray(recipes) || recipes.length === 0) ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-[#3D2B1F]/5 px-8">
                <p className="text-[#3D2B1F]/40">{t.emptyRecipes}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recipes.map(r => (
                  <div key={r.id} className="bg-white rounded-[2rem] p-4 shadow-sm flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FEF9F3] overflow-hidden flex-shrink-0">
                      {r.imageUrl ? <img src={r.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon size={24} /></div>}
                    </div>
                    <div className="flex-1 min-w-0"><span className="font-bold block truncate">{r.name}</span></div>
                    <div className="flex items-center gap-3 bg-[#FEF9F3] p-1 rounded-2xl border border-[#3D2B1F]/5">
                      <button onClick={(e) => { e.stopPropagation(); setOrders(prev => ({ ...prev, [r.id]: Math.max(0, (Number(prev[r.id]) || 0) - 1) })); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#3D2B1F]"><Minus size={16} /></button>
                      <span className="w-4 text-center font-bold">{orders[r.id] || 0}</span>
                      <button onClick={(e) => { e.stopPropagation(); setOrders(prev => ({ ...prev, [r.id]: (Number(prev[r.id]) || 0) + 1 })); }} className="w-8 h-8 flex items-center justify-center bg-[#FF8A3D] text-white rounded-lg shadow-sm"><Plus size={16} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setActiveTab('shopping')} className="fixed bottom-28 left-6 right-6 bg-[#3D2B1F] text-white py-5 rounded-[2rem] font-bold shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  <Calculator size={20} className="text-[#FF8A3D]" /> {t.calculate}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t.shopping}</h2>
              <div className="flex gap-2">
                <button onClick={() => {
                  const csv = "Ingredient,Qty,Unit\n" + shoppingList.map(i => `${i.name},${i.quantity},${(t.units as any)[i.unit]}`).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'shopping-list.csv'; a.click();
                }} className="p-3 bg-white text-green-600 rounded-2xl shadow-sm border border-[#3D2B1F]/5"><FileSpreadsheet size={20} /></button>
                <button onClick={() => {
                  const text = shoppingList.map(i => `- ${i.name}: ${i.quantity} ${(t.units as any)[i.unit]}`).join('\n');
                  navigator.clipboard.writeText(text);
                  alert(lang === 'en' ? 'Copied!' : 'הועתק!');
                }} className="p-3 bg-white text-[#25D366] rounded-2xl shadow-sm border border-[#3D2B1F]/5"><MessageCircle size={20} /></button>
              </div>
            </div>
            {shoppingList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-[#3D2B1F]/5 px-8">
                <p className="text-[#3D2B1F]/40">{t.emptyOrders}</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] shadow-sm divide-y divide-[#3D2B1F]/5 overflow-hidden">
                {shoppingList.map(item => {
                  const key = `${item.name}_${item.unit}`;
                  const isChecked = checkedItems.has(key);
                  return (
                    <div 
                      key={key} onClick={() => setCheckedItems(prev => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key); else next.add(key);
                        return next;
                      })}
                      className={`flex items-center justify-between p-5 active:bg-[#FEF9F3] transition-colors ${isChecked ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${isChecked ? 'bg-[#FF8A3D] border-[#FF8A3D]' : 'border-[#3D2B1F]/10 bg-white'}`}>
                          {isChecked && <Plus size={16} className="text-white rotate-45" />}
                        </div>
                        <span className={`font-medium text-lg ${isChecked ? 'line-through' : ''}`}>{item.name}</span>
                      </div>
                      <span className="font-bold text-[#FF8A3D]">{item.quantity} {(t.units as any)[item.unit]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#3D2B1F]/5 pb-8 pt-3 px-6 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('recipes')} className={`flex flex-col items-center gap-1 ${activeTab === 'recipes' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/40'}`}>
          <BookOpen size={24} /> <span className="text-[10px] font-bold uppercase tracking-widest">{t.recipes}</span>
        </button>
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 ${activeTab === 'orders' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/40'}`}>
          <ListChecks size={24} /> <span className="text-[10px] font-bold uppercase tracking-widest">{t.orders}</span>
        </button>
        <button onClick={() => setActiveTab('shopping')} className={`flex flex-col items-center gap-1 ${activeTab === 'shopping' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/40'}`}>
          <ShoppingCart size={24} /> <span className="text-[10px] font-bold uppercase tracking-widest">{t.shopping}</span>
        </button>
      </nav>

      <RecipeModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave}
        editingRecipe={editingRecipe} t={t} lang={lang}
      />
    </div>
  );
};

export default App;
