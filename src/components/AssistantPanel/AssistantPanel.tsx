import { AssistantSettings } from '@/types/chat';
import { Input, Select, Slider, Switch, Button } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import styles from './AssistantPanel.module.scss';

interface AssistantPanelProps {
  settings: AssistantSettings;
  onChange: (update: Partial<AssistantSettings>) => void;
}

const AssistantPanel = ({ settings, onChange }: AssistantPanelProps) => {
  const handleInputChange =
    (field: keyof AssistantSettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: e.target.value } as Partial<AssistantSettings>);
    };

  const handleSelectChange = (field: keyof AssistantSettings) => (value: string | number) => {
    onChange({ [field]: value } as Partial<AssistantSettings>);
  };

  const handleSliderChange = (value: number) => {
    onChange({ temperature: value });
  };

  return (
    <aside className={styles.assistantPanel}>
      <header className={styles.header}>
        <div>
          <p className={styles.title}>对话助手</p>
          <p className={styles.subtitle}>根据需要调整每次会话的运行参数</p>
        </div>
        <span className={styles.badge}>助手</span>
      </header>

      <div className={styles.scrollArea}>
        <div className={styles.panelSection}>
          <label className={styles.panelLabel} htmlFor="assistant-id">
            ID
          </label>
          <Input
            id="assistant-id"
            value={settings.identifier}
            onChange={handleInputChange('identifier')}
            className={styles.inputControl}
          />
        </div>

        <div className={styles.panelSection}>
          <label className={styles.panelLabel}>图标</label>
          <div className={styles.emojiSelector}>
            <span role="img" aria-label="当前头像">
              {settings.personaEmoji}
            </span>
            <Button type="text" icon={<SwapOutlined />} size="small" />
          </div>
        </div>

        <div className={styles.panelSection}>
          <label className={styles.panelLabel} htmlFor="system-prompt">
            系统提示词
          </label>
          <Input.TextArea
            id="system-prompt"
            rows={3}
            value={settings.systemPrompt}
            onChange={handleInputChange('systemPrompt')}
            placeholder="提示助手在本轮会话中的行为，例如“聚焦产品策略”。"
            className={styles.inputControl}
          />
        </div>

        <div className={styles.panelSection}>
          <div className={styles.panelSectionHeading}>
            <div>
              <p>温度</p>
              <span className={styles.panelLabel}>控制输出的保守或发散程度</span>
            </div>
            <span className={styles.panelValue}>{settings.temperature.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={settings.temperature}
            onChange={handleSliderChange}
            tooltip={{ formatter: (value) => value?.toFixed(2) }}
          />
          <div className={styles.rangeMarkers}>
            <span>严谨</span>
            <span>均衡</span>
            <span>创意</span>
          </div>
        </div>

        <div className={styles.panelGrid}>
          <div className={styles.panelSection}>
            <label className={styles.panelLabel} htmlFor="max-output">
              最大输出长度
            </label>
            <Select
              id="max-output"
              value={settings.maxOutputTokens}
              onChange={handleSelectChange('maxOutputTokens')}
              className={styles.selectControl}
              options={[
                { value: 1024, label: '默认' },
                { value: 2048, label: '2048 tokens' },
                { value: 4096, label: '4096 tokens' },
                { value: 8192, label: '8192 tokens' },
              ]}
            />
          </div>
          <div className={styles.panelSection}>
            <label className={styles.panelLabel} htmlFor="reply-language">
              回复语言
            </label>
            <Select
              id="reply-language"
              value={settings.replyLanguage}
              onChange={handleSelectChange('replyLanguage')}
              className={styles.selectControl}
              options={[
                { value: '默认', label: '默认' },
                { value: '简体中文', label: '简体中文' },
                { value: 'English', label: 'English' },
                { value: '日本語', label: '日本語' },
              ]}
            />
          </div>
          <div className={styles.panelSection}>
            <label className={styles.panelLabel} htmlFor="knowledge-context">
              联想知识库
            </label>
            <Select
              id="knowledge-context"
              value={settings.knowledgeContext}
              onChange={handleSelectChange('knowledgeContext')}
              className={styles.selectControl}
              options={[
                { value: '默认', label: '默认' },
                { value: '产品文档', label: '产品文档' },
                { value: '研发规范', label: '研发规范' },
                { value: '市场材料', label: '市场材料' },
              ]}
            />
          </div>
          <div className={styles.panelSection}>
            <label className={styles.panelLabel} htmlFor="response-tone">
              响应倾向
            </label>
            <Select
              id="response-tone"
              value={settings.responseTone}
              onChange={handleSelectChange('responseTone')}
              className={styles.selectControl}
              options={[
                { value: 'concise', label: '精简' },
                { value: 'balanced', label: '均衡' },
                { value: 'creative', label: '发散' },
              ]}
            />
          </div>
        </div>

        <div className={`${styles.panelSection} ${styles.toggles}`}>
          <div className={styles.panelToggle}>
            <div>
              <p>流式响应</p>
              <span>实时输出模型结果</span>
            </div>
            <Switch
              checked={settings.streamingEnabled}
              onChange={(checked) => onChange({ streamingEnabled: checked })}
            />
          </div>
          <div className={styles.panelToggle}>
            <div>
              <p>安全模式</p>
              <span>过滤潜在敏感内容</span>
            </div>
            <Switch
              checked={settings.safeModeEnabled}
              onChange={(checked) => onChange({ safeModeEnabled: checked })}
            />
          </div>
          <div className={styles.panelToggle}>
            <div>
              <p>自动引用</p>
              <span>回答中包含参考来源</span>
            </div>
            <Switch
              checked={settings.autoCitation}
              onChange={(checked) => onChange({ autoCitation: checked })}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AssistantPanel;
