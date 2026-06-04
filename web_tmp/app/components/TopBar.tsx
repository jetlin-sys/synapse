import React from 'react';
import { Layout, Space, Button, Tooltip, Divider, Typography, Tag } from 'antd';
import { Bot, Bell, Settings, UserCircle, LayoutDashboard, Boxes, Briefcase, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

const { Header } = Layout;
const { Text } = Typography;

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isWorkspace = location.pathname === '/';
  const isProducts = location.pathname === '/products';
  const isOrders = location.pathname === '/orders';
  const isMeetings = location.pathname === '/meetings';

  return (
    <Header
      style={{
        background: '#0a0b12',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 56,
        lineHeight: '56px',
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      <Space size={24} align="center">
        <Space size={10} align="center">
          <div
            style={{
              width: 32,
              height: 32,
              background: '#2563eb',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(37, 99, 235, 0.3)',
              flexShrink: 0,
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            <Bot size={20} color="white" />
          </div>
          <Text
            style={{
              color: '#f1f5f9',
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: '0.025em',
              lineHeight: 1,
            }}
          >
            智能研发助手
          </Text>
          <Tag
            style={{
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              letterSpacing: '0.05em',
              fontSize: 11,
              marginLeft: 4,
              marginInlineEnd: 0,
            }}
          >
            v1.0.0
          </Tag>
        </Space>

        <Space size={4} style={{ marginLeft: 24 }}>
          <Button 
            type="text" 
            icon={<LayoutDashboard size={18} />}
            onClick={() => navigate('/')}
            style={{ 
              color: isWorkspace ? '#818cf8' : '#94a3b8',
              background: isWorkspace ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              fontWeight: isWorkspace ? 600 : 400
            }}
          >
            研发工作台
          </Button>
          <Button 
            type="text" 
            icon={<Boxes size={18} />}
            onClick={() => navigate('/products')}
            style={{ 
              color: isProducts ? '#818cf8' : '#94a3b8',
              background: isProducts ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              fontWeight: isProducts ? 600 : 400
            }}
          >
            产品管理
          </Button>
          <Button 
            type="text" 
            icon={<Briefcase size={18} />}
            onClick={() => navigate('/orders')}
            style={{ 
              color: isOrders ? '#818cf8' : '#94a3b8',
              background: isOrders ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              fontWeight: isOrders ? 600 : 400
            }}
          >
            工单管理
          </Button>
          <Button 
            type="text" 
            icon={<Users size={18} />}
            onClick={() => navigate('/meetings')}
            style={{ 
              color: isMeetings ? '#818cf8' : '#94a3b8',
              background: isMeetings ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              fontWeight: isMeetings ? 600 : 400
            }}
          >
            研发会议
          </Button>
        </Space>
      </Space>

      <Space size={4} align="center">
        <Tooltip title="通知">
          <Button
            type="text"
            icon={<Bell size={18} />}
            style={{
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Tooltip>
        <Tooltip title="设置">
          <Button
            type="text"
            icon={<Settings size={18} />}
            style={{
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Tooltip>
        <Divider
          orientation="vertical"
          style={{ borderColor: 'rgba(51, 65, 85, 0.7)', height: 24, margin: '0 8px' }}
        />
        <Button
          type="text"
          icon={<UserCircle size={22} />}
          style={{
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500 }}>研发管理员</span>
        </Button>
      </Space>
    </Header>
  );
}