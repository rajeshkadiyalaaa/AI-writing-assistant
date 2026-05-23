import React from 'react';
import { Edit3, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Tab bar + one visible panel. Editor and chat are siblings so chat updates do not re-render the editor. */
export default function DocumentTabs({ activeTab, setActiveTab, editorPanel, chatPanel }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-zinc-200/80 p-2">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={cn('nav-tab', activeTab === 'editor' && 'nav-tab-active')}
        >
          <Edit3 size={16} /> Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={cn('nav-tab', activeTab === 'chat' && 'nav-tab-active')}
        >
          <MessageCircle size={16} /> Chat
        </button>
      </div>
      {activeTab === 'editor' ? editorPanel : chatPanel}
    </div>
  );
}
