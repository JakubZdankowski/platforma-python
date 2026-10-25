import { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import consoleImage from '../assets/showcase/python-console.jpg';
import turtleImage from '../assets/showcase/turtle-drawing.jpg';
import lessonsImage from '../assets/showcase/student-lessons.jpg';

const slides = [
  { image: consoleImage, title: 'Pisz kod i sprawdzaj wyniki', alt: 'Przykładowe ćwiczenie: kod Pythona z pętlą i jego wynik w konsoli.' },
  { image: turtleImage, title: 'Rysuj i eksperymentuj z żółwiem', alt: 'Przykładowe ćwiczenie: pętle Pythona rysujące niebieską rozetę za pomocą żółwia.' },
  { image: lessonsImage, title: 'Odkrywaj kolejne lekcje', alt: 'Przykładowy panel ucznia z modułem Podstawy Pythona i listą lekcji.' },
];

export function PlatformCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(preference.matches);
    const onVisibility = () => setVisible(!document.hidden);
    preference.addEventListener('change', onChange);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      preference.removeEventListener('change', onChange);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (paused || hovered || focused || reducedMotion || !visible) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, reducedMotion, visible]);

  const selectSlide = (next: number) => {
    setIndex((next + slides.length) % slides.length);
    setPaused(true);
  };

  return <section className="platform-carousel" aria-label="Zobacz platformę w działaniu" aria-roledescription="karuzela"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <div className="platform-carousel-slides" aria-live={paused || reducedMotion ? 'polite' : 'off'}>
      {slides.map((slide, position) => <figure key={slide.image} hidden={position !== index}
        role="group" aria-roledescription="slajd" aria-label={`${position + 1} z ${slides.length}`}>
        <img src={slide.image} width="1440" height="820" alt={slide.alt} fetchPriority={position === 0 ? 'high' : 'auto'} />
        <figcaption>{slide.title}</figcaption>
      </figure>)}
    </div>
    <div className="platform-carousel-controls">
      <div className="platform-carousel-navigation">
        <Button size="compact" variant="quiet" onClick={() => selectSlide(index - 1)} aria-label="Poprzedni zrzut">Poprzedni</Button>
        <span className="platform-carousel-count">{index + 1} / {slides.length}</span>
        <Button size="compact" variant="quiet" onClick={() => selectSlide(index + 1)} aria-label="Następny zrzut">Następny</Button>
      </div>
      {!reducedMotion && <Button size="compact" variant="quiet" onClick={() => setPaused(value => !value)}>
        {paused ? 'Wznów pokaz' : 'Zatrzymaj pokaz'}
      </Button>}
    </div>
  </section>;
}
