export interface User {
  uid: string;
  email: string;
  createdAt: any; // Firestore timestamp
}

export interface JustTCGCardVariant {
  id: string;
  condition: string;
  printing?: string;
  price?: number;
}

export interface JustTCGCard {
  id: string;
  name: string;
  game: string;
  imageUrl?: string;
  variants: JustTCGCardVariant[];
  set_name?: string;
  cardNumber?: string;
  set?: string;
}

export interface InventoryCard {
  cardId: string;
  game: string;
  cardName: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  imageUrl?: string;
}
