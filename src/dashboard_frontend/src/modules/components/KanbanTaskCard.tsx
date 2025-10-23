import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  files?: string[];
  implementationDetails?: string[];
  requirements?: string[];
  leverage?: string;
  prompt?: string;
}

interface KanbanTaskCardProps {
  task: Task;
  specName: string;
  onCopyTaskPrompt: () => void;
  copiedTaskId: string | null;
  isInProgress?: boolean;
  isDragging?: boolean;
}

export function KanbanTaskCard({
  task,
  specName,
  onCopyTaskPrompt,
  copiedTaskId,
  isInProgress = false,
  isDragging = false
}: KanbanTaskCardProps) {
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const getStatusConfig = () => {
    switch (task.status) {
      case 'pending':
        return {
          bgColor: 'bg-white dark:bg-gray-800',
          borderColor: 'border-gray-200 dark:border-gray-600',
          textColor: 'text-gray-900 dark:text-gray-200',
          iconBg: 'bg-gray-100 dark:bg-gray-700',
          iconColor: 'text-gray-500 dark:text-gray-400',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'in-progress':
        return {
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-700',
          textColor: 'text-orange-900 dark:text-orange-200',
          iconBg: 'bg-orange-100 dark:bg-orange-800',
          iconColor: 'text-orange-600 dark:text-orange-400',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'completed':
        return {
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-700',
          textColor: 'text-green-900 dark:text-green-200',
          iconBg: 'bg-green-100 dark:bg-green-800',
          iconColor: 'text-green-600 dark:text-green-400',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: 'manipulation', // Allow scrolling while supporting drag
      }}
      {...attributes}
      {...listeners}
      className={`
        ${/* Touch-optimized padding and spacing */ ''}
        p-3 sm:p-3 rounded-lg border
        ${/* Enhanced touch area */ ''}
        min-h-[80px]
        ${/* Cursor and interaction states */ ''}
        cursor-grab active:cursor-grabbing
        transition-all hover:shadow-md
        touch-manipulation select-none
        ${/* Colors and styling */ ''}
        ${config.bgColor} ${config.borderColor}
        ${/* Drag states */ ''}
        ${isDragging ? 'rotate-2 scale-105 shadow-lg' : ''}
        ${isSortableDragging ? 'z-50' : ''}
      `}
    >
      {/* Task Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${config.iconBg}`}>
            <div className={config.iconColor}>
              {config.icon}
            </div>
          </div>
          <span className={`text-xs sm:text-sm font-medium ${config.textColor}`}>
            {t('tasksPage.item.task')} {task.id}
          </span>
          {isInProgress && (
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Currently in progress" />
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyTaskPrompt();
          }}
          className={`
            ${/* Touch-optimized sizing */ ''}
            p-2 sm:p-1.5 text-xs rounded transition-colors
            flex items-center justify-center gap-1
            touch-manipulation
            ${/* WCAG AAA compliant touch target sizes */ ''}
            min-h-[44px] min-w-[44px]
            sm:min-h-[36px] sm:min-w-[36px]
            ${/* Interactive states */ ''}
            ${copiedTaskId === task.id
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
          title={t('tasksPage.copyPrompt.tooltip')}
          style={{
            touchAction: 'manipulation', // Allow touch events for the button
          }}
        >
          {copiedTaskId === task.id ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Task Description */}
      <p className={`text-xs sm:text-sm mb-2 line-clamp-3 leading-relaxed ${config.textColor}`}>
        {task.description}
      </p>

      {/* Task Metadata */}
      <div className="space-y-1">
        {/* File count */}
        {task.files && task.files.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">{task.files.length} {task.files.length === 1 ? 'file' : 'files'}</span>
          </div>
        )}

        {/* Implementation details count */}
        {task.implementationDetails && task.implementationDetails.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{task.implementationDetails.length} details</span>
          </div>
        )}

        {/* Has prompt indicator */}
        {task.prompt && (
          <div className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">AI Prompt</span>
          </div>
        )}
      </div>
    </div>
  );
}