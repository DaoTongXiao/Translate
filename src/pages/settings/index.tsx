import { useState, useEffect, useCallback } from 'react';
import { Switch, Select, Button, List, Modal, Form, Input, Card, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from './Settings.module.scss';
import * as db from '@/services/db';
import { Provider, Model } from '@/types/chat';

const SettingsPage = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [activeModel, setActiveModel] = useState<Model | null>(null);

  // Modals state
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  const [providerForm] = Form.useForm();
  const [modelForm] = Form.useForm();

  const loadData = useCallback(async () => {
    try {
      const [provs, mods, active] = await Promise.all([
        db.getProviders(),
        db.getAllModels(),
        db.getActiveModel(),
      ]);
      setProviders(provs);
      setModels(mods);
      setActiveModel(active);
    } catch (error) {
      console.error('Failed to load settings data:', error);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();
  }, [loadData]);

  const handleCreateProvider = async (values: { name: string; baseUrl: string; apiKey: string }) => {
    try {
      await db.createProvider(values.name, values.baseUrl, values.apiKey, '');
      setIsProviderModalOpen(false);
      providerForm.resetFields();
      await loadData();
    } catch (error) {
      console.error('Failed to create provider:', error);
    }
  };

  const handleCreateModel = async (values: { name: string; modelKey: string }) => {
    if (!selectedProviderId) return;
    try {
      await db.createModel(selectedProviderId, values.name, values.modelKey);
      setIsModelModalOpen(false);
      modelForm.resetFields();
      await loadData();
    } catch (error) {
      console.error('Failed to create model:', error);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      await db.deleteProvider(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete provider:', error);
    }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      await db.deleteModel(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  const handleSetActiveModel = async (modelId: string) => {
    try {
      await db.setActiveModel(modelId);
      await loadData();
    } catch (error) {
      console.error('Failed to set active model:', error);
    }
  };

  return (
    <div className={styles.settingsPage}>
      <h1>设置</h1>

      <div className={styles.section}>
        <h2>模型设置</h2>
        <div className={styles.row}>
          <label>当前模型</label>
          <Select
            value={activeModel?.id}
            style={{ width: 300 }}
            onChange={handleSetActiveModel}
            options={models.map((m) => ({
              value: m.id,
              label: `${m.name} (${providers.find((p) => p.id === m.providerId)?.name || 'Unknown'})`,
            }))}
            placeholder="选择一个模型"
          />
        </div>
      </div>

      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>模型提供商</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsProviderModalOpen(true)}>
            添加提供商
          </Button>
        </div>
        
        <List
          grid={{ gutter: 16, column: 1 }}
          dataSource={providers}
          renderItem={(item) => (
            <List.Item>
              <Card title={item.name} extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProvider(item.id)} />}>
                <p>Base URL: {item.baseUrl}</p>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>模型列表:</strong>
                    <Button 
                      size="small" 
                      onClick={() => {
                        setSelectedProviderId(item.id);
                        setIsModelModalOpen(true);
                      }}
                    >
                      添加模型
                    </Button>
                  </div>
                  <div>
                    {models.filter(m => m.providerId === item.id).map(m => (
                      <Tag 
                        key={m.id} 
                        closable 
                        onClose={() => handleDeleteModel(m.id)}
                        color={m.isActive ? 'blue' : 'default'}
                      >
                        {m.name} ({m.modelKey})
                      </Tag>
                    ))}
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </div>

      <div className={styles.section}>
        <h2>通用</h2>
        <div className={styles.row}>
          <label>主题模式</label>
          <Select
            defaultValue="system"
            style={{ width: 120 }}
            options={[
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
              { value: 'system', label: '跟随系统' },
            ]}
          />
        </div>
        <div className={styles.row}>
          <label>开机自启动</label>
          <Switch defaultChecked />
        </div>
      </div>

      {/* Provider Modal */}
      <Modal
        title="添加提供商"
        open={isProviderModalOpen}
        onOk={providerForm.submit}
        onCancel={() => setIsProviderModalOpen(false)}
      >
        <Form form={providerForm} onFinish={handleCreateProvider} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="OpenAI" />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL" rules={[{ required: true }]}>
            <Input placeholder="https://api.openai.com/v1" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
            <Input.Password placeholder="sk-..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Model Modal */}
      <Modal
        title="添加模型"
        open={isModelModalOpen}
        onOk={modelForm.submit}
        onCancel={() => setIsModelModalOpen(false)}
      >
        <Form form={modelForm} onFinish={handleCreateModel} layout="vertical">
          <Form.Item name="name" label="显示名称" rules={[{ required: true }]}>
            <Input placeholder="GPT-4 Turbo" />
          </Form.Item>
          <Form.Item name="modelKey" label="Model Key" rules={[{ required: true }]}>
            <Input placeholder="gpt-4-turbo-preview" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;
