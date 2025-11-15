import React from 'react';

export interface ProgressBarProps {
  /**
   * Progress percentage (0-100)
   */
  progress: number;
  /**
   * Optional label to display  */
  label?: string;
  /**
   * Show percentage text
   */
  showPercentage?: boolean;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Color variant based on progress
   */
  variant?: 'auto' | 'success' | 'warning' | 'danger' | 'info';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Show completed/total counts
   */
  showCounts?: boolean;
  completed?: number;
  total?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'auto',
  className = '',
  showCounts = false,
  completed,
  total,
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  // Determine color based on progress
  const getColorClass = () => {
    if (variant !== 'auto') {
      switch (variant) {
        case 'success':
          return 'bg-green-600';
        case 'warning':
          return 'bg-yellow-600';
        case 'danger':
          return 'bg-red-600';
        case 'info':
          return 'bg-blue-600';
      }
    }

    // Auto color based on progress
    if (clampedProgress >= 80) return 'bg-green-600';
    if (clampedProgress >= 50) return 'bg-yellow-600';
    if (clampedProgress >= 25) return 'bg-orange-600';
    return 'bg-red-600';
  };

  // Get background color class for the container
  const getBgClass = () => {
    if (variant !== 'auto') {
      switch (variant) {
        case 'success':
          return 'bg-green-100';
        case 'warning':
          return 'bg-yellow-100';
        case 'danger':
          return 'bg-red-100';
        case 'info':
          return 'bg-blue-100';
      }
    }

    // Auto background based on progress
    if (clampedProgress >= 80) return 'bg-green-100';
    if (clampedProgress >= 50) return 'bg-yellow-100';
    if (clampedProgress >= 25) return 'bg-orange-100';
    return 'bg-red-100';
  };

  // Get height based on size
  const getHeightClass = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'md':
        return 'h-4';
      case 'lg':
        return 'h-6';
      default:
        return 'h-4';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label and percentage */}
      {(label || showPercentage || showCounts) && (
        <div className="flex justify-between items-center mb-1 text-sm">
          {label && <span className="font-medium text-gray-700">{label}</span>}
          <div className="flex items-center gap-2">
            {showCounts && completed !== undefined && total !== undefined && (
              <span className="text-gray-600">
                {completed}/{total}
              </span>
            )}
            {showPercentage && (
              <span className="font-semibold text-gray-700">{Math.round(clampedProgress)}%</span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className={`w-full ${getBgClass()} rounded-full overflow-hidden ${getHeightClass()}`}>
        <div
          className={`${getColorClass()} ${getHeightClass()} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

/**
 * Compact progress indicator for tables and lists
 */
export interface CompactProgressProps {
  progress: number;
  completed: number;
  total: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const CompactProgress: React.FC<CompactProgressProps> = ({
  progress,
  completed,
  total,
  size = 'sm',
  showLabel = true,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const getColorClass = () => {
    if (clampedProgress >= 80) return 'text-green-600 bg-green-100 border-green-300';
    if (clampedProgress >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    if (clampedProgress >= 25) return 'text-orange-600 bg-orange-100 border-orange-300';
    return 'text-red-600 bg-red-100 border-red-300';
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <div className={`inline-flex items-center gap-1 rounded border ${getColorClass()} ${sizeClass} font-medium`}>
          <span>{completed}/{total}</span>
          <span className="opacity-75">•</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      {!showLabel && (
        <div className="flex items-center gap-1">
          <div className={`w-24 h-2 bg-gray-200 rounded-full overflow-hidden`}>
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getColorClass().split(' ')[1]}`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 min-w-[3rem]">{Math.round(clampedProgress)}%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
