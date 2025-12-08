import { useState, useEffect, useRef } from 'react';
import './App.css';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Controls from './components/Controls';
import TemplateManager from './components/TemplateManager';
import TexTemplateEditor from './components/TexTemplateEditor';

export type Template = {
  id: string;
  name: string;
  latex: string;
};

export type CopyStatus = 'idle' | 'copying' | 'copied' | 'failed';

type TemplateMode = 'standard' | 'tikz';

const TEMPLATE_STORAGE_KEY = 'vistex.customTemplates';
const FAVORITE_COLORS_KEY = 'vistex.favoriteColors';

const DEFAULT_STANDARD_TEMPLATE = String.raw`\documentclass[preview]{standalone}
\usepackage{amsmath,amssymb,amsfonts, mathtools}
\usepackage{xcolor}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
\begin{document}
{{BG_COLOR_COMMAND}}
\color[HTML]{ {{COLOR}} }
$ {{LATEX}} $
\end{document}
`;

const DEFAULT_TIKZ_TEMPLATE = String.raw`\documentclass[tikz,border=2mm]{standalone}
\usepackage{amsmath,amssymb,amsfonts, mathtools}
\usepackage{xcolor}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
\begin{document}
{{BG_COLOR_COMMAND}}
\color[HTML]{ {{COLOR}} }
{{LATEX}}
\end{document}
`;

const DEFAULT_TEMPLATES: Record<TemplateMode, string> = {
  standard: DEFAULT_STANDARD_TEMPLATE,
  tikz: DEFAULT_TIKZ_TEMPLATE,
};

const getDefaultTemplate = (mode: TemplateMode) => DEFAULT_TEMPLATES[mode];

function App() {
  const [latex, setLatex] = useState<string>('\\mathcal{M} = (E, \\mathcal{I})');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Settings
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [isPreviewWhiteBg, setIsPreviewWhiteBg] = useState<boolean>(false);
  const [color, setColor] = useState<string>('#ffffff');
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [dpi, setDpi] = useState<number>(300);
  const [isFullMode, setIsFullMode] = useState<boolean>(false);
  const [isTikzMode, setIsTikzMode] = useState<boolean>(false);
  const [useCustomTemplate, setUseCustomTemplate] = useState<boolean>(false);
  const [customTemplates, setCustomTemplates] = useState<Record<TemplateMode, string>>({
    standard: getDefaultTemplate('standard'),
    tikz: getDefaultTemplate('tikz'),
  });
  const [templateStorageReady, setTemplateStorageReady] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [favoriteTextColors, setFavoriteTextColors] = useState<string[]>([]);
  const [favoriteBgColors, setFavoriteBgColors] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setTemplateStorageReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.templates) {
          setCustomTemplates({
            standard: typeof parsed.templates.standard === 'string' && parsed.templates.standard.trim().length > 0
              ? parsed.templates.standard
              : getDefaultTemplate('standard'),
            tikz: typeof parsed.templates.tikz === 'string' && parsed.templates.tikz.trim().length > 0
              ? parsed.templates.tikz
              : getDefaultTemplate('tikz'),
          });
        }
        if (typeof parsed?.enabled === 'boolean') {
          setUseCustomTemplate(parsed.enabled);
        }
      }
    } catch (err) {
      console.warn('Failed to load custom templates', err);
    }

    // Load favorite colors
    try {
      const favColorsRaw = window.localStorage.getItem(FAVORITE_COLORS_KEY);
      if (favColorsRaw) {
        const favColors = JSON.parse(favColorsRaw);
        if (Array.isArray(favColors.textColors)) {
          setFavoriteTextColors(favColors.textColors);
        }
        if (Array.isArray(favColors.bgColors)) {
          setFavoriteBgColors(favColors.bgColors);
        }
      }
    } catch (e) {
      console.warn('Failed to load favorite colors', e);
    }

    setTemplateStorageReady(true);
  }, []);

  useEffect(() => {
    if (!templateStorageReady || typeof window === 'undefined') return;
    const payload = {
      templates: customTemplates,
      enabled: useCustomTemplate,
    };
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
  }, [customTemplates, useCustomTemplate, templateStorageReady]);

  useEffect(() => {
    if (!templateStorageReady || typeof window === 'undefined') return;
    const favPayload = {
      textColors: favoriteTextColors,
      bgColors: favoriteBgColors,
    };
    window.localStorage.setItem(FAVORITE_COLORS_KEY, JSON.stringify(favPayload));
  }, [favoriteTextColors, favoriteBgColors, templateStorageReady]);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const copyResetTimer = useRef<number | null>(null);
  const templateMode: TemplateMode = isTikzMode ? 'tikz' : 'standard';
  const activeCustomTemplate = customTemplates[templateMode];
  const isClipboardAvailable = typeof navigator !== 'undefined' && !!navigator.clipboard;

  const clearCopyResetTimer = () => {
    if (copyResetTimer.current !== null) {
      window.clearTimeout(copyResetTimer.current);
      copyResetTimer.current = null;
    }
  };

  useEffect(() => {
    return () => clearCopyResetTimer();
  }, []);

  const compile = async () => {
    setLoading(true);
    setError(null);
    const effectiveFormat: 'png' | 'svg' = isTikzMode ? 'svg' : format;
    try {
      const payload: Record<string, unknown> = {
        latex,
        format: effectiveFormat,
        color,
        bgColor,
        dpi,
        isFullMode,
        isTikzMode,
      };

      if (useCustomTemplate && !isFullMode && activeCustomTemplate.trim().length > 0) {
        payload.customTemplate = activeCustomTemplate;
      }

      const response = await fetch('http://localhost:3001/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setImage(data.image);
      } else {
        setError(data.error);
        setImage(null);
      }
    } catch (err) {
      setError('サーバーへの接続に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Debounce compile
  useEffect(() => {
    const timer = setTimeout(() => {
      if (latex) compile();
    }, 800);
    return () => clearTimeout(timer);
  }, [
    latex,
    format,
    color,
    bgColor,
    dpi,
    isFullMode,
    isTikzMode,
    useCustomTemplate,
    customTemplates.standard,
    customTemplates.tikz,
  ]);

  const handleSave = () => {
    if (!image) return;
    const effectiveFormat: 'png' | 'svg' = isTikzMode ? 'svg' : format;
    const link = document.createElement('a');
    link.href = image;
    link.download = `equation_${Date.now()}.${effectiveFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = async () => {
    if (!image) return;
    clearCopyResetTimer();

    if (!isClipboardAvailable) {
      setCopyStatus('failed');
      copyResetTimer.current = window.setTimeout(() => setCopyStatus('idle'), 1800);
      return;
    }

    try {
      setCopyStatus('copying');
      const response = await fetch(image);
      const blob = await response.blob();
      const isSvg = blob.type === 'image/svg+xml' || image.startsWith('data:image/svg+xml');

      if (navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        try {
          const clipboardItem = new ClipboardItem({ [blob.type || 'image/png']: blob });
          await navigator.clipboard.write([clipboardItem]);
          setCopyStatus('copied');
        } catch (clipErr) {
          // ClipboardItem failed, fallback for SVG
          if (isSvg && navigator.clipboard.writeText) {
            const svgText = await blob.text();
            await navigator.clipboard.writeText(svgText);
            setCopyStatus('copied');
          } else {
            throw clipErr;
          }
        }
      } else if (navigator.clipboard.writeText) {
        if (isSvg) {
          const svgText = await blob.text();
          await navigator.clipboard.writeText(svgText);
        } else {
          await navigator.clipboard.writeText(image);
        }
        setCopyStatus('copied');
      } else {
        throw new Error('Clipboard API is not available');
      }
    } catch (err) {
      console.error('Failed to copy image', err);
      setCopyStatus('failed');
    } finally {
      copyResetTimer.current = window.setTimeout(() => setCopyStatus('idle'), 1800);
    }
  };

  const handleAddFavoriteTextColor = () => {
    if (!favoriteTextColors.includes(color)) {
      setFavoriteTextColors(prev => [...prev, color]);
    }
  };

  const handleRemoveFavoriteTextColor = (c: string) => {
    setFavoriteTextColors(prev => prev.filter(fc => fc !== c));
  };

  const handleAddFavoriteBgColor = () => {
    if (bgColor !== 'transparent' && !favoriteBgColors.includes(bgColor)) {
      setFavoriteBgColors(prev => [...prev, bgColor]);
    }
  };

  const handleRemoveFavoriteBgColor = (c: string) => {
    setFavoriteBgColors(prev => prev.filter(fc => fc !== c));
  };

  const handleTemplateSelect = (templateLatex: string) => {
    const textarea = editorRef.current;
    if (!textarea) {
      setLatex(templateLatex);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = latex;

    const newText = text.substring(0, start) + templateLatex + text.substring(end);
    setLatex(newText);

    // Restore focus and move cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + templateLatex.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleTemplateReset = () => {
    setCustomTemplates(prev => ({
      ...prev,
      [templateMode]: getDefaultTemplate(templateMode),
    }));
  };

  const handleCustomTemplateChange = (value: string) => {
    setCustomTemplates(prev => ({
      ...prev,
      [templateMode]: value,
    }));
  };

  return (
    <div className="app-container">
      <div className="panel left-panel">
        <div className="panel-header">
          <h2>LaTeX 入力</h2>
          <div className="panel-actions">
            <div className="segmented-control">
              <button
                className={isTikzMode ? '' : 'active'}
                onClick={() => setIsTikzMode(false)}
              >
                数式モード
              </button>
              <button
                className={isTikzMode ? 'active' : ''}
                onClick={() => {
                  setIsTikzMode(true);
                  setIsFullMode(false);
                  setFormat('svg');
                }}
              >
                TikZモード
              </button>
            </div>
            <label
              className={`checkbox-label ${isTikzMode ? 'checkbox-label--disabled' : ''}`}
            >
              <input
                type="checkbox"
                checked={isFullMode}
                disabled={isTikzMode}
                onChange={(e) => setIsFullMode(e.target.checked)}
              />
              フルモード
            </label>
          </div>
        </div>
        <div className="panel-body">
          <div className="section-card section-card--editor">
            <Editor
              ref={editorRef}
              value={latex}
              onChange={setLatex}
              placeholder={isTikzMode ? 'ここに TikZ 図のコード（例: \\begin{tikzpicture} ...）を書いてね' : 'ここに数式を入力してね'}
            />
          </div>
          <div className="section-card section-card--templates">
            <TemplateManager onSelect={handleTemplateSelect} currentLatex={latex} />
          </div>
          <div className="section-card section-card--tex-template">
            <TexTemplateEditor
              enabled={useCustomTemplate}
              disabled={isFullMode}
              template={activeCustomTemplate}
              onToggle={setUseCustomTemplate}
              onChange={handleCustomTemplateChange}
              onReset={handleTemplateReset}
              isTikzMode={isTikzMode}
            />
          </div>
        </div>
      </div>
      <div className="panel right-panel">
        <div className="panel-header">
          <h2>プレビュー</h2>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPreviewWhiteBg}
              onChange={(e) => setIsPreviewWhiteBg(e.target.checked)}
            />
            背景を白にする
          </label>
        </div>
        <div className="panel-body panel-body--right">
          <div className="section-card section-card--preview">
            <Preview
              image={image}
              loading={loading}
              error={error}
              useWhiteBackground={isPreviewWhiteBg}
              bgColor={bgColor}
            />
          </div>
          <div className="section-card section-card--controls">
            <Controls
              format={format} setFormat={setFormat}
              color={color} setColor={setColor}
              bgColor={bgColor} setBgColor={setBgColor}
              dpi={dpi} setDpi={setDpi}
              onSave={handleSave}
              isTikzMode={isTikzMode}
              onCopy={handleCopyToClipboard}
              canCopy={!!image && isClipboardAvailable}
              copyStatus={copyStatus}
              favoriteTextColors={favoriteTextColors}
              onAddFavoriteTextColor={handleAddFavoriteTextColor}
              onRemoveFavoriteTextColor={handleRemoveFavoriteTextColor}
              favoriteBgColors={favoriteBgColors}
              onAddFavoriteBgColor={handleAddFavoriteBgColor}
              onRemoveFavoriteBgColor={handleRemoveFavoriteBgColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
