import React from 'react';

interface Props {
    image: string | null;
    loading: boolean;
    error: string | null;
    useWhiteBackground: boolean;
}

const Preview: React.FC<Props> = ({ image, loading, error, useWhiteBackground }) => {
    return (
        <div className={`preview-container ${useWhiteBackground ? 'preview-container--white' : ''}`}>
            {loading && (
                <div className="preview-overlay" role="status" aria-live="polite">
                    コンパイル中...
                </div>
            )}
            {!loading && error && (
                <div className="preview-overlay preview-overlay--error" role="alert">
                    <div className="error-message">{error}</div>
                </div>
            )}
            {!loading && !error && image && (
                <img src={image} alt="Equation Preview" className="preview-image" />
            )}
            {!loading && !error && !image && (
                <div className="preview-placeholder">ここにプレビューが表示されます</div>
            )}
        </div>
    );
};

export default Preview;
