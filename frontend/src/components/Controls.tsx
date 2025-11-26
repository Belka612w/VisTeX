import React from 'react';

interface Props {
    format: 'png' | 'svg';
    setFormat: (f: 'png' | 'svg') => void;
    color: string;
    setColor: (c: string) => void;
    bgColor: string;
    setBgColor: (c: string) => void;
    dpi: number;
    setDpi: (d: number) => void;
    onSave: () => void;
    isTikzMode: boolean;
}

const Controls: React.FC<Props> = ({
    format, setFormat,
    color, setColor,
    bgColor, setBgColor,
    dpi, setDpi,
    onSave,
    isTikzMode
}) => {
    return (
        <div className="controls">
            <div className="control-group">
                <label>形式</label>
                <div className="segmented-control">
                    <button
                        className={format === 'png' ? 'active' : ''}
                        onClick={() => { if (!isTikzMode) setFormat('png'); }}
                        disabled={isTikzMode}
                        title={isTikzMode ? 'TikZモードではPNGは使用できません' : undefined}
                    >
                        PNG
                    </button>
                    <button
                        className={format === 'svg' ? 'active' : ''}
                        onClick={() => setFormat('svg')}
                    >
                        SVG
                    </button>
                </div>
                {isTikzMode && (
                    <span style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                        TikZモードではSVGのみ出力できます
                    </span>
                )}
            </div>

            <div className="control-group">
                <label>文字色</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                    <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ flex: '1 1 140px' }}
                        aria-label="文字色コードを入力"
                    />
                </div>
            </div>

            <div className="control-group">
                <label>背景</label>
                <select value={bgColor === 'transparent' ? 'transparent' : 'custom'} onChange={(e) => setBgColor(e.target.value === 'transparent' ? 'transparent' : '#ffffff')}>
                    <option value="transparent">透明</option>
                    <option value="custom">カスタム色</option>
                </select>
                {bgColor !== 'transparent' && (
                    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                    </div>
                )}
            </div>

            {format === 'png' && (
                <div className="control-group">
                    <label>DPI（解像度）</label>
                    <input
                        type="number"
                        value={dpi}
                        onChange={(e) => setDpi(Number(e.target.value))}
                        min="72" max="1200" step="10"
                    />
                </div>
            )}

            <div className="control-group" style={{ justifyContent: 'flex-end' }}>
                <label>&nbsp;</label>
                <button onClick={onSave}>画像を保存</button>
            </div>
        </div>
    );
};

export default Controls;
