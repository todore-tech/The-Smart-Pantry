
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Recipe, Order, Language, Ingredient, Unit } from './types';
import { TRANSLATIONS, CATEGORY_OPTIONS } from './constants';
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
  Camera,
  ArrowDownAZ,
  AlertTriangle,
  Search,
  Filter,
  Sparkles,
  Loader2,
  Upload
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- AI Service ---

const runAIScan = async (base64Image: string, lang: Language) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analyze this recipe image. Extract the recipe name, category (one of: meat, dairy, pareve, dessert, other), and a detailed list of ingredients. 
  For each ingredient, provide: name, numeric quantity, and unit (one of: grams, kg, units, liters, cans, packs).
  Important: The recipe name and ingredient names should be in ${lang === 'he' ? 'Hebrew' : 'English'}. 
  Map non-standard units to the closest available option in the provided list.`;

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image.split(',')[1],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
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

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Scan failed:", error);
    throw error;
  }
};

// --- Components ---

const Header: React.FC<{ 
  lang: Language; 
  setLang: (l: Language) => void;
  title: string;
}> = ({ lang, setLang, title }) => (
  <header className="sticky top-0 z-40 bg-[#FEF9F3]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-[#3D2B1F]/5">
    <h1 className="text-xl font-bold text-[#3D2B1F] tracking-tight">{title}</h1>
    <button 
      type="button"
      onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
      className="bg-white shadow-sm border border-[#3D2B1F]/10 rounded-full p-2 flex items-center gap-2 text-sm font-medium transition-transform active:scale-95"
    >
      <Globe size={18} className="text-[#FF8A3D]" />
      <span>{lang === 'en' ? '🇮🇱 HE' : '🇺🇸 EN'}</span>
    </button>
  </header>
);

const BottomNav: React.FC<{ 
  activeTab: string; 
  setActiveTab: (t: string) => void; 
  t: any;
  lang: Language;
}> = ({ activeTab, setActiveTab, t }) => (
  <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#3D2B1F]/5 pb-8 pt-3 px-6 flex justify-around items-center z-50">
    <button 
      type="button"
      onClick={() => setActiveTab('recipes')}
      className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'recipes' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/40'}`}
    >
      <BookOpen size={24} strokeWidth={activeTab === 'recipes' ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{t.recipes}</span>
    </button>
    <button 
      type="button"
      onClick={() => setActiveTab('orders')}
      className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'orders' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/40'}`}
    >
      <ListChecks size={24} strokeWidth={activeTab === 'orders' ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{t.orders}</span>
    </button>
    <button 
      type="button"
      onClick={() => setActiveTab('shopping')}
      className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'shopping' ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/40'}`}
    >
      <ShoppingCart size={24} strokeWidth={activeTab === 'shopping' ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{t.shopping}</span>
    </button>
  </nav>
);

const CustomConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmLabel, cancelLabel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#3D2B1F]/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-[#3D2B1F]/60 leading-relaxed">{message}</p>
        </div>
        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={onConfirm}
            className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
          >
            {confirmLabel}
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-[#FEF9F3] text-[#3D2B1F]/60 py-4 rounded-2xl font-bold active:scale-95 transition-transform"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  }, [editingRecipe, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Image is too large (max 1.5MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiScanImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setIsAiScanning(true);
        try {
          const result = await runAIScan(base64, lang);
          if (result.name) setName(result.name);
          if (result.category) setCategory(result.category);
          if (result.ingredients) {
            setIngredients(result.ingredients.map((ing: any) => ({
              id: Math.random().toString(),
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit as Unit
            })));
          }
          if (!imageUrl) setImageUrl(base64); // Also use this as the recipe image if none exists
        } catch (error) {
          alert(t.aiScanError);
        } finally {
          setIsAiScanning(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { id: Math.random().toString(), name: '', quantity: 1, unit: 'units' }]);
  };

  const sortIngredients = () => {
    const sorted = [...ingredients].sort((a, b) => {
      if (!a.name) return 1;
      if (!b.name) return -1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    setIngredients(sorted);
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
    
    const finalRecipe: Recipe = {
      id: editingRecipe?.id || Math.random().toString(),
      name: name.trim(),
      category,
      ingredients: ingredients.filter(i => i && i.name && i.name.trim() !== ''),
      imageUrl: imageUrl
    };

    onSave(finalRecipe);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#FEF9F3]">
      {isAiScanning && (
        <div className="absolute inset-0 z-[110] bg-[#3D2B1F]/40 backdrop-blur-md flex flex-col items-center justify-center text-white p-6">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="text-xl font-bold">{t.aiScanning}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
        <header className="px-6 py-4 flex justify-between items-center border-b border-[#3D2B1F]/5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <button type="button" onClick={onClose} className="text-[#3D2B1F]/60 p-2 active:scale-90 transition-transform"><X size={24} /></button>
          <h2 className="font-bold text-lg">{editingRecipe ? t.edit : t.addRecipe}</h2>
          <button type="submit" className="text-[#FF8A3D] font-bold p-2 active:scale-95 transition-transform bg-transparent border-none cursor-pointer">
            {t.save}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          <div className="flex flex-col gap-3">
            <button 
              type="button"
              onClick={() => aiFileInputRef.current?.click()}
              className="w-full bg-gradient-to-r from-[#FF8A3D] to-[#FF6B3D] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#FF8A3D]/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Sparkles size={20} />
              {t.aiScan}
            </button>
            <input 
              type="file" 
              ref={aiFileInputRef} 
              onChange={handleAiScanImage} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold uppercase text-[#3D2B1F]/40 tracking-wider">{t.recipeImage}</label>
              {imageUrl && (
                <button 
                  type="button"
                  onClick={() => setImageUrl(undefined)}
                  className="text-red-400 text-xs font-bold uppercase tracking-wider"
                >
                  {t.delete}
                </button>
              )}
            </div>
            <div 
              className="w-full h-56 bg-white rounded-[2rem] shadow-sm border-2 border-dashed border-[#3D2B1F]/10 flex flex-col items-center justify-center overflow-hidden relative"
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#3D2B1F]/40 p-4 text-center">
                  <ImageIcon size={48} strokeWidth={1.5} />
                  <span className="text-sm font-medium">{t.tapToUpload}</span>
                </div>
              )}
            </div>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border border-[#3D2B1F]/10 py-3 rounded-2xl font-bold text-[#3D2B1F]/60 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Upload size={18} />
              {lang === 'en' ? 'Upload Image' : 'העלה תמונה'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40 tracking-wider px-1">{t.recipeName}</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-white border-none rounded-2xl p-4 text-lg font-medium shadow-sm focus:ring-2 focus:ring-[#FF8A3D] outline-none"
              placeholder="..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#3D2B1F]/40 tracking-wider px-1">{t.category}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCategory(opt)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${category === opt ? 'bg-[#FF8A3D] text-white shadow-md shadow-[#FF8A3D]/20' : 'bg-white text-[#3D2B1F]/60'}`}
                >
                  {(t.categories as any)[opt]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold uppercase text-[#3D2B1F]/40 tracking-wider">{t.addIngredient}</h3>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={sortIngredients} 
                  className="text-[#3D2B1F]/60 flex items-center gap-1 text-sm font-bold bg-white px-3 py-1.5 rounded-xl shadow-sm border border-[#3D2B1F]/5 active:scale-95 transition-transform"
                >
                  <ArrowDownAZ size={16} /> {t.sortIngredients}
                </button>
                <button 
                  type="button" 
                  onClick={addIngredient} 
                  className="text-[#FF8A3D] flex items-center gap-1 text-sm font-bold bg-[#FF8A3D]/10 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                >
                  <Plus size={16} /> {t.addIngredient}
                </button>
              </div>
            </div>
            {ingredients.map((ing) => (
              <div key={ing.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3 relative group">
                <button 
                  type="button"
                  onClick={() => removeIngredient(ing.id)}
                  className="absolute top-3 right-3 text-red-400 opacity-40 group-hover:opacity-100 transition-opacity p-1 bg-transparent border-none cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={ing.name}
                    onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                    className="flex-1 border-none bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm font-medium outline-none"
                    placeholder={t.ingredientName}
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    step="any"
                    value={ing.quantity}
                    onChange={e => updateIngredient(ing.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-20 border-none bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm font-medium outline-none"
                    placeholder={t.quantity}
                  />
                  <select 
                    value={ing.unit}
                    onChange={e => updateIngredient(ing.id, 'unit', e.target.value)}
                    className="flex-1 border-none bg-[#FEF9F3] rounded-xl px-3 py-2 text-sm font-medium outline-none appearance-none"
                  >
                    {Object.keys(t.units).map(u => (
                      <option key={u} value={u}>{(t.units as any)[u]}</option>
                    ))}
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

// --- App Root ---

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState('recipes');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<Order>({});
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  
  // Tab states
  const [recipeSearch, setRecipeSearch] = useState('');
  const [orderCategoryFilter, setOrderCategoryFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  
  // Custom Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; recipeId: string | null }>({
    isOpen: false,
    recipeId: null
  });

  const t = TRANSLATIONS[lang];

  // Persistence
  useEffect(() => {
    try {
      const savedRecipes = localStorage.getItem('smart_pantry_recipes');
      const savedOrders = localStorage.getItem('smart_pantry_orders');
      const savedLang = localStorage.getItem('smart_pantry_lang') as Language;
      
      if (savedRecipes) setRecipes(JSON.parse(savedRecipes));
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      if (savedLang) setLang(savedLang);
    } catch (e) {
      console.error("Failed to load from storage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('smart_pantry_recipes', JSON.stringify(recipes));
      localStorage.setItem('smart_pantry_lang', lang);
    } catch (e) {
      console.error("Failed to save to storage", e);
    }
  }, [recipes, lang]);

  useEffect(() => {
    localStorage.setItem('smart_pantry_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    document.body.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  // Filtered Recipes for Tab 1
  const filteredRecipesList = useMemo(() => {
    return recipes.filter(r => 
      r.name.toLowerCase().includes(recipeSearch.toLowerCase())
    );
  }, [recipes, recipeSearch]);

  // Filtered Recipes for Tab 2
  const ordersRecipesList = useMemo(() => {
    if (orderCategoryFilter === 'all') return recipes;
    return recipes.filter(r => r.category === orderCategoryFilter);
  }, [recipes, orderCategoryFilter]);

  // Aggregation Logic
  const shoppingList = useMemo(() => {
    const totals: Record<string, { name: string; quantity: number; unit: Unit }> = {};

    (Object.entries(orders) as [string, number][]).forEach(([recipeId, recipeQty]) => {
      if (recipeQty <= 0) return;
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) return;

      (recipe.ingredients || []).forEach(ing => {
        if (!ing || !ing.name) return;
        const key = `${ing.name.toLowerCase().trim()}_${ing.unit || 'units'}`;
        if (totals[key]) {
          totals[key].quantity += (ing.quantity || 0) * recipeQty;
        } else {
          totals[key] = {
            name: ing.name,
            quantity: (ing.quantity || 0) * recipeQty,
            unit: ing.unit || 'units'
          };
        }
      });
    });

    return Object.values(totals).map(item => {
      let finalQty = item.quantity;
      let finalUnit = item.unit;

      if (item.unit === 'grams' && finalQty >= 1000) {
        finalQty = parseFloat((finalQty / 1000).toFixed(2));
        finalUnit = 'kg';
      }

      return {
        ...item,
        quantity: finalQty,
        unit: finalUnit
      };
    });
  }, [recipes, orders]);

  const handleSaveRecipe = (recipe: Recipe) => {
    setRecipes(prev => {
      const exists = prev.some(r => r.id === recipe.id);
      if (exists) {
        return prev.map(r => r.id === recipe.id ? recipe : r);
      }
      return [...prev, recipe];
    });
    setEditingRecipe(null);
    setIsModalOpen(false);
  };

  const openDeleteModal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, recipeId: id });
  };

  const confirmDelete = () => {
    if (deleteModal.recipeId) {
      const id = deleteModal.recipeId;
      setRecipes(prev => prev.filter(r => r.id !== id));
      setOrders(prev => {
        const next = { ...prev };
        delete next[id];
        return { ...next };
      });
    }
    setDeleteModal({ isOpen: false, recipeId: null });
  };

  const updateOrder = (id: string, delta: number) => {
    setOrders(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const toggleCheck = (name: string, unit: string) => {
    const key = `${name}_${unit}`;
    const next = new Set(checkedItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCheckedItems(next);
  };

  const exportCsv = () => {
    const rows = [["Ingredient", "Quantity", "Unit"]];
    shoppingList.forEach(item => {
      rows.push([item.name, item.quantity.toString(), (t.units as any)[item.unit]]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shopping-list-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToWhatsapp = () => {
    let text = `🛒 *${t.shopping}* - ${new Date().toLocaleDateString()}\n\n`;
    shoppingList.forEach(item => {
      text += `- ${item.name}: ${item.quantity} ${(t.units as any)[item.unit]}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      alert(lang === 'en' ? 'Copied to clipboard!' : 'הועתק ללוח!');
    });
  };

  return (
    <div className="min-h-screen pb-32">
      <Header lang={lang} setLang={setLang} title={t.title} />

      <main className="px-6 py-4 animate-fade-in">
        {activeTab === 'recipes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{t.recipes}</h2>
              <button 
                type="button"
                onClick={() => { setEditingRecipe(null); setIsModalOpen(true); }}
                className="bg-[#FF8A3D] text-white p-3 rounded-2xl shadow-lg shadow-[#FF8A3D]/20 active:scale-95 transition-transform"
              >
                <Plus size={24} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-[#3D2B1F]/30">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                value={recipeSearch}
                onChange={e => setRecipeSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-white border-none rounded-2xl ps-12 pe-4 py-4 shadow-sm focus:ring-2 focus:ring-[#FF8A3D] outline-none font-medium transition-all"
              />
            </div>

            {recipes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#3D2B1F]/10 px-8">
                <p className="text-[#3D2B1F]/40 font-medium">{t.emptyRecipes}</p>
              </div>
            ) : filteredRecipesList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#3D2B1F]/5 px-8">
                <p className="text-[#3D2B1F]/40 font-medium italic">No matches found for "{recipeSearch}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecipesList.map(recipe => (
                  <div 
                    key={recipe.id} 
                    onClick={() => { setEditingRecipe(recipe); setIsModalOpen(true); }}
                    className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group border border-[#3D2B1F]/5 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="h-40 w-full bg-[#FEF9F3] overflow-hidden relative">
                      {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#FF8A3D]/20">
                          <ImageIcon size={48} />
                        </div>
                      )}
                      <div className="absolute bottom-4 start-4">
                        <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#FF8A3D] shadow-sm">
                          {(t.categories as any)[recipe.category || 'other']}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                          type="button"
                          className="p-3 bg-white/90 backdrop-blur-md text-[#3D2B1F]/60 rounded-2xl hover:text-[#FF8A3D] transition-colors shadow-sm"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => openDeleteModal(e, recipe.id)}
                          className="p-3 bg-white/90 backdrop-blur-md text-red-400 rounded-2xl hover:text-red-600 transition-colors shadow-sm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-xl mb-1 truncate">{recipe.name}</h3>
                      <p className="text-[#3D2B1F]/40 text-xs font-bold uppercase tracking-widest">
                        {(recipe.ingredients || []).length} {t.ingredientName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold">{t.orders}</h2>
              {Object.keys(orders).some(k => orders[k] > 0) && (
                <button 
                  onClick={() => setOrders({})}
                  className="text-red-400 text-xs font-bold uppercase tracking-widest bg-red-50 px-4 py-2 rounded-xl active:scale-90 transition-transform"
                >
                  {lang === 'en' ? 'Reset' : 'אפס'}
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar -mx-6 px-6">
              <button
                onClick={() => setOrderCategoryFilter('all')}
                className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${orderCategoryFilter === 'all' ? 'bg-[#3D2B1F] text-white shadow-lg' : 'bg-white text-[#3D2B1F]/40'}`}
              >
                {t.allCategories}
              </button>
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setOrderCategoryFilter(opt)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${orderCategoryFilter === opt ? 'bg-[#3D2B1F] text-white shadow-lg' : 'bg-white text-[#3D2B1F]/40'}`}
                >
                  {(t.categories as any)[opt]}
                </button>
              ))}
            </div>
            
            {recipes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#3D2B1F]/10 px-8">
                <p className="text-[#3D2B1F]/40 font-medium">{t.emptyRecipes}</p>
              </div>
            ) : ordersRecipesList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#3D2B1F]/5 px-8">
                <p className="text-[#3D2B1F]/40 font-medium">No recipes in this category.</p>
              </div>
            ) : (
              <div className="space-y-3 pb-24">
                {ordersRecipesList.map(recipe => (
                  <div key={recipe.id} className="bg-white rounded-[2rem] p-4 shadow-sm flex items-center gap-4 border border-transparent hover:border-[#FF8A3D]/10 transition-colors">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#FEF9F3] flex-shrink-0 relative">
                      {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#FF8A3D]/20">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-lg block truncate">{recipe.name}</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter text-[#3D2B1F]/30 block">
                        {(t.categories as any)[recipe.category || 'other']}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#FEF9F3] p-1 rounded-2xl border border-[#3D2B1F]/5">
                      <button 
                        type="button"
                        onClick={() => updateOrder(recipe.id, -1)}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm active:scale-90 transition-transform text-[#3D2B1F]"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="w-6 text-center font-bold text-lg">
                        {orders[recipe.id] || 0}
                      </span>
                      <button 
                        type="button"
                        onClick={() => updateOrder(recipe.id, 1)}
                        className="w-10 h-10 flex items-center justify-center bg-[#FF8A3D] text-white rounded-xl shadow-sm shadow-[#FF8A3D]/30 active:scale-90 transition-transform"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  type="button"
                  onClick={() => setActiveTab('shopping')}
                  className="fixed bottom-28 right-6 left-6 bg-[#3D2B1F] text-white py-5 rounded-[2rem] font-bold shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all z-40"
                >
                  <Calculator size={22} className="text-[#FF8A3D]" />
                  {t.calculate}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{t.shopping}</h2>
              <div className="flex gap-2">
                <button type="button" onClick={exportCsv} className="p-3 bg-white text-green-600 rounded-2xl shadow-sm border border-[#3D2B1F]/5 active:scale-95 transition-transform">
                  <FileSpreadsheet size={20} />
                </button>
                <button type="button" onClick={copyToWhatsapp} className="p-3 bg-white text-[#25D366] rounded-2xl shadow-sm border border-[#3D2B1F]/5 active:scale-95 transition-transform">
                  <MessageCircle size={20} />
                </button>
              </div>
            </div>

            {shoppingList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#3D2B1F]/10 px-8">
                <p className="text-[#3D2B1F]/40 font-medium">{t.emptyOrders}</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] shadow-sm divide-y divide-[#3D2B1F]/5 overflow-hidden">
                {shoppingList.map(item => {
                  const isChecked = checkedItems.has(`${item.name}_${item.unit}`);
                  return (
                    <div 
                      key={`${item.name}_${item.unit}`} 
                      className={`flex items-center justify-between p-5 transition-colors cursor-pointer active:bg-[#FEF9F3] ${isChecked ? 'opacity-40' : ''}`}
                      onClick={() => toggleCheck(item.name, item.unit)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-[#FF8A3D] border-[#FF8A3D]' : 'border-[#3D2B1F]/10 bg-white'}`}>
                          {isChecked && <Plus size={16} className="text-white rotate-45" />}
                        </div>
                        <span className={`font-medium text-lg ${isChecked ? 'line-through' : ''}`}>{item.name}</span>
                      </div>
                      <span className="font-bold text-[#FF8A3D] text-lg bg-[#FF8A3D]/5 px-3 py-1 rounded-xl">
                        {item.quantity} {(t.units as any)[item.unit]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <RecipeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRecipe}
        editingRecipe={editingRecipe}
        t={t}
        lang={lang}
      />

      <CustomConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, recipeId: null })}
        onConfirm={confirmDelete}
        title={lang === 'en' ? 'Delete Recipe' : 'מחק מתכון'}
        message={lang === 'en' ? 'Are you sure? This cannot be undone.' : 'האם אתה בטוח? פעולה זו אינה ניתנת לביטול.'}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
      />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} t={t} lang={lang} />
    </div>
  );
};

export default App;
