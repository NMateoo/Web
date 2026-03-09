import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { NgxParticlesModule } from '@tsparticles/angular';
import { loadSlim } from '@tsparticles/slim';
import type { Container, Engine } from '@tsparticles/engine';

interface MapPhoto {
  lat: number;
  lng: number;
  image_url: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgxParticlesModule],
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
  showWelcomeModal = signal<boolean>(true);
  private photos: MapPhoto[] = [];
  private currentIndex = 0;
  private intervalId?: number;

  particlesId = 'tsparticles';
  particlesOptions = {
    fullScreen: { enable: false },
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    particles: {
      color: { value: ['#ff6b6b', '#ff8e8e', '#ffb3b3', '#ff4757'] },
      move: {
        direction: 'top' as const,
        enable: true,
        outModes: { default: 'out' as const },
        random: true,
        speed: { min: 1, max: 3 },
        straight: false,
      },
      number: { value: 30 },
      opacity: {
        value: { min: 0.4, max: 0.9 },
        animation: { enable: true, speed: 0.5 },
      },
      shape: { type: 'heart' },
      size: {
        value: { min: 8, max: 18 },
        animation: { enable: true, speed: 2 },
      },
      wobble: {
        enable: true,
        distance: 10,
        speed: { min: -5, max: 5 },
      },
    },
  };

  constructor() {
    this.supabase = this.supabaseService.getClient();
  }

  particlesInit = async (engine: Engine): Promise<void> => {
    await loadSlim(engine);
  };

  particlesLoaded(container: Container): void {
    console.log('Particles loaded', container);
  }

  ngOnInit(): void {
    this.loadPhotos();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async loadPhotos(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const { data: photos, error } = await this.supabase
        .from('map_photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) { console.error('Error al cargar las fotos:', error); return; }

      if (photos && photos.length > 0) {
        this.photos = photos;
        this.currentPhoto.set(this.photos[0]);
        this.startSlideshow();
      }
    } catch (error) {
      console.error('Error al cargar las fotos:', error);
    }
  }

  startSlideshow(): void {
    if (!isPlatformBrowser(this.platformId) || this.photos.length === 0) return;
    this.intervalId = window.setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.photos.length;
      this.currentPhoto.set(this.photos[this.currentIndex]);
    }, 7000);
  }

  closeWelcomeModal(): void {
    this.showWelcomeModal.set(false);
  }

  navigateToPreguntas(): void { this.router.navigate(['/preguntas']); }
  navigateToMapa(): void { this.router.navigate(['/mapa']); }
  navigateToCupones(): void { this.router.navigate(['/cupones']); }
}