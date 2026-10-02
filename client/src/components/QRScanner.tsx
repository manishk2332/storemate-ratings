import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner({ onStoreScan, onClose }: { onStoreScan: (storeId: number) => void; onClose: () => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [message, setMessage] = useState("Point your camera at a StoreMate store QR code.");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("storemate-qr-reader");
    scannerRef.current = scanner;
    let active = true;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      decodedText => {
        const match = decodedText.match(/(?:storemate:\/\/store\/|[?&]storeId=)(\d+)/i) ?? decodedText.match(/^\s*(\d+)\s*$/);
        if (!match) {
          setMessage("This QR code is not a StoreMate store code.");
          return;
        }
        const storeId = Number(match[1]);
        if (!Number.isInteger(storeId) || storeId < 1) {
          setMessage("Invalid store code. Please scan another QR code.");
          return;
        }
        setMessage("Store found. Opening its rating card…");
        active = false;
        scanner.stop().catch(() => undefined).finally(() => onStoreScan(storeId));
      },
      () => undefined,
    ).then(() => { if (active) setIsScanning(true); }).catch(() => {
      if (active) setMessage("Camera access was blocked. Allow camera permission and try again, or close this scanner.");
    });

    return () => {
      active = false;
      if (scanner.isScanning) scanner.stop().catch(() => undefined);
      scanner.clear();
      scannerRef.current = null;
    };
  }, [onStoreScan]);

  return <div className="qr-overlay" role="dialog" aria-modal="true" aria-labelledby="qr-title">
    <div className="qr-modal">
      <div className="qr-modal-head"><div><div className="eyebrow">Quick access</div><h2 id="qr-title">Scan a store QR</h2></div><button className="secondary-button qr-close" onClick={onClose} aria-label="Close QR scanner">×</button></div>
      <div id="storemate-qr-reader" className="qr-reader" />
      <p className="qr-status">{isScanning ? message : message}</p>
      <p className="qr-help">Store codes can contain a number such as <code>2</code>, <code>storemate://store/2</code>, or a URL ending in <code>?storeId=2</code>.</p>
    </div>
  </div>;
}
