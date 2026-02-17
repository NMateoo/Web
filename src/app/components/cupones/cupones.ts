import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

interface Coupon {
  id: number;
  used: boolean;
  usedAt?: Date;
}

@Component({
  selector: 'app-cupones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cupones.html',
  styleUrl: './cupones.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cupones implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private supabaseService = inject(SupabaseService);
  private supabase: SupabaseClient;
  
  private readonly TOTAL_COUPONS = 36;
  private readonly EXCLUDED_COUPONS = [1, 35, 36]; // Portada y contraportada
  
  coupons = signal<Coupon[]>([]);
  isLoading = signal(true);

  constructor() {
    this.supabase = this.supabaseService.getClient();
    this.initializeCoupons();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCouponsState();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private initializeCoupons(): void {
    const initialCoupons: Coupon[] = [];
    for (let i = 1; i <= this.TOTAL_COUPONS; i++) {
      if (!this.EXCLUDED_COUPONS.includes(i)) {
        initialCoupons.push({ id: i, used: false });
      }
    }
    this.coupons.set(initialCoupons);
  }

  private async loadCouponsState(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('coupons')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error al cargar cupones:', error);
        this.isLoading.set(false);
        return;
      }

      if (data && data.length > 0) {
        const couponMap = new Map(data.map((c: any) => [c.id, { id: c.id, used: c.used, usedAt: c.used_at }]));
        let updated = this.coupons().map(c => couponMap.get(c.id) || c);
        // Filtrar los cupones excluidos
        updated = updated.filter(c => !this.EXCLUDED_COUPONS.includes(c.id));
        this.coupons.set(updated);
      }

      this.isLoading.set(false);
    } catch (error) {
      console.error('Error al cargar cupones:', error);
      this.isLoading.set(false);
    }
  }

  async toggleCoupon(couponId: number): Promise<void> {
    try {
      const coupon = this.coupons().find(c => c.id === couponId);
      if (!coupon) return;

      const newUsedState = !coupon.used;
      const { error } = await this.supabase
        .from('coupons')
        .upsert({
          id: couponId,
          used: newUsedState,
          used_at: newUsedState ? new Date().toISOString() : null,
        });

      if (error) {
        console.error('Error al actualizar cupón:', error);
        return;
      }

      // Actualizar el estado local
      this.coupons.update(coupons =>
        coupons.map(c =>
          c.id === couponId
            ? { ...c, used: newUsedState, usedAt: newUsedState ? new Date() : undefined }
            : c
        )
      );
    } catch (error) {
      console.error('Error al cambiar cupón:', error);
    }
  }

  get usedCount(): number {
    return this.coupons().filter(c => c.used).length;
  }

  get totalCount(): number {
    return this.coupons().length;
  }
}
