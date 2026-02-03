import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Settings, HelpCircle, Video, BarChart3, Layout, Zap, FileText } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import BulkCreator from './pages/BulkCreator';
import Templates from './pages/Templates';
import Analytics from './pages/Analytics';
import SettingsPage from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

type TabType = 'dashboard' | 'bulk' | 'templates' | 'analytics' | 'settings';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: <Layout className="w-4 h-4" /> },
  { id: 'bulk', label: 'สร้างหลายรายการ', icon: <Zap className="w-4 h-4" /> },
  { id: 'templates', label: 'เทมเพลต', icon: <FileText className="w-4 h-4" /> },
  { id: 'analytics', label: 'สถิติ', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'settings', label: 'ตั้งค่า', icon: <Settings className="w-4 h-4" /> },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const isPopup = typeof document !== 'undefined' && document.body.classList.contains('popup');

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'bulk':
        return <BulkCreator />;
      case 'templates':
        return <Templates />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`flex flex-col bg-gray-50 ${isPopup ? 'h-[600px]' : 'h-screen'}`}>
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-primary-500" />
            <h1 className="text-lg font-bold text-gray-900">Flow Affiliate Pro</h1>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('settings')}
              className="btn-icon"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <button 
              className="btn-icon"
              title="Help"
              onClick={() => window.open('https://docs.flowaffiliate.pro', '_blank')}
            >
              <HelpCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex bg-white border-b border-gray-200 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-primary-600 border-primary-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
