import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collectionData,
  setDoc,
  CollectionReference,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { InventoryCard } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  getInventory$(userId: string): Observable<InventoryCard[]> {
    const inventoryRef = collection(
      this.firestore,
      `users/${userId}/inventory`
    ) as CollectionReference<InventoryCard>;
    return collectionData<InventoryCard>(inventoryRef, {
      idField: 'cardId',
    });
  }

  addCardToInventory(
    userId: string,
    cardData: InventoryCard
  ): Promise<void> {
    const inventoryRef = collection(
      this.firestore,
      `users/${userId}/inventory`
    );
    const docRef = doc(inventoryRef, cardData.cardId);
    return setDoc(docRef, {
      ...cardData,
      dateAdded: new Date(),
      priceLastFetched: new Date(),
    });
  }

  updateCard(userId: string, cardId: string, updates: Partial<InventoryCard>): Promise<void> {
    const cardRef = doc(
      this.firestore,
      `users/${userId}/inventory/${cardId}`
    );
    return updateDoc(cardRef, updates);
  }

  deleteCard(userId: string, cardId: string): Promise<void> {
    const cardRef = doc(
      this.firestore,
      `users/${userId}/inventory/${cardId}`
    );
    return deleteDoc(cardRef);
  }
}
