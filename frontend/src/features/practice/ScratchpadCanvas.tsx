import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import { canvasPoint, PENS, strokeFor, type PenId, type Tool } from './scratchpad';

const HEIGHT = 220;
const PEN_IDS = Object.keys(PENS) as PenId[];
// squared paper, like a math notebook
const GRID = {
  backgroundImage:
    'linear-gradient(#e3e1f0 1px, transparent 1px), linear-gradient(90deg, #e3e1f0 1px, transparent 1px)',
  backgroundSize: '20px 20px',
} as const;

/**
 * Papan Coretan: a free drawing board under the problem text (finger, pen or mouse).
 * Nothing is saved or graded. The parent remounts it per problem (`key`), which clears it.
 */
export function ScratchpadCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>('ink');

  // match the canvas to its box (and the screen's pixel density), keeping what is drawn
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(wrap.clientWidth);
      if (!width || canvas.width === Math.round(width * dpr)) return;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      if (canvas.width) copy.getContext('2d')?.drawImage(canvas, 0, 0);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(HEIGHT * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${HEIGHT}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (copy.width) ctx.drawImage(copy, 0, 0, copy.width / dpr, copy.height / dpr);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const pointFrom = (e: PointerEvent<HTMLCanvasElement>) =>
    canvasPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());

  const drawTo = (to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d');
    const from = last.current;
    if (!ctx || !from) return;
    const style = strokeFor(tool);
    ctx.globalCompositeOperation = style.composite;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    last.current = to;
  };

  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFrom(e);
    last.current = p;
    drawTo({ x: p.x + 0.01, y: p.y }); // a tap leaves a dot
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (last.current) drawTo(pointFrom(e));
  };
  const end = () => {
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toolButton = (active: boolean) =>
    `grid h-9 w-9 place-items-center rounded-full border-2 transition active:scale-95 ${active ? 'border-plum-800 bg-white shadow-[0_2px_0_#3b2d4f]' : 'border-transparent bg-lavender-100'}`;

  return (
    <section className="mt-4 rounded-3xl border-2 border-lavender-200 bg-lavender-50 p-2.5" aria-label={t.tools.scratchTitle}>
      <div className="flex items-center gap-1.5 px-1 pb-2">
        {PEN_IDS.map((pen) => (
          <button
            key={pen}
            type="button"
            onClick={() => setTool(pen)}
            aria-label={t.tools.pens[pen]}
            aria-pressed={tool === pen}
            title={t.tools.pens[pen]}
            className={toolButton(tool === pen)}
          >
            <span className="h-4 w-4 rounded-full" style={{ background: PENS[pen] }} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTool('eraser')}
          aria-label={t.tools.eraser}
          aria-pressed={tool === 'eraser'}
          title={t.tools.eraser}
          className={`${toolButton(tool === 'eraser')} text-plum-700`}
        >
          <Icon name="eraser" size={18} />
        </button>
        <button
          type="button"
          onClick={clear}
          className="ml-auto flex items-center gap-1 rounded-full px-3 py-2 text-xs font-extrabold text-plum-700 transition hover:bg-lavender-100 active:scale-95"
        >
          <Icon name="trash" size={16} />
          {t.tools.clear}
        </button>
      </div>
      <div ref={wrapRef} className="overflow-hidden rounded-2xl bg-white" style={GRID}>
        <canvas
          ref={canvasRef}
          aria-label={t.tools.canvasLabel}
          className={`block touch-none ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
          style={{ height: HEIGHT }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
      </div>
      <p className="px-1 pt-1.5 text-[11px] font-bold text-ink-muted">{t.tools.scratchNote}</p>
    </section>
  );
}
