export function LeftPanel() {
  const workOrders = [
    { id: 'WO-2024-001', title: '用户登录功能优化', status: '进行中', priority: '高' },
    { id: 'WO-2024-002', title: '数据库性能调优', status: '待处理', priority: '中' },
    { id: 'WO-2024-003', title: 'API接口升级', status: '已完成', priority: '高' },
    { id: 'WO-2024-004', title: '前端页面重构', status: '进行中', priority: '低' },
    { id: 'WO-2024-005', title: '安全漏洞修复', status: '待处理', priority: '高' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case '进行中': return 'bg-blue-500';
      case '待处理': return 'bg-yellow-500';
      case '已完成': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'text-red-400';
      case '中': return 'text-yellow-400';
      case '低': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full bg-slate-50 border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800">工单列表</h2>
        <p className="text-sm text-slate-500 mt-1">共 {workOrders.length} 个工单</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {workOrders.map((order) => (
          <div 
            key={order.id} 
            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-mono text-slate-500">{order.id}</span>
              <span className={`text-xs font-semibold ${getPriorityColor(order.priority)}`}>
                {order.priority}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-800 mb-3">{order.title}</h3>
            <div className="flex items-center gap-2">
              <div className={`${getStatusColor(order.status)} size-2 rounded-full`}></div>
              <span className="text-xs text-slate-600">{order.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200">
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
          + 新建工单
        </button>
      </div>
    </div>
  );
}
