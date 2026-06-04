import React from 'react';
import { ConfigProvider, theme } from 'antd';
import { RouterProvider } from 'react-router';
import { router } from './routes';

const { darkAlgorithm } = theme;

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: darkAlgorithm,
        token: {
          colorPrimary: '#818cf8',
          colorBgBase: '#0a0b12',
          colorBgContainer: '#161822',
          colorBgElevated: '#1e2133',
          colorBgLayout: '#0f1117',
          colorBorder: 'rgba(51, 65, 85, 0.5)',
          colorBorderSecondary: 'rgba(51, 65, 85, 0.3)',
          colorText: '#e2e8f0',
          colorTextSecondary: '#94a3b8',
          colorTextTertiary: '#64748b',
          colorTextQuaternary: '#475569',
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: 14,
          colorLink: '#818cf8',
          colorLinkHover: '#a5b4fc',
        },
        components: {
          Layout: {
            headerBg: '#0a0b12',
            footerBg: '#0a0b12',
            bodyBg: '#0f1117',
            headerHeight: 56,
            headerPadding: '0 16px',
            footerPadding: '0 16px',
          },
          Table: {
            headerBg: '#161822',
            rowHoverBg: 'rgba(51, 65, 85, 0.2)',
            borderColor: 'rgba(51, 65, 85, 0.3)',
            cellPaddingBlock: 10,
            cellPaddingInline: 24,
          },
          Input: {
            colorBgContainer: '#12141e',
            hoverBorderColor: 'rgba(129, 140, 248, 0.5)',
            activeBorderColor: 'rgba(129, 140, 248, 0.7)',
            activeShadow: '0 0 0 2px rgba(129, 140, 248, 0.1)',
          },
          Card: {
            colorBgContainer: '#1a1d2e',
          },
          Dropdown: {
            colorBgElevated: '#1e2133',
          },
          Button: {
            colorBgContainer: 'transparent',
          },
          Tabs: {
            itemColor: '#94a3b8',
            itemSelectedColor: '#818cf8',
            itemHoverColor: '#a5b4fc',
            titleFontSize: 14,
            horizontalItemPadding: '12px 16px',
          },
          Drawer: {
            colorBgElevated: '#0a0b12',
          }
        },
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
