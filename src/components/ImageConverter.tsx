import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { save } from '@tauri-apps/plugin-dialog';

const ImageConverter = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; output_path?: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);


  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: '图片文件',
          extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp']
        }]
      });

      if (selected && typeof selected === 'string') {
        // 设置预览图片
        setPreviewImage(`data:image/png;base64,${await window.btoa(await window.atob('file://' + selected))}`);
        
        // 选择保存位置
        const savePath = await save({
          filters: [{
            name: '图标文件',
            extensions: ['ico']
          }],
          defaultPath: selected.replace(/\.[^\.]+$/, '.ico')
        });

        if (savePath) {
          setIsProcessing(true);
          setResult(null);

          const convertResult = await invoke('convert_to_ico', {
            imageData: {
              path: selected,
              output_path: savePath
            }
          });

          setResult(convertResult as any);
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: `处理出错: ${error}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenFile = (path: string) => {
    invoke('open_file', { path });
  };

  return (
    <div className="image-converter">
      <div className="card">
        <div className="converter-container">
          <div className="converter-left">
            <div className="preview-container">
              {previewImage ? (
                <img src={previewImage} alt="预览" className="preview-image" />
              ) : (
                <div className="preview-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--color-text-secondary)" strokeWidth="1.5" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="var(--color-text-secondary)" />
                    <path d="M21 15L16 10L5 21" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="placeholder-text">暂无预览</div>
                </div>
              )}
            </div>
          </div>
          <div className="converter-right">
            <div className="converter-actions">
              <button
                onClick={handleFileSelect}
                disabled={isProcessing}
                className="action-button primary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                  <path d="M12 6V12M12 12V18M12 12H18M12 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {isProcessing ? '处理中...' : '选择图片文件'}
              </button>
            </div>

            <div className="feature-list">
              <div className="section-title">功能特点</div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>自动生成圆角图标</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>高质量抽锤处理</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>支持多种图片格式</span>
              </div>
            </div>

            {result && (
              <div className={`result-card ${result.success ? 'success' : 'error'}`}>
                <div className="result-icon">
                  {result.success ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 4L12 14.01L9 11.01" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15 9L9 15" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 9L15 15" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="result-content">
                  <h3>{result.success ? '转换成功' : '转换失败'}</h3>
                  <p>{result.message}</p>
                  {result.success && result.output_path && (
                    <button
                      onClick={() => handleOpenFile(result.output_path!)}
                      className="action-button secondary"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                        <path d="M21 9L21 19C21 20.1046 20.1046 21 19 21L5 21C3.89543 21 3 20.1046 3 19L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M17 6L12 1L7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 1L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      打开文件夹
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .image-converter {
          width: 100%;
        }

        .converter-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-lg);
        }

        .converter-left, .converter-right {
          display: flex;
          flex-direction: column;
        }

        .preview-container {
          background-color: var(--color-bg-secondary);
          border-radius: var(--border-radius-lg);
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px dashed var(--border-color);
          box-shadow: var(--shadow-sm);
          position: relative;
        }
        
        .preview-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: var(--border-radius-lg);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
          pointer-events: none;
        }

        .preview-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: var(--border-radius-md);
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          gap: var(--spacing-md);
        }

        .placeholder-text {
          font-size: 0.9rem;
          opacity: 0.7;
        }

        .converter-actions {
          margin-bottom: var(--spacing-lg);
        }

        .action-button {
          display: flex;
          align-items: center;
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--border-radius-md);
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }

        .action-button.primary {
          background-color: var(--color-primary);
          color: white;
          width: 100%;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .action-button.primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
          border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
        }

        .action-button.primary:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .section-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-sm);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) 0 var(--spacing-lg);
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--color-text-secondary);
          font-size: 0.95rem;
        }

        .result-card {
          margin-top: var(--spacing-lg);
          padding: var(--spacing-md);
          border-radius: var(--border-radius-md);
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-md);
        }

        .result-card.success {
          background-color: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.2);
          box-shadow: var(--shadow-sm);
        }

        .result-card.error {
          background-color: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          box-shadow: var(--shadow-sm);
        }

        .result-content {
          flex: 1;
        }

        .result-content h3 {
          font-size: 1.1rem;
          margin-bottom: var(--spacing-xs);
          color: var(--color-text-primary);
        }

        .result-content p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin-bottom: var(--spacing-md);
        }

        .action-button.secondary {
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          padding: var(--spacing-xs) var(--spacing-md);
          margin-top: var(--spacing-sm);
        }

        .action-button.secondary:hover {
          background-color: var(--color-bg-hover);
          color: var(--color-text-primary);
        }

        @media (max-width: 768px) {
          .converter-container {
            grid-template-columns: 1fr;
            gap: var(--spacing-md);
          }
          
          .preview-container {
            aspect-ratio: 16/9;
            margin-bottom: var(--spacing-md);
          }
        }
      `}</style>
      <div className="converter-container">
        <div className="converter-left">
          <div className="preview-container">
            {previewImage ? (
              <img src={previewImage} alt="预览" className="preview-image" />
            ) : (
              <div className="preview-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--color-text-secondary)" strokeWidth="1.5" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="var(--color-text-secondary)" />
                  <path d="M21 15L16 10L5 21" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="placeholder-text">暂无预览</div>
              </div>
            )}
          </div>
        </div>
        <div className="converter-right">
          <div className="converter-actions">
            <button
              onClick={handleFileSelect}
              disabled={isProcessing}
              className="action-button primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                <path d="M12 6V12M12 12V18M12 12H18M12 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {isProcessing ? '处理中...' : '选择图片文件'}
            </button>
          </div>

          <div className="feature-list">
            <div className="section-title">功能特点</div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>自动生成圆角图标</span>
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>高质量抽锤处理</span>
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>支持多种图片格式</span>
            </div>
          </div>

          {result && (
            <div className={`result-card ${result.success ? 'success' : 'error'}`}>
              <div className="result-icon">
                {result.success ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 4L12 14.01L9 11.01" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 9L9 15" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 9L15 15" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="result-content">
                <h3>{result.success ? '转换成功' : '转换失败'}</h3>
                <p>{result.message}</p>
                {result.success && result.output_path && (
                  <button
                    onClick={() => handleOpenFile(result.output_path!)}
                    className="action-button secondary"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                      <path d="M21 9L21 19C21 20.1046 20.1046 21 19 21L5 21C3.89543 21 3 20.1046 3 19L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M17 6L12 1L7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 1L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    打开文件夹
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageConverter;
