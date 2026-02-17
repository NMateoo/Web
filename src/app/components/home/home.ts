import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

interface MapPhoto {
  lat: number;
  lng: number;
  image_url: string; // Cambiado de 'image' a 'image_url' para coincidir con la DB
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit, OnDestroy {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private supabaseService = inject(SupabaseService);
  private supabase: SupabaseClient;
  
  currentPhoto = signal<MapPhoto | null>(null);
  private photos: MapPhoto[] = [];
  private currentIndex = 0;
  private intervalId?: number;

  constructor() {
    // Obtener el cliente de Supabase desde el servicio
    this.supabase = this.supabaseService.getClient();
  }

  ngOnInit(): void {
    this.loadPhotos();
  }

  ngOnDestroy(): void {
    // Limpiar el intervalo cuando se destruya el componente
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async loadPhotos(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const { data: photos, error } = await this.supabase
        .from('map_photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar las fotos:', error);
        return;
      }

      if (photos && photos.length > 0) {
        this.photos = photos;
        this.currentPhoto.set(this.photos[0]);
        this.startSlideshow(); // Iniciar slideshow solo cuando haya fotos
      }
    } catch (error) {
      console.error('Error al cargar las fotos:', error);
    }
  }

  startSlideshow(): void {
    if (!isPlatformBrowser(this.platformId) || this.photos.length === 0) {
      return;
    }

    // Cambiar foto cada 10 segundos
    this.intervalId = window.setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.photos.length;
      this.currentPhoto.set(this.photos[this.currentIndex]);
    }, 7000);
  }

  navigateToPreguntas(): void {
    this.router.navigate(['/preguntas']);
  }

  navigateToMapa(): void {
    this.router.navigate(['/mapa']);
  }
}