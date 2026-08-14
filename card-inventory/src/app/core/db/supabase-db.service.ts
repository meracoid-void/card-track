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

    // Simple fetch - get cubes owned by user and cubes they participate in
    this.fetchUserCubes(user.id, cubesSubject);

    return cubesSubject.asObservable();
  }

  private async fetchUserCubes(userId: string, cubesSubject: BehaviorSubject<Cube[]>): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    
    try {
      const [ownedCubesResult, participatedCubesResult] = await Promise.all([
        supabase.from('cubes').select('*').eq('owner_id', userId),
        supabase.from('cube_participants').select('cube_id').eq('user_id', userId).eq('status', 'accepted')
      ]);

      const allCubes: any[] = [];
      
      // Add owned cubes
      if (!ownedCubesResult.error && ownedCubesResult.data) {
        allCubes.push(...ownedCubesResult.data);
      }
      
      // Add participated cubes
      if (!participatedCubesResult.error && participatedCubesResult.data) {
        const participatedCubeIds = participatedCubesResult.data.map((p: any) => p.cube_id);
        
        // Fetch the full cube data for participated cubes
        if (participatedCubeIds.length > 0) {
          const { data: participatedCubes } = await supabase.from('cubes').select('*').in('id', participatedCubeIds);
          if (participatedCubes) {
            allCubes.push(...participatedCubes);
          }
        }
      }

      // Deduplicate cubes
      const uniqueCubes = allCubes.filter((cube, index, self) =>
        index === self.findIndex((c) => c.id === cube.id)
      );
      
      cubesSubject.next(
        uniqueCubes.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
      );
    } catch (error) {
      console.error('Error fetching cubes:', error);
      cubesSubject.next([]);
    }
  }

  refreshUserCubes(): void {
    const user = this.getCurrentUser();
    if (user) {
      // This would need to be called from components, for now we'll implement a simpler approach
    }
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

  async removeCardFromCubeById(cardRowId: string): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('cube_cards')
      .delete()
      .eq('id', cardRowId);

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

    // Simple fetch
    this.fetchCubeCards(cubeId, cardsSubject);

    return cardsSubject.asObservable();
  }

  private async fetchCubeCards(cubeId: string, cardsSubject: BehaviorSubject<CubeCard[]>): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('cube_cards')
        .select('*')
        .eq('cube_id', cubeId);
      
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
    } catch (err) {
      console.error('Error fetching cube cards:', err);
      cardsSubject.next([]);
    }
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

    // Simple fetch
    this.fetchCubeParticipants(cubeId, participantsSubject);

    return participantsSubject.asObservable();
  }

  private async fetchCubeParticipants(cubeId: string, participantsSubject: BehaviorSubject<CubeParticipant[]>): Promise<void> {
    const supabase = this.authService.getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('cube_participants')
        .select('*')
        .eq('cube_id', cubeId);
      
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
    } catch (err) {
      console.error('Error fetching cube participants:', err);
      participantsSubject.next([]);
    }
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
