
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Trash2 } from 'lucide-react'; 

interface CustomerSignatureProps {
  onSaveSignature: (dataUrl: string) => void;
  width?: number;
  height?: number;
  backgroundColor?: string;
  penColor?: string;
  penWidth?: number;
}

const CustomerSignature: React.FC<CustomerSignatureProps> = ({
  onSaveSignature,
  width: initialWidth = 400,
  height: initialHeight = 200,
  backgroundColor = 'hsl(0 0% 100%)', 
  penColor = 'hsl(0 0% 0%)', 
  penWidth = 2.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [hasUnsavedDrawing, setHasUnsavedDrawing] = useState<boolean>(false);
  
  const [canvasWidth, setCanvasWidth] = useState(initialWidth);
  const [canvasHeight, setCanvasHeight] = useState(initialHeight);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable function to get context
  const getCtx = useCallback(() => canvasRef.current?.getContext('2d'), []);

  // Resize handler
  const handleCanvasResize = useCallback(() => {
    if (containerRef.current && canvasRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      // Ensure a minimum width and subtract border/padding if any (e.g., 2px border on each side)
      const newWidth = Math.max(containerWidth > 4 ? containerWidth - 0 : containerWidth, 200); 
      const aspectRatio = initialWidth / initialHeight;
      const newHeight = Math.round(newWidth / aspectRatio);

      if (canvasRef.current.width === newWidth && canvasRef.current.height === newHeight) {
        return; 
      }
      
      setCanvasWidth(newWidth); 
      setCanvasHeight(newHeight);
      // When canvas resizes, any unsaved drawing is lost.
      // This is inherent to canvas resizing without redrawing paths.
      // We clear hasUnsavedDrawing because the drawing is gone.
      // We don't call onSaveSignature("") here to prevent unwanted "cleared" messages.
      setHasUnsavedDrawing(false);
    }
  }, [initialWidth, initialHeight]); // Dependencies: initial dimensions

  // Effect for ResizeObserver
  useEffect(() => {
    handleCanvasResize(); // Initial check
    const resizeObserver = new ResizeObserver(handleCanvasResize);
    const currentContainerRef = containerRef.current;
    if (currentContainerRef) {
      resizeObserver.observe(currentContainerRef);
    }
    return () => {
      if (currentContainerRef) {
        resizeObserver.unobserve(currentContainerRef);
      }
      resizeObserver.disconnect();
    };
  }, [handleCanvasResize]);


  // Main effect to draw on canvas based on state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); // Get context directly
    if (!ctx) return;

    // Helper to initialize (clear and style) the canvas
    const internalInitializeCanvas = () => {
      // Ensure physical canvas dimensions match state
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    // Helper to draw placeholder text
    const internalDrawPlaceholder = () => {
      ctx.font = "italic 16px sans-serif";
      ctx.fillStyle = "hsl(0 0% 70%)"; 
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Sign here", canvas.width / 2, canvas.height / 2);
      // Reset pen color for actual drawing after placeholder
      ctx.strokeStyle = penColor;
      ctx.fillStyle = backgroundColor; 
    };
    
    // If canvas dimensions changed and are reflected in canvasWidth/Height state
    // this effect will re-run. We must ensure the physical canvas matches.
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        internalInitializeCanvas();
        // If there was a saved signature, attempt to redraw it
        if (signatureDataUrl) {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
            img.src = signatureDataUrl;
        } else {
            // No saved sig, and unsaved drawing was lost by resize, so draw placeholder
            internalDrawPlaceholder();
        }
        return; // Important: exit after resize handling
    }


    // If currently drawing, this effect should not interfere. Actual drawing is handled by event handlers.
    if (isDrawing) {
      return;
    }

    // Not drawing. Decide what to display:
    if (signatureDataUrl) { // A signature has been saved
      internalInitializeCanvas(); // Clear and set styles for drawing the image
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
      img.src = signatureDataUrl;
    } else if (hasUnsavedDrawing) {
      // Has an unsaved drawing, canvas should already contain it. Do nothing here to preserve it.
      // Ensure pen styles are correct for next stroke (already set by initialize or startDrawing)
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else { // No saved sig, no unsaved drawing -> draw placeholder
      internalInitializeCanvas(); 
      internalDrawPlaceholder();
    }

  }, [
    signatureDataUrl, hasUnsavedDrawing, isDrawing, 
    canvasWidth, canvasHeight, 
    backgroundColor, penColor, penWidth // Props that affect canvas appearance
  ]);


  const getCoordinates = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (event.nativeEvent instanceof MouseEvent) {
      x = event.nativeEvent.offsetX;
      y = event.nativeEvent.offsetY;
    } else if (event.nativeEvent instanceof TouchEvent && event.nativeEvent.touches.length > 0) {
      event.preventDefault(); 
      x = event.nativeEvent.touches[0].clientX - rect.left;
      y = event.nativeEvent.touches[0].clientY - rect.top;
    } else {
      return { x:0, y:0 };
    }
    return { x, y };
  }, []); // canvasRef is stable

  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // If starting to draw over a saved signature, or from placeholder state, clear it.
    if (signatureDataUrl || !hasUnsavedDrawing) {
      // Full clear and style reset:
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (signatureDataUrl) {
        setSignatureDataUrl(null); 
        onSaveSignature(""); // Notify parent that saved signature is being replaced
      }
      // If !hasUnsavedDrawing, it means we were showing placeholder or it was empty
      // hasUnsavedDrawing will be set to true in endDrawing
    }
    
    const { x, y } = getCoordinates(event);
    ctx.beginPath(); 
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, [getCoordinates, signatureDataUrl, hasUnsavedDrawing, onSaveSignature, backgroundColor, penColor, penWidth]);

  const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (event.nativeEvent instanceof TouchEvent) {
      event.preventDefault();
    }

    const { x, y } = getCoordinates(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getCoordinates]);

  const endDrawing = useCallback(() => {
    if (!isDrawing) return; 
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.closePath();
    }
    setIsDrawing(false); 
    if (!hasUnsavedDrawing) { // Only set if it was false, to mark that drawing has occurred
        setHasUnsavedDrawing(true);
    }
  }, [isDrawing, hasUnsavedDrawing]); // setHasUnsavedDrawing is stable

  const handleSaveSignatureClick = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasUnsavedDrawing) return; // Only save if there's an unsaved drawing
    
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl); 
    onSaveSignature(dataUrl);    
    setHasUnsavedDrawing(false); // Drawing is now saved
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Full clear and style reset:
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw placeholder after clearing
    ctx.font = "italic 16px sans-serif";
    ctx.fillStyle = "hsl(0 0% 70%)"; 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sign here", canvas.width / 2, canvas.height / 2);
    // Reset pen color for actual drawing after placeholder
    ctx.strokeStyle = penColor;
    ctx.fillStyle = backgroundColor; 
    
    setSignatureDataUrl(null);   
    onSaveSignature(""); 
    setHasUnsavedDrawing(false); 
    setIsDrawing(false); 
  };

  const canClear = hasUnsavedDrawing || !!signatureDataUrl;
  const canSave = hasUnsavedDrawing;


  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing} 
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        className="border border-input rounded-md cursor-crosshair touch-none bg-white shadow-sm"
        aria-label="Signature Pad"
        style={{ width: '100%', height: 'auto', maxHeight: `${initialHeight * 1.5}px` }} 
      />
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={clearSignature} 
          aria-label="Clear Signature"
          disabled={!canClear}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Clear Signature
        </Button>
        <Button 
          onClick={handleSaveSignatureClick} 
          aria-label="Save Signature"
          disabled={!canSave} 
        >
          <Check className="mr-2 h-4 w-4" /> Save Signature
        </Button>
      </div>
    </div>
  );
};

export default CustomerSignature;
