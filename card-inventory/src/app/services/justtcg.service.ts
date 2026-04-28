import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, shareReplay, map } from 'rxjs/operators';
import { JustTCGCard } from '../models/index';
import { environment } from '../../environments/environment';

interface JustTCGApiResponse<T> {
  data: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  usage: {
    apiRequestLimit: number;
    apiDailyLimit: number;
    apiRateLimit: number;
    apiRequestsUsed: number;
    apiDailyRequestsUsed: number;
    apiRequestsRemaining: number;
    apiDailyRequestsRemaining: number;
    apiPlan: string;
  };
  error?: string;
  code?: string;
}

@Injectable({
  providedIn: 'root',
})
export class JustTCGService {
  private cardCache = new Map<string, Observable<JustTCGCard[]>>();

  constructor() {}

  searchCards(cardName: string, game: string): Observable<JustTCGCard[]> {
    if (!cardName.trim()) {
      return of([]);
    }

    const cacheKey = `${game}:${cardName}`;

    // Check cache first
    if (this.cardCache.has(cacheKey)) {
      return this.cardCache.get(cacheKey)!;
    }

    const request$ = from(this.importAndSearch(cardName, game)).pipe(
      shareReplay(1),
      catchError((error) => {
        console.error('Failed to fetch cards from JustTCG:', error);
        return of([] as JustTCGCard[]);
      })
    );

    this.cardCache.set(cacheKey, request$);
    return request$;
  }

  private async importAndSearch(
    cardName: string,
    game: string
  ): Promise<JustTCGCard[]> {
    // Dynamically import the SDK to support Angular's build process
    const { JustTCG } = await import('justtcg-js');

    const client = new JustTCG({
      apiKey: environment.justTcgApiKey,
    });

    const response: JustTCGApiResponse<any[]> = await client.v1.cards.get({
      q: cardName,
      game: game,
      limit: 20,
    });

    if (response.error) {
      throw new Error(`API Error: ${response.error} (Code: ${response.code})`);
    }

    return this.transformCards(response.data || []);
  }

  private transformCards(rawCards: any[]): JustTCGCard[] {
    return rawCards.map((card) => ({
      id: card.id || card.cardId,
      name: card.name,
      game: card.game,
      imageUrl: card.images?.[0] || card.imageUrl,
      variants: card.variants || [],
      setName: card.set?.name,
      cardNumber: card.cardNumber,
    }));
  }

  getPrice(card: JustTCGCard): number | null {
    if (!card.variants || card.variants.length === 0) {
      return null;
    }

    // Get the most expensive variant
    const topVariant = card.variants.sort(
      (a, b) => (b.price ?? 0) - (a.price ?? 0)
    )[0];

    return topVariant?.price ?? null;
  }
}
