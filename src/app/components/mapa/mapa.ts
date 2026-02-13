import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';

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

  private tempMarker: any = null;
  howModal = false;


  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

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
    this.L = await import('leaflet');
    this.fixLeafletIconPath();
  }

  private initMap(): void {
    const sevillaCoords: [number, number] = [37.3891, -5.9845];

    this.map = this.L.map('map', {
      center: sevillaCoords,
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
  onImageSelected(event: any): void {
    if (!this.selectedCoords) {
      alert('Primero haz click en el mapa');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const imageBase64 = reader.result as string;

      const photoData = {
        lat: this.selectedCoords![0],
        lng: this.selectedCoords![1],
        image: imageBase64
      };

      this.savePhoto(photoData);
      this.addPhotoMarker(photoData);
    };

    reader.readAsDataURL(file);
  }

  private addPhotoMarker(photo: any): void {
    this.L.marker([photo.lat, photo.lng])
      .addTo(this.map)
      .bindPopup(`
        <div style="width:200px">
          <img src="${photo.image}" style="width:100%; border-radius:8px"/>
        </div>
      `);
  }

  private savePhoto(photo: any): void {
    const existing = JSON.parse(localStorage.getItem('mapPhotos') || '[]');
    existing.push(photo);
    localStorage.setItem('mapPhotos', JSON.stringify(existing));
  }

  private loadSavedPhotos(): void {
    const saved = JSON.parse(localStorage.getItem('mapPhotos') || '[]');
    saved.forEach((photo: any) => {
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
