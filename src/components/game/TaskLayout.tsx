import { ReactNode, useState } from 'react';
import AlippePanel from './AlippePanel';
import BackButton from './BackButton';

interface TaskLayoutProps {
  children: ReactNode;
  showAlippe?: boolean;
}

const TaskLayout = ({ children, showAlippe = true }: TaskLayoutProps) => {
  const [showAlippeMobile, setShowAlippeMobile] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden animate-fade-in">
      {/* Desktop Alippe */}
      {showAlippe && (
        <div className="hidden lg:flex p-4">
          <AlippePanel />
        </div>
      )}

      {/* Mobile Alippe toggle */}
      {showAlippe && (
        <button
          className="lg:hidden fixed top-4 left-4 z-[60] glass-card rounded-xl px-3 py-2 text-sm font-bold"
          onClick={() => setShowAlippeMobile(!showAlippeMobile)}
        >
          📖 Әліппе
        </button>
      )}

      {/* Mobile Alippe overlay */}
      {showAlippe && showAlippeMobile && (
        <div className="lg:hidden fixed inset-0 z-[55]" onClick={() => setShowAlippeMobile(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
          <div className="absolute left-0 top-0 bottom-0 p-3 z-10" onClick={e => e.stopPropagation()}>
            <AlippePanel />
          </div>
        </div>
      )}

      <div className="flex-1 relative flex flex-col items-center justify-center p-4 pt-14 lg:pt-4 overflow-y-auto">
        {children}
        <div className="absolute bottom-4 left-4 z-50">
          <BackButton />
        </div>
      </div>
    </div>
  );
};

export default TaskLayout;
