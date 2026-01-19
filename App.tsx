
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  ChefHat,
  AlertCircle,
  ExternalLink
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
  // Always create a new instance before call to use latest API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { mimeType, data } = parseBase64(base64Image);
  const targetLang = lang === 'he' ? 'Hebrew' : 'English';
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { inlineData: { mimeType, data } },
          { text: `TASK: Extract the recipe from this image and translate it to ${targetLang}. 
          IMAGE TYPE: Could be a printed recipe, handwritten note, or a photo of a screen.
          EXTRACT:
          1. name: string (the dish title).
          2. category: MUST BE one of [meat, dairy, pareve, dessert, other].
          3. ingredients: array of objects { 'name': string, 'quantity': number, 'unit': string (must be: grams, kg, units, liters, cans, packs) }.
          
          Respond ONLY with valid JSON.` }
        ] 
      },
      config: {
        systemInstruction: `You are an elite culinary data extraction AI. Always respond with perfectly structured JSON. 
        Map categories to exactly: meat, dairy, pareve, dessert, other.
        Map units to exactly: grams, kg, units, liters, cans, packs.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
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

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    console.error("AI Scan Error:", error);
    // Handle API key errors or entity not found (billing/project issues)
    if (error?.message?.includes("API_KEY") || error?.status === 403 || error?.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_ERROR");
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
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setIngredients([{ id: Date.now().toString(), name: '', quantity: 1, unit: 'units' }]);
        setImageUrl(undefined);
      }
    }
  }, [editingRecipe, isOpen]);

  if (!isOpen) return null;

  const handleAiScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setIsAiScanning(true);
        try {
          // Check for API key selection if running in AI Studio context
          if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
            await window.aistudio.openSelectKey();
          }
          const result = await runAIScan(base64, lang);
          if (result.name) setName(result.name);
          if (result.category && CATEGORY_OPTIONS.includes(result.category.toLowerCase() as any)) {
            setCategory(result.category.toLowerCase());
          }
          if (result.ingredients) {
            setIngredients(result.ingredients.map((ing: any) => ({
              id: (Date.now() + Math.random()).toString(),
              name: ing.name || '',
              quantity: Number(ing.quantity) || 1,
              unit: (ing.unit?.toLowerCase() as Unit) || 'units'
            })));
          }
          setImageUrl(base64);
        } catch (err: any) {
          if (err.message === "API_KEY_ERROR" && window.aistudio) {
            await window.aistudio.openSelectKey();
          } else {
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#FEF9F3]">
      {isAiScanning && (
        <div className="absolute inset-0 z-[110] bg-[#3D2B1F]/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
          <Loader2 size={48} className="animate-spin mb-4 text-[#FF8A3D]" />
          <p className="text-xl font-bold">{t.aiScanning}</p>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; onSave({ id: editingRecipe?.id || Date.now().toString(), name: name.trim(), category, ingredients: ingredients.filter(i => i.name.trim() !== ''), imageUrl }); }} className="flex flex-col h-full">
        <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-[#3D2B1F]/5">
          <button type="button" onClick={onClose} className="p-2"><X size={24} /></button>
          <h2 className="font-bold text-lg">{editingRecipe ? t.edit : t.addRecipe}</h2>
          <div className="flex gap-2">
            {editingRecipe && (
              <button 
                type="button" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  // @ts-ignore
                  if (window.deleteRecipe) window.deleteRecipe(editingRecipe.id);
                }}
                className="text-red-500 p-2"
              >
                <Trash2 size={22} />
              </button>
            )}
            <button type="submit" className="text-[#FF8A3D] font-bold p-2">{t.save}</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          <button type="button" onClick={() => aiFileInputRef.current?.click()} className="w-full bg-gradient-to-r from-[#FF8A3D] to-[#FF6B3D] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
            <Sparkles size={20} /> {t.aiScan}
          </button>
          <input type="file" ref={aiFileInputRef} onChange={handleAiScan} accept="image/*" className="hidden" />

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.recipeImage}</label>
            <div className="w-full h-52 bg-white rounded-3xl border-2 border-dashed border-[#3D2B1F]/10 flex items-center justify-center overflow-hidden">
              {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={48} className="text-[#3D2B1F]/10" />}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-white border border-[#3D2B1F]/10 py-3 rounded-2xl font-bold text-[#3D2B1F]/60">
              <Upload size={18} className="inline mr-2" /> {lang === 'en' ? 'Upload Image' : 'העלה תמונה'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.recipeName}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white rounded-2xl p-4 text-lg font-medium shadow-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.category}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => setCategory(opt)} className={`px-4 py-2 rounded-xl text-sm font-bold ${category === opt ? 'bg-[#FF8A3D] text-white' : 'bg-white text-[#3D2B1F]/60'}`}>
                  {(t.categories as any)[opt]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.addIngredient}</h3>
              <button type="button" onClick={() => setIngredients([...ingredients, { id: Date.now().toString(), name: '', quantity: 1, unit: 'units' }])} className="text-[#FF8A3D] font-bold text-sm">
                <Plus size={16} className="inline" /> {t.addIngredient}
              </button>
            </div>
            {ingredients.map(ing => (
              <div key={ing.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3 relative border border-[#3D2B1F]/5">
                <button type="button" onClick={() => removeIngredient(ing.id)} className="absolute top-2 right-2 text-red-400 p-1"><Trash2 size={16} /></button>
                <input type="text" value={ing.name} placeholder={t.ingredientName} onChange={e => updateIngredient(ing.id, 'name', e.target.value)} className="w-full bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm outline-none" />
                <div className="flex gap-2">
                  <input type="number" step="any" value={ing.quantity} onChange={e => updateIngredient(ing.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-20 bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm outline-none" />
                  <select value={ing.unit} onChange={e => updateIngredient(ing.id, 'unit', e.target.value)} className="flex-1 bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm outline-none">
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
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('smart_pantry_lang') as Language) || 'en');
  const [recipes, setRecipes] = useState<Recipe[]>(() => JSON.parse(localStorage.getItem('smart_pantry_recipes') || '[]'));
  const [orders, setOrders] = useState<Order>(() => JSON.parse(localStorage.getItem('smart_pantry_orders') || '{}'));
  const [activeTab, setActiveTab] = useState('recipes');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem('smart_pantry_recipes', JSON.stringify(recipes));
    localStorage.setItem('smart_pantry_orders', JSON.stringify(orders));
    localStorage.setItem('smart_pantry_lang', lang);
    document.body.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [recipes, orders, lang]);

  /**
   * STRICT DELETE RECIPE REQUIREMENT
   * Explicitly attached to window object for global scope accessibility.
   * Forces ID type safety with parseInt(id).
   * Console logging for verification.
   * Confirm dialog to prevent accidental clicks.
   * Functional state updates ensure the screen re-renders immediately.
   */
  useEffect(() => {
    // @ts-ignore
    window.deleteRecipe = function(id: any) {
      console.log("Attempting to delete ID:", id);
      if (!confirm("Are you sure?")) {
        return;
      }

      // Requirement: Force ID to be a number
      const safeId = parseInt(id);
      
      // Update state for recipes
      setRecipes(prevRecipes => {
        const updatedRecipes = prevRecipes.filter(r => parseInt(r.id) !== safeId);
        // Save to local storage happens in the useEffect monitoring 'recipes'
        return updatedRecipes;
      });

      // Update state for orders (clean up references to deleted recipe)
      setOrders(prevOrders => {
        const nextOrders = { ...prevOrders };
        delete nextOrders[String(id)];
        return nextOrders;
      });

      // Close modal and reset state to ensure UI is fresh
      setIsModalOpen(false);
      setEditingRecipe(null);
      
      console.log("Recipe with ID " + safeId + " deleted successfully.");
    };

    return () => {
      // @ts-ignore
      delete window.deleteRecipe;
    };
  }, []);

  const handleSave = useCallback((recipe: Recipe) => {
    setRecipes(prev => {
      const exists = prev.some(r => r.id === recipe.id);
      return exists ? prev.map(r => r.id === recipe.id ? recipe : r) : [...prev, recipe];
    });
    setIsModalOpen(false);
    setEditingRecipe(null);
  }, []);

  const filteredRecipes = useMemo(() => recipes.filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase())), [recipes, recipeSearch]);

  const shoppingList = useMemo(() => {
    const totals: Record<string, { name: string; quantity: number; unit: Unit }> = {};
    Object.entries(orders).forEach(([id, qty]) => {
      const r = recipes.find(rcp => String(rcp.id) === String(id));
      if (!r || qty <= 0) return;
      r.ingredients.forEach(ing => {
        const key = `${ing.name.toLowerCase().trim()}_${ing.unit}`;
        if (totals[key]) totals[key].quantity += ing.quantity * qty;
        else totals[key] = { ...ing, quantity: ing.quantity * qty };
      });
    });
    return Object.values(totals);
  }, [recipes, orders]);

  return (
    <div className="min-h-screen pb-32 flex flex-col">
      <header className="sticky top-0 z-40 bg-[#FEF9F3]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-[#3D2B1F]/5">
        <h1 className="text-xl font-bold">{t.title}</h1>
        <button onClick={() => setLang(lang === 'en' ? 'he' : 'en')} className="bg-white shadow-sm border border-[#3D2B1F]/10 rounded-full px-3 py-1.5 flex items-center gap-2 text-sm">
          <Globe size={16} className="text-[#FF8A3D]" /> {lang === 'en' ? '🇮🇱 HE' : '🇺🇸 EN'}
        </button>
      </header>

      <main className="px-6 py-4 flex-1">
        {activeTab === 'recipes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t.recipes}</h2>
              <button onClick={() => { setEditingRecipe(null); setIsModalOpen(true); }} className="bg-[#FF8A3D] text-white p-3 rounded-2xl shadow-lg"><Plus size={24} /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D2B1F]/30" size={20} />
              <input type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-white rounded-2xl pl-12 pr-4 py-4 shadow-sm outline-none" />
            </div>

            {recipes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center gap-4">
                <ChefHat size={64} className="text-[#FF8A3D]/20" />
                <p className="text-[#3D2B1F]/40">{t.emptyRecipes}</p>
                <button onClick={() => { setEditingRecipe(null); setIsModalOpen(true); }} className="bg-[#FF8A3D] text-white px-8 py-3 rounded-2xl font-bold">{t.addRecipe}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRecipes.map(r => (
                  <div key={r.id} onClick={() => { setEditingRecipe(r); setIsModalOpen(true); }} className="bg-white rounded-[2rem] overflow-hidden shadow-sm flex flex-col border border-[#3D2B1F]/5 active:scale-[0.99] transition-all">
                    <div className="h-40 bg-[#FEF9F3] relative">
                      {r.imageUrl ? <img src={r.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon size={48} /></div>}
                      <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black uppercase text-[#FF8A3D]">{(t.categories as any)[r.category]}</span>
                      
                      <div className="absolute top-3 right-3 flex gap-2 z-10">
                        {/* Fix: removed invalid 'onclick' string prop which is not supported in React JSX and causes TypeScript errors. The 'onClick' handler already correctly manages this functionality. */}
                        <button 
                          className="p-2.5 bg-white shadow-lg rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            // @ts-ignore
                            if (window.deleteRecipe) window.deleteRecipe(r.id); 
                          }}
                        >
                          <Trash2 size={20} />
                        </button>
                        <button className="p-2.5 bg-white shadow-lg rounded-xl text-[#3D2B1F]/60">
                          <Edit3 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="p-5 flex justify-between items-center">
                      <h3 className="font-bold text-lg">{r.name}</h3>
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
            <h2 className="text-2xl font-bold">{t.orders}</h2>
            {recipes.length === 0 ? <p className="text-center py-20 text-[#3D2B1F]/40">{t.emptyRecipes}</p> : (
              <div className="space-y-3">
                {recipes.map(r => (
                  <div key={r.id} className="bg-white rounded-[2rem] p-4 shadow-sm flex items-center gap-4 border border-[#3D2B1F]/5">
                    <div className="w-16 h-16 rounded-2xl bg-[#FEF9F3] overflow-hidden">
                      {r.imageUrl ? <img src={r.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon size={24} /></div>}
                    </div>
                    <span className="flex-1 font-bold truncate">{r.name}</span>
                    <div className="flex items-center gap-3 bg-[#FEF9F3] p-1.5 rounded-2xl">
                      <button onClick={(e) => { e.stopPropagation(); setOrders(prev => ({ ...prev, [String(r.id)]: Math.max(0, (Number(prev[String(r.id)]) || 0) - 1) })); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm"><Minus size={16} /></button>
                      <span className="w-4 text-center font-bold">{orders[String(r.id)] || 0}</span>
                      <button onClick={(e) => { e.stopPropagation(); setOrders(prev => ({ ...prev, [String(r.id)]: (Number(prev[String(r.id)]) || 0) + 1 })); }} className="w-8 h-8 flex items-center justify-center bg-[#FF8A3D] text-white rounded-xl shadow-sm"><Plus size={16} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setActiveTab('shopping')} className="fixed bottom-28 left-6 right-6 bg-[#3D2B1F] text-white py-5 rounded-[2rem] font-bold shadow-xl flex items-center justify-center gap-3"><Calculator size={20} className="text-[#FF8A3D]" /> {t.calculate}</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{t.shopping}</h2>
            {shoppingList.length === 0 ? <p className="text-center py-20 text-[#3D2B1F]/40">{t.emptyOrders}</p> : (
              <div className="bg-white rounded-[2rem] shadow-sm divide-y divide-[#3D2B1F]/5 overflow-hidden border border-[#3D2B1F]/5">
                {shoppingList.map(item => {
                  const key = `${item.name}_${item.unit}`;
                  const isChecked = checkedItems.has(key);
                  return (
                    <div key={key} onClick={() => setCheckedItems(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; })} className={`flex items-center justify-between p-5 ${isChecked ? 'bg-gray-50 opacity-60' : ''}`}>
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

      <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-[#3D2B1F]/5 pb-8 pt-3 px-6 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('recipes')} className={`flex flex-col items-center gap-1 ${activeTab === 'recipes' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/30'}`}>
          <BookOpen size={24} /> <span className="text-[10px] font-bold uppercase">{t.recipes}</span>
        </button>
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 ${activeTab === 'orders' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/30'}`}>
          <ListChecks size={24} /> <span className="text-[10px] font-bold uppercase">{t.orders}</span>
        </button>
        <button onClick={() => setActiveTab('shopping')} className={`flex flex-col items-center gap-1 ${activeTab === 'shopping' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/30'}`}>
          <ShoppingCart size={24} /> <span className="text-[10px] font-bold uppercase">{t.shopping}</span>
        </button>
      </nav>

      <RecipeModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingRecipe(null); }} 
        onSave={handleSave} 
        editingRecipe={editingRecipe} 
        t={t} 
        lang={lang} 
      />
    </div>
  );
};

export default App;
