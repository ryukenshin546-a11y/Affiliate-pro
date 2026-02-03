import { formatNumber, formatCurrency } from '@/utils/slugify.util';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

const colorClasses = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-yellow-50 text-yellow-600',
  error: 'bg-red-50 text-red-600',
};

export function StatsCard({ title, value, icon, trend, subtitle, color = 'primary' }: StatsCardProps) {
  const displayValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{displayValue}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className={`mt-1 flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="ml-1 text-gray-500">vs yesterday</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  showPercentage?: boolean;
}

export function ProgressCard({ title, current, total, showPercentage = true }: ProgressCardProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-sm text-gray-500">
          {current}/{total}
          {showPercentage && <span className="ml-1 text-xs">({percentage}%)</span>}
        </span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface CreditCardProps {
  remaining: number;
  total: number;
  onBuyMore?: () => void;
}

export function CreditCard({ remaining, total, onBuyMore }: CreditCardProps) {
  const percentage = total > 0 ? Math.round((remaining / total) * 100) : 0;
  const isLow = percentage < 20;

  return (
    <div className={`card p-4 ${isLow ? 'border-yellow-300 bg-yellow-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="text-sm font-medium text-gray-700">Credits</span>
        </div>
        {isLow && (
          <span className="badge badge-warning">Low</span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{remaining}</p>
          <p className="text-xs text-gray-500">of {total} remaining</p>
        </div>
        {onBuyMore && (
          <button 
            onClick={onBuyMore}
            className="btn btn-secondary text-xs"
          >
            Buy More
          </button>
        )}
      </div>
      <div className="mt-3 progress-bar">
        <div 
          className={`progress-bar-fill ${isLow ? 'bg-yellow-500' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
