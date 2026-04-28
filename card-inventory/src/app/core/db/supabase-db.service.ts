import { Injectable } from '@angular/core';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { InventoryCard } from '../../models';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupabaseDbService {
  constructor(private authService: SupabaseAuthService) {}

  getInventory$(): Observable<InventoryCard[]> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.authService.getCurrentUser();

    if (!user) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const inventorySubject = new BehaviorSubject<InventoryCard[]>([]);

    // Initial fetch
    supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          inventorySubject.next(
            data.map((row: any) => ({
              cardId: row.card_id,
              cardName: row.card_name,
              game: row.game,
              quantity: row.quantity,
              purchasePrice: row.purchase_price,
              currentPrice: row.current_price,
              imageUrl: row.image_url,
            }))
          );
        }
      });

    // Set up real-time listener
    const subscription = supabase
      .channel('inventory-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newCard: InventoryCard = {
              cardId: payload.new.card_id,
              cardName: payload.new.card_name,
              game: payload.new.game,
              quantity: payload.new.quantity,
              purchasePrice: payload.new.purchase_price,
              currentPrice: payload.new.current_price,
              imageUrl: payload.new.image_url,
            };

            const current = inventorySubject.value;
            const index = current.findIndex((c) => c.cardId === newCard.cardId);
            if (index >= 0) {
              current[index] = newCard;
            } else {
              current.push(newCard);
            }
            inventorySubject.next([...current]);
          } else if (payload.eventType === 'DELETE') {
            const current = inventorySubject.value;
            inventorySubject.next(
              current.filter((c) => c.cardId !== payload.old.card_id)
            );
          }
        }
      )
      .subscribe();

    return inventorySubject.asObservable();
  }

  async addCardToInventory(cardData: InventoryCard): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.authService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase.from('inventory').insert([
      {
        user_id: user.id,
        card_id: cardData.cardId,
        card_name: cardData.cardName,
        game: cardData.game,
        quantity: cardData.quantity,
        purchase_price: cardData.purchasePrice,
        current_price: cardData.currentPrice,
        image_url: cardData.imageUrl,
      },
    ]);

    if (error) {
      throw error;
    }
  }

  async updateCard(
    cardId: string,
    updates: Partial<InventoryCard>
  ): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.authService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('inventory')
      .update({
        quantity: updates.quantity,
        purchase_price: updates.purchasePrice,
        current_price: updates.currentPrice,
      })
      .eq('card_id', cardId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.authService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('card_id', cardId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }
  }
}
