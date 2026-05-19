import React from 'react';
import { Copy, Check } from 'lucide-react';

interface InfoCardProps {
  title: string;
  value: string;
  copyable?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, value, copyable = true }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!copyable || !value) return;
    
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-w-0 border-r border-border bg-card px-4 py-3 text-card-foreground last:border-r-0">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h3>
        {copyable && (
          <button
            onClick={handleCopy}
            className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        )}
      </div>
      
      <div className="break-all">
        <p className="text-sm font-medium leading-5 text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
};

export default InfoCard;
