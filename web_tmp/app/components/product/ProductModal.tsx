import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Modal, Form, Input, Select, Space, Button, Divider, Switch, 
  message, Row, Col, Collapse, Tag
} from 'antd';
import { Trash2, GitBranch, ChevronRight, Plus, X } from 'lucide-react';
import { Product, Repository } from './types';

// Mock data for new fields
const mockProjectSpaces = [
  { label: '基础平台部', value: 'space_1' },
  { label: '业务中台部', value: 'space_2' },
  { label: '数据智能部', value: 'space_3' },
];

const mockProductVersions = [
  { label: 'V1.0.0', value: 'v1.0.0' },
  { label: 'V2.0.0', value: 'v2.0.0' },
  { label: 'V3.0.0', value: 'v3.0.0' },
  { label: 'V4.0.0', value: 'v4.0.0' },
];

const mockModules: Record<string, { label: string; value: string }[]> = {
  'v1.0.0': [
    { label: '用户管理模块', value: 'mod_user' },
    { label: '权限管理模块', value: 'mod_auth' },
    { label: '日志审计模块', value: 'mod_log' },
  ],
  'v2.0.0': [
    { label: '订单管理模块', value: 'mod_order' },
    { label: '支付管理模块', value: 'mod_pay' },
    { label: '库存管理模块', value: 'mod_inventory' },
  ],
  'v3.0.0': [
    { label: '数据分析模块', value: 'mod_analytics' },
    { label: '报表中心模块', value: 'mod_report' },
    { label: 'AI 推荐模块', value: 'mod_ai' },
  ],
  'v4.0.0': [
    { label: '消息通知模块', value: 'mod_notify' },
    { label: '工作流引擎模块', value: 'mod_workflow' },
    { label: '监控告警模块', value: 'mod_monitor' },
  ],
};

const mockRepos: Record<string, { name: string; url: string; branch: string }[]> = {
  'mod_user': [
    { name: 'user-backend', url: 'https://git-nj.iwhalecloud.com/backend/user-backend.git', branch: 'master' },
    { name: 'user-frontend', url: 'https://git-nj.iwhalecloud.com/frontend/user-frontend.git', branch: 'develop' },
  ],
  'mod_auth': [
    { name: 'auth-service', url: 'https://git-nj.iwhalecloud.com/backend/auth-service.git', branch: 'develop' },
    { name: 'auth-gateway', url: 'https://git-nj.iwhalecloud.com/backend/auth-gateway.git', branch: 'master' },
  ],
  'mod_log': [
    { name: 'log-collector', url: 'https://git-nj.iwhalecloud.com/backend/log-collector.git', branch: 'master' },
  ],
  'mod_order': [
    { name: 'order-service', url: 'https://git-nj.iwhalecloud.com/backend/order-service.git', branch: 'master' },
    { name: 'order-frontend', url: 'https://git-nj.iwhalecloud.com/frontend/order-frontend.git', branch: 'develop' },
  ],
  'mod_pay': [
    { name: 'pay-service', url: 'https://git-nj.iwhalecloud.com/backend/pay-service.git', branch: 'master' },
  ],
  'mod_inventory': [
    { name: 'inventory-service', url: 'https://git-nj.iwhalecloud.com/backend/inventory-service.git', branch: 'master' },
  ],
  'mod_analytics': [
    { name: 'analytics-engine', url: 'https://git-nj.iwhalecloud.com/data/analytics-engine.git', branch: 'develop' },
    { name: 'analytics-frontend', url: 'https://git-nj.iwhalecloud.com/frontend/analytics-frontend.git', branch: 'develop' },
  ],
  'mod_report': [
    { name: 'report-service', url: 'https://git-nj.iwhalecloud.com/backend/report-service.git', branch: 'master' },
  ],
  'mod_ai': [
    { name: 'ai-recommend', url: 'https://git-nj.iwhalecloud.com/ai/ai-recommend.git', branch: 'develop' },
    { name: 'ai-model-server', url: 'https://git-nj.iwhalecloud.com/ai/ai-model-server.git', branch: 'main' },
  ],
  'mod_notify': [
    { name: 'notify-service', url: 'https://git-nj.iwhalecloud.com/backend/notify-service.git', branch: 'master' },
  ],
  'mod_workflow': [
    { name: 'workflow-engine', url: 'https://git-nj.iwhalecloud.com/backend/workflow-engine.git', branch: 'develop' },
    { name: 'workflow-frontend', url: 'https://git-nj.iwhalecloud.com/frontend/workflow-frontend.git', branch: 'develop' },
  ],
  'mod_monitor': [
    { name: 'monitor-agent', url: 'https://git-nj.iwhalecloud.com/ops/monitor-agent.git', branch: 'master' },
  ],
};

// Fake product exists check
const checkProductExists = async (space: string, version: string, module: string) => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Dummy check: simulate existing product for a specific combo
      resolve(space === 'space_1' && version === 'v1.0.0' && module === 'mod_user');
    }, 300);
  });
};

const DEFAULT_ICONS = [
  { label: '蓝天 (应用)', value: 'data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="%233b82f6"/><path d="M16 8L24 24H8L16 8Z" fill="white"/></svg>' },
  { label: '青草 (组件)', value: 'data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="%2310b981"/><circle cx="16" cy="16" r="8" fill="white"/></svg>' },
  { label: '紫罗兰 (服务)', value: 'data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="%238b5cf6"/><rect x="10" y="10" width="12" height="12" fill="white"/></svg>' },
  { label: '橙阳 (系统)', value: 'data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="%23f97316"/><polygon points="16,8 24,16 16,24 8,16" fill="white"/></svg>' },
  { label: '暗夜 (框架)', value: 'data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="%23334155"/><path d="M10 16L16 10L22 16L16 22L10 16Z" fill="white"/></svg>' },
];

interface ProductModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: (values: Partial<Product>) => void;
  initialValues?: Product;
}

export function ProductModal({ open, onCancel, onFinish, initialValues }: ProductModalProps) {
  const [form] = Form.useForm();
  const [isEdit, setIsEdit] = useState(false);
  
  const [projectSpaces, setProjectSpaces] = useState<{label: string, value: string}[]>([]);
  const [productVersions, setProductVersions] = useState<{label: string, value: string}[]>([]);
  const [appModules, setAppModules] = useState<{label: string, value: string}[]>([]);

  const nameVal = Form.useWatch('name', form);
  const spaceVal = Form.useWatch('projectSpace', form);
  const versionVal = Form.useWatch('productVersion', form);
  const moduleVal = Form.useWatch('appModule', form);
  
  const isProductInfoFilled = !!(nameVal && spaceVal && versionVal && moduleVal);

  useEffect(() => {
    if (open) {
      setProjectSpaces(mockProjectSpaces);
      setProductVersions(mockProductVersions);
      
      if (initialValues) {
        form.setFieldsValue(initialValues);
        setIsEdit(true);
      } else {
        form.resetFields();
        form.setFieldsValue({
          repositories: [],
        });
        setIsEdit(false);
        setAppModules([]);
      }
    }
  }, [open, initialValues, form]);

  const handleVersionChange = (val: string) => {
    form.setFieldsValue({ appModule: undefined, repositories: [] });
    setAppModules(mockModules[val] || []);
    form.validateFields(['appModule']).catch(() => {});
  };

  const handleModuleChange = (val: string) => {
    const repos = mockRepos[val] || [];
    form.setFieldsValue({ 
      repositories: repos.map((r, idx) => ({
        url: r.url,
        branch: r.branch,
        purpose: '',
        isMain: idx === 0,
        analysisTime: '',
        analysisStatus: 'analyzing'
      }))
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const mainRepos = (values.repositories || []).filter((r: Repository) => r.isMain);
      if (values.repositories && values.repositories.length > 0) {
        if (mainRepos.length === 0) {
          message.error('必须且只能有一个主分支仓库');
          return;
        }
        if (mainRepos.length > 1) {
          message.error('只能有一个主分支仓库');
          return;
        }
      }

      // 将表单的 productVersion / appModule (value) 映射为 Product 的 version / module (label)
      const versionLabel = productVersions.find(v => v.value === values.productVersion)?.label || values.productVersion || '';
      const moduleLabel = appModules.find(m => m.value === values.appModule)?.label || values.appModule || '';

      // 将功能列表按逗号拼接
      const featuresStr = Array.isArray(values.features) ? values.features.join(',') : (values.features || '');

      const submitValues = {
        ...values,
        version: versionLabel,
        module: moduleLabel,
        features: featuresStr,
      };

      onFinish(submitValues);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑产品' : '新增产品'}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={880}
      okText={isEdit ? '更新' : '创建'}
      cancelText="取消"
      style={{ top: 40 }}
      styles={{
        header: { marginBottom: 16, borderBottom: '1px solid rgba(51, 65, 85, 0.3)', paddingBottom: 16 },
        body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', overflowX: 'hidden' },
        content: { padding: '20px 24px' }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
      >
        <Row gutter={24}>
          <Col span={16}>
            <Form.Item
              name="name"
              label="产品名称"
              rules={[
                { required: true, message: '请填写产品名称' },
                { max: 64, message: '产品名称不能超过64个字符' }
              ]}
            >
              <Input placeholder="请输入产品名称（不超过64个字）" maxLength={64} disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="icon"
              label="产品图标"
              initialValue={DEFAULT_ICONS[0].value}
              rules={[{ required: true, message: '请选择产品图标' }]}
            >
              <Select placeholder="请选择产品图标">
                {DEFAULT_ICONS.map(icon => (
                  <Select.Option key={icon.label} value={icon.value}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={icon.value} alt={icon.label} style={{ width: 20, height: 20, borderRadius: 4 }} />
                      <span>{icon.label}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="projectSpace"
              label="项目空间"
              rules={[{ required: true, message: '请选择项目空间' }]}
            >
              <Select 
                showSearch
                placeholder="请选择项目空间" 
                disabled={isEdit}
                options={projectSpaces}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={() => form.validateFields(['appModule']).catch(() => {})}
              />
            </Form.Item>
          </Col>
          
          <Col span={8}>
            <Form.Item
              name="productVersion"
              label="产品版本"
              rules={[{ required: true, message: '请选择产品版本' }]}
            >
              <Select 
                showSearch
                placeholder="请选择产品版本" 
                disabled={isEdit}
                options={productVersions}
                onChange={handleVersionChange}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="appModule"
              label="应用模块"
              dependencies={['projectSpace', 'productVersion']}
              rules={[
                { required: true, message: '请选择应用模块' },
                {
                  validator: async (_, value) => {
                    const space = form.getFieldValue('projectSpace');
                    const version = form.getFieldValue('productVersion');
                    if (space && version && value && !isEdit) {
                      const exists = await checkProductExists(space, version, value);
                      if (exists) {
                        return Promise.reject(new Error('该产品(项目空间+版本+模块)已存在，禁止创建'));
                      }
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              extra={
                !isEdit && form.getFieldValue('projectSpace') === 'space_1' && form.getFieldValue('productVersion') === 'v1.0.0'
                  ? <span style={{ fontSize: 12, color: '#64748b' }}>提示: 选"用户管理模块"会模拟已存在情况</span>
                  : null
              }
            >
              <Select 
                showSearch
                placeholder="请选择应用模块" 
                disabled={isEdit || !form.getFieldValue('productVersion')}
                options={appModules}
                onChange={handleModuleChange}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>


        <Form.Item
          name="description"
          label="产品描述"
          rules={[{ required: true, message: '请输入产品描述' }]}
        >
          <Input.TextArea rows={2} placeholder="简单描述该产品的功能与定位" />
        </Form.Item>

        <Form.Item
          name="features"
          label="产品功能"
          extra={<span style={{ fontSize: 12, color: '#64748b' }}>输入单个功能后按回车添加，可添加多个功能</span>}
          initialValue={[]}
        >
          <TagInput />
        </Form.Item>

        <Divider orientation="left" style={{ margin: '24px 0 16px', borderColor: 'rgba(51, 65, 85, 0.3)' }}>
          <Space size={8}>
            <GitBranch size={16} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>代码仓库配置</span>
          </Space>
        </Divider>

        {!isProductInfoFilled ? (
          <div style={{ 
            padding: '24px', 
            textAlign: 'center', 
            background: 'rgba(51, 65, 85, 0.1)', 
            borderRadius: 12,
            color: '#94a3b8',
            border: '1px dashed rgba(51, 65, 85, 0.3)'
          }}>
            请先完善上方产品信息（名称、空间、版本、模块）后，再添加仓库配置
          </div>
        ) : (
          <Form.List name="repositories">
            {(fields, { add, remove }) => (
              <>
                <Collapse
                  defaultActiveKey={['0']}
                  accordion
                  style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: 16 }}
                  expandIcon={({ isActive }) => <ChevronRight size={16} style={{ transform: isActive ? 'rotate(90deg)' : 'none', transition: 'all 0.3s' }} color="#94a3b8" />}
                  items={fields.map(({ key, name, ...restField }, index) => ({
                    key: String(index),
                    label: <span style={{ color: '#cbd5e1', fontWeight: 500 }}>仓库配置 {index + 1}</span>,
                    style: { 
                      background: 'rgba(51, 65, 85, 0.1)', 
                      borderRadius: 12, 
                      marginBottom: 16,
                      border: '1px solid rgba(51, 65, 85, 0.2)',
                      overflow: 'hidden'
                    },
                    children: (
                      <Row gutter={16}>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'branch']}
                            label="仓库分支"
                            rules={[{ required: true, message: '必填' }]}
                          >
                            <Input placeholder="main/master" />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item
                            {...restField}
                            name={[name, 'url']}
                            label="仓库地址"
                            rules={[{ required: true, message: '必填' }]}
                          >
                            <Input placeholder="https://git.example.com/repo.git" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'purpose']}
                            label="仓库作用"
                            rules={[{ required: true, message: '必填' }]}
                          >
                            <Input placeholder="如：后端核心" />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item
                            {...restField}
                            name={[name, 'token']}
                            label="仓库 Token"
                          >
                            <Input.Password placeholder="访问权限令牌" />
                          </Form.Item>
                        </Col>
                        <Col span={14}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 30 }}>
                            <Form.Item
                              {...restField}
                              name={[name, 'isMain']}
                              valuePropName="checked"
                              noStyle
                            >
                              <Switch 
                                checkedChildren="主仓库" 
                                unCheckedChildren="次仓库"
                                onChange={(checked) => {
                                  if (checked) {
                                    const repos = form.getFieldValue('repositories');
                                    const newRepos = repos.map((r: any, i: number) => ({
                                      ...r,
                                      isMain: i === index
                                    }));
                                    form.setFieldsValue({ repositories: newRepos });
                                  }
                                }}
                              />
                            </Form.Item>
                            <Button 
                              type="text" 
                              danger 
                              icon={<Trash2 size={16} />} 
                              onClick={() => remove(name)}
                              size="small"
                            >
                              移除仓库
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    )
                  }))}
                />
                <Button 
                  type="dashed" 
                  onClick={() => add({ branch: 'master', isMain: fields.length === 0 })} 
                  block 
                  icon={<GitBranch size={16} />}
                  style={{ height: 48, borderRadius: 12 }}
                >
                  增加代码仓库配置
                </Button>
              </>
            )}
          </Form.List>

        )}
      </Form>
    </Modal>
  );
}

// TagInput component for product features
interface TagInputProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

function TagInput({ value = [], onChange }: TagInputProps) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<any>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputVal.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange?.([...value, trimmed]);
      }
      setInputVal('');
    }
  };

  const handleRemove = (tag: string) => {
    onChange?.(value.filter(t => t !== tag));
  };

  return (
    <div
      style={{
        border: '1px solid rgba(51, 65, 85, 0.4)',
        borderRadius: 8,
        padding: '4px 8px',
        minHeight: 36,
        cursor: 'text',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        alignItems: 'center',
        background: 'transparent',
        transition: 'border-color 0.2s',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map(tag => (
        <Tag
          key={tag}
          closable
          onClose={() => handleRemove(tag)}
          closeIcon={<X size={10} />}
          style={{
            margin: 0,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 12,
            padding: '0 6px',
            lineHeight: '22px',
          }}
        >
          {tag}
        </Tag>
      ))}
      <Input
        ref={inputRef}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? '输入功能后按回车添加' : ''}
        variant="borderless"
        style={{
          flex: 1,
          minWidth: 120,
          padding: '0 4px',
          height: 24,
          fontSize: 13,
        }}
      />
    </div>
  );
}