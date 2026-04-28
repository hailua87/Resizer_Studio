import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Header from './components/shared/Header.tsx';
import PdfConverter from './components/PdfConverter.tsx';
import ImageResizer from './components/ImageResizer.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pdf' | 'resize'>('pdf');

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-hidden selection:bg-brand-100 selection:text-brand-900">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'pdf' ? (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex overflow-hidden"
            >
              <PdfConverter />
            </motion.div>
          ) : (
            <motion.div
              key="resize"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex overflow-hidden"
            >
              <ImageResizer />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
