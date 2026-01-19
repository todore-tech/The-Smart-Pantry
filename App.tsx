
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
  Clock,
  ArrowDownAZ,
  RotateCcw,
  CheckCircle2,
  Circle,
  Camera,
  Flame,
  Utensils,
  Timer,
  Wand2
} from 'lucide-react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// --- Constants ---
// A warm, aesthetic kitchen/ingredients placeholder
const DEFAULT_PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1505935428862-770b6f24f629?auto=format&fit=crop&q=80&w=1200";

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
  // Always create a new instance right before use to ensure the latest API key
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
          IMAGE TYPE: This could be a photo of a cookbook, a handwritten note, or a restaurant menu.
          HEBREW SUPPORT: If the target language is Hebrew, ensure all text fields (name, ingredients) are in Hebrew.
          EXTRACT:
          1. name: string (the dish title).
          2. category: MUST BE one of [meat, dairy, pareve, dessert, other].
          3. prepTime: number (minutes, if found).
          4. cookTime: number (minutes, if found).
          5. ingredients: array of objects { 'name': string, 'quantity': number, 'unit': string (must be: grams, kg, units, liters, cans, packs) }.
          
          Respond ONLY with valid JSON. Do not include any markdown formatting if possible, just the raw JSON object.` }
        ] 
      },
      config: {
        systemInstruction: `You are an elite culinary data extraction AI. You excel at reading blurred or stylized text from kitchen photos. 
        Always respond with perfectly structured JSON according to the schema. 
        Map categories strictly to: meat, dairy, pareve, dessert, other.
        Map units strictly to: grams, kg, units, liters, cans, packs.`,
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

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    
    try {
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanedText);
      
      // Secondary validation for required fields
      if (!result.name || !result.ingredients || !Array.isArray(result.ingredients)) {
        throw new Error("INCOMPLETE_DATA");
      }
      
      return result;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Text:", text);
      throw new Error("INVALID_JSON_RESPONSE");
    }
  } catch (error: any) {
    console.error("AI Scan API Error:", error);
    const errorMessage = error?.message || "";
    
    // Check for specific API Key / Project errors
    if (errorMessage.includes("API_KEY") || 
        errorMessage.includes("403") || 
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("billing") ||
        errorMessage.includes("Project")) {
      throw new Error("API_KEY_OR_PROJECT_ERROR");
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
        setIngredients([{ id: Date.now().toString(), name: '', quantity: 1, unit: 'units' }]);
        setImageUrl(undefined);
      }
    }
  }, [editingRecipe, isOpen]);

  if (!isOpen) return null;

  const performAiAnalysis = async (base64: string) => {
    setIsAiScanning(true);
    try {
      // @ts-ignore - Handle mandatory key selection for certain environments
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
      
      const result = await runAIScan(base64, lang);
      
      if (result.name) setName(result.name);
      if (result.category && CATEGORY_OPTIONS.includes(result.category.toLowerCase() as any)) {
        setCategory(result.category.toLowerCase());
      }
      if (result.prepTime) setPrepTime(result.prepTime);
      if (result.cookTime) setCookTime(result.cookTime);
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
      const errMsg = err.message || "";
      console.error("Analysis process failed:", err);

      if (errMsg === "API_KEY_OR_PROJECT_ERROR") {
        const keyAlert = lang === 'en' 
          ? "There was a problem with your API project. Please ensure you have selected a valid project with billing enabled."
          : "הייתה בעיה עם פרויקט ה-API שלך. אנא וודא שבחרת פרויקט תקין עם חיוב מופעל.";
        alert(keyAlert);
        
        // @ts-ignore - Re-prompt for key as per guidelines
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
        }
      } else if (errMsg === "INVALID_JSON_RESPONSE" || errMsg === "INCOMPLETE_DATA") {
        const dataAlert = lang === 'en'
          ? "The AI had trouble formatting the recipe data. Please try again with a clearer photo of the list."
          : "הבינה המלאכותית התקשתה בעיבוד נתוני המתכון. אנא נסו שוב עם צילום ברור יותר של הרשימה.";
        alert(dataAlert);
      } else {
        alert(t.aiScanError || "Could not read recipe. Please try a clearer photo.");
      }
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleAiScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await performAiAnalysis(base64);
        if (aiFileInputRef.current) aiFileInputRef.current.value = '';
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
          <p className="mt-2 text-sm opacity-80">{lang === 'en' ? 'Converting image to recipe data...' : 'ממיר את התמונה לנתוני מתכון...'}</p>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; onSave({ id: editingRecipe?.id || Date.now().toString(), name: name.trim(), category, prepTime, cookTime, ingredients: ingredients.filter(i => i.name.trim() !== ''), imageUrl }); }} className="flex flex-col h-full">
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
          <button type="button" onClick={() => aiFileInputRef.current?.click()} className="w-full bg-gradient-to-r from-[#FF8A3D] to-[#FF6B3D] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Sparkles size={20} /> {t.aiScan}
          </button>
          <input type="file" ref={aiFileInputRef} onChange={handleAiScan} accept="image/*" className="hidden" />

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.recipeImage}</label>
            <div 
              className="w-full h-64 bg-white rounded-[2.5rem] border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center justify-center overflow-hidden group relative shadow-inner"
            >
              <img 
                src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE} 
                className={`w-full h-full object-cover transition-all duration-700 ${!imageUrl ? 'opacity-40 saturate-[0.7] blur-[1px]' : 'opacity-100'}`} 
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-[#3D2B1F]/20 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-full">
                  <Upload size={32} />
                </div>
                <span className="text-[12px] font-black uppercase mt-3 tracking-widest">{t.tapToUpload}</span>
              </div>
              
              {!imageUrl && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer pointer-events-auto group-hover:opacity-0 transition-opacity"
                >
                   <div className="bg-white/90 backdrop-blur-xl p-4 rounded-full shadow-2xl border border-white/50">
                      <Camera size={36} className="text-[#FF8A3D]" />
                   </div>
                   <div className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-full text-[11px] font-black uppercase mt-4 text-[#3D2B1F]/70 shadow-lg border border-white/50 tracking-wider">
                     {t.tapToUpload}
                   </div>
                </div>
              )}

              {/* Analysis trigger button when an image is present */}
              {imageUrl && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); performAiAnalysis(imageUrl); }}
                  className="absolute bottom-5 right-5 bg-gradient-to-br from-[#FF8A3D] to-[#FF6B3D] text-white p-4 rounded-2xl shadow-2xl border border-white/20 active:scale-90 transition-all group/magic flex items-center gap-2 overflow-hidden hover:pr-12"
                >
                  <Wand2 size={24} className="group-hover/magic:rotate-12 transition-transform" />
                  <span className="absolute right-[-100%] group-hover/magic:right-4 text-[10px] font-black uppercase whitespace-nowrap transition-all duration-300">
                    {lang === 'en' ? 'Magic Scan' : 'סריקת קסם'}
                  </span>
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="flex-1 bg-white border border-[#3D2B1F]/10 py-3.5 rounded-2xl font-bold text-[#3D2B1F]/60 flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
              >
                <Upload size={18} /> {lang === 'en' ? 'Upload Photo' : 'העלה תמונה'}
              </button>
              {imageUrl && (
                <button 
                  type="button" 
                  onClick={() => setImageUrl(undefined)} 
                  className="bg-red-50 text-red-500 border border-red-100 px-5 rounded-2xl active:scale-95 transition-transform shadow-sm"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.recipeName}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white rounded-2xl p-4 text-lg font-medium shadow-sm border border-transparent focus:border-[#FF8A3D]/20 focus:ring-4 focus:ring-[#FF8A3D]/5 outline-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.prepTime} ({t.minutes})</label>
              <input type="number" value={prepTime || ''} onChange={e => setPrepTime(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full bg-white rounded-2xl p-4 text-lg font-medium shadow-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]/20 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#3D2B1F]/40">{t.cookTime} ({t.minutes})</label>
              <input type="number" value={cookTime || ''} onChange={e => setCookTime(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full bg-white rounded-2xl p-4 text-lg font-medium shadow-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]/20 transition-all" />
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
              <button type="button" onClick={() => setIngredients([...ingredients, { id: Date.now().toString(), name: '', quantity: 1, unit: 'units' }])} className="text-[#FF8A3D] font-black text-xs uppercase flex items-center gap-1.5 active:scale-95 transition-transform bg-[#FF8A3D]/10 px-3 py-1.5 rounded-full">
                <Plus size={14} strokeWidth={3} /> {t.addIngredient}
              </button>
            </div>
            {ingredients.map(ing => (
              <div key={ing.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3 relative border border-[#3D2B1F]/5 animate-fade-in">
                <button type="button" onClick={() => removeIngredient(ing.id)} className="absolute top-2 right-2 text-red-400 p-1.5 active:scale-90 transition-transform"><Trash2 size={16} /></button>
                <input type="text" value={ing.name} placeholder={t.ingredientName} onChange={e => updateIngredient(ing.id, 'name', e.target.value)} className="w-full bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]/10 transition-all" />
                <div className="flex gap-2">
                  <input type="number" step="any" value={ing.quantity} onChange={e => updateIngredient(ing.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-24 bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]/10 transition-all" />
                  <select value={ing.unit} onChange={e => updateIngredient(ing.id, 'unit', e.target.value)} className="flex-1 bg-[#FEF9F3] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]/10 transition-all appearance-none">
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
  const [isShoppingListSorted, setIsShoppingListSorted] = useState(() => localStorage.getItem('smart_pantry_shopping_sorted') === 'true');

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem('smart_pantry_recipes', JSON.stringify(recipes));
    localStorage.setItem('smart_pantry_orders', JSON.stringify(orders));
    localStorage.setItem('smart_pantry_lang', lang);
    localStorage.setItem('smart_pantry_shopping_sorted', String(isShoppingListSorted));
    document.body.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [recipes, orders, lang, isShoppingListSorted]);

  useEffect(() => {
    // @ts-ignore
    window.deleteRecipe = function(id: any) {
      if (!confirm(lang === 'en' ? "Delete this recipe?" : "למחוק את המתכון הזה?")) {
        return;
      }

      const safeId = String(id);
      
      setRecipes(prevRecipes => prevRecipes.filter(r => String(r.id) !== safeId));
      setOrders(prevOrders => {
        const nextOrders = { ...prevOrders };
        delete nextOrders[safeId];
        return nextOrders;
      });

      setIsModalOpen(false);
      setEditingRecipe(null);
    };

    return () => {
      // @ts-ignore
      delete window.deleteRecipe;
    };
  }, [lang]);

  const handleSave = useCallback((recipe: Recipe) => {
    setRecipes(prev => {
      const exists = prev.some(r => String(r.id) === String(recipe.id));
      return exists ? prev.map(r => String(r.id) === String(recipe.id) ? recipe : r) : [...prev, recipe];
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
    const list = Object.values(totals);
    if (isShoppingListSorted) {
      list.sort((a, b) => a.name.localeCompare(b.name, lang === 'he' ? 'he' : 'en', { sensitivity: 'base', numeric: true }));
    }
    return list;
  }, [recipes, orders, isShoppingListSorted, lang]);

  const copyToWhatsApp = useCallback(() => {
    if (shoppingList.length === 0) return;
    
    const title = lang === 'en' ? '🛒 *My Shopping List*' : '🛒 *רשימת הקניות שלי*';
    const date = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'he-IL');
    
    let message = `${title} (${date})\n\n`;
    
    shoppingList.forEach((item) => {
      const unitLabel = (t.units as any)[item.unit];
      message += `• ${item.name}: *${item.quantity} ${unitLabel}*\n`;
    });
    
    navigator.clipboard.writeText(message).then(() => {
      alert(lang === 'en' ? 'List copied to clipboard!' : 'הרשימה הועתקה ללוח!');
    }).catch(err => {
      console.error('Failed to copy list: ', err);
    });
  }, [shoppingList, lang, t]);

  return (
    <div className="min-h-screen pb-32 flex flex-col">
      <header className="sticky top-0 z-40 bg-[#FEF9F3]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-[#3D2B1F]/5">
        <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D2B1F]/30 group-focus-within:text-[#FF8A3D] transition-colors" size={20} />
              <input type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-white rounded-2xl pl-12 pr-4 py-4 shadow-sm outline-none focus:ring-2 focus:ring-[#FF8A3D]/10 transition-all border border-transparent focus:border-[#FF8A3D]/10" />
            </div>

            {recipes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center gap-4">
                <ChefHat size={64} className="text-[#FF8A3D]/20" />
                <p className="text-[#3D2B1F]/40 px-6 max-w-xs mx-auto">{t.emptyRecipes}</p>
                <button onClick={() => { setEditingRecipe(null); setIsModalOpen(true); }} className="bg-[#FF8A3D] text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">{t.addRecipe}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredRecipes.map(r => (
                  <div key={r.id} onClick={() => { setEditingRecipe(r); setIsModalOpen(true); }} className="bg-white rounded-[3rem] overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col border border-[#3D2B1F]/5 active:scale-[0.98] transition-all group">
                    <div className="h-72 bg-[#FEF9F3] relative overflow-hidden">
                      <img 
                        src={r.imageUrl || DEFAULT_PLACEHOLDER_IMAGE} 
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ${!r.imageUrl ? 'opacity-80 saturate-[0.8] grayscale-[0.2]' : 'opacity-100'}`} 
                      />
                      
                      {/* Gradient for badge readability */}
                      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                      
                      {/* Floating Category Badge */}
                      <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-black uppercase text-[#FF8A3D] shadow-xl tracking-widest border border-white/20">{(t.categories as any)[r.category]}</div>
                      
                      <div className="absolute top-5 right-5 flex gap-2.5 z-10">
                        <button 
                          className="p-3.5 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl text-red-500 hover:bg-red-50 active:scale-90 transition-all border border-white/20"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            // @ts-ignore
                            if (window.deleteRecipe) window.deleteRecipe(r.id); 
                          }}
                        >
                          <Trash2 size={20} />
                        </button>
                        <button className="p-3.5 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl text-[#3D2B1F]/60 active:scale-90 transition-all border border-white/20">
                          <Edit3 size={20} />
                        </button>
                      </div>

                      {/* Prominent Quick-Info Overlay */}
                      {(r.prepTime !== undefined || r.cookTime !== undefined) && (
                        <div className="absolute bottom-5 left-5 right-5 flex gap-2">
                           {r.prepTime !== undefined && (
                             <div className="bg-white/90 backdrop-blur-xl px-4 py-2 rounded-2xl flex items-center gap-2 shadow-2xl border border-white/40">
                               <Timer size={14} className="text-[#FF8A3D]" />
                               <span className="text-[10px] font-black uppercase text-[#3D2B1F]/70 tracking-tight">
                                 {lang === 'en' ? 'Prep' : 'הכנה'}: {r.prepTime}{t.minutes}
                               </span>
                             </div>
                           )}
                           {r.cookTime !== undefined && (
                             <div className="bg-[#FF8A3D]/90 backdrop-blur-xl px-4 py-2 rounded-2xl flex items-center gap-2 shadow-2xl border border-white/10">
                               <Flame size={14} className="text-white" />
                               <span className="text-[10px] font-black uppercase text-white tracking-tight">
                                 {lang === 'en' ? 'Cook' : 'בישול'}: {r.cookTime}{t.minutes}
                               </span>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-8 flex flex-col gap-5">
                      <div className="space-y-1">
                        <h3 className="font-black text-2xl leading-tight text-[#3D2B1F] tracking-tight group-hover:text-[#FF8A3D] transition-colors">{r.name}</h3>
                        <p className="text-[#3D2B1F]/40 text-xs font-bold uppercase tracking-widest">
                           {r.ingredients.length} {lang === 'en' ? 'Ingredients' : 'מרכיבים'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                         <div className="h-0.5 flex-1 bg-[#3D2B1F]/5 rounded-full" />
                         <div className="p-2 bg-[#FEF9F3] rounded-full border border-[#3D2B1F]/5">
                           <Utensils size={14} className="text-[#FF8A3D]" />
                         </div>
                         <div className="h-0.5 flex-1 bg-[#3D2B1F]/5 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in relative">
            <h2 className="text-2xl font-bold tracking-tight">{t.orders}</h2>
            {recipes.length === 0 ? <p className="text-center py-20 text-[#3D2B1F]/40">{t.emptyRecipes}</p> : (
              <div className="space-y-3 pb-52">
                {recipes.map(r => (
                  <div key={r.id} className="bg-white rounded-[2.25rem] p-4 shadow-sm flex items-center gap-4 border border-[#3D2B1F]/5 transition-all active:scale-[0.99] hover:border-[#FF8A3D]/10">
                    <div className="w-16 h-16 rounded-2xl bg-[#FEF9F3] overflow-hidden flex-shrink-0 shadow-inner">
                      <img 
                        src={r.imageUrl || DEFAULT_PLACEHOLDER_IMAGE} 
                        className={`w-full h-full object-cover ${!r.imageUrl ? 'opacity-40' : 'opacity-100'}`} 
                      />
                    </div>
                    <span className="flex-1 font-bold truncate text-lg tracking-tight">{r.name}</span>
                    <div className="flex items-center gap-3 bg-[#FEF9F3] p-1.5 rounded-[1.25rem] shadow-inner">
                      <button onClick={(e) => { e.stopPropagation(); setOrders(prev => ({ ...prev, [String(r.id)]: Math.max(0, (Number(prev[String(r.id)]) || 0) - 1) })); }} className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm active:scale-90 transition-transform"><Minus size={18} /></button>
                      <span className="w-6 text-center font-bold text-lg">{orders[String(r.id)] || 0}</span>
                      <button onClick={(e) => { e.stopPropagation(); setOrders(prev => ({ ...prev, [String(r.id)]: (Number(prev[String(r.id)]) || 0) + 1 })); }} className="w-9 h-9 flex items-center justify-center bg-[#FF8A3D] text-white rounded-xl shadow-sm active:scale-90 transition-transform"><Plus size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Calculate Button - Fixed at bottom of orders view */}
            {recipes.length > 0 && (
              <div className="fixed bottom-[112px] left-6 right-6 z-40 pointer-events-none">
                <button 
                  onClick={() => setActiveTab('shopping')} 
                  className="w-full bg-[#3D2B1F] text-white py-5 rounded-[2.25rem] font-bold shadow-2xl flex items-center justify-center gap-3 active:scale-95 hover:bg-[#2D1B1F] transition-all pointer-events-auto"
                >
                  <Calculator size={20} className="text-[#FF8A3D]" /> {t.calculate}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">{t.shopping}</h2>
              {shoppingList.length > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={copyToWhatsApp}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm bg-[#25D366] text-white active:scale-95"
                  >
                    <MessageCircle size={16} />
                    {t.copyWhatsapp}
                  </button>
                  <button 
                    onClick={() => setIsShoppingListSorted(!isShoppingListSorted)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${isShoppingListSorted ? 'bg-[#FF8A3D] text-white' : 'bg-white text-[#3D2B1F]/60 border border-[#3D2B1F]/10'}`}
                  >
                    <ArrowDownAZ size={16} />
                    {t.sortIngredients}
                  </button>
                  {Object.values(orders).some(q => q > 0) && (
                    <button 
                      onClick={() => { if(confirm(lang === 'en' ? 'Reset all orders?' : 'לאפס את כל ההזמנות?')) setOrders({}); }}
                      className="bg-red-50 text-red-500 border border-red-100 p-2.5 rounded-2xl active:scale-90 transition-transform shadow-sm"
                    >
                      <RotateCcw size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {shoppingList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-[#3D2B1F]/5 flex flex-col items-center gap-4">
                <ShoppingCart size={48} className="text-[#3D2B1F]/10" />
                <p className="text-[#3D2B1F]/40 px-6">{t.emptyOrders}</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] shadow-sm divide-y divide-[#3D2B1F]/5 overflow-hidden border border-[#3D2B1F]/5">
                {shoppingList.map(item => {
                  const key = `${item.name}_${item.unit}`;
                  const isChecked = checkedItems.has(key);
                  return (
                    <div 
                      key={key} 
                      onClick={() => setCheckedItems(prev => { 
                        const next = new Set(prev); 
                        if (next.has(key)) next.delete(key); 
                        else next.add(key); 
                        return next; 
                      })} 
                      className={`flex items-center justify-between p-6 transition-all duration-300 active:bg-gray-50 ${isChecked ? 'bg-gray-50/50' : 'bg-white'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`transition-all duration-500 ${isChecked ? 'text-[#FF8A3D] scale-110' : 'text-[#3D2B1F]/10'}`}>
                          {isChecked ? <CheckCircle2 size={26} strokeWidth={2.5} /> : <Circle size={26} strokeWidth={1.5} />}
                        </div>
                        <span className={`font-bold text-lg transition-all duration-300 ${isChecked ? 'line-through text-[#3D2B1F]/30 opacity-70' : 'text-[#3D2B1F]'}`}>{item.name}</span>
                      </div>
                      <span className={`font-black text-lg transition-colors ${isChecked ? 'text-[#FF8A3D]/40' : 'text-[#FF8A3D]'}`}>{item.quantity} {(t.units as any)[item.unit]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-[#3D2B1F]/5 pb-8 pt-5 px-6 flex justify-around items-center z-50 shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.12)]">
        <button onClick={() => setActiveTab('recipes')} className={`flex flex-col items-center gap-2 transition-all active:scale-90 ${activeTab === 'recipes' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/20'}`}>
          <div className={`p-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'recipes' ? 'bg-[#FF8A3D]/10 shadow-inner' : ''}`}>
            <BookOpen size={24} strokeWidth={activeTab === 'recipes' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{t.recipes}</span>
        </button>
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-2 transition-all active:scale-90 ${activeTab === 'orders' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/20'}`}>
          <div className={`p-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'orders' ? 'bg-[#FF8A3D]/10 shadow-inner' : ''}`}>
            <ListChecks size={24} strokeWidth={activeTab === 'orders' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{t.orders}</span>
        </button>
        <button onClick={() => setActiveTab('shopping')} className={`flex flex-col items-center gap-2 transition-all active:scale-90 ${activeTab === 'shopping' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/20'}`}>
          <div className={`p-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'shopping' ? 'bg-[#FF8A3D]/10 shadow-inner' : ''}`}>
            <ShoppingCart size={24} strokeWidth={activeTab === 'shopping' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{t.shopping}</span>
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
