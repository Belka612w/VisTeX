import React from 'react';
import type { CopyStatus } from '../App';

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
    onCopy: () => void;
    canCopy: boolean;
    copyStatus: CopyStatus;
    favoriteTextColors: string[];
    onAddFavoriteTextColor: () => void;
    onRemoveFavoriteTextColor: (c: string) => void;
    favoriteBgColors: string[];
    onAddFavoriteBgColor: () => void;
    onRemoveFavoriteBgColor: (c: string) => void;
}

const Controls: React.FC<Props> = ({
    format, setFormat,
    color, setColor,
    bgColor, setBgColor,
    dpi, setDpi,
    onSave,
    isTikzMode,
    onCopy,
    canCopy,
    copyStatus,
    favoriteTextColors,
    onAddFavoriteTextColor,
    onRemoveFavoriteTextColor,
    favoriteBgColors,
    onAddFavoriteBgColor,
    onRemoveFavoriteBgColor
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
                <div className="color-row">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="color-input-fixed"
                    />
                    <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="color-text-input"
                        aria-label="文字色コードを入力"
                    />
                    <button
                        className="color-add-btn"
                        onClick={onAddFavoriteTextColor}
                        title="お気に入りに追加"
                    >
                        +
                    </button>
                </div>
                {favoriteTextColors.length > 0 && (
                    <div className="favorite-colors">
                        {favoriteTextColors.map((c) => (
                            <button
                                key={c}
                                className="favorite-color-btn"
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                                title={`${c} を選択`}
                            >
                                <span
                                    className="favorite-color-remove"
                                    onClick={(e) => { e.stopPropagation(); onRemoveFavoriteTextColor(c); }}
                                    title="削除"
                                >
                                    ×
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="control-group">
                <label>背景</label>
                <div className="bg-color-row">
                    <select
                        value={bgColor === 'transparent' ? 'transparent' : 'custom'}
                        onChange={(e) => setBgColor(e.target.value === 'transparent' ? 'transparent' : '#ffffff')}
                        className="bg-select"
                    >
                        <option value="transparent">透明</option>
                        <option value="custom">カスタム色</option>
                    </select>
                    {bgColor !== 'transparent' && (
                        <>
                            <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="color-input-fixed"
                            />
                            <button
                                className="color-add-btn"
                                onClick={onAddFavoriteBgColor}
                                title="お気に入りに追加"
                            >
                                +
                            </button>
                        </>
                    )}
                </div>
                {favoriteBgColors.length > 0 && (
                    <div className="favorite-colors">
                        {favoriteBgColors.map((c) => (
                            <button
                                key={c}
                                className="favorite-color-btn"
                                style={{ backgroundColor: c }}
                                onClick={() => setBgColor(c)}
                                title={`${c} を選択`}
                            >
                                <span
                                    className="favorite-color-remove"
                                    onClick={(e) => { e.stopPropagation(); onRemoveFavoriteBgColor(c); }}
                                    title="削除"
                                >
                                    ×
                                </span>
                            </button>
                        ))}
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

            <div className="control-group control-group--actions">
                <label>出力</label>
                <div className="control-actions">
                    <div className="action-status">
                        {copyStatus === 'copied' && (
                            <span className="action-note action-note--success">クリップボードにコピーしました</span>
                        )}
                        {copyStatus === 'failed' && (
                            <span className="action-note action-note--error">コピーに失敗しました。ブラウザの設定を確認してください。</span>
                        )}
                        {copyStatus === 'idle' && (
                            <span className="action-note">
                                {canCopy ? 'クリップボードにコピー・画像保存が利用できます' : 'プレビュー生成後にコピー/保存できます'}
                            </span>
                        )}
                        {copyStatus === 'copying' && (
                            <span className="action-note">コピー中...</span>
                        )}
                    </div>
                    <div className="action-buttons">
                        <button
                            onClick={onCopy}
                            disabled={!canCopy || copyStatus === 'copying'}
                        >
                            {copyStatus === 'copying' ? 'コピー中...' : 'クリップボードにコピー'}
                        </button>
                        <button onClick={onSave} disabled={!canCopy}>画像を保存</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Controls;
