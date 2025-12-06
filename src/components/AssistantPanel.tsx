import { AssistantSettings } from "../types/chat";
import styles from "./AssistantPanel.module.scss";

interface AssistantPanelProps {
  settings: AssistantSettings;
  onChange: (update: Partial<AssistantSettings>) => void;
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle = ({ checked, onChange }: ToggleProps) => (
  <button
    type="button"
    className={`${styles.toggleButton} ${checked ? styles.toggleChecked : ""}`}
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
  >
    <span className={styles.toggleThumb} />
  </button>
);

const AssistantPanel = ({ settings, onChange }: AssistantPanelProps) => {
  const handleInputChange = (field: keyof AssistantSettings) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ [field]: event.target.value } as Partial<AssistantSettings>);
  };

  const handleSelectChange = (field: keyof AssistantSettings) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ [field]: event.target.value } as Partial<AssistantSettings>);
  };

  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ temperature: Number(event.target.value) });
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
          <input
            className={styles.inputControl}
            id="assistant-id"
            type="text"
            value={settings.identifier}
            onChange={handleInputChange("identifier")}
          />
        </div>

        <div className={styles.panelSection}>
          <label className={styles.panelLabel}>图标</label>
          <div className={styles.emojiSelector}>
            <span role="img" aria-label="当前头像">
              {settings.personaEmoji}
            </span>
            <button type="button" className={styles.ghostButton} aria-label="更换图标">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5V19" strokeLinecap="round" />
                <path d="M5 12H19" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.panelSection}>
          <label className={styles.panelLabel} htmlFor="system-prompt">
            系统提示词
          </label>
          <textarea
            className={`${styles.inputControl} ${styles.textareaControl}`}
            id="system-prompt"
            rows={3}
            value={settings.systemPrompt}
            onChange={handleInputChange("systemPrompt")}
            placeholder="提示助手在本轮会话中的行为，例如“聚焦产品策略”。"
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
          <input
            className={styles.rangeInput}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.temperature}
            onChange={handleRangeChange}
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
            <select
              className={styles.inputControl}
              id="max-output"
              value={settings.maxOutputTokens}
              onChange={handleSelectChange("maxOutputTokens")}
            >
              <option value={1024}>默认</option>
              <option value={2048}>2048 tokens</option>
              <option value={4096}>4096 tokens</option>
              <option value={8192}>8192 tokens</option>
            </select>
          </div>
          <div className={styles.panelSection}>
            <label className={styles.panelLabel} htmlFor="reply-language">
              回复语言
            </label>
            <select
              className={styles.inputControl}
              id="reply-language"
              value={settings.replyLanguage}
              onChange={handleSelectChange("replyLanguage")}
            >
              <option value="默认">默认</option>
              <option value="简体中文">简体中文</option>
              <option value="English">English</option>
              <option value="日本語">日本語</option>
            </select>
          </div>
          <div className={styles.panelSection}>
            <label className={styles.panelLabel} htmlFor="knowledge-context">
              联想知识库
            </label>
            <select
              className={styles.inputControl}
              id="knowledge-context"
              value={settings.knowledgeContext}
              onChange={handleSelectChange("knowledgeContext")}
            >
              <option value="默认">默认</option>
              <option value="产品文档">产品文档</option>
              <option value="研发规范">研发规范</option>
              <option value="市场材料">市场材料</option>
            </select>
          </div>
          <div className={styles.panelSection}>
            <label className={styles.panelLabel} htmlFor="response-tone">
              响应倾向
            </label>
            <select
              className={styles.inputControl}
              id="response-tone"
              value={settings.responseTone}
              onChange={handleSelectChange("responseTone")}
            >
              <option value="concise">精简</option>
              <option value="balanced">均衡</option>
              <option value="creative">发散</option>
            </select>
          </div>
        </div>

        <div className={`${styles.panelSection} ${styles.toggles}`}>
          <div className={styles.panelToggle}>
            <div>
              <p>流式响应</p>
              <span>实时输出模型结果</span>
            </div>
            <Toggle
              checked={settings.streamingEnabled}
              onChange={(checked) => onChange({ streamingEnabled: checked })}
            />
          </div>
          <div className={styles.panelToggle}>
            <div>
              <p>安全模式</p>
              <span>过滤潜在敏感内容</span>
            </div>
            <Toggle
              checked={settings.safeModeEnabled}
              onChange={(checked) => onChange({ safeModeEnabled: checked })}
            />
          </div>
          <div className={styles.panelToggle}>
            <div>
              <p>自动引用</p>
              <span>回答中包含参考来源</span>
            </div>
            <Toggle
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
