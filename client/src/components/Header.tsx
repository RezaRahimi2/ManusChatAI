import { useState } from "react";
import { Link, useLocation } from "wouter";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleDetails: () => void;
}

export default function Header({ onToggleSidebar, onToggleDetails }: HeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [location] = useLocation();
  const isSettingsPage = location === "/settings";
  const isFlowDiagramPage = location === "/flow-diagram";

  return (
    <header className="bg-white dark:bg-neutral-800 shadow-sm border-b border-neutral-200 dark:border-neutral-700 py-2 px-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <button 
            className="md:hidden mr-2 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
            onClick={onToggleSidebar}
          >
            <span className="material-icons">menu</span>
          </button>
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 mr-3">
                <span className="material-icons text-white">psychology</span>
              </div>
              <h1 className="text-xl font-semibold">Manus AI Clone</h1>
            </div>
          </Link>
        </div>
        <div className="flex items-center">
          <Link href="/flow-diagram">
            <button className={`mr-4 p-2 rounded-full ${isFlowDiagramPage ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
              <span className="material-icons">account_tree</span>
            </button>
          </Link>
          <Link href="/settings">
            <button className={`mr-4 p-2 rounded-full ${isSettingsPage ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
              <span className="material-icons">settings</span>
            </button>
          </Link>
          <button className="mr-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <span className="material-icons">help_outline</span>
          </button>
          <button 
            className="hidden lg:block mr-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
            onClick={onToggleDetails}
          >
            <span className="material-icons">tune</span>
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center">
              <span className="material-icons text-sm">person</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
