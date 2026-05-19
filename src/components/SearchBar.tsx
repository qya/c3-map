import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Menu, Globe, Hexagon, Languages, HelpCircle, MessageSquare, Shield, Moon, Sun, Layers } from 'lucide-react';
import { isValidC3, isValidH3 } from '../utils/geoUtils';

export type UiLanguage = 'en' | 'id';
export type MapStyleId = 'standard' | 'voyager' | 'terrain' | 'dark' | 'satellite';

const mapStyleOptions: MapStyleId[] = ['standard', 'voyager', 'terrain', 'dark', 'satellite'];
const COORDINATE_PATTERN = /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/;
const H3_CODE_PATTERN = /^8[0-9a-f]{3,14}$/i;

type AddressSuggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
};

interface SearchBarProps {
  onSearch: (query: string) => void;
  onHexPreviewToggle: (enabled: boolean) => void;
  hexPreviewEnabled: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  language: UiLanguage;
  onLanguageToggle: () => void;
  mapStyle: MapStyleId;
  onMapStyleChange: (style: MapStyleId) => void;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
}

const labels = {
  en: {
    placeholder: 'Enter C3/H3 or coordinates',
    menu: 'Menu',
    mapView: 'Map view',
    mapStyles: {
      standard: 'Standard',
      voyager: 'Voyager',
      terrain: 'Terrain',
      dark: 'Dark',
      satellite: 'Satellite',
    },
    grid: 'Grid',
    gridDescription: 'Show hexagonal grid',
    language: 'Language',
    languageValue: 'English',
    theme: 'Theme',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    help: 'Help',
    helpTitle: 'C3 Code tutorial',
    helpIntro: 'C3 is a shorter version of an H3 hex code. Instead of 15 characters, you get an 11-character code that is easier to read and share.',
    helpSteps: [
      'Click anywhere on the map to capture the C3 code, H3 index, coordinate, and address.',
      'Paste a C3/H3 code or coordinates like -8.236959, 111.457310 into search.',
      'Turn on Grid to preview nearby hex cells, then zoom in for tighter detail.',
    ],
    close: 'Close',
    feedback: 'Feedback',
    privacy: 'Privacy policy',
    docs: 'H3 Documentation',
    clear: 'Clear',
    searchingAddress: 'Searching addresses...',
    noAddressResults: 'No address matches',
  },
  id: {
    placeholder: 'Masukkan C3/H3 atau koordinat',
    menu: 'Menu',
    mapView: 'Tampilan peta',
    mapStyles: {
      standard: 'Standar',
      voyager: 'Voyager',
      terrain: 'Medan',
      dark: 'Gelap',
      satellite: 'Satelit',
    },
    grid: 'Grid',
    gridDescription: 'Tampilkan grid heksagonal',
    language: 'Bahasa',
    languageValue: 'Indonesia',
    theme: 'Tema',
    lightMode: 'Mode terang',
    darkMode: 'Mode gelap',
    help: 'Bantuan',
    helpTitle: 'Tutorial C3 Code',
    helpIntro: 'C3 adalah versi pendek dari H3 hex code. Dari 15 karakter, C3 menjadi 11 karakter dan lebih mudah dibaca serta dibagikan.',
    helpSteps: [
      'Klik di peta untuk mengambil kode C3, indeks H3, koordinat, dan alamat.',
      'Tempel C3/H3 code atau koordinat seperti -8.236959, 111.457310 di pencarian.',
      'Aktifkan Grid untuk melihat sel heksagon sekitar, lalu perbesar untuk detail.',
    ],
    close: 'Tutup',
    feedback: 'Masukan',
    privacy: 'Kebijakan privasi',
    docs: 'Dokumentasi H3',
    clear: 'Hapus',
    searchingAddress: 'Mencari alamat...',
    noAddressResults: 'Alamat tidak ditemukan',
  },
};

const shouldSuggestAddress = (query: string) => {
  const trimmed = query.trim();
  const isCodeInput = H3_CODE_PATTERN.test(trimmed) || isValidH3(trimmed) || isValidC3(trimmed);

  return trimmed.length >= 3 && /[a-z]/i.test(trimmed) && !COORDINATE_PATTERN.test(trimmed) && !isCodeInput;
};

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onHexPreviewToggle,
  hexPreviewEnabled,
  isLoading,
  theme,
  onThemeToggle,
  language,
  onLanguageToggle,
  mapStyle,
  onMapStyleChange,
  sidebarOpen,
  onSidebarOpenChange,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [hasSearchedAddress, setHasSearchedAddress] = useState(false);
  const selectedAddressRef = useRef('');
  const t = labels[language];
  const showAddressPreview =
    shouldSuggestAddress(inputValue) &&
    (addressLoading || addressSuggestions.length > 0 || hasSearchedAddress);

  useEffect(() => {
    const query = inputValue.trim();

    if (selectedAddressRef.current === query) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setHasSearchedAddress(false);
      return;
    }

    if (!shouldSuggestAddress(query)) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setHasSearchedAddress(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setAddressLoading(true);
      setHasSearchedAddress(false);

      try {
        const params = new URLSearchParams({
          q: query,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: {
            'Accept-Language': language,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch address suggestions');
        }

        const data = (await response.json()) as AddressSuggestion[];
        setAddressSuggestions(data.filter((suggestion) => suggestion.lat && suggestion.lon));
      } catch (error) {
        if (!controller.signal.aborted) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setAddressLoading(false);
          setHasSearchedAddress(true);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [inputValue, language]);

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    selectedAddressRef.current = suggestion.display_name;
    setInputValue(suggestion.display_name);
    setAddressSuggestions([]);
    setHasSearchedAddress(false);
    onSearch(`${suggestion.lat}, ${suggestion.lon}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressSuggestions.length > 0) {
      handleAddressSelect(addressSuggestions[0]);
      return;
    }

    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  const handleClear = () => {
    selectedAddressRef.current = '';
    setInputValue('');
    setAddressSuggestions([]);
    setHasSearchedAddress(false);
  };

  const handleTogglePreview = () => {
    onHexPreviewToggle(!hexPreviewEnabled);
  };

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t.close}
          className="fixed inset-0 z-[55] bg-black/25 backdrop-blur-[1px] md:hidden"
          onClick={() => onSidebarOpenChange(false)}
        />
      )}
      <aside
        className={`absolute left-0 top-0 z-[60] h-full w-[250px] border-r border-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out md:z-40 md:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex h-[88px] items-center gap-3 border-b border-border px-5">
          <div className="relative flex size-10 shrink-0 items-center justify-center text-primary" aria-hidden="true">
            <Hexagon className="absolute size-10 stroke-[1.8]" />
            <span className="relative text-[11px] font-black tracking-tight text-primary">C3</span>
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-semibold leading-7 tracking-tight text-foreground">C3 Code</div>
            <div className="text-xs font-medium text-muted-foreground">Small H3 Hexagonal Hierarchical Geospatial</div>
          </div>
        </div>
        <nav className="py-3">
          <div className="px-4 pb-2">
            <div className="mb-2 flex items-center gap-3 text-[15px] text-sidebar-foreground">
              <Layers className="size-5 shrink-0" strokeWidth={2.2} />
              <span>{t.mapView}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pl-9">
              {mapStyleOptions.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onMapStyleChange(style)}
                  className={`h-8 rounded-sm border px-2 text-left text-xs transition-colors ${mapStyle === style
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background/60 text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}
                >
                  {t.mapStyles[style]}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleTogglePreview}
            className={`flex h-[60px] w-full items-center gap-4 px-4 text-left text-[15px] transition-colors hover:bg-sidebar-accent ${hexPreviewEnabled ? 'text-primary' : 'text-sidebar-foreground'
              }`}
          >
            <Hexagon className="size-5 shrink-0" strokeWidth={2.2} />
            <span className="min-w-0 flex-1">
              <span className="block">{t.grid}</span>
              <span className="block truncate text-xs text-muted-foreground">{t.gridDescription}</span>
            </span>
            <span
              className={`relative h-6 w-11 rounded-full border p-0.5 transition-colors ${hexPreviewEnabled
                ? 'border-primary bg-primary shadow-[0_0_0_3px_oklch(0.57_0.19_255_/_0.14)] dark:shadow-[0_0_0_3px_oklch(0.7_0.17_255_/_0.2)]'
                : 'border-border bg-background shadow-inner'
                }`}
              aria-hidden="true"
            >
              <span
                className={`block size-5 rounded-full border transition-transform ${hexPreviewEnabled
                  ? 'translate-x-5 border-primary-foreground/30 bg-primary-foreground shadow-sm'
                  : 'translate-x-0 border-border bg-muted-foreground/55 shadow-sm dark:bg-muted-foreground/70'
                  }`}
              />
            </span>
          </button>
          <button
            type="button"
            onClick={onThemeToggle}
            className="flex h-[60px] w-full items-center gap-4 px-4 text-left text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            {theme === 'dark' ? <Sun className="size-5 shrink-0" strokeWidth={2.2} /> : <Moon className="size-5 shrink-0" strokeWidth={2.2} />}
            <span className="min-w-0 flex-1">
              <span className="block">{t.theme}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {theme === 'dark' ? t.lightMode : t.darkMode}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onLanguageToggle}
            className="flex h-[60px] w-full items-center gap-4 px-4 text-left text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Languages className="size-5 shrink-0" strokeWidth={2.2} />
            <span className="min-w-0 flex-1">
              <span className="block">{t.language}</span>
              <span className="block truncate text-xs text-muted-foreground">{t.languageValue}</span>
            </span>
          </button>
        </nav>
        <div className="border-t border-border py-3">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex h-[60px] w-full items-center gap-4 px-4 text-left text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <HelpCircle className="size-5 shrink-0" strokeWidth={2.1} />
            <span>{t.help}</span>
          </button>
          <a
            href="/feedback.html"
            className="flex h-[60px] w-full items-center gap-4 px-4 text-left text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <MessageSquare className="size-5 shrink-0" strokeWidth={2.1} />
            <span>{t.feedback}</span>
          </a>
          <a
            href="/privacy.html"
            className="flex h-[60px] w-full items-center gap-4 px-4 text-left text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Shield className="size-5 shrink-0" strokeWidth={2.1} />
            <span>{t.privacy}</span>
          </a>
          <a
            href="https://h3geo.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[60px] w-full items-center gap-4 px-4 text-left text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Globe className="size-5 shrink-0" strokeWidth={2.1} />
            <span>{t.docs}</span>
          </a>
        </div>
      </aside>

      <div
        className="absolute left-3 top-3 z-50 w-[calc(100%-1.5rem)] md:left-1/2 md:w-full md:max-w-[500px] md:-translate-x-1/2"
      >
        <div className="flex h-12 items-center rounded-sm border border-border bg-map-search text-map-search-foreground shadow-[0_8px_24px_oklch(0.22_0.012_252_/_0.16)] dark:shadow-[0_8px_28px_oklch(0_0_0_/_0.45)]">
          <button
            type="button"
            onClick={() => onSidebarOpenChange(!sidebarOpen)}
            className="flex size-12 shrink-0 items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            title={t.menu}
          >
            <Menu className="size-5" />
          </button>

          <form onSubmit={handleSubmit} className="min-w-0 flex-1">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  selectedAddressRef.current = '';
                  setInputValue(e.target.value);
                }}
                placeholder={t.placeholder}
                autoComplete="off"
                className="h-12 w-full bg-transparent pr-11 text-[15px] outline-none placeholder:text-map-search-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
              />

              {inputValue ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-map-search-muted transition-colors hover:text-map-search-foreground"
                  title={t.clear}
                >
                  <X className="size-5" />
                </button>
              ) : (
                <Search className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-map-search-muted" />
              )}
            </div>
          </form>
        </div>

        {showAddressPreview && (
          <div className="absolute left-0 right-0 top-14 overflow-hidden rounded-sm border border-border bg-popover text-popover-foreground shadow-[0_18px_44px_oklch(0.22_0.012_252_/_0.2)] dark:shadow-[0_18px_44px_oklch(0_0_0_/_0.5)]">
            {addressLoading ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">{t.searchingAddress}</div>
            ) : addressSuggestions.length > 0 ? (
              <div className="max-h-[280px] overflow-y-auto py-1">
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleAddressSelect(suggestion)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <Search className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {suggestion.display_name.split(',')[0]}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-4 text-muted-foreground">
                        {suggestion.display_name}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">{t.noAddressResults}</div>
            )}
          </div>
        )}
      </div>

      {helpOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setHelpOpen(false)}
        >
          <section
            aria-modal="true"
            role="dialog"
            aria-labelledby="c3-help-title"
            className="w-full max-w-[540px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-[0_28px_90px_oklch(0_0_0_/_0.4)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="relative border-b border-border bg-secondary/35 px-5 pb-5 pt-4">
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                title={t.close}
              >
                <X className="size-5" />
              </button>
              <div className="flex items-center gap-3 pr-10">
                <div className="relative flex size-12 shrink-0 items-center justify-center text-primary" aria-hidden="true">
                  <Hexagon className="absolute size-12 fill-primary/10 stroke-[1.7]" />
                  <span className="relative text-base font-black leading-none text-primary">C</span>
                </div>
                <div className="min-w-0">
                  <h2 id="c3-help-title" className="text-xl font-semibold leading-7 text-foreground">
                    {t.helpTitle}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{t.helpIntro}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md border border-border bg-background/70 p-3">
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase text-muted-foreground">H3 hex</span>
                  <span className="mt-1 block truncate font-mono text-sm text-foreground">8de9a6740ad00ff</span>
                </div>
                <span className="text-sm font-semibold text-primary">to</span>
                <div className="min-w-0 text-right">
                  <span className="block text-[11px] font-semibold uppercase text-muted-foreground">C3</span>
                  <span className="mt-1 block truncate font-mono text-sm font-semibold text-primary">RBB5ABGXSE</span>
                </div>
              </div>
            </div>
            <ol className="space-y-2 px-5 py-5">
              {t.helpSteps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-md border border-border bg-background/45 p-3 text-sm leading-5 text-foreground"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="flex justify-end border-t border-border bg-secondary/25 px-5 py-4">
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="h-9 rounded-sm bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t.close}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default SearchBar;
