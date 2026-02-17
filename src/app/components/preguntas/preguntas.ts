import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Pregunta {
  id: number;
  texto: string;
  tipo: 'multiple' | 'abierta';
  opciones?: string[];
  respuestaSeleccionada?: string;
  respuestaAbierta?: string;
  respondida: boolean;
}

@Component({
  selector: 'app-preguntas',
  imports: [CommonModule, FormsModule],
  templateUrl: './preguntas.html',
  styleUrl: './preguntas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Preguntas {
  preguntas: Pregunta[] = [
    { 
      id: 1, 
      texto: '¿Cuál es nuestro día?', 
      tipo: 'multiple',
      opciones: ['10/03', '10/10', '10/05', '10/08'],
      respondida: false 
    },
    { 
      id: 2, 
      texto: '¿Cuál es nuestra comida favorita?', 
      tipo: 'multiple',
      opciones: ['Pizza', 'Pasta', 'Sushi', 'Hamburguesa'],
      respondida: false 
    },
    { 
      id: 3, 
      texto: '¿Dónde nos gustaría viajar juntos?', 
      tipo: 'abierta',
      respondida: false 
    },
    { 
      id: 4, 
      texto: 'Algún momento especial juntos', 
      tipo: 'abierta',
      respondida: false 
    },
    { 
      id: 5, 
      texto: '¿Por que siempre nos perdemos cuando salimos?', 
      tipo: 'multiple',
      opciones: ['Mateo no se orienta', 'Sara no sabe usar el GPS', 'Tenemos mala suerte', 'Es el destino'],
      respondida: false 
    },
  ];

  preguntaActual: Pregunta | null = null;
  mostrarPregunta: boolean = false;

  seleccionarPregunta(pregunta: Pregunta) {
    if (!pregunta.respondida) {
      this.preguntaActual = { ...pregunta };
      this.mostrarPregunta = true;
    }
  }

  seleccionarOpcion(opcion: string) {
    if (this.preguntaActual) {
      this.preguntaActual.respuestaSeleccionada = opcion;
    }
  }

  guardarRespuesta() {
    if (this.preguntaActual) {
      const preguntaOriginal = this.preguntas.find(p => p.id === this.preguntaActual!.id);
      if (preguntaOriginal) {
        preguntaOriginal.respondida = true;
        preguntaOriginal.respuestaSeleccionada = this.preguntaActual.respuestaSeleccionada;
        preguntaOriginal.respuestaAbierta = this.preguntaActual.respuestaAbierta;
      }
      this.cerrarPregunta();
    }
  }

  cerrarPregunta() {
    this.mostrarPregunta = false;
    this.preguntaActual = null;
  }

  reiniciarJuego() {
    this.preguntas.forEach(p => {
      p.respondida = false;
      p.respuestaSeleccionada = undefined;
      p.respuestaAbierta = undefined;
    });
  }

  puedeGuardar(): boolean {
    if (!this.preguntaActual) return false;
    
    if (this.preguntaActual.tipo === 'multiple') {
      return !!this.preguntaActual.respuestaSeleccionada;
    } else {
      return !!this.preguntaActual.respuestaAbierta && this.preguntaActual.respuestaAbierta.trim().length > 0;
    }
  }

  get preguntasRespondidas(): number {
    return this.preguntas.filter(p => p.respondida).length;
  }
}