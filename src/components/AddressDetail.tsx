import React from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, MapPin, Share2, X } from 'lucide-react';
import type { UiLanguage } from './SearchBar';

interface AddressDetailProps {
  address: string;
  loading: boolean;
  h3Code?: string;
  c3Code?: string;
  language: UiLanguage;
}

const labels = {
  en: {
    h3: 'H3 Code (Hex)',
    c3: 'C3 Code',
    address: 'Full Address',
    searching: 'Searching address...',
    notFound: 'No address found',
    share: 'Share codes',
    shareTitle: 'Share C3 location codes',
    barcode: 'Barcode',
    close: 'Close',
  },
  id: {
    h3: 'Kode H3 (Hex)',
    c3: 'Kode C3',
    address: 'Alamat Lengkap',
    searching: 'Mencari alamat...',
    notFound: 'Alamat tidak ditemukan',
    share: 'Bagikan kode',
    shareTitle: 'Bagikan kode lokasi C3',
    barcode: 'Barcode',
    close: 'Tutup',
  },
};

const CopyButton: React.FC<{ value?: string; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      title={label}
    >
      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
    </button>
  );
};

const BarcodeSvg: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const normalizedValue = value.toUpperCase();
  const modules = normalizedValue.split('').flatMap((character, index) => {
    const code = character.charCodeAt(0);
    const bits = Array.from({ length: 8 }, (_, bit) => Boolean(code & (1 << bit)));
    return [true, false, ...bits, index % 2 === 0, false];
  });
  const barWidth = 2;
  const quietZone = 12;
  const width = modules.length * barWidth + quietZone * 2;
  const height = 72;

  return (
    <svg
      role="img"
      aria-label={`${label} ${value}`}
      viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-full rounded-sm bg-background text-foreground"
      preserveAspectRatio="none"
    >
      <rect width={width} height={height} className="fill-background" />
      {modules.map((isBar, index) =>
        isBar ? (
          <rect
            key={`${characterKey(value)}-${index}`}
            x={quietZone + index * barWidth}
            y="8"
            width={index % 5 === 0 ? 2.8 : 1.7}
            height="48"
            rx="0.4"
            className="fill-foreground"
          />
        ) : null,
      )}
      <text
        x={width / 2}
        y="67"
        textAnchor="middle"
        className="fill-muted-foreground text-[8px] font-semibold tracking-[0.16em]"
      >
        {normalizedValue}
      </text>
    </svg>
  );
};

const characterKey = (value: string) => value.replace(/[^a-z0-9]/gi, '');

const ShareDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  h3Code?: string;
  c3Code?: string;
  labels: typeof labels.en;
}> = ({ open, onClose, h3Code, c3Code, labels: t }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/35 px-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-code-title"
        className="w-full max-w-md overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-[0_24px_80px_oklch(0_0_0_/_0.32)]"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="share-code-title" className="text-base font-semibold leading-6 text-foreground">
              {t.shareTitle}
            </h2>
            <p className="text-xs font-medium text-muted-foreground">{t.barcode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={t.close}
            title={t.close}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {c3Code && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {t.c3}
                </div>
                <CopyButton value={c3Code} label={`Copy ${t.c3}`} />
              </div>
              <BarcodeSvg value={c3Code} label={t.c3} />
            </div>
          )}

          {h3Code && (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {t.h3}
                </div>
                <CopyButton value={h3Code} label={`Copy ${t.h3}`} />
              </div>
              <BarcodeSvg value={h3Code} label={t.h3} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

const AddressDetail: React.FC<AddressDetailProps> = ({
  address,
  loading,
  h3Code,
  c3Code,
  language,
}) => {
  const [shareOpen, setShareOpen] = React.useState(false);

  if (!address && !loading && !h3Code && !c3Code) {
    return null;
  }

  const t = labels[language];

  return (
    <div className="absolute bottom-3 left-3 right-3 z-50 md:left-1/2 md:right-auto md:w-[min(520px,calc(100vw-48px))] md:-translate-x-1/2">
      <div className="overflow-hidden rounded-md border border-border bg-card px-5 py-4 text-card-foreground shadow-[0_14px_40px_oklch(0.22_0.012_252_/_0.18)] dark:shadow-[0_14px_42px_oklch(0_0_0_/_0.48)]">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">
              {t.c3}
            </div>
            <h2 className="break-all text-2xl font-bold leading-6 tracking-normal text-foreground">
              {c3Code || '-'}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              disabled={!c3Code && !h3Code}
              className="flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
              title={t.share}
            >
              <Share2 className="size-4" />
            </button>
            <CopyButton value={c3Code} label={`Copy ${t.c3}`} />
          </div>
        </div>

        <div className="mt-3 flex min-w-0 items-start justify-between gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {t.h3}
            </div>
            <h1 className="break-all text-3xl font-italic leading-8 tracking-normal text-foreground">
              {h3Code || '-'}
            </h1>
          </div>
          <CopyButton value={h3Code} label={`Copy ${t.h3}`} />
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <MapPin className="size-4" />
            <span>{t.address}</span>
          </div>
          <p className="line-clamp-3 text-sm font-medium leading-5 text-foreground">
            {loading ? t.searching : address || t.notFound}
          </p>
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        h3Code={h3Code}
        c3Code={c3Code}
        labels={t}
      />
    </div>
  );
};

export default AddressDetail;
