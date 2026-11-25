import { Activity, BarChart3, GitFork, History, KeyRound, Layers, LayoutDashboard, Server, Wallet } from 'lucide-react';

export const aiWorkspaceLinks = [
    { key: 'overview', title: 'AI Overview', icon: LayoutDashboard },
    { key: 'providers', title: 'AI Providers', icon: Server },
    { key: 'keys', title: 'API Key Management', icon: KeyRound },
    { key: 'models', title: 'AI Models', icon: Layers },
    { key: 'features', title: 'Feature Configuration', icon: GitFork },
    { key: 'budget', title: 'Budget & Token Allocation', icon: Wallet },
    { key: 'usage', title: 'Usage & Analytics', icon: BarChart3 },
    { key: 'health', title: 'Health & Monitoring', icon: Activity },
    { key: 'audit', title: 'Audit Logs', icon: History },
].map(item => ({ ...item, href: `/admin/ai/workspace/${item.key}` }));
