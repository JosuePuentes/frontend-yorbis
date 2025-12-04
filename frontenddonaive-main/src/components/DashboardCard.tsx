import React from "react";

interface DashboardCardProps {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  badge?: React.ReactNode;
  trendSvg?: React.ReactNode;
  className?: string;
  description?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  trendSvg,
  className = "",
  description,
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-md p-6 flex flex-col justify-between min-w-0 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium tracking-wide">{title}</span>
        {badge && <span className="ml-2">{badge}</span>}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-gray-900 mb-1">{value}</span>
        <span className="text-base text-gray-700 font-semibold mb-2 text-center">{subtitle}</span>
        {description && <span className="text-xs text-gray-500 mt-1 text-center">{description}</span>}
        {trendSvg && <div className="w-full h-8 mt-2">{trendSvg}</div>}
      </div>
    </div>
  );
};

export default DashboardCard;
