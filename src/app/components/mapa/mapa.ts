import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-mapa',
  imports: [CommonModule],
  templateUrl: './mapa.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
    }
  `]
})

export class Mapa implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  
  private map: any;
  private L: any;
  protected selectedCoords = signal<[number, number] | null>(null);
  protected selectedLocation = signal<string>('Ubicación desconocida');
  private mapMediaItems = signal<any[]>([]);
  private readonly locationDetailsCache = new Map<string, { location: string; country: string; countryCode: string }>();
  private readonly mediaMarkers = new Map<string, any>();
  private deleteListener?: (event: MouseEvent) => void;
  private supabase: SupabaseClient;

  showUploadModal = signal(false);
  selectedFile = signal<File | null>(null);
  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  isDeleting = signal(false);

  // Notificaciones
  notification = signal<string>('');
  notificationType = signal<'success' | 'error' | 'pending'>('success');
  showNotification = signal(false);
  private notificationTimeout?: ReturnType<typeof setTimeout>;

  // Confirmación
  showConfirmDialog = signal(false);
  confirmMessage = signal<string>('');
  private confirmCallback: (() => void) | null = null;

  // Mapa coroplético - Nuevos signals
  private countriesData = signal<Map<string, any>>(new Map());
  selectedCountry = signal<string | null>(null);
  private selectedCountryCode = signal<string | null>(null);
  showCountryGallery = signal(false);
  currentCountryIndex = signal(0);
  private countriesGeoJSON: any = null;
  private isSelectingCountry = false; // Flag para evitar propagación de eventos
  private countriesLayer: any = null; // Referencia a la capa GeoJSON

  isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Obtener el cliente de Supabase desde el servicio
    this.supabase = this.supabaseService.getClient();
  }

  // Computed para las fotos del país seleccionado
  protected countryPhotos = computed(() => {
    const countryCode = this.selectedCountryCode();
    if (!countryCode) return [];
    const countryData = this.countriesData().get(countryCode);
    return countryData?.photos || [];
  });

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadLeaflet();
      this.setupDeleteListener();
      await this.loadSavedPhotos();
    }
  }

  ngOnDestroy(): void {
    if (this.deleteListener) document.removeEventListener('click', this.deleteListener);
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    this.map?.remove();
  }

  private setupDeleteListener(): void {
    this.deleteListener = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Botón de guardar ubicación
      const saveBtn = target.closest('.save-location-btn');
      if (saveBtn) {
        const id = saveBtn.getAttribute('data-id');
        if (id) {
          const input = document.querySelector(`.location-input[data-id="${id}"]`) as HTMLInputElement | null;
          if (input) {
            const newLocation = input.value;
            if (newLocation.trim()) {
              this.updateLocationName(id, newLocation);
            }
          }
        }
        return;
      }

      // Botones de navegación
      const nextBtn = target.closest('.nav-next-btn');
      const prevBtn = target.closest('.nav-prev-btn');
      
      if (nextBtn) {
        const currentId = nextBtn.getAttribute('data-id');
        if (currentId) this.navigateMedia(currentId, 1);
        return;
      }
      
      if (prevBtn) {
        const currentId = prevBtn.getAttribute('data-id');
        if (currentId) this.navigateMedia(currentId, -1);
        return;
      }

      // Botón de eliminar
      const button = target.closest('.delete-media-btn');
      if (!button) return;

      const id = button.getAttribute('data-id');
      const url = button.getAttribute('data-url');
      const type = button.getAttribute('data-type');

      if (!id || !url || !type) {
        console.error('El ID proporcionado es inválido:', id);
        alert('No se puede eliminar: faltan datos del contenido.');
        return;
      }
      this.deleteMedia(id, url, type);
    };
    document.addEventListener('click', this.deleteListener);
  }

  private async loadLeaflet(): Promise<void> {
    const leaflet = await import('leaflet');
    this.L = leaflet.default ?? leaflet;
    this.fixLeafletIconPath();
  }

  private initMap(centerCoords: [number, number]): void {
    this.map = this.L.map('map', {
      center: centerCoords,
      zoom: 13
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    // Cargar capa de países (coroplético)
    this.loadCountriesGeoJSON();

    // CLICK EN MAPA - Abre el modal para agregar foto
    this.map.on('click', async (e: any) => {
      // Si se seleccionó un país, no abrir modal
      if (this.isSelectingCountry) {
        this.isSelectingCountry = false;
        return;
      }

      this.ngZone.run(async () => {
        const coords: [number, number] = [e.latlng.lat, e.latlng.lng];
        this.selectedCoords.set(coords);
        
        // Obtener el nombre del lugar
        const details = await this.getLocationDetails(coords[0], coords[1]);
        this.selectedLocation.set(details.location);
        
        this.showUploadModal.set(true);
        this.uploadError.set(null);
        this.cdr.detectChanges();
      });
    });

    this.map.invalidateSize();
  }
  private async getLocationDetails(lat: number, lng: number): Promise<{ location: string; country: string; countryCode: string }> {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = this.locationDetailsCache.get(key);
    if (cached) return cached;
    const fallback = { location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, country: 'Unknown', countryCode: '' };
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      
      if (!response.ok) return fallback;
      
      const data = await response.json();
      
      // Priorizar: city/town > village > county > state
      const address = data.address;
      const location = 
        address?.city || 
        address?.town || 
        address?.village || 
        address?.county || 
        address?.state || 
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
      const details = {
        location,
        country: address?.country || 'Unknown',
        countryCode: String(address?.country_code || '').toUpperCase()
      };
      this.locationDetailsCache.set(key, details);
      return details;
    } catch (error) {
      console.error('Error obteniendo nombre de ubicación:', error);
      return fallback;
    }
  }
  // � Cuando se selecciona un archivo en el modal
  onModalFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.uploadError.set(null);
    }
  }

  // 📸 📹 Confirmar y subir archivo
  async onUploadConfirm(): Promise<void> {
    if (!this.selectedFile()) {
      this.uploadError.set('Por favor selecciona una foto o video');
      return;
    }

    if (!this.selectedCoords()) {
      this.uploadError.set('Coordenadas no válidas');
      return;
    }

    this.isUploading.set(true);

    try {
      const file = this.selectedFile()!;
      const fileType = file.type.startsWith('video/') ? 'video' : 'image';
      
      // Subir archivo a Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const bucket = fileType === 'image' ? 'fotos-mapa' : 'videos-mapa';

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) {
        console.error(`Error subiendo ${fileType}:`, uploadError);
        this.uploadError.set(`Error al subir el ${fileType}`);
        this.isUploading.set(false);
        return;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Guardar metadatos en base de datos
      const mediaData: any = {
        lat: this.selectedCoords()![0],
        lng: this.selectedCoords()![1],
        image_url: publicUrl,
        media_url: publicUrl,
        media_type: fileType,
        created_at: new Date().toISOString(),
        location_name: null
      };

      const insertedId = await this.saveMedia(mediaData);
      mediaData.id = insertedId; // Asignar el id generado por la BD
      const details = await this.getLocationDetails(mediaData.lat, mediaData.lng);
      mediaData.country = details.country;
      mediaData.countryCode = details.countryCode;
      await this.addMediaMarker(mediaData, details.location);
      
      // Agregar el nuevo media a la lista de medios del mapa
      this.mapMediaItems.update(items => [...items, mediaData]);
      const updatedCountries = new Map(this.countriesData());
      const countryData = updatedCountries.get(details.countryCode) || { photos: [], count: 0, name: details.country };
      const photos = [...countryData.photos, mediaData];
      updatedCountries.set(details.countryCode, { ...countryData, photos, count: photos.length });
      this.countriesData.set(updatedCountries);
      this.updateCountryLayer();

      // Limpiar modal
      this.closeModal();
      this.isUploading.set(false);

    } catch (error) {
      console.error(`Error al procesar archivo:`, error);
      this.uploadError.set(`Error al procesar el archivo`);
      this.isUploading.set(false);
    }
  }

  closeModal(): void {
    this.showUploadModal.set(false);
    this.selectedFile.set(null);
    this.uploadError.set(null);
    this.selectedCoords.set(null);
  }

  private async addMediaMarker(media: any, locationName?: string): Promise<void> {
    const isVideo = media.media_type === 'video';
    
    // Obtener el nombre del lugar (usar el guardado o hacer reverse geocoding)
    const resolvedLocationName = media.location_name || locationName || `${media.lat.toFixed(4)}, ${media.lng.toFixed(4)}`;
    
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
          <div style="padding: 12px;">
            <div style="display: flex; gap: 4px; margin-bottom: 12px;">
              <input type="text" class="location-input" data-id="${media.id}" value="${resolvedLocationName}" style="flex: 1; padding: 6px; background-color: white; color: black; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;" />
              <button class="save-location-btn" data-id="${media.id}" style="padding: 6px 10px; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 13px;">💾</button>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button class="nav-prev-btn" data-id="${media.id}" style="flex: 1; padding: 8px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">⬅️ Anterior</button>
              <button class="nav-next-btn" data-id="${media.id}" style="flex: 1; padding: 8px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">Siguiente ➡️</button>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="delete-media-btn" data-id="${media.id}" data-url="${media.media_url}" data-type="${media.media_type}" style="flex: 1; padding: 8px; background-color: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">🗑️ Borrar</button>
            </div>
          </div>
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
        <div style="width: 250px;">
          <img src="${media.media_url}" style="width: 100%; height: auto; max-height: 250px; object-fit: contain; border-radius: 8px;"/>
          <div style="padding: 12px;">
            <div style="display: flex; gap: 4px; margin-bottom: 12px;">
              <input type="text" class="location-input" data-id="${media.id}" value="${resolvedLocationName}" style="flex: 1; padding: 6px; background-color: white; color: black; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;" />
              <button class="save-location-btn" data-id="${media.id}" style="padding: 6px 10px; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 13px;">💾</button>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button class="nav-prev-btn" data-id="${media.id}" style="flex: 1; padding: 8px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">⬅️ Anterior</button>
              <button class="nav-next-btn" data-id="${media.id}" style="flex: 1; padding: 8px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">Siguiente ➡️</button>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="delete-media-btn" data-id="${media.id}" data-url="${media.media_url}" data-type="${media.media_type}" style="flex: 1; padding: 8px; background-color: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">🗑️ Borrar</button>
            </div>
          </div>
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

    const marker = this.L.marker([media.lat, media.lng], { icon: mediaIcon })
      .addTo(this.map)
      .bindPopup(popupHTML);
    this.mediaMarkers.set(String(media.id), marker);
  }

  private async saveMedia(media: any): Promise<string | null> {
    // Remover created_at para que Supabase lo genere automáticamente
    const { created_at, ...mediaWithoutTimestamp } = media;
    
    console.log('Datos a insertar:', JSON.stringify(mediaWithoutTimestamp, null, 2));
    
    const { data, error } = await this.supabase
      .from('map_photos')
      .insert([mediaWithoutTimestamp])
      .select('id');

    if (error) {
      console.error('Error guardando en DB:', error);
      console.error('Detalles del error:', JSON.stringify(error, null, 2));
      throw error;
    }

    // Retornar el id del registro insertado
    return data && data.length > 0 ? data[0].id : null;
  }

  private async loadSavedPhotos(): Promise<void> {
    const { data: media, error } = await this.supabase
      .from('map_photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando contenido:', error);
      // Inicializar con Granada si hay error
      this.initMap([37.1773, -3.5986]);
      return;
    }

    // Inicializar el mapa con una foto aleatoria, o Granada si no hay fotos
    let centerCoords: [number, number] = [37.1773, -3.5986];
    if (media && media.length > 0) {
      const randomIndex = Math.floor(Math.random() * media.length);
      centerCoords = [media[randomIndex].lat, media[randomIndex].lng];
    }
    
    this.initMap(centerCoords);

    // Agrupar fotos por país
    const countriesMap = new Map<string, any[]>();
    const mediaItems: any[] = [];

    for (const item of media || []) {
      const details = await this.getLocationDetails(item.lat, item.lng);
      const countryCode = details.countryCode;
      
      // Mantener compatibilidad con datos antiguos
      const mediaItem = {
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        media_url: item.media_url || item.image_url,
        media_type: item.media_type || 'image',
        created_at: item.created_at,
        location_name: item.location_name || null,
        country: details.country,
        countryCode
      };

      mediaItems.push(mediaItem);

      // Agrupar por país
      if (!countriesMap.has(countryCode)) {
        countriesMap.set(countryCode, []);
      }
      countriesMap.get(countryCode)!.push(mediaItem);

      // Agregar marcador en el mapa
      await this.addMediaMarker(mediaItem, details.location);
    }

    // Guardar datos de países en el signal
    const countriesData = new Map<string, any>();
    countriesMap.forEach((photos, countryCode) => {
      countriesData.set(countryCode, {
        photos: photos,
        count: photos.length,
        name: photos[0]?.country || 'Unknown'
      });
    });
    this.countriesData.set(countriesData);

    // Guardar medios para navegación
    this.mapMediaItems.set(mediaItems);

    // Actualizar colores del mapa después de agrupar
    this.updateCountryLayer();
  }

  private navigateMedia(currentId: string, direction: number): void {
    const medias = this.mapMediaItems();
    const currentIndex = medias.findIndex((m) => m.id === currentId);
    
    if (currentIndex === -1) return;
    
    let nextIndex = currentIndex + direction;
    
    // Navegar circular
    if (nextIndex < 0) {
      nextIndex = medias.length - 1;
    } else if (nextIndex >= medias.length) {
      nextIndex = 0;
    }
    
    const nextMedia = medias[nextIndex];
    
    // Centrar el mapa en las coordenadas del siguiente media
    if (this.map) {
      // Cerrar el pop-up actual
      this.map.closePopup();
      
      this.map.flyTo([nextMedia.lat, nextMedia.lng], 13, { duration: 2 });
      
      // Esperar a que termine la animación y luego abrir el pop-up
      this.map.once('moveend', () => this.mediaMarkers.get(String(nextMedia.id))?.openPopup());
    }
  }

  private async updateLocationName(id: string, newLocation: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('map_photos')
        .update({ location_name: newLocation })
        .eq('id', id);

      if (error) {
        console.error('Error actualizando ubicación:', error);
        this.showNotificationMessage('Error al actualizar la ubicación', 'error');
        return;
      }

      this.showNotificationMessage('Ubicación actualizada correctamente', 'success');
    } catch (error) {
      console.error('Error:', error);
      this.showNotificationMessage('Error al actualizar la ubicación', 'error');
    }
  }

  private async deleteMedia(id: string | number, mediaUrl: string, mediaType: string): Promise<void> {
    this.confirmMessage.set('¿Estás seguro de que deseas borrar esto?');
    this.confirmCallback = async () => {
      try {
        this.isDeleting.set(true);
        
        // Extraer nombre del archivo de la URL
        const urlParts = mediaUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const bucket = mediaType === 'video' ? 'videos-mapa' : 'fotos-mapa';

        // Eliminar de Storage
        const { error: deleteError } = await this.supabase.storage
          .from(bucket)
          .remove([fileName]);

        if (deleteError) {
          console.error('Error eliminando archivo de Storage:', deleteError);
          this.showNotificationMessage('Error al eliminar el archivo', 'error');
          this.isDeleting.set(false);
          return;
        }

        // Eliminar de la base de datos
        const { error: dbError } = await this.supabase
          .from('map_photos')
          .delete()
          .eq('id', id);

        if (dbError) {
          console.error('Error eliminando de la BD:', dbError);
          this.showNotificationMessage('Error al eliminar de la base de datos', 'error');
          this.isDeleting.set(false);
          return;
        }

        const marker = this.mediaMarkers.get(String(id));
        if (marker) this.map.removeLayer(marker);
        this.mediaMarkers.delete(String(id));
        const deletedMedia = this.mapMediaItems().find((item) => String(item.id) === String(id));
        this.mapMediaItems.update((items) => items.filter((item) => String(item.id) !== String(id)));

        if (deletedMedia?.countryCode) {
          const updatedCountries = new Map(this.countriesData());
          const countryData = updatedCountries.get(deletedMedia.countryCode);
          if (countryData) {
            const photos = countryData.photos.filter((photo: any) => String(photo.id) !== String(id));
            updatedCountries.set(deletedMedia.countryCode, { ...countryData, photos, count: photos.length });
            this.countriesData.set(updatedCountries);
          }
        }

        this.updateCountryLayer();
        this.showConfirmDialog.set(false);
        this.isDeleting.set(false);
        this.showNotificationMessage('Contenido eliminado correctamente', 'success');

      } catch (error) {
        console.error('Error al eliminar:', error);
        this.showNotificationMessage('Error al eliminar el archivo', 'error');
        this.isDeleting.set(false);
      }
    };
    this.showConfirmDialog.set(true);
  }

  // ============== MÉTODOS PARA MAPA COROPLÉTICO ==============

  private async loadCountriesGeoJSON(): Promise<void> {
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
      );
      if (!response.ok) throw new Error(`GeoJSON request failed: ${response.status}`);
      this.countriesGeoJSON = await response.json();
      this.updateCountryLayer();
    } catch (error) {
      console.error('Error cargando GeoJSON de países:', error);
    }
  }

  private updateCountryLayer(): void {
    if (!this.countriesGeoJSON || !this.map) return;

    // Remover capa anterior si existe
    if (this.countriesLayer) {
      this.map.removeLayer(this.countriesLayer);
    }

    const geoJsonLayer = this.L.geoJSON(this.countriesGeoJSON, {
      style: (feature: any) => {
        const countryCode = String(feature.properties.ISO_A2 || '').toUpperCase();
        const countryData = this.countriesData().get(countryCode);
        const photoCount = countryData?.photos?.length || 0;
        const color = this.getCountryColor(photoCount);

        return {
          fillColor: color,
          weight: 2.5,
          opacity: 0.95,
          color: '#334155',
          fillOpacity: 0.35
        };
      },
      onEachFeature: (feature: any, layer: any) => {
        const countryName = feature.properties.NAME;
        const countryCode = String(feature.properties.ISO_A2 || '').toUpperCase();
        const countryData = this.countriesData().get(countryCode);
        const photoCount = countryData?.photos?.length || 0;

        // Popup con información
        const popupText = `<div style="font-size: 12px;">
          <strong>${countryName}</strong><br/>
          📸 Fotos: ${photoCount}
        </div>`;

        layer.bindPopup(popupText);

        // Click en país - Usar L.DomEvent.stop para detener completamente
        layer.on('click', (e: any) => {
          this.L.DomEvent.stop(e);
          this.isSelectingCountry = true;
          
          this.ngZone.run(() => {
            this.selectCountry(countryName, countryCode);
          });
        });

        // Efectos visuales al pasar mouse
        layer.on('mouseover', () => {
          layer.setStyle({
            weight: 3.5,
            fillOpacity: 0.5
          });
          layer.bringToFront();
        });

        layer.on('mouseout', () => {
          layer.setStyle({
            weight: 2.5,
            fillOpacity: 0.35
          });
        });
      }
    }).addTo(this.map);

    // Guardar referencia a la capa
    this.countriesLayer = geoJsonLayer;
  }

  private getCountryColor(photoCount: number): string {
    if (photoCount === 0) return '#fce7f3';
    if (photoCount <= 5) return '#f9a8d4';
    if (photoCount <= 15) return '#ec4899';
    if (photoCount <= 30) return '#be185d';
    return '#831843';
  }

  private selectCountry(countryName: string, countryCode: string): void {
    this.selectedCountry.set(countryName);
    this.selectedCountryCode.set(countryCode);
    this.showCountryGallery.set(true);
    this.currentCountryIndex.set(0);
    this.cdr.detectChanges();
    // El flag se reseteará en el siguiente click del mapa
  }

  protected closeCountryGallery(): void {
    this.showCountryGallery.set(false);
    this.selectedCountry.set(null);
    this.selectedCountryCode.set(null);
    this.currentCountryIndex.set(0);
  }

  protected nextCountryPhoto(): void {
    const photos = this.countryPhotos();
    if (photos.length === 0) return;

    let index = this.currentCountryIndex() + 1;
    if (index >= photos.length) index = 0;
    this.currentCountryIndex.set(index);
  }

  protected prevCountryPhoto(): void {
    const photos = this.countryPhotos();
    if (photos.length === 0) return;

    let index = this.currentCountryIndex() - 1;
    if (index < 0) index = photos.length - 1;
    this.currentCountryIndex.set(index);
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

  private showNotificationMessage(message: string, type: 'success' | 'error' | 'pending'): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notification.set(message);
    this.notificationType.set(type);
    this.showNotification.set(true);
    this.cdr.detectChanges();

    this.notificationTimeout = setTimeout(() => {
      this.showNotification.set(false);
      this.cdr.detectChanges();
    }, 3500);
  }

  closeNotification(): void {
    this.showNotification.set(false);
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  confirmDelete(): void {
    this.showConfirmDialog.set(false);
    if (this.confirmCallback) {
      this.confirmCallback();
      this.confirmCallback = null;
    }
  }

  cancelDelete(): void {
    this.showConfirmDialog.set(false);
    this.confirmCallback = null;
  }
}
