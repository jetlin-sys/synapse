export function RelatedOrders() {
  const relatedOrders = [
    { id: 'WO-2024-003', title: 'API接口升级', relation: '前置依赖', status: '已完成' },
    { id: 'WO-2024-007', title: '数据模型重构', relation: '相关工单', status: '进行中' },
    { id: 'WO-2024-012', title: '接口文档更新', relation: '后续任务', status: '待处理' },
  ];

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      '已完成': 'bg-green-100 text-green-700',
      '进行中': 'bg-blue-100 text-blue-700',
      '待处理': 'bg-yellow-100 text-yellow-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getRelationIcon = (relation: string) => {
    switch (relation) {
      case '前置依赖': return '◀';
      case '相关工单': return '↔';
      case '后续任务': return '▶';
      default: return '•';
    }
  };

  return (
    <div className="h-full bg-slate-50 border-t border-slate-200 overflow-y-auto">
      <div className="p-4">
        <h3 className="font-semibold text-slate-800 mb-3">关联工单明细</h3>
        <div className="space-y-2">
          {relatedOrders.map((order) => (
            <div 
              key={order.id} 
              className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg">{getRelationIcon(order.relation)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">{order.id}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{order.relation}</span>
                    </div>
                    <p className="text-sm text-slate-800">{order.title}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
