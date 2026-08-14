import { Injectable } from '@angular/core';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { InventoryCard, Cube, CubeCard, CubeParticipant } from '../../models';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupabaseDbService {
  constructor(private authService: SupabaseAuthService) {}

  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  getInventory$(): Observable<InventoryCard[]> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

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
    const user = this.getCurrentUser();

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
    const user = this.getCurrentUser();

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
    const user = this.getCurrentUser();

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

  // Cube CRUD Operations

  async createCube(name: string, description?: string): Promise<Cube> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('cubes')
      .insert([
        {
          owner_id: user.id,
          name,
          description,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      ownerId: data.owner_id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  getUserCubes$(): Observable<Cube[]> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const cubesSubject = new BehaviorSubject<Cube[]>([]);

    // Initial fetch - get cubes owned by user and cubes they participate in
    supabase
      .from('cubes')
      .select('*')
      .or(`owner_id.eq.${user.id},id.in.(select cube_id from cube_participants where user_id.eq.${user.id} and status.eq.accepted)`)
      .then(({ data, error }) => {
        if (!error && data) {
          cubesSubject.next(
            data.map((row: any) => ({
              id: row.id,
              ownerId: row.owner_id,
              name: row.name,
              description: row.description,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }))
          );
        }
      });

    // Set up real-time listener
    const subscription = supabase
      .channel('cubes-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cubes',
        },
        (payload: any) => {
          const cubeData = payload.new || payload.old;
          const isOwner = cubeData.owner_id === user.id;
          
          // Check if user is owner or participant
          supabase
            .from('cube_participants')
            .select('*')
            .eq('cube_id', cubeData.id)
            .eq('user_id', user.id)
            .eq('status', 'accepted')
            .then(({ data: participantData }) => {
              const isParticipant = participantData && participantData.length > 0;
              
              if (!isOwner && !isParticipant) {
                // User shouldn't see this cube, remove it if it exists
                const current = cubesSubject.value;
                cubesSubject.next(current.filter((c) => c.id !== cubeData.id));
                return;
              }

              if (payload.eventType === 'INSERT') {
                const newCube: Cube = {
                  id: cubeData.id,
                  ownerId: cubeData.owner_id,
                  name: cubeData.name,
                  description: cubeData.description,
                  createdAt: cubeData.created_at,
                  updatedAt: cubeData.updated_at,
                };
                const current = cubesSubject.value;
                cubesSubject.next([...current, newCube]);
              } else if (payload.eventType === 'UPDATE') {
                const updatedCube: Cube = {
                  id: cubeData.id,
                  ownerId: cubeData.owner_id,
                  name: cubeData.name,
                  description: cubeData.description,
                  createdAt: cubeData.created_at,
                  updatedAt: cubeData.updated_at,
                };
                const current = cubesSubject.value;
                const index = current.findIndex((c) => c.id === updatedCube.id);
                if (index >= 0) {
                  current[index] = updatedCube;
                  cubesSubject.next([...current]);
                }
              } else if (payload.eventType === 'DELETE') {
                const current = cubesSubject.value;
                cubesSubject.next(current.filter((c) => c.id !== cubeData.id));
              }
            });
        }
      )
      .subscribe();

    return cubesSubject.asObservable();
  }

  async getCubeById(cubeId: string): Promise<Cube | null> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('cubes')
      .select('*')
      .eq('id', cubeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return {
      id: data.id,
      ownerId: data.owner_id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateCube(cubeId: string, updates: { name?: string; description?: string }): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('cubes')
      .update({
        name: updates.name,
        description: updates.description,
      })
      .eq('id', cubeId)
      .eq('owner_id', user.id);

    if (error) {
      throw error;
    }
  }

  async deleteCube(cubeId: string): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('cubes')
      .delete()
      .eq('id', cubeId)
      .eq('owner_id', user.id);

    if (error) {
      throw error;
    }
  }

  async addCardToCube(cubeId: string, cardData: {
    cardId: string;
    cardName: string;
    imageUrl?: string;
    setName?: string;
    cardNumber?: string;
  }): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase.from('cube_cards').insert([
      {
        cube_id: cubeId,
        card_id: cardData.cardId,
        card_name: cardData.cardName,
        image_url: cardData.imageUrl,
        set_name: cardData.setName,
        card_number: cardData.cardNumber,
      },
    ]);

    if (error) {
      throw error;
    }
  }

  async removeCardFromCube(cubeId: string, cardId: string): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('cube_cards')
      .delete()
      .eq('cube_id', cubeId)
      .eq('card_id', cardId);

    if (error) {
      throw error;
    }
  }

  getCubeCards$(cubeId: string): Observable<CubeCard[]> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const cardsSubject = new BehaviorSubject<CubeCard[]>([]);

    // Initial fetch
    supabase
      .from('cube_cards')
      .select('*')
      .eq('cube_id', cubeId)
      .then(({ data, error }) => {
        if (!error && data) {
          cardsSubject.next(
            data.map((row: any) => ({
              id: row.id,
              cubeId: row.cube_id,
              cardId: row.card_id,
              cardName: row.card_name,
              imageUrl: row.image_url,
              setName: row.set_name,
              cardNumber: row.card_number,
              addedAt: row.added_at,
            }))
          );
        }
      });

    // Set up real-time listener
    const subscription = supabase
      .channel(`cube-cards-${cubeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cube_cards',
          filter: `cube_id=eq.${cubeId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newCard: CubeCard = {
              id: payload.new.id,
              cubeId: payload.new.cube_id,
              cardId: payload.new.card_id,
              cardName: payload.new.card_name,
              imageUrl: payload.new.image_url,
              setName: payload.new.set_name,
              cardNumber: payload.new.card_number,
              addedAt: payload.new.added_at,
            };

            const current = cardsSubject.value;
            const index = current.findIndex((c) => c.id === newCard.id);
            if (index >= 0) {
              current[index] = newCard;
            } else {
              current.push(newCard);
            }
            cardsSubject.next([...current]);
          } else if (payload.eventType === 'DELETE') {
            const current = cardsSubject.value;
            cardsSubject.next(current.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return cardsSubject.asObservable();
  }

  async inviteParticipant(cubeId: string, userId: string): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user is the owner of the cube
    const { data: cubeData, error: cubeError } = await supabase
      .from('cubes')
      .select('owner_id')
      .eq('id', cubeId)
      .single();

    if (cubeError || !cubeData) {
      throw new Error('Cube not found');
    }

    if (cubeData.owner_id !== user.id) {
      throw new Error('Only cube owners can invite participants');
    }

    // Add the participant
    const { error } = await supabase.from('cube_participants').insert([
      {
        cube_id: cubeId,
        user_id: userId,
        status: 'pending',
      },
    ]);

    if (error) {
      throw error;
    }
  }

  async acceptInvite(cubeId: string): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('cube_participants')
      .update({ status: 'accepted' })
      .eq('cube_id', cubeId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }
  }

  async declineInvite(cubeId: string): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('cube_participants')
      .update({ status: 'declined' })
      .eq('cube_id', cubeId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }
  }

  getCubeParticipants$(cubeId: string): Observable<CubeParticipant[]> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const participantsSubject = new BehaviorSubject<CubeParticipant[]>([]);

    // Initial fetch
    supabase
      .from('cube_participants')
      .select('*')
      .eq('cube_id', cubeId)
      .then(({ data, error }) => {
        if (!error && data) {
          participantsSubject.next(
            data.map((row: any) => ({
              id: row.id,
              cubeId: row.cube_id,
              userId: row.user_id,
              status: row.status,
              joinedAt: row.joined_at,
            }))
          );
        }
      });

    // Set up real-time listener
    const subscription = supabase
      .channel(`cube-participants-${cubeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cube_participants',
          filter: `cube_id=eq.${cubeId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newParticipant: CubeParticipant = {
              id: payload.new.id,
              cubeId: payload.new.cube_id,
              userId: payload.new.user_id,
              status: payload.new.status,
              joinedAt: payload.new.joined_at,
            };

            const current = participantsSubject.value;
            const index = current.findIndex((p) => p.id === newParticipant.id);
            if (index >= 0) {
              current[index] = newParticipant;
            } else {
              current.push(newParticipant);
            }
            participantsSubject.next([...current]);
          } else if (payload.eventType === 'DELETE') {
            const current = participantsSubject.value;
            participantsSubject.next(current.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return participantsSubject.asObservable();
  }

  async removeParticipant(cubeId: string, participantId: string): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user is the owner of the cube
    const { data: cubeData, error: cubeError } = await supabase
      .from('cubes')
      .select('owner_id')
      .eq('id', cubeId)
      .single();

    if (cubeError || !cubeData) {
      throw new Error('Cube not found');
    }

    if (cubeData.owner_id !== user.id) {
      throw new Error('Only cube owners can remove participants');
    }

    const { error } = await supabase
      .from('cube_participants')
      .delete()
      .eq('id', participantId);

    if (error) {
      throw error;
    }
  }
}
