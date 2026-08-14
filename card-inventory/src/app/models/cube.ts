export interface Cube {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CubeCard {
  id: string;
  cubeId: string;
  cardId: string;
  cardName: string;
  imageUrl?: string;
  setName?: string;
  cardNumber?: string;
  addedAt: string;
}

export interface CubeParticipant {
  id: string;
  cubeId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'declined';
  joinedAt: string;
}

export interface PendingInvitation {
  id: string;
  cubeId: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

// Frontend-only drafting settings (not stored in database)
export interface CubeDraftingSettings {
  maxParticipants: number;
  packsPerPerson: number;
  minCardsToDraft: number;
}

export const DEFAULT_DRAFTING_SETTINGS: CubeDraftingSettings = {
  maxParticipants: 8,
  packsPerPerson: 2,
  minCardsToDraft: 50
};