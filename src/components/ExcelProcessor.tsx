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


  return (
    <div className="excel-processor">
      <h2>Excel HTML文本处理工具</h2>
      <div className="processor-container">
        <button
          onClick={handleFileSelect}
          disabled={isProcessing}
          className="select-button"
        >
          {isProcessing ? '处理中...' : '选择Excel文件'}
        </button>

        {result && (
          <div className={`result ${result.success ? 'success' : 'error'}`}>
            <p>{result.message}</p>
            {result.success && result.output_path}
          </div>
        )}
      </div>

      <style>{`
        .excel-processor {
          padding: 2rem;
          text-align: center;
        }

        .processor-container {
          margin-top: 2rem;
        }

        .select-button {
          padding: 0.8rem 1.5rem;
          font-size: 1.1rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .select-button:hover:not(:disabled) {
          background-color: #1d4ed8;
        }

        .select-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }

        .result {
          margin-top: 1.5rem;
          padding: 1rem;
          border-radius: 0.5rem;
        }

        .success {
          background-color: #dcfce7;
          color: #166534;
        }

        .error {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .open-button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background-color: #059669;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .open-button:hover {
          background-color: #047857;
        }
      `}</style>
    </div>
  );
};

export default ExcelProcessor;