import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subvalue,
  change,
  trend = 'neutral', // 'up' | 'down' | 'neutral'
  icon: Icon,
  badge,
  highlightColor = 'sky',
  tooltip
}) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
            {title}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight">
              {value}
            </span>
            {badge && (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {badge}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
            <Icon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
        {change && (
          <div className="flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
            {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            {trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
            <span className={trend === 'up' ? 'text-amber-600 dark:text-amber-400' : (trend === 'down' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}>
              {change}
            </span>
          </div>
        )}
        {subvalue && (
          <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[200px]">
            {subvalue}
          </span>
        )}
      </div>
    </div>
  );
}
