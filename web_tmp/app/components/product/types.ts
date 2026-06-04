export interface Repository {
  purpose: string;
  url: string;
  branch: string;
  token: string;
  isMain: boolean;
  analysisTime?: string;
  analysisStatus?: 'analyzing' | 'completed';
}

export interface ProductDocument {
  id: string;
  title: string;
  type: 'markdown' | 'excalidraw' | 'mixed';
  content: string; // Markdown content
  excalidrawElements?: any[]; // Excalidraw mock data
}

export interface ProductKnowledge {
  architecture: boolean;
  solution: boolean;
  requirements: boolean;
  manual: boolean;
  delivery: boolean;
}

export interface Ticket {
  id: string;
  title: string;
  assignee: string;
  status: string;
}

export interface Product {
  id: string;
  name: string;
  version: string;
  module: string;
  icon: string;
  description: string;
  repositories: Repository[];
  latestTickets?: Ticket[];
  analysisStatus: {
    code: 'success' | 'processing' | 'pending' | 'error';
    ticket: 'success' | 'processing' | 'pending' | 'error';
    document: 'success' | 'processing' | 'pending' | 'error';
  };
  knowledge: ProductKnowledge;
}

export const AVAILABLE_PRODUCT_NAMES = [
  "智能搜索助手",
  "协同设计平台",
  "代码审计工具",
  "自动化测试框架",
  "CI/CD 流水线",
  "移动端应用套件",
  "数据可视化引擎",
  "云原生网关"
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "智能搜索助手",
    version: "v2.4.1",
    module: "核心检索模块",
    icon: "https://api.dicebear.com/7.x/shapes/svg?seed=search",
    description: "基于 RAG 架构的企业级智能搜索解决方案，支持多源异构数据索引。",
    repositories: [
      {
        purpose: "后端核心业务",
        url: "https://github.com/rd-agent/search-backend",
        branch: "develop",
        token: "*******",
        isMain: true,
        analysisTime: "2026-04-09 10:20:00",
        analysisStatus: "completed"
      },
      {
        purpose: "前端交互界面",
        url: "https://github.com/rd-agent/search-frontend",
        branch: "develop",
        token: "*******",
        isMain: false,
        analysisTime: "2026-04-09 10:25:00",
        analysisStatus: "analyzing"
      }
    ],
    analysisStatus: {
      code: 'success',
      ticket: 'processing',
      document: 'success'
    },
    latestTickets: [
      { id: "21832622", title: "【P1里程碑】-故障应急数字员工-批价异常快速回退场景-MDB组件支持定时备份能力", assignee: "张三", status: "处理中" },
      { id: "21832623", title: "【需求】-检索结果智能摘要重构", assignee: "李四", status: "待处理" },
      { id: "21832624", title: "【Bug】-并发查询时内存泄漏问题修复", assignee: "王五", status: "已完成" },
      { id: "21832625", title: "【优化】-Elasticsearch索引映射更新", assignee: "赵六", status: "已完成" },
      { id: "21832626", title: "【任务】-编写API接入文档", assignee: "张三", status: "已完成" },
      { id: "21832627", title: "【需求】-支持PDF文档内容抽取", assignee: "李四", status: "处理中" },
      { id: "21832628", title: "【Bug】-高亮显示错位问题修复", assignee: "王五", status: "已完成" },
      { id: "21832629", title: "【任务】-安全漏洞扫描与修复", assignee: "赵六", status: "已完成" },
      { id: "21832630", title: "【需求】-多租户权限隔离实现", assignee: "张三", status: "处理中" },
      { id: "21832631", title: "【优化】-前端包体积优化", assignee: "李四", status: "待处理" }
    ],
    knowledge: {
      architecture: true,
      solution: true,
      requirements: true,
      manual: false,
      delivery: false
    }
  },
  {
    id: "2",
    name: "代码审计工具",
    version: "v1.2.0",
    module: "安全规则引擎",
    icon: "https://api.dicebear.com/7.x/shapes/svg?seed=code",
    description: "静态代码分析平台，内置多种安全规则集，支持并发分析任务。",
    repositories: [
      {
        name: "code-audit-core",
        purpose: "审计引擎",
        url: "https://github.com/rd-agent/code-audit-core",
        branch: "master",
        token: "*******",
        isMain: true
      }
    ],
    analysisStatus: {
      code: 'success',
      ticket: 'success',
      document: 'pending'
    },
    latestTickets: [
      { id: "21833001", title: "【需求】-适配 Go 1.22 新特性分析", assignee: "孙七", status: "已完成" },
      { id: "21833002", title: "【Bug】-规则引擎误报率过高问题定位", assignee: "周八", status: "处理中" },
      { id: "21833003", title: "【任务】-增加Python依赖漏洞库", assignee: "吴九", status: "待处理" },
      { id: "21833004", title: "【优化】-扫描报告导出格式改进", assignee: "郑十", status: "已完成" },
      { id: "21833005", title: "【任务】-性能测试基准更新", assignee: "孙七", status: "处理中" }
    ],
    knowledge: {
      architecture: true,
      solution: false,
      requirements: true,
      manual: true,
      delivery: true
    }
  }
];
