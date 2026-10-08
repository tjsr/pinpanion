import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Pin } from '../types.ts';
import { HuntCaptureDialog, HuntPhotoPreview } from './ScavengerHunt.tsx';

afterEach(() => { vi.restoreAllMocks(); });

describe('Pingo scavenger camera flow', () => {
  it('shows the saved photo at display size and releases its object URL', async () => {
    const objectUrl = vi.fn(() => 'blob:saved-photo');
    const revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: objectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const pin = { id: 42, name: 'Test pin' } as Pin;
    const photo = { key: 'ACDE:42', boardCode: 'ACDE', pinId: 42,
      capturedAt: Date.now(), blob: new Blob(['saved'], { type: 'image/jpeg' }) };
    const view = render(<HuntPhotoPreview pin={pin} photo={photo} />);
    expect(await screen.findByRole('img', { name: 'Full photo of Test pin' })).toHaveAttribute('src', 'blob:saved-photo');
    expect(objectUrl).toHaveBeenCalledWith(photo.blob);
    view.unmount();
    expect(revoke).toHaveBeenCalledWith('blob:saved-photo');
  });

  it('captures a live frame, offers a square crop, and saves the confirmed photo', async () => {
    const stop = vi.fn();
    const track = { stop, kind: 'video', readyState: 'live' };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track], getVideoTracks: () => [track] })) } });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
      callback(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }));
    });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });

    const onSave = vi.fn(async () => {});
    const onClose = vi.fn();
    const pin = { id: 42, name: 'Test pin' } as Pin;
    const user = userEvent.setup();
    render(<HuntCaptureDialog pin={pin} startedAt={Date.now() - 1_000}
      onSave={onSave} onClose={onClose} />);

    const video = document.querySelector('video')!;
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());
    fireEvent.loadedMetadata(video);
    fireEvent.playing(video);
    await user.click(screen.getByRole('button', { name: 'Take photo' }));
    const image = await screen.findByAltText('Photo to crop');
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 640 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 480 });
    fireEvent.load(image);
    expect(screen.getByText(/Drag the square over the pin/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm photo' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.any(Blob), expect.any(Number)));
    expect(onClose).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });
});
