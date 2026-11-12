export interface SupportedVideoFormat {
  mimeType: string;
  extension: 'mp4' | 'webm';
  label: string;
}

export function detectBestVideoFormat(): SupportedVideoFormat {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', extension: 'webm', label: 'WebM' };
  }

  const candidates: SupportedVideoFormat[] = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4', label: 'MP4 (H.264)' },
    { mimeType: 'video/mp4', extension: 'mp4', label: 'MP4' },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm', label: 'WebM (VP9)' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm', label: 'WebM (VP8)' },
    { mimeType: 'video/webm', extension: 'webm', label: 'WebM' },
  ];

  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: 'video/webm', extension: 'webm', label: 'WebM' };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function exportCanvasToPng(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
  );
  if (!blob) {
    throw new Error('Не удалось сформировать PNG файл');
  }
  triggerBlobDownload(blob, filename);
}
