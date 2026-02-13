import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})

export class Mapa implements OnInit, AfterViewInit {
  private map: any;
  private marker: any;
  private L: any;
  private selectedCoords: [number, number] | null = null;
  private supabase: SupabaseClient;

  private tempMarker: any = null;
  howModal = false;

  isBrowser = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Inicializar Supabase
    this.supabase = createClient(
      'https://jspejuafqxidxnyfxkme.supabase.co',
      'sb_publishable_d_Yy7ULDAtDLC-CcWv3qDg_eSTht6E5'
    );
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
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // CLICK EN MAPA
    this.map.on('click', (e: any) => {
      this.selectedCoords = [e.latlng.lat, e.latlng.lng];
      alert('Selecciona una imagen para esta ubicación');
    });

    this.map.invalidateSize();
  }

  // 📸 Cuando se selecciona imagen
  async onImageSelected(event: any): Promise<void> {
    if (!this.selectedCoords) {
      alert('Primero haz click en el mapa');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
      // Subir imagen a Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('fotos-mapa')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError);
        alert('Error al subir la imagen');
        return;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = this.supabase.storage
        .from('fotos-mapa')
        .getPublicUrl(fileName);

      // Guardar metadatos en base de datos
      const photoData = {
        lat: this.selectedCoords![0],
        lng: this.selectedCoords![1],
        image_url: publicUrl,
        created_at: new Date().toISOString()
      };

      await this.savePhoto(photoData);
      this.addPhotoMarker(photoData);

      this.selectedCoords = null;
      alert('Foto guardada correctamente!');

    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar la imagen');
    }
  }

  private addPhotoMarker(photo: any): void {
    // Crear icono personalizado con la imagen en miniatura
    const photoIcon = this.L.divIcon({
      className: 'custom-photo-marker',
      html: `
        <div style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          <img src="${photo.image_url}" 
               style="width: 100%; 
                      height: 100%; 
                      object-fit: cover;
                      display: block;" 
               alt="foto"/>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -25]
    });

    this.L.marker([photo.lat, photo.lng], { icon: photoIcon })
      .addTo(this.map)
      .bindPopup(`
        <div class='w-full h-full object-contain'>
          <img src="${photo.image_url}" style="width:100%; border-radius:8px"/>
        </div>
      `);
  }

  private async savePhoto(photo: any): Promise<void> {
    const { data, error } = await this.supabase
      .from('map_photos')
      .insert([photo]);

    if (error) {
      console.error('Error guardando en DB:', error);
      throw error;
    }
  }

  private async loadSavedPhotos(): Promise<void> {
    const { data: photos, error } = await this.supabase
      .from('map_photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando fotos:', error);
      return;
    }

    photos?.forEach((photo: any) => {
      this.addPhotoMarker(photo);
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