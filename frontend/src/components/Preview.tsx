import React from 'react';

interface Props {
    image: string | null;
    loading: boolean;
    error: string | null;
}

const Preview: React.FC<Props> = ({ image, loading, error }) => {
    return (
        <div className="preview-container">
            {loading && <div style={{ position: 'absolute', color: '#888' }}>コンパイル中...</div>}
            {error && <div className="error-message">{error}</div>}
            {!loading && !error && image && (
                <img src={image} alt="Equation Preview" className="preview-image" />
            )}
            {!loading && !error && !image && (
                <div style={{ color: '#666' }}>ここにプレビューが表示されます</div>
            )}
        </div>
    );
};

export default Preview;
