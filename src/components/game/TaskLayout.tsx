import { ReactNode } from 'react';
import AlippePanel from './AlippePanel';
import BackButton from './BackButton';

interface TaskLayoutProps {
  children: ReactNode;
  showAlippe?: boolean;
}

const TaskLayout = ({ children, showAlippe = true }: TaskLayoutProps) => {
  return (
    <div className="flex h-screen w-full overflow-hidden animate-fade-in">
      {showAlippe && (
        <div className="hidden lg:flex p-4">
          <AlippePanel />
        </div>
      )}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 overflow-y-auto">
        {children}
        <div className="absolute bottom-5 left-5 z-50">
          <BackButton />
        </div>
      </div>
    </div>
  );
};

export default TaskLayout;
