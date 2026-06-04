import React from 'react';
import { Layout, theme } from 'antd';
import { Outlet } from 'react-router';
import { TopBar } from '../components/TopBar';
import { StatusBar } from '../components/StatusBar';

export function MainLayout() {
  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <TopBar />
      <Layout.Content
        style={{
          display: 'flex',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Outlet />
      </Layout.Content>
      <StatusBar />
    </Layout>
  );
}
