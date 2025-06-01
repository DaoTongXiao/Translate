import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

const ExcelProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; output_path?: string } | null>(null);

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Excel',
          extensions: ['xlsx', 'xls']
        }]
      });

      if (selected && typeof selected === 'string') {
        setIsProcessing(true);
        setResult(null);

        const processResult = await invoke('process_excel', {
          inputPath: selected
        });

        setResult(processResult as any);
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
    <div className="excel-processor">
      <div className="card">
        <div className="processor-container">
          <div className="processor-header">
            <div className="section-title">Excel HTML文本处理工具</div>
            <p className="processor-description">
              上传Excel文件，自动提取并处理其中的HTML文本内容，支持批量转换和格式优化。
            </p>
          </div>
          
          <div className="processor-actions">
            <button
              onClick={handleFileSelect}
              disabled={isProcessing}
              className="action-button primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isProcessing ? '处理中...' : '选择Excel文件'}
            </button>
          </div>
          
          <div className="feature-list">
            <div className="section-title">功能特点</div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>批量处理HTML文本</span>
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>自动格式化和优化</span>
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L10 17L20 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>支持多种Excel格式</span>
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
                <h3>{result.success ? '处理成功' : '处理失败'}</h3>
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

      <style>{`
        .excel-processor {
          width: 100%;
        }

        .processor-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .processor-header {
          text-align: center;
          margin-bottom: var(--spacing-md);
        }

        .processor-description {
          color: var(--color-text-secondary);
          font-size: 0.95rem;
          margin-top: var(--spacing-xs);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .processor-actions {
          margin-bottom: var(--spacing-md);
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
      `}</style>
    </div>
  );
};

export default ExcelProcessor;