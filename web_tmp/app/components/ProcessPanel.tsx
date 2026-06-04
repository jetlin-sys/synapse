export function ProcessPanel() {
  const codeAnalysis = {
    status: '分析中',
    progress: 75,
    files: 128,
    linesOfCode: 15432,
    issues: 3,
    suggestions: 12
  };

  const knowledgeBase = {
    documentsProcessed: 45,
    totalDocuments: 60,
    accuracy: 92,
    lastUpdate: '2024-03-06 14:30:25'
  };

  const processSteps = [
    { name: '需求分析', status: 'completed', time: '2024-03-06 10:00' },
    { name: '代码解析', status: 'in-progress', time: '2024-03-06 12:30' },
    { name: '知识提取', status: 'in-progress', time: '2024-03-06 14:00' },
    { name: '方案生成', status: 'pending', time: '-' },
    { name: '代码实现', status: 'pending', time: '-' },
    { name: '测试验证', status: 'pending', time: '-' },
  ];

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'in-progress': return '⟳';
      case 'pending': return '○';
      default: return '○';
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in-progress': return 'bg-blue-500 text-white animate-pulse';
      case 'pending': return 'bg-slate-200 text-slate-400';
      default: return 'bg-slate-200 text-slate-400';
    }
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">工单处理流程</h2>
        
        {/* 流程步骤 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {processSteps.map((step, index) => (
              <div key={step.name} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`size-10 rounded-full ${getStepColor(step.status)} flex items-center justify-center text-lg font-semibold`}>
                    {getStepIcon(step.status)}
                  </div>
                  <span className="text-xs text-slate-600 mt-2 text-center">{step.name}</span>
                  <span className="text-xs text-slate-400 mt-1">{step.time}</span>
                </div>
                {index < processSteps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 mb-12 ${step.status === 'completed' ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 代码解析情况 */}
        <div className="mb-6">
          <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">代码解析情况</h3>
              <span className="text-sm text-blue-600 font-medium">{codeAnalysis.status}</span>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600">解析进度</span>
                <span className="font-semibold text-slate-800">{codeAnalysis.progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${codeAnalysis.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-slate-500 mb-1">文件数量</p>
                <p className="text-xl font-semibold text-slate-800">{codeAnalysis.files}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-slate-500 mb-1">代码行数</p>
                <p className="text-xl font-semibold text-slate-800">{codeAnalysis.linesOfCode.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-slate-500 mb-1">发现问题</p>
                <p className="text-xl font-semibold text-red-600">{codeAnalysis.issues}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-slate-500 mb-1">优化建议</p>
                <p className="text-xl font-semibold text-green-600">{codeAnalysis.suggestions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 知识情况 */}
        <div>
          <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">知识库处理情况</h3>
              <span className="text-sm text-purple-600 font-medium">处理中</span>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600">文档处理进度</span>
                <span className="font-semibold text-slate-800">
                  {knowledgeBase.documentsProcessed} / {knowledgeBase.totalDocuments}
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(knowledgeBase.documentsProcessed / knowledgeBase.totalDocuments) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <p className="text-xs text-slate-500 mb-1">已处理文档</p>
                <p className="text-xl font-semibold text-slate-800">{knowledgeBase.documentsProcessed}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <p className="text-xs text-slate-500 mb-1">准确率</p>
                <p className="text-xl font-semibold text-green-600">{knowledgeBase.accuracy}%</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <p className="text-xs text-slate-500 mb-1">最后更新</p>
                <p className="text-xs font-medium text-slate-600 mt-1">{knowledgeBase.lastUpdate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
