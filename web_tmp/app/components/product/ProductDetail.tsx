import React, { useState } from 'react';
import { 
  Drawer, Typography, Space, Tag, Tabs, Empty, 
  Card, Row, Col, Divider, Tooltip, Button, Collapse, Popconfirm, message 
} from 'antd';
import { 
  Github, GitBranch, GitMerge, FileText, 
  Layout, Book, ClipboardList, Package, ExternalLink,
  Code2, Network, Share2, Maximize2, Layers, FileArchive, RefreshCw
} from 'lucide-react';
import { Product } from './types';
import { Excalidraw } from "@excalidraw/excalidraw";

const { Title, Text, Paragraph } = Typography;

interface ProductDetailProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function ProductDetail({ product, open, onClose }: ProductDetailProps) {
  const [activeTab, setActiveTab] = useState<string>('code-graph');
  const [openDocs, setOpenDocs] = useState<{ id: string; title: string; category: string; content: string }[]>([]);

  if (!product) return null;

  const mainRepo = product.repositories.find(r => r.isMain);

  const knowledgeItems = [
    { key: 'architecture', label: '产品架构', icon: <Layers size={14} /> },
    { key: 'solution', label: '产品方案', icon: <Book size={14} /> },
    { key: 'requirements', label: '产品需求', icon: <ClipboardList size={14} /> },
    { key: 'manual', label: '产品手册', icon: <FileText size={14} /> },
    { key: 'delivery', label: '交付材料', icon: <Package size={14} /> },
  ];

  // MOCK_DOCS structure simulating querying specific documents under a category
  const getMockDocsForCategory = (categoryKey: string, productName: string) => {
    return [
      { id: `doc-${categoryKey}-1`, title: `${productName}-${categoryKey === 'architecture' ? '总体设计' : '需求概要'} v1.0`, content: `# ${productName} \n\n这是一篇关于 **${categoryKey}** 的技术文档。包含Markdown结构和下方的Excalidraw草图数据，以便演示混合展示效果。\n\n- 核心特点：高性能、高可用、可扩展\n- 依赖服务：Redis, PostgreSQL` },
      { id: `doc-${categoryKey}-2`, title: `迭代日志与附录`, content: `# 迭代日志\n目前处于 v1.0.0 版本阶段，持续完善中。` },
    ];
  };

  const handleOpenDoc = (doc: any, category: string) => {
    if (!openDocs.find(d => d.id === doc.id)) {
      setOpenDocs([...openDocs, { ...doc, category }]);
    }
    setActiveTab(doc.id);
  };

  const onEditTab = (targetKey: any, action: 'add' | 'remove') => {
    if (action === 'remove') {
      const newDocs = openDocs.filter(doc => doc.id !== targetKey);
      setOpenDocs(newDocs);
      if (activeTab === targetKey) {
        setActiveTab(newDocs.length > 0 ? newDocs[newDocs.length - 1].id : 'knowledge-graph');
      }
    }
  };

  return (
    <Drawer
      title={
        <Space size={12}>
          <img src={product.icon} alt="" style={{ width: 28, height: 28, borderRadius: 4 }} />
          <div>
            <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>{product.description.slice(0, 40)}...</div>
          </div>
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width="85vw"
      styles={{
        header: { background: '#0a0b12', borderBottom: '1px solid rgba(51, 65, 85, 0.4)', padding: '16px 24px' },
        body: { padding: 0, background: '#0f1117', overflow: 'hidden' }
      }}
      extra={
        <Space>
          <Button icon={<ExternalLink size={14} />} size="small">在控制台打开</Button>
          <Button icon={<Share2 size={14} />} size="small">分享</Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left Sidebar: Knowledge Navigation */}
        <div style={{ 
          width: 280, 
          borderRight: '1px solid rgba(51, 65, 85, 0.3)', 
          background: '#161822',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24
        }}>
          <div>
            <Title level={5} style={{ color: '#818cf8', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              产品代码视图
            </Title>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {product.repositories.map((repo, idx) => (
                <div 
                  key={repo.url || idx} 
                  onClick={() => setActiveTab('code-graph')}
                  style={{ 
                    padding: '12px', 
                    background: activeTab === 'code-graph' ? 'rgba(129, 140, 248, 0.15)' : (repo.isMain ? 'rgba(129, 140, 248, 0.1)' : 'rgba(51, 65, 85, 0.2)'), 
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: activeTab === 'code-graph' ? '1px solid rgba(129, 140, 248, 0.4)' : (repo.isMain ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid rgba(51, 65, 85, 0.2)'),
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  className="hover:border-indigo-400/50"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Space size={6}>
                      <GitBranch size={13} color="#94a3b8" />
                      <Text strong style={{ color: '#e2e8f0', fontSize: 13 }}>{repo.branch}</Text>
                    </Space>
                    {repo.isMain && <Tag color="blue" style={{ margin: 0, fontSize: 10, border: 'none' }}>主仓库</Tag>}
                  </div>
                  
                  <div style={{ marginBottom: 10 }}>
                    <Tooltip title={repo.purpose || '暂无描述'} placement="topLeft">
                      <div style={{ 
                        fontSize: 12, 
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%'
                      }}>
                        {repo.purpose || '暂无描述'}
                      </div>
                    </Tooltip>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space size={4}>
                      {repo.analysisTime && (
                        <Tag style={{ margin: 0, fontSize: 10, background: 'rgba(51, 65, 85, 0.5)', border: 'none', color: '#cbd5e1' }}>
                          {repo.analysisTime}
                        </Tag>
                      )}
                      <Tag color={repo.analysisStatus === 'completed' ? 'success' : 'processing'} style={{ margin: 0, fontSize: 10, border: 'none' }}>
                        {repo.analysisStatus === 'completed' ? '分析完成' : '分析中'}
                      </Tag>
                    </Space>
                    <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
                      <Popconfirm
                        title="开始代码分析"
                        description="确定要对该仓库进行最新代码分析吗？"
                        onConfirm={(e) => { e?.stopPropagation(); message.success('分析任务已提交'); }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="确定"
                        cancelText="取消"
                        disabled={repo.analysisStatus !== 'completed'}
                      >
                        <Tooltip title={repo.analysisStatus === 'completed' ? "重新分析" : "分析中"}>
                          <Button 
                            type="text" 
                            size="small" 
                            icon={<RefreshCw size={14} className={repo.analysisStatus !== 'completed' ? 'animate-spin' : ''} />}
                            style={{ 
                              color: repo.analysisStatus === 'completed' ? '#818cf8' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 4
                            }}
                            disabled={repo.analysisStatus !== 'completed'}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              ))}
            </Space>
          </div>

          <div>
            <Title level={5} style={{ color: '#818cf8', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              产品知识视图
            </Title>
            <Collapse 
              ghost 
              expandIconPosition="end"
              items={knowledgeItems.map(item => {
                const hasKnowledge = (product.knowledge as any)[item.key];
                const docs = getMockDocsForCategory(item.key, product.name);
                return {
                  key: item.key,
                  label: (
                    <div 
                      onClick={() => setActiveTab('knowledge-graph')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer' }}
                    >
                      <Space size={10} style={{ color: hasKnowledge ? '#cbd5e1' : '#475569' }}>
                        {item.icon}
                        <span style={{ fontSize: 13 }}>{item.label}</span>
                      </Space>
                      {hasKnowledge ? (
                        <Text style={{ fontSize: 11, color: '#10b981' }}>{docs.length} 篇</Text>
                      ) : (
                        <Text style={{ fontSize: 11, color: '#475569' }}>未创建</Text>
                      )}
                    </div>
                  ),
                  children: hasKnowledge ? (
                    <Space direction="vertical" style={{ width: '100%', paddingLeft: 24 }}>
                      {docs.map((doc, idx) => (
                        <div 
                          key={doc.id}
                          onClick={() => handleOpenDoc(doc, item.key)}
                          style={{
                            padding: '6px 12px',
                            cursor: 'pointer',
                            borderRadius: 6,
                            background: activeTab === doc.id ? 'rgba(129, 140, 248, 0.15)' : 'transparent',
                            border: activeTab === doc.id ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid transparent',
                            color: activeTab === doc.id ? '#818cf8' : '#94a3b8',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.2s'
                          }}
                          className="hover:bg-[rgba(51,65,85,0.3)] hover:text-slate-300"
                        >
                          <FileArchive size={12} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
                        </div>
                      ))}
                    </Space>
                  ) : (
                    <Text style={{ fontSize: 12, color: '#64748b', paddingLeft: 24 }}>此分类暂无知识文档</Text>
                  )
                };
              })}
            />
          </div>

          <div>
            <Title level={5} style={{ color: '#818cf8', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              产品工单视图
            </Title>
            <div 
              onClick={() => setActiveTab('ticket-graph')}
              style={{
                padding: '16px',
                background: activeTab === 'ticket-graph' ? 'rgba(129, 140, 248, 0.15)' : 'rgba(51, 65, 85, 0.2)',
                border: activeTab === 'ticket-graph' ? '1px solid rgba(129, 140, 248, 0.4)' : '1px solid rgba(51, 65, 85, 0.2)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              className="hover:border-indigo-400/50"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Space>
                  <ClipboardList size={16} color={activeTab === 'ticket-graph' ? '#818cf8' : '#94a3b8'} />
                  <Text strong style={{ color: '#e2e8f0', fontSize: 14 }}>工单分析视图</Text>
                </Space>
                <Tag color={product.analysisStatus?.ticket === 'success' ? 'success' : 'processing'} style={{ margin: 0, fontSize: 10, border: 'none' }}>
                  {product.analysisStatus?.ticket === 'success' ? '分析完成' : '分析中'}
                </Tag>
              </div>
              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>需求单</div>
                    <div style={{ fontSize: 16, color: '#f1f5f9', fontWeight: 600 }}>
                      {product.latestTickets?.filter(t => t.title.includes('需求')).length || 0}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>研发单</div>
                    <div style={{ fontSize: 16, color: '#f1f5f9', fontWeight: 600 }}>
                      {product.latestTickets?.filter(t => !t.title.includes('需求')).length || 0}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </div>

        {/* Right Main Content: Graphs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Tabs
            activeKey={activeTab}
            className="detail-tabs"
            renderTabBar={() => <></>}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            items={[
              {
                key: 'code-graph',
                children: (
                  <div style={{ 
                    padding: '24px', 
                    height: 'calc(100vh - 110px)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#94a3b8' }}>
                        基于 <b>{mainRepo?.branch || '主'}</b> 分支的代码静态分析生成的知识图谱
                      </Text>
                      <Space>
                        <Button size="small" type="primary" icon={<GitMerge size={14} />}>同步代码库</Button>
                        <Button size="small" icon={<Maximize2 size={14} />} />
                      </Space>
                    </div>
                    
                    {/* Placeholder for Code Graph */}
                    <div style={{ 
                      flex: 1, 
                      background: '#161822', 
                      borderRadius: 16, 
                      border: '1px solid rgba(51, 65, 85, 0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundImage: 'radial-gradient(rgba(129, 140, 248, 0.05) 1px, transparent 0)',
                      backgroundSize: '30px 30px'
                    }}>
                      <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center'
                      }}>
                        <Code2 size={48} color="#818cf8" strokeWidth={1} style={{ opacity: 0.5, marginBottom: 16 }} />
                        <Title level={4} style={{ color: '#e2e8f0', marginBottom: 8 }}>代码关系分析图谱</Title>
                        <Text style={{ color: '#64748b' }}>正在解析模块依赖关系与函数调用链路...</Text>
                        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
                          <Tag style={{ background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', border: '1px solid rgba(129, 140, 248, 0.2)' }}>Nodes: 1,248</Tag>
                          <Tag style={{ background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', border: '1px solid rgba(129, 140, 248, 0.2)' }}>Edges: 5,692</Tag>
                        </div>
                      </div>
                      
                      {/* Interactive Controls Overlay */}
                      <div style={{ position: 'absolute', bottom: 20, right: 20 }}>
                        <Card size="small" style={{ background: '#1e2133', border: '1px solid rgba(51, 65, 85, 0.4)', borderRadius: 12 }}>
                          <Space size={16}>
                            <Tooltip title="缩放"><Button type="text" size="small">Zoom</Button></Tooltip>
                            <Divider type="vertical" />
                            <Tooltip title="筛选器"><Button type="text" size="small">Filters</Button></Tooltip>
                            <Divider type="vertical" />
                            <Tooltip title="重心视图"><Button type="text" size="small">Centric</Button></Tooltip>
                          </Space>
                        </Card>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                key: 'ticket-graph',
                children: (
                  <div style={{ 
                    padding: '24px', 
                    height: 'calc(100vh - 110px)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#94a3b8' }}>
                        工单状态与开发进度图谱关联分析
                      </Text>
                      <Space>
                        <Button size="small" type="primary" icon={<Network size={14} />}>刷新数据</Button>
                        <Button size="small" icon={<Maximize2 size={14} />} />
                      </Space>
                    </div>
                    <div style={{ 
                      flex: 1, 
                      background: '#161822', 
                      borderRadius: 16, 
                      border: '1px solid rgba(51, 65, 85, 0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 0)',
                      backgroundSize: '30px 30px'
                    }}>
                      <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center'
                      }}>
                        <ClipboardList size={48} color="#10b981" strokeWidth={1} style={{ opacity: 0.5, marginBottom: 16 }} />
                        <Title level={4} style={{ color: '#e2e8f0', marginBottom: 8 }}>工单追踪与分析图谱</Title>
                        <Text style={{ color: '#64748b' }}>需求与缺陷的处理流转监控和分析占位展示...</Text>
                        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
                          <Tag style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>需求流转: 128</Tag>
                          <Tag style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>缺陷修复: 45</Tag>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                key: 'knowledge-graph',
                children: (
                  <div style={{ padding: '24px', height: 'calc(100vh - 110px)' }}>
                     {/* Placeholder for Knowledge Graph */}
                     <div style={{ 
                      height: '100%',
                      background: '#161822', 
                      borderRadius: 16, 
                      border: '1px solid rgba(51, 65, 85, 0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 0)',
                      backgroundSize: '30px 30px'
                    }}>
                      <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center'
                      }}>
                        <Network size={48} color="#10b981" strokeWidth={1} style={{ opacity: 0.5, marginBottom: 16 }} />
                        <Title level={4} style={{ color: '#e2e8f0', marginBottom: 8 }}>业务知识图谱</Title>
                        <Text style={{ color: '#64748b' }}>综合产品方案、需求文档与研发代码的跨域关联图谱</Text>
                      </div>
                    </div>
                  </div>
                )
              },
              ...openDocs.map(doc => ({
                key: doc.id,
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', overflowY: 'auto', background: '#0f1117' }}>
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(51, 65, 85, 0.3)' }}>
                      <Title level={4} style={{ color: '#f1f5f9', margin: 0 }}>{doc.title}</Title>
                      <Space size={16} style={{ marginTop: 12 }}>
                        <Tag color="blue">{doc.category}</Tag>
                        <Text style={{ color: '#64748b' }}>由研发助手自动关联生成</Text>
                      </Space>
                    </div>
                    <div style={{ padding: '24px 32px', color: '#cbd5e1', lineHeight: 1.8 }}>
                      {doc.content.split('\n').map((line, idx) => (
                        <p key={idx} style={{ 
                          fontSize: line.startsWith('# ') ? 24 : line.startsWith('## ') ? 20 : 14,
                          fontWeight: line.startsWith('#') ? 600 : 'normal',
                          color: line.startsWith('#') ? '#f8fafc' : '#cbd5e1',
                          marginBottom: line.startsWith('#') ? 16 : 8
                        }}>
                          {line.replace(/#/g, '').trim()}
                        </p>
                      ))}
                    </div>
                    <div style={{ height: 600, position: 'relative', borderTop: '1px solid rgba(51, 65, 85, 0.3)' }}>
                      <Excalidraw theme="dark" />
                    </div>
                  </div>
                )
              }))
            ]}
          />
        </div>
      </div>
    </Drawer>
  );
}
