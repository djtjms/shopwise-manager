import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Download } from "lucide-react";

interface QRCodeViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; name: string; sku?: string; barcode?: string; selling_price: number } | null;
}

export function QRCodeView({ open, onOpenChange, product }: QRCodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !product || !canvasRef.current) return;
    const qrData = JSON.stringify({
      id: product.id,
      name: product.name,
      sku: product.sku || "",
      price: product.selling_price,
    });
    QRCode.toCanvas(canvasRef.current, qrData, { width: 200, margin: 2 });
  }, [open, product]);

  const handlePrint = () => {
    if (!canvasRef.current || !product) return;
    const dataUrl = canvasRef.current.toDataURL();
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Code - ${product.name}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;}
      img{margin-bottom:10px;}p{margin:2px 0;font-size:14px;}</style></head>
      <body>
        <img src="${dataUrl}" width="200" height="200" />
        <p><strong>${product.name}</strong></p>
        ${product.sku ? `<p>SKU: ${product.sku}</p>` : ""}
        <p>Price: ৳${product.selling_price}</p>
        <script>window.print();window.close();</script>
      </body></html>
    `);
  };

  const handleDownload = () => {
    if (!canvasRef.current || !product) return;
    const link = document.createElement("a");
    link.download = `qr-${product.sku || product.id}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader><DialogTitle>QR Code</DialogTitle></DialogHeader>
        {product && (
          <div className="flex flex-col items-center gap-3">
            <canvas ref={canvasRef} />
            <p className="font-medium">{product.name}</p>
            {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
            <p className="text-sm">Price: ৳{product.selling_price}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button size="sm" variant="outline" onClick={handleDownload}><Download className="h-4 w-4 mr-1" /> Download</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
