import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (data: string) => void;
}

export function QRScanner({ open, onOpenChange, onScan }: QRScannerProps) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>("qr-scanner-" + Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!open) return;

    const startScanner = async () => {
      try {
        setError("");
        const scanner = new Html5Qrcode(containerRef.current);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
            onOpenChange(false);
          },
          () => {}
        );
      } catch (err: any) {
        setError("Camera access denied or unavailable. Please allow camera permissions.");
      }
    };

    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Scan QR Code</DialogTitle></DialogHeader>
        <div id={containerRef.current} className="w-full" />
        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        <p className="text-sm text-muted-foreground text-center">Point your camera at a product QR code</p>
      </DialogContent>
    </Dialog>
  );
}
