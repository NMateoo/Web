import { Component, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Pregunta {
  id: number;
  texto: string;
  opciones: string[];
}

@Component({
  selector: 'app-preguntas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preguntas.html',
  styleUrl: './preguntas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Preguntas {
  private readonly STORAGE_KEY = 'cuestionario_respuestas';

  preguntas: Pregunta[] = [
    {
      id: 1,
      texto: '¿Cuál es la capital de Francia?',
      opciones: ['Londres', 'París', 'Berlín', 'Madrid'],
    },
    {
      id: 2,
      texto: '¿Cuál es el planeta más grande del sistema solar?',
      opciones: ['Marte', 'Saturno', 'Júpiter', 'Venus'],
    },
    {
      id: 3,
      texto: '¿En qué año termina la Segunda Guerra Mundial?',
      opciones: ['1943', '1944', '1945', '1946'],
    },
    {
      id: 4,
      texto: '¿Cuál es el océano más grande?',
      opciones: ['Atlántico', 'Índico', 'Ártico', 'Pacífico'],
    },
    {
      id: 5,
      texto: '¿Quién pintó la Mona Lisa?',
      opciones: ['Michelangelo', 'Da Vinci', 'Raphael', 'Donatello'],
    },
  ];

  respuestas = signal<Map<number, string>>(new Map());
  mostrarResultados = signal(false);

  respuestasGuardadas = computed(() => {
    return this.respuestas().size === this.preguntas.length;
  });

  constructor() {
    this.cargarRespuestas();
  }

  seleccionarRespuesta(preguntaId: number, opcion: string): void {
    this.respuestas.update((map) => new Map(map).set(preguntaId, opcion));
  }

  obtenerRespuesta(preguntaId: number): string | undefined {
    return this.respuestas().get(preguntaId);
  }

  guardarRespuestas(): void {
    const respuestasObj: Record<string, string> = {};
    this.respuestas().forEach((valor, clave) => {
      respuestasObj[clave] = valor;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(respuestasObj));
    this.mostrarResultados.set(true);
    setTimeout(() => this.mostrarResultados.set(false), 3000);
  }

  private cargarRespuestas(): void {
    const guardadas = localStorage.getItem(this.STORAGE_KEY);
    if (guardadas) {
      const respuestasObj = JSON.parse(guardadas);
      const map = new Map<number, string>();
      Object.entries(respuestasObj).forEach(([clave, valor]) => {
        map.set(Number(clave), valor as string);
      });
      this.respuestas.set(map);
    }
  }

  limpiarRespuestas(): void {
    this.respuestas.set(new Map());
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
