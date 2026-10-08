import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tooltip, Typography } from '@mui/material';
import type { Pin } from '../types.ts';
import { centeredSquare, moveSquare, resizeSquare } from './scavenger.ts';
import type { CropSquare, HuntPhoto } from './scavenger.ts';
import { addCaptureMetadata, captureMetadataMatches, formatPhotoTakenAt } from './photoMetadata.ts';

function usePhotoUrl(blob: Blob): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export function HuntPhotoCard({ pin, photo }: { pin: Pin; photo: HuntPhoto }) {
  const url = usePhotoUrl(photo.blob);
  return <Box className="pingo-hunt-photo">
    {url && <img src={url} alt={`Photo of ${pin.name}`} />}
    <span>{pin.name}</span>
  </Box>;
}

export function HuntPhotoPreview({ pin, photo }: { pin: Pin; photo: HuntPhoto }) {
  const url = usePhotoUrl(photo.blob);
  return url ? <Tooltip describeChild title={formatPhotoTakenAt(photo.capturedAt)}>
    <img className="pingo-hunt-preview-image" src={url} alt={`Full photo of ${pin.name}`} />
  </Tooltip> : null;
}

type Drag = { mode: 'move' | 'resize'; x: number; y: number; square: CropSquare };

function SquareEditor({ blob, onConfirm, busy }: {
  blob: Blob; onConfirm: (blob: Blob) => void; busy: boolean;
}) {
  const [url, setUrl] = useState('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [square, setSquare] = useState<CropSquare | null>(null);
  const [error, setError] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !frameRef.current) return;
    const measure = () => {
      const imageBox = image.getBoundingClientRect();
      const frameBox = frameRef.current?.getBoundingClientRect();
      if (frameBox) setRendered({ left: imageBox.left - frameBox.left,
        top: imageBox.top - frameBox.top, width: imageBox.width, height: imageBox.height });
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(image);
    window.addEventListener('resize', measure);
    measure();
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [url]);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !imageRef.current) return;
    const { width, height } = imageRef.current.getBoundingClientRect();
    const dx = (event.clientX - drag.current.x) * dimensions.width / width;
    const dy = (event.clientY - drag.current.y) * dimensions.height / height;
    setSquare(drag.current.mode === 'move' ?
      moveSquare(drag.current.square, dx, dy, dimensions.width, dimensions.height) :
      resizeSquare(drag.current.square, Math.abs(dx) > Math.abs(dy) ? dx : dy,
        dimensions.width, dimensions.height));
  };

  const confirm = () => {
    if (!square || !imageRef.current) return;
    const canvas = document.createElement('canvas');
    const size = Math.min(1024, Math.round(square.size));
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) { setError('This browser could not crop the photo.'); return; }
    context.drawImage(imageRef.current, square.x, square.y, square.size, square.size,
      0, 0, size, size);
    canvas.toBlob(cropped => {
      if (cropped) onConfirm(cropped);
      else setError('This browser could not save the cropped photo.');
    }, 'image/jpeg', 0.85);
  };

  return <Stack spacing={1} sx={{ alignItems: 'center' }}>
    <Typography>Drag the square over the pin. Drag its lower-right corner to expand or shrink it.</Typography>
    <Box ref={frameRef} className="pingo-crop-frame">
      {url && <img ref={imageRef} src={url} alt="Photo to crop" onLoad={event => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        setDimensions({ width: naturalWidth, height: naturalHeight });
        setSquare(centeredSquare(naturalWidth, naturalHeight));
        const imageBox = event.currentTarget.getBoundingClientRect();
        const frameBox = frameRef.current?.getBoundingClientRect();
        if (frameBox) setRendered({ left: imageBox.left - frameBox.left,
          top: imageBox.top - frameBox.top, width: imageBox.width, height: imageBox.height });
      }} />}
      {square && rendered.width > 0 && <Box className="pingo-crop-square"
        style={{ left: rendered.left + square.x / dimensions.width * rendered.width,
          top: rendered.top + square.y / dimensions.height * rendered.height,
          width: square.size / dimensions.width * rendered.width,
          height: square.size / dimensions.height * rendered.height }}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { mode: 'move', x: event.clientX, y: event.clientY, square };
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}>
        <span className="pingo-crop-handle" aria-label="Resize crop square"
          onPointerDown={event => {
            event.stopPropagation();
            event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
            drag.current = { mode: 'resize', x: event.clientX, y: event.clientY, square };
          }} />
      </Box>}
    </Box>
    <Button variant="contained" onClick={confirm} disabled={!square || busy}>Confirm photo</Button>
    {error && <Typography role="alert" color="error">{error}</Typography>}
  </Stack>;
}

function LiveCamera({ onCapture }: { onCapture: (blob: Blob, capturedAt: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot open a camera. Use a device with camera access.');
      return;
    }
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(opened => {
        if (!active) { opened.getTracks().forEach(track => track.stop()); return; }
        stream = opened;
        if (videoRef.current) videoRef.current.srcObject = opened;
      })
      .catch(() => { if (active) setError('Camera access was unavailable. Allow camera access and try again.'); });
    return () => {
      active = false;
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight ||
        !(video.srcObject as MediaStream | null)?.getVideoTracks().some(track => track.readyState === 'live')) {
      setError('The camera is no longer live. Please reopen it and try again.');
      return;
    }
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) { setError('This browser could not capture the photo.'); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const capturedAt = Date.now();
    canvas.toBlob(blob => {
      if (blob) onCapture(blob, capturedAt);
      else setError('This browser could not capture the photo.');
    }, 'image/jpeg', 0.88);
  };

  return <Stack spacing={1} sx={{ alignItems: 'center' }}>
    <video ref={videoRef} className="pingo-camera" autoPlay muted playsInline
      onLoadedMetadata={() => {
        void videoRef.current?.play().catch(() => setError('Camera preview could not start.'));
      }}
      onPlaying={() => setReady(true)}
      onError={() => setError('Camera preview could not start.')} />
    <Button variant="contained" onClick={takePhoto} disabled={!ready}>Take photo</Button>
    {error && <Typography role="alert" color="error">{error}</Typography>}
  </Stack>;
}

export function HuntCaptureDialog({ pin, startedAt, onClose, onSave }: {
  pin: Pin; startedAt: number; onClose: () => void;
  onSave: (blob: Blob, capturedAt: number) => Promise<void>;
}) {
  const [capture, setCapture] = useState<{ blob: Blob; capturedAt: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (blob: Blob) => {
    if (!capture || capture.capturedAt < startedAt) {
      setError('Only photos taken after this board was generated are valid.');
      return;
    }
    setBusy(true);
    try {
      const datedPhoto = await addCaptureMetadata(blob, capture.capturedAt);
      if (!await captureMetadataMatches(datedPhoto, capture.capturedAt)) {
        throw new Error('The photo timestamp could not be verified. Please retake the photo.');
      }
      await onSave(datedPhoto, capture.capturedAt);
      onClose();
    }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Photo could not be saved.');
      setBusy(false);
    }
  };
  return <Dialog open onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>{capture ? `Select ${pin.name} in the photo` : `Photograph ${pin.name}`}</DialogTitle>
    <DialogContent>
      {capture ? <SquareEditor blob={capture.blob} onConfirm={blob => void save(blob)} busy={busy} /> :
        <LiveCamera onCapture={(blob, capturedAt) => setCapture({ blob, capturedAt })} />}
      {error && <Typography role="alert" color="error">{error}</Typography>}
    </DialogContent>
    <DialogActions>
      {capture && <Button onClick={() => setCapture(null)} disabled={busy}>Retake</Button>}
      <Button onClick={onClose} disabled={busy}>Cancel</Button>
    </DialogActions>
  </Dialog>;
}
