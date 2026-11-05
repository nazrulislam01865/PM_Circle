import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Crop, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ImageKind = 'avatar' | 'cover';
const specifications = {
    avatar: { width: 400, height: 400, label: 'Profile photo' },
    cover: { width: 1536, height: 400, label: 'Cover photo' },
};
const clamp = (number: number, low: number, high: number) => Math.max(low, Math.min(high, number));

export function ProfileImageCropDialog({ file, kind, onCancel, onConfirm }: {
    file: File | null;
    kind: ImageKind;
    onCancel: () => void;
    onConfirm: (file: File, kind: ImageKind) => void;
}) {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
    const spec = specifications[kind];
    const ratio = spec.width / spec.height;

    useEffect(() => {
        if (!file) { setImage(null); return; }
        const url = URL.createObjectURL(file);
        const next = new Image();
        next.onload = () => setImage(next);
        next.onerror = () => setError('This image could not be opened. Choose another JPG, PNG or WebP image.');
        next.src = url;
        setZoom(1);
        setCenter({ x: 0.5, y: 0.5 });
        setError('');
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const getSource = () => {
        if (!image) return null;
        const originalRatio = image.naturalWidth / image.naturalHeight;
        const baseWidth = originalRatio > ratio ? image.naturalHeight * ratio : image.naturalWidth;
        const baseHeight = originalRatio > ratio ? image.naturalHeight : image.naturalWidth / ratio;
        const width = baseWidth / zoom;
        const height = baseHeight / zoom;
        const x = clamp(center.x * image.naturalWidth - width / 2, 0, image.naturalWidth - width);
        const y = clamp(center.y * image.naturalHeight - height / 2, 0, image.naturalHeight - height);
        return { x, y, width, height };
    };

    // The on-screen preview and the uploaded image use the exact same crop rectangle.
    useEffect(() => {
        const canvas = canvasRef.current;
        const source = getSource();
        if (!canvas || !image || !source) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
    }, [image, zoom, center, kind]);

    const lowResolution = image && (image.naturalWidth < spec.width || image.naturalHeight < spec.height);
    const wrongRatio = image && Math.abs(image.naturalWidth / image.naturalHeight - ratio) / ratio > 0.05;

    const applyCrop = async () => {
        if (!file || !image) return;
        const source = getSource();
        if (!source) return;
        setBusy(true);
        try {
            const output = document.createElement('canvas');
            output.width = spec.width;
            output.height = spec.height;
            const ctx = output.getContext('2d');
            if (!ctx) throw new Error('Image editing is not supported by this browser.');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, output.width, output.height);
            const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/jpeg', 0.88));
            if (!blob) throw new Error('Unable to prepare the cropped image.');
            onConfirm(new File([blob], `${kind}-photo.jpg`, { type: 'image/jpeg' }), kind);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Unable to prepare image.');
        } finally {
            setBusy(false);
        }
    };

    return <Dialog open={Boolean(file)} onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
        <DialogContent className="pm-image-crop-dialog">
            <DialogHeader>
                <DialogTitle><Crop size={20} aria-hidden="true" /> Adjust {spec.label.toLowerCase()}</DialogTitle>
                <DialogDescription>Drag the image to position it, then adjust zoom. Review the preview before saving.</DialogDescription>
            </DialogHeader>
            <div className="pm-image-crop-scroll">
            {image ? <>
                {(wrongRatio || lowResolution) && <div className="pm-image-crop-alert" role="status">
                    <AlertTriangle size={18} aria-hidden="true" />
                    {lowResolution ? 'This image is smaller than recommended and may appear blurry.' : 'This image has a different shape. Crop it to fit without distortion.'}
                </div>}
                <canvas ref={canvasRef} width={spec.width} height={spec.height}
                    className={`pm-image-crop-preview pm-image-crop-${kind}`}
                    role="group" tabIndex={0}
                    aria-label="Image crop preview. Use the arrow keys to reposition it."
                    onKeyDown={(event) => {
                        const step = event.shiftKey ? 0.06 : 0.015;
                        if (event.key === 'ArrowLeft') { event.preventDefault(); setCenter((previous) => ({ ...previous, x: clamp(previous.x - step, 0, 1) })); }
                        if (event.key === 'ArrowRight') { event.preventDefault(); setCenter((previous) => ({ ...previous, x: clamp(previous.x + step, 0, 1) })); }
                        if (event.key === 'ArrowUp') { event.preventDefault(); setCenter((previous) => ({ ...previous, y: clamp(previous.y - step, 0, 1) })); }
                        if (event.key === 'ArrowDown') { event.preventDefault(); setCenter((previous) => ({ ...previous, y: clamp(previous.y + step, 0, 1) })); }
                    }}
                    onPointerDown={(event) => {
                        dragRef.current = { x: event.clientX, y: event.clientY, cx: center.x, cy: center.y };
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                        if (!dragRef.current || !image) return;
                        const baseWidth = Math.min(image.naturalWidth, image.naturalHeight * ratio) / zoom;
                        const baseHeight = baseWidth / ratio;
                        const x = dragRef.current.cx - (event.clientX - dragRef.current.x) * baseWidth / (event.currentTarget.getBoundingClientRect().width * image.naturalWidth);
                        const y = dragRef.current.cy - (event.clientY - dragRef.current.y) * baseHeight / (event.currentTarget.getBoundingClientRect().height * image.naturalHeight);
                        setCenter({ x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
                    }}
                    onPointerUp={() => { dragRef.current = null; }}
                    onPointerCancel={() => { dragRef.current = null; }} />
                <label htmlFor="pm-image-crop-zoom" className="pm-label">Zoom</label>
                <input id="pm-image-crop-zoom" type="range" min="1" max="3" step="0.05" value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))} />
            </> : <div className="pm-image-crop-loading"><ImageIcon size={24} /> Preparing image preview...</div>}
            {error && <p role="alert" className="pm-profile-error">{error}</p>}
            </div>
            <DialogFooter className="pm-image-crop-footer">
                <button type="button" className="pm-btn pm-btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="button" className="pm-btn pm-btn-primary" onClick={applyCrop} disabled={busy || !image}>{busy ? 'Preparing...' : 'Crop and upload'}</button>
            </DialogFooter>
        </DialogContent>
    </Dialog>;
}
