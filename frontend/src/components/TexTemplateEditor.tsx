import React from 'react';

interface Props {
    enabled: boolean;
    disabled: boolean;
    template: string;
    onToggle: (value: boolean) => void;
    onChange: (value: string) => void;
    onReset: () => void;
    isTikzMode: boolean;
}

const PLACEHOLDERS = [
    { token: '{{LATEX}}', description: 'エディタに入力した内容をそのまま展開' },
    { token: '{{COLOR}}', description: '# を除いた文字色（xcolor の HTML モデル用）' },
    { token: '{{COLOR_HEX}}', description: '# を含む文字色（CSS の色指定に便利）' },
    { token: '{{BG_COLOR}}', description: '# を除いた背景色 / transparent' },
    { token: '{{BG_COLOR_HEX}}', description: '# を含む背景色 / transparent' },
];

const TexTemplateEditor: React.FC<Props> = ({
    enabled,
    disabled,
    template,
    onToggle,
    onChange,
    onReset,
    isTikzMode,
}) => {
    return (
        <div className="template-editor">
            <div className="template-editor__header">
                <h3>TeX テンプレート</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
                    <input
                        type="checkbox"
                        checked={enabled}
                        disabled={disabled}
                        onChange={(e) => onToggle(e.target.checked)}
                    />
                    カスタムテンプレートを使う
                </label>
            </div>

            {disabled && (
                <p className="template-editor__note">
                    フルモードではテンプレートを上書きせず、エディタの内容をそのまま送信します。
                </p>
            )}

            {enabled && (
                <>
                    <textarea
                        value={template}
                        onChange={(e) => onChange(e.target.value)}
                        spellCheck={false}
                    />
                    <div className="template-editor__bottom">
                        <div className="template-editor__placeholders">
                            {PLACEHOLDERS.map(item => (
                                <div key={item.token}>
                                    <code>{item.token}</code>
                                    <span>{item.description}</span>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="secondary" onClick={onReset}>
                            {isTikzMode ? 'TikZ 用デフォルトに戻す' : '数式モードのデフォルトに戻す'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default TexTemplateEditor;
