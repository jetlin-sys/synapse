import React from 'react';
import { Card, Typography, Space, Tag, Button, Tooltip, Avatar, List } from 'antd';
import { Github, Edit2, Trash2, ArrowRight, BookOpen, ExternalLink, Ticket, Code, FileText, CheckCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react';
import { Product } from './types';

const { Text, Paragraph, Title } = Typography;

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onView: (product: Product) => void;
}

const getStatusColor = (status: string | undefined) => {
  switch (status) {
    case 'success': return 'success';
    case 'processing': return 'processing';
    case 'error': return 'error';
    case 'pending':
    default: return 'default';
  }
};

const getStatusText = (status: string | undefined) => {
  switch (status) {
    case 'success': return '已完成';
    case 'processing': return '进行中';
    case 'error': return '失败';
    case 'pending':
    default: return '待处理';
  }
};

const getTicketStatusColor = (status: string) => {
  switch (status) {
    case '已完成': return 'success';
    case '处理中': return 'processing';
    case '待处理': return 'default';
    default: return 'default';
  }
};

export function ProductCard({ product, onEdit, onDelete, onView }: ProductCardProps) {
  return (
    <Card
      hoverable
      style={{
        background: '#1a1d2e',
        border: '1px solid rgba(51, 65, 85, 0.4)',
        borderRadius: 16,
        height: '480px', // Fixed height for the entire card
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column'
      }}
      bodyStyle={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <Tooltip title="编辑配置">
          <Button 
            type="text" 
            icon={<Edit2 size={16} />} 
            onClick={(e) => { e.stopPropagation(); onEdit(product); }} 
            style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.05)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            className="hover:text-white hover:bg-slate-700"
          />
        </Tooltip>
        <Tooltip title="产品详情">
          <Button 
            type="text" 
            icon={<BookOpen size={16} />} 
            onClick={(e) => { e.stopPropagation(); onView(product); }} 
            style={{ color: '#818cf8', background: 'rgba(129, 140, 248, 0.1)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            className="hover:bg-indigo-500/20"
          />
        </Tooltip>
        <Tooltip title="删除产品">
          <Button 
            type="text" 
            icon={<Trash2 size={16} />} 
            onClick={(e) => { e.stopPropagation(); onDelete(product.id); }} 
            danger 
            style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
          />
        </Tooltip>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Space align="start" size={16} style={{ marginBottom: 12, width: '100%', paddingRight: 100 }}>
          <Avatar
            src={product.icon}
            shape="square"
            size={48}
            style={{ 
              borderRadius: 8, 
              background: 'rgba(129, 140, 248, 0.1)',
              border: '1px solid rgba(129, 140, 248, 0.2)'
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Title level={5} style={{ margin: 0, color: '#f1f5f9', fontSize: 16, marginBottom: 8 }}>
              {product.name}
            </Title>
            <Space size={8} wrap style={{ display: 'flex' }}>
              {product.version && (
                <Tag color="blue" style={{ border: 'none', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', margin: 0 }}>
                  {product.version}
                </Tag>
              )}
              {product.module && (
                <Tag color="purple" style={{ border: 'none', background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', margin: 0 }}>
                  {product.module}
                </Tag>
              )}
            </Space>
          </div>
        </Space>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'nowrap', overflow: 'hidden' }}>
          <Tag 
            color={getStatusColor(product.analysisStatus?.code)} 
            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', fontSize: 12 }}
          >
            <Code size={12} />代码:{getStatusText(product.analysisStatus?.code)}
          </Tag>
          <Tag 
            color={getStatusColor(product.analysisStatus?.ticket)} 
            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', fontSize: 12 }}
          >
            <Ticket size={12} />工单:{getStatusText(product.analysisStatus?.ticket)}
          </Tag>
          <Tag 
            color={getStatusColor(product.analysisStatus?.document)} 
            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', fontSize: 12 }}
          >
            <FileText size={12} />文档:{getStatusText(product.analysisStatus?.document)}
          </Tag>
        </div>

        <Paragraph 
          ellipsis={{ rows: 2 }} 
          style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16, height: 40, flexShrink: 0 }}
        >
          {product.description}
        </Paragraph>

        <div style={{ 
          background: 'rgba(15, 17, 23, 0.5)', 
          borderRadius: 8, 
          padding: '12px',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0 // Required for flex child scrolling
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
            <Space size={4}>
              <Ticket size={14} color="#60a5fa" />
              <Text style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>最新改造工单 ({product.latestTickets?.length || 0})</Text>
            </Space>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar">
            {product.latestTickets && product.latestTickets.length > 0 ? (
              <List
                dataSource={product.latestTickets}
                size="small"
                split={false}
                renderItem={(item) => (
                  <List.Item style={{ padding: '6px 0', borderBottom: '1px solid rgba(51, 65, 85, 0.3)' }}>
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: '#64748b', fontSize: 12, flexShrink: 0 }}>#{item.id}</Text>
                      <Text 
                        ellipsis={{ tooltip: item.title }} 
                        style={{ color: '#cbd5e1', fontSize: 13, flex: 1, margin: 0 }}
                      >
                        {item.title}
                      </Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12, flexShrink: 0, width: 40, textAlign: 'right' }} ellipsis>
                        {item.assignee}
                      </Text>
                      <Tag color={getTicketStatusColor(item.status)} style={{ margin: 0, fontSize: 10, flexShrink: 0, width: 48, textAlign: 'center', padding: '0 4px' }}>
                        {item.status}
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>暂无活跃工单</Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
