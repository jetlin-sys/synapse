import React from 'react';
import { OrderManagement } from '../components/order/OrderManagement';

export function OrderPage() {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <OrderManagement />
    </div>
  );
}
