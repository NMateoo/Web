import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
    }
  `]
})

export class Mapa implements OnInit, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private supabaseService = inject(SupabaseService);
  
  private map: any;
  private marker: any;
  private L: any;
  private selectedCoords: [number, number] | null = null;
  private supabase: SupabaseClient;

  private tempMarker: any = null;
  howModal = false;

  isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Obtener el cliente de Supabase desde el servicio
    this.supabase = this.supabaseService.getClient();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('🗺️ Mapa component initialized in browser');
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadLeaflet();
      setTimeout(() => {
        this.initMap();
        this.loadSavedPhotos();
      }, 100);
    }
  }

  private async loadLeaflet(): Promise<void> {
    const leaflet = await import('leaflet');
    this.L = leaflet.default ?? leaflet;
    this.fixLeafletIconPath();
  }

  private initMap(): void {
    const granadaCoords: [number, number] = [37.1773, -3.5986]; // Granada

    this.map = this.L.map('map', {
      center: granadaCoords,
      zoom: 13
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    // CLICK EN MAPA
    this.map.on('click', (e: any) => {
      this.selectedCoords = [e.latlng.lat, e.latlng.lng];
      alert('Selecciona una imagen para esta ubicación');
    });

    this.map.invalidateSize();
  }

  // 📸 📹 Cuando se selecciona imagen o video
  async onFileSelected(event: any): Promise<void> {
    if (!this.selectedCoords) {
      alert('Primero haz click en el mapa');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
      // Detectar tipo de archivo basándose en MIME type
      const fileType = file.type.startsWith('video/') ? 'video' : 'image';
      
      // Subir archivo a Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const bucket = fileType === 'image' ? 'fotos-mapa' : 'videos-mapa';

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) {
        console.error(`Error subiendo ${fileType}:`, uploadError);
        alert(`Error al subir el ${fileType}`);
        return;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Guardar metadatos en base de datos
      const mediaData = {
        lat: this.selectedCoords![0],
        lng: this.selectedCoords![1],
        media_url: publicUrl,
        media_type: fileType,
        created_at: new Date().toISOString()
      };

      await this.saveMedia(mediaData);
      this.addMediaMarker(mediaData);

      this.selectedCoords = null;
      alert(`${fileType === 'image' ? 'Foto' : 'Video'} guardada correctamente!`);

      // Limpiar el input
      event.target.value = '';

    } catch (error) {
      console.error(`Error al procesar archivo:`, error);
      alert(`Error al procesar el archivo`);
    }
  }

  private addMediaMarker(media: any): void {
    const isVideo = media.media_type === 'video';
    
    // Crear icono personalizado
    let markerHTML: string;
    let popupHTML: string;
    
    if (isVideo) {
      // Icono para video con play button
      markerHTML = `
        <div style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          background-color: #1f2937;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="font-size: 28px; color: white;">▶</div>
        </div>
      `;
      popupHTML = `
        <div style="width: 300px; background-color: #1f2937; border-radius: 8px; overflow: hidden;">
          <video width="300" height="200" controls style="width: 100%; height: auto; display: block;">
            <source src="${media.media_url}" type="video/mp4">
            Tu navegador no soporta videos HTML5
          </video>
        </div>
      `;
    } else {
      // Icono para imagen con miniatura
      markerHTML = `
        <div style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          <img src="${media.media_url}" 
               style="width: 100%; 
                      height: 100%; 
                      object-fit: cover;
                      display: block;" 
               alt="foto"/>
        </div>
      `;
      popupHTML = `
        <div style="width: 200px; height: 200px; background-color: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <img src="${media.media_url}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;"/>
        </div>
      `;
    }
    
    const mediaIcon = this.L.divIcon({
      className: 'custom-media-marker',
      html: markerHTML,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -25]
    });

    this.L.marker([media.lat, media.lng], { icon: mediaIcon })
      .addTo(this.map)
      .bindPopup(popupHTML);
  }

  private async saveMedia(media: any): Promise<void> {
    const { data, error } = await this.supabase
      .from('map_photos')
      .insert([media]);

    if (error) {
      console.error('Error guardando en DB:', error);
      throw error;
    }
  }

  private async loadSavedPhotos(): Promise<void> {
    const { data: media, error } = await this.supabase
      .from('map_photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando contenido:', error);
      return;
    }

    media?.forEach((item: any) => {
      // Mantener compatibilidad con datos antiguos
      const mediaItem = {
        lat: item.lat,
        lng: item.lng,
        media_url: item.media_url || item.image_url,
        media_type: item.media_type || 'image',
        created_at: item.created_at
      };
      this.addMediaMarker(mediaItem);
    });
  }

  private fixLeafletIconPath(): void {
    const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
    const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
    const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

    const iconDefault = this.L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    this.L.Marker.prototype.options.icon = iconDefault;
  }
}