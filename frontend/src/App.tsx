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

  const editorRef = useRef<HTMLTextAreaElement>(null);

  const compile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex, format, color, bgColor, dpi, isFullMode }),
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
  }, [latex, format, color, bgColor, dpi, isFullMode]);

  const handleSave = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = `equation_${Date.now()}.${format}`;
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
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={isFullMode}
              onChange={(e) => setIsFullMode(e.target.checked)}
            />
            フルモード
          </label>
        </div>
        <Editor ref={editorRef} value={latex} onChange={setLatex} />
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
        />
      </div>
    </div>
  );
}

export default App;
