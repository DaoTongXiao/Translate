import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './ChatCanvas.module.scss';


interface MarkdownMessageProps {
  content: string;
  role: 'user' | 'assistant';
}

const MarkdownMessage = ({ content, role }: MarkdownMessageProps) => {
  return (
    <div className={`${styles.markdownContent} ${role === 'user' ? styles.userMarkdown : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node: _node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className={styles.codeBlockWrapper}>
                 <div className={styles.codeHeader}>
                    <span>{match[1]}</span>
                 </div>
                <SyntaxHighlighter
                  {...props}
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code {...props} className={className}>
                {children}
              </code>
            );
          },
          table({ children }) {
           return <div className={styles.tableWrapper}><table>{children}</table></div>
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
