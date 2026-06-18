import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

/* ==========================================================================
 * ✍️ COMPONENT: SignatureCanvas
 * --------------------------------------------------------------------------
 * A reusable canvas component that allows users to draw their signature 
 * using a mouse, touch, or stylus. It exposes imperative handles to let 
 * parent components retrieve the drawn image as a base64 PNG data URL.
 * ========================================================================== */
const SignatureCanvas = forwardRef(function SignatureCanvas({ width = 400, height = 160, lineColor = '#1a1a2e', lineWidth = 2.5 }, ref) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  /* ------------------------------------------------------------------------
   * 🔗 IMPERATIVE HANDLE
   * ------------------------------------------------------------------------
   * Exposes specific methods to the parent component via the forwarded ref.
   * - getImageDataUrl: Returns the PNG string or null if canvas is empty.
   * - clear: Programmatically clears the canvas.
   * - isEmpty: Returns the current empty state.
   * ------------------------------------------------------------------------ */
  useImperativeHandle(ref, () => ({
    getImageDataUrl() {
      return isEmpty ? null : canvasRef.current?.toDataURL('image/png');
    },
    clear() {
      clearCanvas();
    },
    isEmpty() {
      return isEmpty;
    },
  }));

  /* ------------------------------------------------------------------------
   * 🎨 EFFECT: Initialize Canvas Context
   * ------------------------------------------------------------------------
   * Sets up the initial canvas state, including a solid white background 
   * (to prevent transparent PNG issues) and standardizing stroke properties.
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [lineColor, lineWidth]);

  /* ------------------------------------------------------------------------
   * 📍 FUNCTION: getPos
   * ------------------------------------------------------------------------
   * Normalizes mouse and touch coordinates relative to the canvas size and 
   * its actual rendered dimensions (handling CSS scaling differences).
   * ------------------------------------------------------------------------ */
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  /* ------------------------------------------------------------------------
   * 🖱️ DRAWING EVENT HANDLERS
   * ------------------------------------------------------------------------
   * Handles the start, progression, and termination of the drawing strokes.
   * ------------------------------------------------------------------------ */
  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  /* ==========================================================================
   * 🖼️ RENDER UI
   * ========================================================================== */
  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-white touch-none cursor-crosshair"
        style={{ maxWidth: width }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="flex gap-2 w-full justify-end">
        <button
          type="button"
          onClick={clearCanvas}
          className="px-4 py-1.5 text-sm font-bold rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition"
        >
          Clear
        </button>
      </div>
      {isEmpty && (
        <p className="text-xs text-slate-400 font-medium -mt-2">Draw your signature above</p>
      )}
    </div>
  );
});

export default SignatureCanvas;
