import React, { useEffect, useState } from 'react';
import type { Template } from '../App';

interface Props {
    onSelect: (latex: string) => void;
    currentLatex: string;
}

const TemplateManager: React.FC<Props> = ({ onSelect, currentLatex }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');

    const fetchTemplates = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/templates');
            const data = await res.json();
            setTemplates(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleSave = async () => {
        if (!name) return;
        await fetch('http://localhost:3001/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, latex: currentLatex }),
        });
        setName('');
        setIsSaving(false);
        fetchTemplates();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('このテンプレートを削除しますか？')) return;

        // Optimistic update
        setTemplates(prev => prev.filter(t => t.id !== id));

        try {
            await fetch(`http://localhost:3001/api/templates/${id}`, { method: 'DELETE' });
            // Re-fetch to be sure
            fetchTemplates();
        } catch (err) {
            console.error("Failed to delete", err);
            fetchTemplates(); // Revert on error
        }
    };

    return (
        <div className="template-manager">
            <div className="section-header">
                <h3>テンプレート</h3>
                <button className="secondary compact" onClick={() => setIsSaving(!isSaving)}>
                    {isSaving ? 'キャンセル' : '+ 現在の式を保存'}
                </button>
            </div>

            {isSaving && (
                <div className="template-save-row">
                    <input
                        placeholder="テンプレート名"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <button onClick={handleSave}>保存</button>
                </div>
            )}

            <div className="template-list">
                {templates.map(t => (
                    <div key={t.id} className="template-item" onClick={() => onSelect(t.latex)}>
                        <span className="template-item__name">{t.name}</span>
                        <button
                            className="secondary small"
                            onClick={(e) => handleDelete(e, t.id)}
                            aria-label={`${t.name} を削除`}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TemplateManager;
