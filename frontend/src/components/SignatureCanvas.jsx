import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

/**
 * SignatureCanvas — lets the user draw a signature with mouse / touch.
 * Expose `getImageDataUrl()` via ref so the parent can retrieve the PNG.
 */
const SignatureCanvas = forwardRef(function SignatureCanvas({ width = 400, height = 160, lineColor = '#1a1a2e', lineWidth = 2.5 }, ref) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

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
