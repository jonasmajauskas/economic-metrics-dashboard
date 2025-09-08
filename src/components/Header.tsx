import React from 'react';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
interface HeaderProps {
  areAllSectionsOpen: boolean;
  toggleAllSections: () => void;
}
const Header: React.FC<HeaderProps> = ({
  areAllSectionsOpen,
  toggleAllSections
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Economic Metrics Dashboard</h1>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground">{currentDate}</p>
          <button onClick={toggleAllSections} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
            {areAllSectionsOpen ? <>
                <ChevronUp size={16} />
                <span>Collapse All</span>
              </> : <>
                <ChevronDown size={16} />
                <span>Expand All</span>
              </>}
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>
    </header>;
};
export default Header;