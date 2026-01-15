import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Preguntas } from './preguntas';

describe('Preguntas', () => {
  let component: Preguntas;
  let fixture: ComponentFixture<Preguntas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Preguntas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Preguntas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
