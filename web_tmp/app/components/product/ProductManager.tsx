import React, { useState } from 'react';
import { 
  Typography, Space, Button, Input, Row, Col, 
  Empty, message, Breadcrumb, Divider 
} from 'antd';
import { Plus, Search, Filter, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { ProductDetail } from './ProductDetail';
import { Product, MOCK_PRODUCTS } from './types';

const { Title, Text } = Typography;

export function ProductManager() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchText.toLowerCase()) || 
    p.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleAdd = () => {
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    message.success('产品已删除');
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleFinish = (values: Partial<Product>) => {
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...values } as Product : p));
      message.success('产品已更新');
    } else {
      const newProduct: Product = {
        ...values,
        id: Math.random().toString(36).substr(2, 9),
        icon: values.icon || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + values.name,
        repositories: values.repositories || [],
        knowledge: values.knowledge || { architecture: false, solution: false, requirements: false, manual: false, delivery: false }
      } as Product;
      setProducts([newProduct, ...products]);
      message.success('产品已创建');
    }
    setIsModalOpen(false);
  };

  return (
    <div style={{ 
      padding: '24px 32px', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      overflowY: 'auto',
      background: '#0f1117'
    }}>
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb 
          items={[{ title: '首页' }, { title: '管理中心' }, { title: '产品管理' }]} 
          style={{ marginBottom: 8, color: '#64748b' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#f1f5f9', fontWeight: 600 }}>产品管理</Title>
            <Text style={{ color: '#94a3b8' }}>配置与关联各业务产品，管理研发分类与知识图谱。</Text>
          </div>
          <Button 
            type="primary" 
            icon={<Plus size={16} />} 
            onClick={handleAdd}
            style={{ 
              height: 40, 
              padding: '0 20px', 
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(129, 140, 248, 0.3)'
            }}
          >
            新增产品
          </Button>
        </div>
      </div>

      <div style={{ 
        marginBottom: 24, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#161822',
        padding: '12px 20px',
        borderRadius: 12,
        border: '1px solid rgba(51, 65, 85, 0.3)'
      }}>
        <Space size={16}>
          <Input
            placeholder="搜索产品名称或描述..."
            prefix={<Search size={16} color="#64748b" />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 320, background: '#0a0b12' }}
          />
          <Divider type="vertical" style={{ height: 24, borderColor: 'rgba(51, 65, 85, 0.3)' }} />
          <Button icon={<Filter size={16} />} type="text" style={{ color: '#94a3b8' }}>
            高级筛选
          </Button>
        </Space>
        <Space size={4}>
          <Button icon={<LayoutGrid size={18} />} type="text" style={{ color: '#818cf8', background: 'rgba(129, 140, 248, 0.1)' }} />
          <Button icon={<List size={18} />} type="text" style={{ color: '#94a3b8' }} />
          <Divider type="vertical" style={{ height: 20, margin: '0 8px' }} />
          <Button icon={<SlidersHorizontal size={18} />} type="text" style={{ color: '#94a3b8' }} />
        </Space>
      </div>

      {filteredProducts.length > 0 ? (
        <Row gutter={[24, 24]}>
          {filteredProducts.map(product => (
            <Col key={product.id} xs={24} sm={12} lg={12} xl={8} xxl={6}>
              <ProductCard
                product={product}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
            description={<Text style={{ color: '#64748b' }}>未找到相关产品</Text>}
          />
        </div>
      )}

      <ProductModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onFinish={handleFinish}
        initialValues={editingProduct}
      />

      <ProductDetail
        product={selectedProduct}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
