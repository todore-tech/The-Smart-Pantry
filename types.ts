
export type Unit = 'grams' | 'kg' | 'units' | 'liters' | 'cans' | 'packs';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  ingredients: Ingredient[];
  imageUrl?: string;
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
}

export interface Order {
  [recipeId: string]: number;
}

export type Language = 'en' | 'he';

export interface Translation {
  title: string;
  recipes: string;
  orders: string;
  shopping: string;
  addRecipe: string;
  recipeName: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  calculate: string;
  totalItems: string;
  exportCsv: string;
  copyWhatsapp: string;
  emptyRecipes: string;
  emptyOrders: string;
  addIngredient: string;
  recipeImage: string;
  tapToUpload: string;
  sortIngredients: string;
  searchPlaceholder: string;
  allCategories: string;
  category: string;
  aiScan: string;
  aiScanning: string;
  aiScanError: string;
  prepTime: string;
  cookTime: string;
  minutes: string;
  categories: {
    meat: string;
    dairy: string;
    pareve: string;
    dessert: string;
    other: string;
  };
  units: {
    grams: string;
    kg: string;
    units: string;
    liters: string;
    cans: string;
    packs: string;
  }
}
