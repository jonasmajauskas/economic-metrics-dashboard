import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
interface CollapsibleContainerProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  additionalInfo?: React.ReactNode;
}
const CollapsibleContainer: React.FC<CollapsibleContainerProps> = ({
  title,
  children,
  isOpen,
  onToggle,
  icon,
  additionalInfo
}) => {
  return <div className="mb-6 border border-border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <h2 className="text-lg font-semibold">{title}</h2>
          {additionalInfo && <span className="text-muted-foreground text-sm">
              {additionalInfo}
            </span>}
        </div>
        <button className="p-1 hover:bg-secondary rounded-full transition-colors">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      {isOpen && <div className="p-4 border-t border-border">{children}</div>}
    </div>;
};
export default CollapsibleContainer;