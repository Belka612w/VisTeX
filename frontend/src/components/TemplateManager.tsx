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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3>テンプレート</h3>
                <button className="secondary" onClick={() => setIsSaving(!isSaving)} style={{ fontSize: '12px', padding: '5px 10px' }}>
                    {isSaving ? 'キャンセル' : '+ 現在の式を保存'}
                </button>
            </div>

            {isSaving && (
                <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                    <input
                        placeholder="テンプレート名"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button onClick={handleSave} style={{ padding: '5px 10px' }}>保存</button>
                </div>
            )}

            <div className="template-list">
                {templates.map(t => (
                    <div key={t.id} className="template-item" onClick={() => onSelect(t.latex)}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                        <button
                            className="secondary"
                            style={{ padding: '2px 6px', fontSize: '12px', marginLeft: '5px' }}
                            onClick={(e) => handleDelete(e, t.id)}
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
