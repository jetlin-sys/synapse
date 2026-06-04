import React from 'react';
import { ProductManager } from '../components/product/ProductManager';

export function ProductPage() {
  return (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
      <ProductManager />
    </div>
  );
}
