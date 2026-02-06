/**
 * DeviceFingerprintCollector - Collects device fingerprint during signup
 * Hidden component that populates a form field with device hash
 * ~50 lines
 */

import { useEffect } from "preact/hooks";

interface DeviceFingerprintCollectorProps {
  inputName?: string;
}

export default function DeviceFingerprintCollector({ inputName = "deviceHash" }: DeviceFingerprintCollectorProps) {
  useEffect(() => {
    collectAndSetFingerprint();
  }, []);

  const collectAndSetFingerprint = async () => {
    try {
      const hash = await generateDeviceHash();
      const input = document.querySelector(`input[name="${inputName}"]`) as HTMLInputElement;
      if (input) {
        input.value = hash;
      }
    } catch (error) {
      console.warn("Failed to collect device fingerprint:", error);
    }
  };

  const generateDeviceHash = async (): Promise<string> => {
    const components: string[] = [
      navigator.userAgent || '',
      navigator.language || '',
      (navigator.hardwareConcurrency || 0).toString(),
      screen.width.toString(),
      screen.height.toString(),
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString(),
      (navigator.maxTouchPoints || 0).toString(),
    ];

    // Canvas fingerprint
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#10b981';
        ctx.fillText('ChoreGami-fp-2026', 2, 2);
        components.push(canvas.toDataURL().slice(-50));
      }
    } catch {
      components.push('no-canvas');
    }

    // Hash
    const data = components.join('|');
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Render hidden input
  return <input type="hidden" name={inputName} value="" />;
}
