import { useState, useEffect, useRef } from 'react';
import './App.css';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Controls from './components/Controls';
import TemplateManager from './components/TemplateManager';

export type Template = {
  id: string;
  name: string;
  latex: string;
};

function App() {
  const [latex, setLatex] = useState<string>('\\mathcal{M} = (E, \\mathcal{I})');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Settings
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [color, setColor] = useState<string>('#ffffff');
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [dpi, setDpi] = useState<number>(300);
  const [isFullMode, setIsFullMode] = useState<boolean>(false);
  const [isTikzMode, setIsTikzMode] = useState<boolean>(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  const compile = async () => {
    setLoading(true);
    setError(null);
    const effectiveFormat: 'png' | 'svg' = isTikzMode ? 'svg' : format;
    try {
      const response = await fetch('http://localhost:3001/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex, format: effectiveFormat, color, bgColor, dpi, isFullMode, isTikzMode }),
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
  }, [latex, format, color, bgColor, dpi, isFullMode, isTikzMode]);

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

  return (
    <div className="app-container">
      <div className="panel left-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>LaTeX 入力</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="segmented-control" style={{ minWidth: '170px' }}>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: isTikzMode ? 'default' : 'pointer', fontSize: '12px', opacity: isTikzMode ? 0.5 : 1 }}>
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
        <Editor
          ref={editorRef}
          value={latex}
          onChange={setLatex}
          placeholder={isTikzMode ? 'ここに TikZ 図のコード（例: \\begin{tikzpicture} ...）を書いてね' : 'ここに数式を入力してね'}
        />
        <TemplateManager onSelect={handleTemplateSelect} currentLatex={latex} />
      </div>
      <div className="panel right-panel">
        <h2>プレビュー</h2>
        <Preview image={image} loading={loading} error={error} />
        <Controls
          format={format} setFormat={setFormat}
          color={color} setColor={setColor}
          bgColor={bgColor} setBgColor={setBgColor}
          dpi={dpi} setDpi={setDpi}
          onSave={handleSave}
          isTikzMode={isTikzMode}
        />
      </div>
    </div>
  );
}

export default App;
