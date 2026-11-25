import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ChatView } from './app/ChatView';
import { HomeView } from './app/HomeView';
import { SettingsView } from './app/SettingsView';
import { MainHeader } from './components/MainHeader';
import { ToastContainer } from './components/ToastContainer';
import { AppProvider, useApp } from './context/AppContext';

function AppRouter() {
  const { route, toasts, dismissToast } = useApp();

  if (route.name === 'settings') {
    return (
      <>
        <motion.div
          key="settings"
          initial={{ opacity: 0.01, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-dvh w-full"
        >
          <SettingsView />
        </motion.div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="h-dvh w-full flex flex-col relative overflow-hidden bg-white dark:bg-[#141618] transition-colors duration-200">
      {/* Persistent MaDbotS header stays completely unchanged across Home <-> Chat swipe up/down */}
      <MainHeader />

      {/* Home content underneath */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <HomeView />
      </div>

      {/* ChatView overlays bottom 8px of MainHeader (at top: 60px) so visible top & bottom padding around MaDbotS* are equal (12px each) with zero shadows */}
      <AnimatePresence>
        {route.name === 'chat' && (
          <ChatView key="chat-sheet" botId={route.botId} />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </MotionConfig>
  );
}
