
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LOGO_DATA_URL } from "./constants.tsx";

const TRANSLATIONS: any = {
    en: {
        title: 'The Smart Pantry',
        recipes: 'Recipes',
        orders: 'Orders',
        inventory: 'Pantry',
        shopping: 'Shopping',
        addRecipe: 'Add Recipe',
        recipeName: 'Recipe Name',
        ingredientName: 'Ingredient Name',
        quantity: 'Qty',
        unit: 'Unit',
        save: 'Save Changes',
        delete: 'Delete',
        edit: 'Edit Recipe',
        calculate: 'Sum Shopping List',
        copyWhatsapp: 'WhatsApp',
        emptyRecipes: 'No recipes yet. Tap + to start!',
        emptyOrders: 'Select items to generate a list.',
        emptyInventory: 'Your pantry is empty. Add items you have in stock.',
        addIngredient: 'Add Item',
        searchPlaceholder: 'Search recipes...',
        aiScan: 'Photo Scan',
        voiceAssistant: 'Voice Assistant',
        voiceActive: 'Listening...',
        aiScanning: 'Scanning...',
        aiScanError: 'AI Scan failed.',
        importMenuTitle: 'Import Methods',
        magicPasteLabel: 'Magic Paste AI',
        magicPasteSub: 'Paste any text recipe',
        importFileLabel: 'CSV File',
        importFileSub: 'Bulk import (.csv)',
        clearAllLabel: 'Clear Library',
        clearAllSub: 'Delete all recipes',
        confirmClearAll: 'Are you sure? This will delete ALL recipes.',
        magicPasteTitle: 'Magic Paste',
        pasteLabel: 'Paste Text Here',
        runMagicPasteLabel: 'Extract Recipe',
        prepTime: 'Prep Time',
        minutes: 'min',
        need: 'Need',
        inPantry: 'in pantry',
        fullyStocked: 'Fully Stocked / From Pantry',
        planningMode: 'Planning',
        cookingMode: 'Cooking',
        markAsCooked: 'Done!',
        completedToday: 'Finished Today',
        ingredientsDeducted: 'Ingredients removed from pantry',
        undo: 'Undo',
        undoSuccess: 'Action reverted',
        categories: { meat: 'Meat', dairy: 'Dairy', pareve: 'Pareve', dessert: 'Dessert', other: 'Other' },
        units: { kg: 'kg', grams: 'g', units: 'units', liters: 'L', cans: 'cans', packs: 'packs' }
    },
    he: {
        title: 'המזווה החכם',
        recipes: 'מתכונים',
        orders: 'הזמנות',
        inventory: 'מלאי',
        shopping: 'קניות',
        addRecipe: 'מתכון חדש',
        recipeName: 'שם המתכון',
        ingredientName: 'שם המרכיב',
        quantity: 'כמות',
        unit: 'יחידה',
        save: 'שמור שינויים',
        delete: 'מחק',
        edit: 'עריכת מתכון',
        calculate: 'חשב רשימת קניות',
        copyWhatsapp: 'שתף',
        emptyRecipes: 'אין מתכונים עדיין. לחץ על + להוספה!',
        emptyOrders: 'בחר מנות כדי לחשב רשימה.',
        emptyInventory: 'המלאי שלך ריק. הוסף מוצרים שיש לך בבית.',
        addIngredient: 'הוסף פריט',
        searchPlaceholder: 'חפש מתכון...',
        aiScan: 'סריקת תמונה',
        voiceAssistant: 'עוזר קולי',
        voiceActive: 'מקשיב...',
        aiScanning: 'סורק...',
        aiScanError: 'סריקת ה-AI נכשלה.',
        importMenuTitle: 'שיטות ייבוא',
        magicPasteLabel: 'הדבקת קסם AI',
        magicPasteSub: 'הדבק טקסט חופשי',
        importFileLabel: 'העלה CSV',
        importFileSub: 'ייבוא המוני',
        clearAllLabel: 'מחיקת ספרייה',
        clearAllSub: 'מחק את כל המתכונים',
        confirmClearAll: 'בטוח? זה ימחק את כל המתכונים לצמיתות.',
        magicPasteTitle: 'הדבקת קסם',
        pasteLabel: 'הדבק טקסט של מתכון',
        runMagicPasteLabel: 'חלץ מתכון',
        prepTime: 'זמן הכנה',
        minutes: 'דק\'',
        need: 'צריך',
        inPantry: 'במלאי',
        fullyStocked: 'קיים במלאי / לא דרוש קנייה',
        planningMode: 'תכנון',
        cookingMode: 'בישול',
        markAsCooked: 'מוכן!',
        completedToday: 'הוכנו היום',
        ingredientsDeducted: 'המרכיבים הופחתו מהמלאי',
        undo: 'בטל',
        undoSuccess: 'הפעולה בוטלה',
        categories: { meat: 'בשרי', dairy: 'חלבי', pareve: 'פרווה', dessert: 'קינוח', other: 'אחר' },
        units: { kg: 'ק"ג', grams: 'גרם', units: 'יחידות', liters: 'ליטר', cans: 'קופסאות', packs: 'חבילות' }
    }
};

const UNIT_OPTIONS = ['kg', 'grams', 'units', 'liters', 'cans', 'packs'];
const CATEGORY_OPTIONS = ['meat', 'dairy', 'pareve', 'dessert', 'other'];

let state = {
    lang: localStorage.getItem('smart_pantry_lang') || 'he',
    recipes: JSON.parse(localStorage.getItem('smart_pantry_recipes') || '[]'),
    orders: JSON.parse(localStorage.getItem('smart_pantry_orders') || '{}'),
    inventory: JSON.parse(localStorage.getItem('smart_pantry_inventory') || '[]'),
    activeTab: 'recipes',
    isCookingMode: false,
    completedToday: JSON.parse(localStorage.getItem('smart_pantry_completed') || '[]'),
    recipeSearch: '',
    checkedItems: new Set(),
    editingRecipeId: null as any,
    modalIngredients: [] as any[],
    modalCategory: 'other',
    modalImageUrl: null as string | null,
    isVoiceActive: false,
    voiceSession: null as any,
    inputAudioContext: null as any,
    outputAudioContext: null as any,
    nextStartTime: 0,
    sources: new Set() as Set<any>
};

const saveState = () => {
    localStorage.setItem('smart_pantry_recipes', JSON.stringify(state.recipes));
    localStorage.setItem('smart_pantry_orders', JSON.stringify(state.orders));
    localStorage.setItem('smart_pantry_inventory', JSON.stringify(state.inventory));
    localStorage.setItem('smart_pantry_completed', JSON.stringify(state.completedToday));
    localStorage.setItem('smart_pantry_lang', state.lang);
};

const t = () => TRANSLATIONS[state.lang];

// --- Audio ---
function encode(bytes: any) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}
function decode(base64: any) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}
async function decodeAudioData(data: any, ctx: any, sampleRate: any, numChannels: any) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
}

const render = () => {
    const trans = t();
    document.documentElement.lang = state.lang;
    document.body.dir = state.lang === 'he' ? 'rtl' : 'ltr';
    (document.getElementById('appTitle') as any).textContent = trans.title;
    (document.getElementById('langToggleLabel') as any).textContent = state.lang === 'en' ? '🇮🇱 HE' : '🇺🇸 EN';

    const titleContainer = document.getElementById('appTitleContainer');
    if (titleContainer) {
        const logoImg = titleContainer.querySelector('img');
        if (logoImg) logoImg.src = LOGO_DATA_URL;
    }

    ['recipes', 'orders', 'inventory', 'shopping'].forEach(id => {
        const btn = document.getElementById(`nav-${id}`) as any;
        if (btn) {
            btn.querySelector('.nav-label').textContent = trans[id];
            const active = state.activeTab === id;
            btn.classList.toggle('text-[#FF8A3D]', active);
            btn.querySelector('.nav-icon-bg').classList.toggle('active-tab-indicator', active);
        }
    });

    const main = document.getElementById('mainContent') as any;
    main.innerHTML = '';
    (document.getElementById('calculateBtnContainer') as any).classList.add('hidden');

    if (state.activeTab === 'recipes') renderRecipesTab(main, trans);
    else if (state.activeTab === 'orders') {
        renderOrdersTab(main, trans);
        if (state.recipes.length > 0) (document.getElementById('calculateBtnContainer') as any).classList.remove('hidden');
    }
    else if (state.activeTab === 'inventory') renderInventoryTab(main, trans);
    else if (state.activeTab === 'shopping') renderShoppingTab(main, trans);

    (window as any).lucide.createIcons();
};

const renderRecipesTab = (container: any, trans: any) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-3xl font-black">${trans.recipes}</h2>
            <div class="flex gap-2">
                <button id="importTrigger" class="bg-white border p-4 rounded-3xl shadow-sm"><i data-lucide="file-up"></i></button>
                <button id="addRecipeTrigger" class="bg-[#FF8A3D] text-white p-4 rounded-3xl shadow-xl"><i data-lucide="plus"></i></button>
            </div>
        </div>
        <div class="relative mb-10">
            <i data-lucide="search" class="absolute left-5 top-1/2 -translate-y-1/2 text-[#3D2B1F]/20 w-5 h-5"></i>
            <input type="text" id="recipeSearch" dir="auto" value="${state.recipeSearch}" placeholder="${trans.searchPlaceholder}" class="w-full bg-white rounded-[2rem] pl-14 pr-6 py-5 shadow-sm outline-none font-bold text-right-rtl" />
        </div>
        <div id="recipeGrid" class="grid grid-cols-1 gap-10"></div>
    `;

    const grid = document.getElementById('recipeGrid') as any;
    const list = state.recipes.filter((r: any) => r.name.toLowerCase().includes(state.recipeSearch.toLowerCase()));
    
    if (list.length === 0) {
        grid.innerHTML = `<div class="text-center py-24 opacity-20"><i data-lucide="chef-hat" class="mx-auto mb-4 w-20 h-20"></i><p>${trans.emptyRecipes}</p></div>`;
    } else {
        list.forEach((r: any) => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-[3.5rem] overflow-hidden shadow-xl border border-[#3D2B1F]/5 cursor-pointer active:scale-[0.98] transition-all group';
            card.onclick = () => openRecipeModal(r.id);
            
            const placeholderImg = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80&w=800";
            const imageUrl = r.imageUrl || placeholderImg;
            const categoryText = trans.categories[r.category] || trans.categories.other;
            
            card.innerHTML = `
                <div class="relative h-60 w-full overflow-hidden">
                    <img src="${imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                    <div class="absolute top-6 left-6 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase text-[#FF8A3D] shadow-sm tracking-widest">
                        ${categoryText}
                    </div>
                </div>
                <div class="p-8">
                    <h3 class="font-black text-2xl mb-4 text-[#3D2B1F]">${r.name}</h3>
                    <div class="flex items-center gap-6 text-[#3D2B1F]/40 text-xs font-bold">
                        <div class="flex items-center gap-2">
                            <i data-lucide="timer" class="w-4 h-4"></i>
                            <span>${r.prepTime || 0} ${trans.minutes}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i data-lucide="list" class="w-4 h-4"></i>
                            <span>${r.ingredients.length} items</span>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    document.getElementById('addRecipeTrigger')!.onclick = () => openRecipeModal();
    document.getElementById('importTrigger')!.onclick = () => document.getElementById('importMenu')!.classList.add('open');
    document.getElementById('recipeSearch')!.oninput = (e: any) => { state.recipeSearch = e.target.value; render(); };
};

const renderOrdersTab = (container: any, trans: any) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-3xl font-black">${trans.orders}</h2>
            <div class="flex bg-white/80 p-1 rounded-2xl shadow-sm border border-[#3D2B1F]/5 backdrop-blur-md">
                <button id="planningToggle" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${!state.isCookingMode ? 'bg-[#3D2B1F] text-white shadow-lg' : 'text-[#3D2B1F]/40'}">
                    <i data-lucide="clipboard-list" class="w-4 h-4"></i> ${trans.planningMode}
                </button>
                <button id="cookingToggle" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${state.isCookingMode ? 'bg-[#FF8A3D] text-white shadow-lg' : 'text-[#3D2B1F]/40'}">
                    <i data-lucide="flame" class="w-4 h-4"></i> ${trans.cookingMode}
                </button>
            </div>
        </div>
        <div id="ordersList" class="space-y-4 pb-40"></div>
    `;

    document.getElementById('planningToggle')!.onclick = () => { state.isCookingMode = false; render(); };
    document.getElementById('cookingToggle')!.onclick = () => { state.isCookingMode = true; render(); };

    const list = document.getElementById('ordersList') as any;
    
    if (!state.isCookingMode) {
        state.recipes.forEach((r: any) => {
            const qty = state.orders[r.id] || 0;
            const row = document.createElement('div');
            row.className = 'bg-white rounded-[2.5rem] p-5 shadow-sm flex items-center justify-between border border-[#3D2B1F]/5 animate-fade-in';
            row.innerHTML = `
                <span class="font-black text-xl truncate pr-4">${r.name}</span>
                <div class="flex items-center gap-3 bg-[#FEF9F3] p-1.5 rounded-[1.25rem]">
                    <button class="m-btn w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm"><i data-lucide="minus"></i></button>
                    <span class="w-6 text-center font-black">${qty}</span>
                    <button class="p-btn w-9 h-9 flex items-center justify-center bg-[#FF8A3D] text-white rounded-xl shadow-sm"><i data-lucide="plus"></i></button>
                </div>
            `;
            (row.querySelector('.m-btn') as any).onclick = () => { state.orders[r.id] = Math.max(0, (state.orders[r.id] || 0) - 1); saveState(); render(); };
            (row.querySelector('.p-btn') as any).onclick = () => { state.orders[r.id] = (state.orders[r.id] || 0) + 1; saveState(); render(); };
            list.appendChild(row);
        });
    } else {
        const activeOrders = Object.entries(state.orders).filter(([id, qty]) => (qty as number) > 0);
        
        if (activeOrders.length === 0 && state.completedToday.length === 0) {
            list.innerHTML = `<div class="text-center py-24 opacity-20"><i data-lucide="utensils" class="mx-auto mb-4 w-20 h-20"></i><p>${trans.emptyOrders}</p></div>`;
        } else {
            activeOrders.forEach(([id, qty]: [string, any]) => {
                const r = state.recipes.find(rcp => String(rcp.id) === String(id));
                if (!r) return;
                
                for(let i=1; i <= qty; i++) {
                    const row = document.createElement('div');
                    row.className = 'bg-white rounded-[2.5rem] p-6 shadow-sm border-l-4 border-[#FF8A3D] flex items-center justify-between animate-fade-in mb-4';
                    row.innerHTML = `
                        <div class="flex flex-col">
                            <span class="font-black text-xl text-[#3D2B1F]">${r.name}</span>
                            <span class="text-[10px] font-bold text-[#FF8A3D] uppercase tracking-widest">${i} / ${qty}</span>
                        </div>
                        <button class="done-btn bg-[#3D2B1F] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-90 transition-all flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4"></i> ${trans.markAsCooked}
                        </button>
                    `;
                    (row.querySelector('.done-btn') as any).onclick = () => handleMarkAsCooked(id);
                    list.appendChild(row);
                }
            });

            if (state.completedToday.length > 0) {
                const completedHeader = document.createElement('div');
                completedHeader.className = 'pt-8 pb-4 text-center';
                completedHeader.innerHTML = `<h3 class="text-[10px] font-black uppercase text-[#3D2B1F]/30 tracking-widest">${trans.completedToday}</h3>`;
                list.appendChild(completedHeader);

                state.completedToday.forEach((item: any) => {
                    const r = state.recipes.find(rcp => String(rcp.id) === String(item.recipeId));
                    const row = document.createElement('div');
                    row.className = 'bg-white/40 p-4 rounded-2xl flex items-center justify-between border border-dashed border-[#3D2B1F]/10 opacity-60 mb-2';
                    row.innerHTML = `
                        <div class="flex items-center gap-4">
                            <i data-lucide="check-circle-2" class="text-green-500 w-4 h-4"></i>
                            <span class="font-bold line-through text-sm">${r?.name || '---'}</span>
                        </div>
                        <button class="undo-btn text-[10px] font-black uppercase text-[#FF8A3D] flex items-center gap-1">
                            <i data-lucide="rotate-ccw" class="w-3 h-3"></i> ${trans.undo}
                        </button>
                    `;
                    (row.querySelector('.undo-btn') as any).onclick = () => handleUndoCooked(item.id);
                    list.appendChild(row);
                });
            }
        }
    }
    
    (document.getElementById('calculateBtnLabel') as any).textContent = trans.calculate;
    document.getElementById('calculateBtn')!.onclick = () => { state.activeTab = 'shopping'; render(); };
};

const handleMarkAsCooked = (recipeId: string) => {
    const r = state.recipes.find(rcp => String(rcp.id) === String(recipeId));
    const qty = state.orders[recipeId] || 0;
    if (!r || qty <= 0) return;

    r.ingredients.forEach(needed => {
        const inventoryItem = state.inventory.find((inv: any) => 
            inv.name.toLowerCase().trim() === needed.name.toLowerCase().trim() && 
            inv.unit === needed.unit
        );
        if (inventoryItem) {
            inventoryItem.quantity = Math.max(0, inventoryItem.quantity - needed.quantity);
        }
    });

    state.completedToday.unshift({
        id: Date.now().toString() + Math.random(),
        recipeId: recipeId,
        timestamp: Date.now()
    });
    state.orders[recipeId] = Math.max(0, state.orders[recipeId] - 1);
    
    showToast(t().ingredientsDeducted);
    saveState();
    render();
};

const handleUndoCooked = (completedId: string) => {
    const itemIndex = state.completedToday.findIndex((i: any) => i.id === completedId);
    if (itemIndex === -1) return;
    
    const item = state.completedToday[itemIndex];
    const r = state.recipes.find(rcp => String(rcp.id) === String(item.recipeId));
    
    if (r) {
        r.ingredients.forEach(needed => {
            const inventoryItem = state.inventory.find((inv: any) => 
                inv.name.toLowerCase().trim() === needed.name.toLowerCase().trim() && 
                inv.unit === needed.unit
            );
            if (inventoryItem) {
                inventoryItem.quantity = inventoryItem.quantity + needed.quantity;
            } else {
                state.inventory.push({
                    id: Date.now().toString() + Math.random(),
                    name: needed.name,
                    quantity: needed.quantity,
                    unit: needed.unit
                });
            }
        });
        state.orders[item.recipeId] = (state.orders[item.recipeId] || 0) + 1;
    }

    state.completedToday.splice(itemIndex, 1);
    showToast(t().undoSuccess);
    saveState();
    render();
};

const showToast = (msg: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-[#3D2B1F] text-[#FF8A3D] px-6 py-3 rounded-full shadow-2xl font-black text-xs animate-fade-in flex items-center gap-3';
    toast.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4"></i> ${msg}`;
    document.body.appendChild(toast);
    (window as any).lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

const renderInventoryTab = (container: any, trans: any) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-3xl font-black">${trans.inventory}</h2>
            <button id="addInventoryBtn" class="bg-[#FF8A3D] text-white px-5 py-3 rounded-2xl font-black text-xs uppercase shadow-lg flex items-center gap-2">
                <i data-lucide="plus" class="w-4 h-4"></i> ${trans.addIngredient}
            </button>
        </div>
        <div id="inventoryList" class="space-y-4 pb-40"></div>
    `;

    const list = document.getElementById('inventoryList') as any;
    if (state.inventory.length === 0) {
        list.innerHTML = `<div class="text-center py-24 opacity-20"><i data-lucide="archive" class="mx-auto mb-4 w-20 h-20"></i><p>${trans.emptyInventory}</p></div>`;
    } else {
        state.inventory.forEach((ing: any, i: number) => {
            const el = document.createElement('div');
            el.className = 'bg-white rounded-[2rem] p-5 shadow-sm space-y-4 border border-[#3D2B1F]/5 animate-fade-in relative';
            el.innerHTML = `
                <button class="del-inv absolute top-4 right-4 text-red-300"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                <input type="text" dir="auto" value="${ing.name}" placeholder="${trans.ingredientName}" class="nm-inv w-full bg-[#FEF9F3] rounded-xl px-4 py-2 text-sm font-bold outline-none text-right-rtl" />
                <div class="flex gap-3">
                    <input type="number" step="any" value="${ing.quantity}" class="qty-inv w-24 bg-[#FEF9F3] rounded-xl px-4 py-2 text-sm font-bold outline-none" />
                    <select class="ut-inv flex-1 bg-[#FEF9F3] rounded-xl px-4 py-2 text-sm font-bold outline-none">
                        ${UNIT_OPTIONS.map(u => `<option value="${u}" ${ing.unit === u ? 'selected' : ''}>${trans.units[u]}</option>`).join('')}
                    </select>
                </div>
            `;
            list.appendChild(el);
            (el.querySelector('.nm-inv') as any).oninput = (e: any) => { state.inventory[i].name = e.target.value; saveState(); };
            (el.querySelector('.qty-inv') as any).oninput = (e: any) => { state.inventory[i].quantity = parseFloat(e.target.value) || 0; saveState(); };
            (el.querySelector('.ut-inv') as any).onchange = (e: any) => { state.inventory[i].unit = e.target.value; saveState(); };
            (el.querySelector('.del-inv') as any).onclick = () => { state.inventory.splice(i, 1); saveState(); render(); };
        });
    }

    document.getElementById('addInventoryBtn')!.onclick = () => {
        state.inventory.push({ id: Date.now().toString() + Math.random(), name: '', quantity: 0, unit: 'kg' });
        saveState();
        render();
    };
};

const renderShoppingTab = (container: any, trans: any) => {
    const calculated = calculateSmartAggregated();
    const toBuy = calculated.filter(i => i.netToBuy > 0);
    const stocked = calculated.filter(i => i.netToBuy <= 0);

    container.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-black">${trans.shopping}</h2>
            ${toBuy.length ? `<button id="whatsapp" class="bg-[#25D366] text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase shadow-lg">${trans.copyWhatsapp}</button>` : ''}
        </div>
        <div id="shoppingList" class="space-y-8 pb-40"></div>
    `;

    const shopList = document.getElementById('shoppingList') as any;
    if (calculated.length === 0) {
        shopList.innerHTML = `<p class="text-center opacity-20 py-20">${trans.emptyOrders}</p>`;
        return;
    }

    if (toBuy.length > 0) {
        const buyBox = document.createElement('div');
        buyBox.className = 'bg-white rounded-[3rem] shadow-sm divide-y divide-[#3D2B1F]/5 overflow-hidden border border-[#3D2B1F]/5';
        toBuy.forEach((item: any) => {
            const key = `buy_${item.name}_${item.unit}`;
            const done = state.checkedItems.has(key);
            const el = document.createElement('div');
            el.className = `flex items-center justify-between p-7 cursor-pointer transition-colors ${done ? 'bg-gray-50' : 'bg-white'}`;
            el.innerHTML = `
                <div class="flex items-center gap-5">
                    <i data-lucide="${done ? 'check-circle-2' : 'circle'}" class="${done ? 'text-[#FF8A3D]' : 'text-[#3D2B1F]/10'} w-7 h-7"></i>
                    <div class="flex flex-col">
                        <span class="font-bold text-xl ${done ? 'line-through text-[#3D2B1F]/30' : ''}">${item.name}</span>
                        <span class="text-[10px] text-[#3D2B1F]/40 font-black uppercase tracking-wider">
                            ${trans.need} ${item.totalNeeded} ${trans.units[item.unit]} 
                            ${item.inPantry > 0 ? `(-${item.inPantry} ${trans.inPantry})` : ''}
                        </span>
                    </div>
                </div>
                <span class="font-black text-xl ${done ? 'text-[#FF8A3D]/30' : 'text-[#FF8A3D]'}">${item.netToBuy} ${trans.units[item.unit]}</span>
            `;
            el.onclick = () => { 
                if (state.checkedItems.has(key)) state.checkedItems.delete(key); 
                else state.checkedItems.add(key); 
                render(); 
            };
            buyBox.appendChild(el);
        });
        shopList.appendChild(buyBox);
    }

    if (stocked.length > 0) {
        const stockedHeader = document.createElement('h3');
        stockedHeader.className = 'text-xs font-black uppercase tracking-widest text-[#3D2B1F]/40 px-4 mb-[-1rem]';
        stockedHeader.textContent = trans.fullyStocked;
        shopList.appendChild(stockedHeader);

        const stockBox = document.createElement('div');
        stockBox.className = 'bg-white/50 rounded-[3rem] shadow-sm divide-y divide-[#3D2B1F]/5 overflow-hidden border border-[#3D2B1F]/5 opacity-60';
        stocked.forEach((item: any) => {
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between p-7 grayscale';
            el.innerHTML = `
                <div class="flex items-center gap-5">
                    <i data-lucide="check-circle-2" class="text-[#3D2B1F]/20 w-7 h-7"></i>
                    <div class="flex flex-col">
                        <span class="font-bold text-xl line-through text-[#3D2B1F]/30">${item.name}</span>
                        <span class="text-[10px] text-[#3D2B1F]/40 font-black uppercase tracking-wider">
                            ${trans.need} ${item.totalNeeded} ${trans.units[item.unit]} (${trans.inPantry}: ${item.inPantry} ${trans.units[item.unit]})
                        </span>
                    </div>
                </div>
                <span class="font-black text-xl text-[#3D2B1F]/20">0 ${trans.units[item.unit]}</span>
            `;
            stockBox.appendChild(el);
        });
        shopList.appendChild(stockBox);
    }

    if(document.getElementById('whatsapp')) {
        document.getElementById('whatsapp')!.onclick = () => {
            let msg = `🛒 *${t().shopping}*\n\n`;
            toBuy.forEach((i: any) => msg += `• ${i.name}: *${i.netToBuy} ${trans.units[i.unit]}*\n`);
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
        };
    }
};

const calculateSmartAggregated = () => {
    const totals: any = {};
    Object.entries(state.orders).forEach(([id, qty]) => {
        const r = state.recipes.find((rcp: any) => String(rcp.id) === String(id));
        if (!r || (qty as number) <= 0) return;
        r.ingredients.forEach((ing: any) => {
            const key = `${ing.name.toLowerCase().trim()}_${ing.unit}`;
            if (totals[key]) {
                totals[key].totalNeeded += ing.quantity * (qty as number);
            } else {
                totals[key] = { name: ing.name.trim(), totalNeeded: ing.quantity * (qty as number), unit: ing.unit };
            }
        });
    });

    return Object.values(totals).map((item: any) => {
        const inventoryItem = state.inventory.find((inv: any) => 
            inv.name.toLowerCase().trim() === item.name.toLowerCase().trim() && 
            inv.unit === item.unit
        );
        const inPantry = inventoryItem ? inventoryItem.quantity : 0;
        const netToBuy = Math.max(0, item.totalNeeded - inPantry);
        return { ...item, inPantry, netToBuy };
    });
};

// --- Modals ---
const openRecipeModal = (id = null as any, prefill = null as any) => {
    state.editingRecipeId = id;
    const r = id ? state.recipes.find((i: any) => String(i.id) === String(id)) : prefill;
    
    (document.getElementById('modalTitle') as any).textContent = id ? t().edit : t().addRecipe;
    (document.getElementById('recipeNameInput') as any).value = r ? r.name : '';
    state.modalIngredients = r ? JSON.parse(JSON.stringify(r.ingredients)) : [{ id: Date.now().toString(), name: '', quantity: 1, unit: 'kg' }];
    state.modalCategory = r?.category || 'other';
    state.modalImageUrl = r?.imageUrl || null;
    
    let extraFields = document.getElementById('extraFields') as any;
    if (!extraFields) {
        extraFields = document.createElement('div');
        extraFields.id = 'extraFields';
        extraFields.className = 'space-y-6';
        const recipeNameInput = document.getElementById('recipeNameInput') as any;
        recipeNameInput.parentNode.appendChild(extraFields);
    }
    
    extraFields.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
                <label class="text-[10px] font-black uppercase text-[#3D2B1F]/40 tracking-widest">${t().prepTime} (${t().minutes})</label>
                <input type="number" id="prepTimeInput" value="${r?.prepTime || ''}" class="w-full bg-white rounded-2xl p-4 text-sm font-bold border-none shadow-sm outline-none" />
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black uppercase text-[#3D2B1F]/40 tracking-widest">Category</label>
                <select id="categoryInput" class="w-full bg-white rounded-2xl p-4 text-sm font-bold border-none shadow-sm outline-none">
                    ${CATEGORY_OPTIONS.map(opt => `<option value="${opt}" ${state.modalCategory === opt ? 'selected' : ''}>${t().categories[opt]}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="space-y-2">
            <label class="text-[10px] font-black uppercase text-[#3D2B1F]/40 tracking-widest">Image URL (optional)</label>
            <input type="url" id="imageUrlInput" value="${state.modalImageUrl || ''}" placeholder="https://..." class="w-full bg-white rounded-2xl p-4 text-sm font-bold border-none shadow-sm outline-none" />
        </div>
    `;
    
    document.getElementById('deleteRecipeBtn')!.classList.toggle('hidden', !id);
    renderModalIngs();
    document.getElementById('recipeModal')!.classList.add('open');
};

const renderModalIngs = () => {
    const list = document.getElementById('ingredientsList') as any;
    list.innerHTML = '';
    state.modalIngredients.forEach((ing, i) => {
        const el = document.createElement('div');
        el.className = 'bg-white rounded-3xl p-5 shadow-sm space-y-4 relative border border-[#3D2B1F]/5 animate-fade-in';
        el.innerHTML = `
            <button type="button" class="del absolute top-3 right-3 text-red-300"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            <input type="text" dir="auto" value="${ing.name}" placeholder="${t().ingredientName}" class="nm w-full bg-[#FEF9F3] rounded-2xl px-5 py-3 text-sm font-bold outline-none text-right-rtl" />
            <div class="flex gap-3">
                <input type="number" step="any" value="${ing.quantity}" class="qty w-28 bg-[#FEF9F3] rounded-2xl px-5 py-3 text-sm font-bold outline-none" />
                <select class="ut flex-1 bg-[#FEF9F3] rounded-2xl px-5 py-3 text-sm font-bold outline-none">
                    ${UNIT_OPTIONS.map(u => `<option value="${u}" ${ing.unit === u ? 'selected' : ''}>${t().units[u]}</option>`).join('')}
                </select>
            </div>
        `;
        list.appendChild(el);
        (el.querySelector('.nm') as any).oninput = (e: any) => state.modalIngredients[i].name = e.target.value;
        (el.querySelector('.qty') as any).oninput = (e: any) => state.modalIngredients[i].quantity = parseFloat(e.target.value) || 0;
        (el.querySelector('.ut') as any).onchange = (e: any) => state.modalIngredients[i].unit = e.target.value;
        (el.querySelector('.del') as any).onclick = () => { state.modalIngredients.splice(i, 1); renderModalIngs(); };
    });
    (window as any).lucide.createIcons();
};

// --- AI (Photo & Voice & Magic Paste) ---
const handleMagicPaste = async () => {
    const text = (document.getElementById('magicPasteArea') as any).value;
    if (!text.trim()) return;
    
    document.getElementById('aiScanningOverlay')!.classList.remove('hidden');
    (document.getElementById('aiScanningText') as any).textContent = t().aiScanning;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: `TASK: Extract the following recipe text into a structured JSON object. 
            Identify the recipe name and all ingredients with their quantities and units.
            Normalize units to: grams, kg, units, liters, cans, packs. 
            If the text is in Hebrew, translate the values to English.
            RECIPE TEXT: ${text}` }] },
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.OBJECT, 
                    properties: { 
                        name: { type: Type.STRING }, 
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
                    required: ["name", "ingredients"]
                } 
            }
        });
        
        const res = JSON.parse(response.text.trim());
        // Add required client-side IDs
        res.ingredients = res.ingredients.map((ing: any) => ({
            ...ing,
            id: Date.now().toString() + Math.random(),
            unit: (UNIT_OPTIONS.includes(ing.unit?.toLowerCase()) ? ing.unit.toLowerCase() : 'kg')
        }));

        document.getElementById('magicPasteModal')!.classList.remove('open');
        openRecipeModal(null, res);
    } catch (e) { 
        console.error(e);
        alert(t().aiScanError); 
    } finally { 
        document.getElementById('aiScanningOverlay')!.classList.add('hidden'); 
    }
};

const handlePhotoScan = async (base64Image: string) => {
    document.getElementById('aiScanningOverlay')!.classList.remove('hidden');
    (document.getElementById('aiScanningText') as any).textContent = t().aiScanning;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts = base64Image.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const data = parts[1];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { 
                parts: [
                    { inlineData: { mimeType, data } },
                    { text: `TASK: Extract the recipe from this image. Identify the name and ingredients. Normalize units. Translate to ${state.lang === 'he' ? 'Hebrew' : 'English'}.` }
                ] 
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
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
                    required: ["name", "ingredients"]
                }
            }
        });

        const res = JSON.parse(response.text.trim());
        res.ingredients = res.ingredients.map((ing: any) => ({
            ...ing,
            id: Date.now().toString() + Math.random(),
            unit: (UNIT_OPTIONS.includes(ing.unit?.toLowerCase()) ? ing.unit.toLowerCase() : 'kg')
        }));
        
        // Directly update modal fields
        (document.getElementById('recipeNameInput') as any).value = res.name;
        state.modalIngredients = res.ingredients;
        renderModalIngs();
        
    } catch (error) {
        console.error(error);
        alert(t().aiScanError);
    } finally {
        document.getElementById('aiScanningOverlay')!.classList.add('hidden');
    }
};

const startVoice = async () => {
    if (state.isVoiceActive) { stopVoice(); return; }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    state.isVoiceActive = true;
    state.inputAudioContext = new AudioContext({ sampleRate: 16000 });
    state.outputAudioContext = new AudioContext({ sampleRate: 24000 });
    const outputNode = state.outputAudioContext.createGain(); outputNode.connect(state.outputAudioContext.destination);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    document.getElementById('voiceAssistantBtn')!.classList.add('voice-active');
    (document.getElementById('voiceAssistantBtnLabel') as any).textContent = t().voiceActive;

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
            onopen: () => {
                const source = state.inputAudioContext.createMediaStreamSource(stream);
                const proc = state.inputAudioContext.createScriptProcessor(4096, 1, 1);
                proc.onaudioprocess = (e: any) => {
                    if (!state.isVoiceActive) return;
                    const l = e.inputBuffer.getChannelData(0);
                    const int16 = new Int16Array(l.length);
                    for(let i=0; i<l.length; i++) int16[i] = l[i] * 32768;
                    sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
                };
                source.connect(proc); proc.connect(state.inputAudioContext.destination);
            },
            onmessage: async (msg: any) => {
                const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    state.nextStartTime = Math.max(state.nextStartTime, state.outputAudioContext.currentTime);
                    const buffer = await decodeAudioData(decode(base64Audio), state.outputAudioContext, 24000, 1);
                    const src = state.outputAudioContext.createBufferSource();
                    src.buffer = buffer; src.connect(outputNode); src.start(state.nextStartTime);
                    state.nextStartTime += buffer.duration;
                    state.sources.add(src); src.onended = () => state.sources.delete(src);
                }
                if (msg.toolCall) {
                    for (const fc of msg.toolCall.functionCalls) {
                        if (fc.name === 'update_recipe_fields') {
                            if (fc.args.name) (document.getElementById('recipeNameInput') as any).value = fc.args.name;
                            if (fc.args.ingredients) {
                                state.modalIngredients = fc.args.ingredients.map((ing: any) => ({ id: Date.now() + Math.random(), name: ing.name || '', quantity: ing.quantity || 1, unit: ing.unit || 'kg' }));
                                renderModalIngs();
                            }
                            sessionPromise.then(s => s.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "ok" } }] }));
                        }
                    }
                }
            },
            onclose: () => stopVoice()
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            tools: [{ functionDeclarations: [{ name: 'update_recipe_fields', parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, ingredients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.NUMBER }, unit: { type: Type.STRING } } } } } } }] }],
            systemInstruction: `You are a helpful kitchen assistant. Help the user fill out the recipe form. Use update_recipe_fields tool.`
        }
    });
    state.voiceSession = sessionPromise;
};

const stopVoice = () => {
    if (state.voiceSession) state.voiceSession.then((s: any) => s.close());
    if (state.inputAudioContext) state.inputAudioContext.close();
    if (state.outputAudioContext) state.outputAudioContext.close();
    state.isVoiceActive = false;
    document.getElementById('voiceAssistantBtn')!.classList.remove('voice-active');
    (document.getElementById('voiceAssistantBtnLabel') as any).textContent = t().voiceAssistant;
};

// --- Initialization & Events ---
document.getElementById('langToggle')!.onclick = () => { state.lang = state.lang === 'en' ? 'he' : 'en'; saveState(); render(); };
['recipes', 'orders', 'inventory', 'shopping'].forEach(id => {
    const btn = document.getElementById(`nav-${id}`);
    if (btn) btn.onclick = () => { state.activeTab = id; render(); };
});

document.getElementById('closeModalBtn')!.onclick = () => { stopVoice(); document.getElementById('recipeModal')!.classList.remove('open'); };
document.getElementById('addIngredientBtn')!.onclick = () => { state.modalIngredients.push({ id: Date.now().toString() + Math.random(), name: '', quantity: 1, unit: 'kg' }); renderModalIngs(); };
document.getElementById('voiceAssistantBtn')!.onclick = startVoice;
document.getElementById('runMagicPasteBtn')!.onclick = handleMagicPaste;

document.getElementById('aiScanBtn')!.onclick = () => document.getElementById('aiFileInput')!.click();
document.getElementById('aiFileInput')!.onchange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handlePhotoScan(reader.result as string);
    reader.readAsDataURL(file);
};

document.getElementById('recipeForm')!.onsubmit = (e) => {
    e.preventDefault();
    const payload = {
        id: state.editingRecipeId || Date.now().toString(),
        name: (document.getElementById('recipeNameInput') as any).value,
        category: (document.getElementById('categoryInput') as any).value,
        prepTime: parseInt((document.getElementById('prepTimeInput') as any).value) || 0,
        imageUrl: (document.getElementById('imageUrlInput') as any).value || null,
        ingredients: state.modalIngredients.filter(i => i.name.trim() !== '')
    };
    if (state.editingRecipeId) state.recipes = state.recipes.map((i: any) => String(i.id) === String(state.editingRecipeId) ? payload : i);
    else state.recipes.push(payload);
    saveState();
    document.getElementById('recipeModal')!.classList.remove('open');
    render();
};

document.getElementById('deleteRecipeBtn')!.onclick = () => {
    if (confirm(t().delete + '?')) {
        state.recipes = state.recipes.filter((i: any) => String(i.id) !== String(state.editingRecipeId));
        delete state.orders[state.editingRecipeId];
        saveState();
        document.getElementById('recipeModal')!.classList.remove('open');
        render();
    }
};

document.getElementById('clearAllRecipesBtn')!.onclick = () => {
    if (confirm(t().confirmClearAll)) {
        state.recipes = []; state.orders = {}; saveState();
        document.getElementById('importMenu')!.classList.remove('open');
        render();
    }
};

document.getElementById('magicPasteBtn')!.onclick = () => {
    document.getElementById('importMenu')!.classList.remove('open');
    document.getElementById('magicPasteModal')!.classList.add('open');
};
document.getElementById('closeMagicPasteBtn')!.onclick = () => document.getElementById('magicPasteModal')!.classList.remove('open');
document.getElementById('closeImportMenu')!.onclick = () => document.getElementById('importMenu')!.classList.remove('open');

render();
