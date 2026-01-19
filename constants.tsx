
import { Translation } from './types';

export const TRANSLATIONS: Record<'en' | 'he', Translation> = {
  en: {
    title: 'The Smart Pantry',
    recipes: 'Recipes',
    orders: 'Orders',
    shopping: 'Shopping',
    addRecipe: 'Add Recipe',
    recipeName: 'Recipe Name',
    ingredientName: 'Ingredient Name',
    quantity: 'Qty',
    unit: 'Unit',
    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    calculate: 'Calculate List',
    totalItems: 'Total Items',
    exportCsv: 'Export to Sheets',
    copyWhatsapp: 'Copy to WhatsApp',
    emptyRecipes: 'No recipes yet. Tap + to add one!',
    emptyOrders: 'Set quantities for your daily orders.',
    addIngredient: 'Add Ingredient',
    recipeImage: 'Recipe Image',
    tapToUpload: 'Tap to upload photo',
    sortIngredients: 'Sort A-Z',
    searchPlaceholder: 'Search recipes...',
    allCategories: 'All',
    category: 'Category',
    aiScan: 'Scan Recipe (AI)',
    aiScanning: 'Analyzing recipe image...',
    aiScanError: 'Could not read recipe. Please try a clearer photo.',
    categories: {
      meat: 'Meat',
      dairy: 'Dairy',
      pareve: 'Pareve',
      dessert: 'Dessert',
      other: 'Other'
    },
    units: {
      grams: 'grams',
      kg: 'kg',
      units: 'units',
      liters: 'liters',
      cans: 'cans',
      packs: 'packs'
    }
  },
  he: {
    title: 'המזווה החכם',
    recipes: 'מתכונים',
    orders: 'הזמנות',
    shopping: 'קניות',
    addRecipe: 'הוסף מתכון',
    recipeName: 'שם המתכון',
    ingredientName: 'שם המרכיב',
    quantity: 'כמות',
    unit: 'יחידה',
    save: 'שמור שינויים',
    cancel: 'ביטול',
    delete: 'מחק',
    edit: 'ערוך',
    calculate: 'חשב רשימה',
    totalItems: 'סה"כ פריטים',
    exportCsv: 'ייצא לגוגל שיטס',
    copyWhatsapp: 'העתק לוואטסאפ',
    emptyRecipes: 'אין מתכונים עדיין. לחץ על + להוספה!',
    emptyOrders: 'קבע כמויות להזמנות היומיות שלך.',
    addIngredient: 'הוסף מרכיב',
    recipeImage: 'תמונת המנה',
    tapToUpload: 'לחץ להעלאת תמונה',
    sortIngredients: 'מיין א-ב',
    searchPlaceholder: 'חיפוש מתכונים...',
    allCategories: 'הכל',
    category: 'קטגוריה',
    aiScan: 'סרוק מתכון (AI)',
    aiScanning: 'מנתח את התמונה...',
    aiScanError: 'לא הצלחתי לקרוא את המתכון. נסה תמונה ברורה יותר.',
    categories: {
      meat: 'בשרי',
      dairy: 'חלבי',
      pareve: 'פרווה',
      dessert: 'קינוח',
      other: 'אחר'
    },
    units: {
      grams: 'גרם',
      kg: 'ק"ג',
      units: 'יחידות',
      liters: 'ליטר',
      cans: 'קופסאות',
      packs: 'חבילות'
    }
  }
};

export const UNIT_OPTIONS: string[] = ['grams', 'kg', 'units', 'liters', 'cans', 'packs'];
export const CATEGORY_OPTIONS = ['meat', 'dairy', 'pareve', 'dessert', 'other'] as const;
