import { forwardRef } from 'react';

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

const Editor = forwardRef<HTMLTextAreaElement, Props>(({ value, onChange, placeholder }, ref) => {
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder ?? 'ここに数式を入力してね'}
                spellCheck={false}
            />
        </div>
    );
});

export default Editor;
