import React, { useState, useEffect } from 'react';
import { Layout, Space, Typography } from 'antd';
import { Activity, Clock, ShieldCheck, CheckCircle } from 'lucide-react';

const { Footer } = Layout;
const { Text } = Typography;

export function StatusBar() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Footer
      style={{
        background: '#0a0b12',
        borderTop: '1px solid rgba(51, 65, 85, 0.5)',
        height: 32,
        lineHeight: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
      }}
    >
      <Space size={24}>
        <Space size={8} align="center">
          <Activity size={14} color="#34d399" />
          <Text style={{ color: '#34d399', fontSize: 12, fontWeight: 500 }}>系统运行正常</Text>
        </Space>
        <Space size={8} align="center">
          <ShieldCheck size={14} color="#94a3b8" />
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>AI 引擎版本 v1.0.0</Text>
        </Space>
      </Space>

      <Space size={24}>
        <Space size={8} align="center">
          <Clock size={14} color="#94a3b8" />
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>最近同步时间: {time}</Text>
        </Space>
        <Space size={6} align="center">
          <CheckCircle size={14} color="#60a5fa" />
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>工单数据: 已连接</Text>
        </Space>
      </Space>
    </Footer>
  );
}