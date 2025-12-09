import React, { useState, useMemo, useEffect, forwardRef } from 'react';
import { BookmarkNode } from '../types';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Compass, MoreHorizontal, Plus, Pencil, Trash } from 'lucide-react';

interface SidebarProps {
  nodes: BookmarkNode[];
  selectedId: string;
  onSelect: (node: BookmarkNode) => void;
  onAction?: (action: 'addBookmark' | 'addFolder' | 'rename' | 'delete', node: BookmarkNode) => void;
  forceExpandIds?: Set<string>;
  autoExpandVersion?: number;
  style?: React.CSSProperties;
  onMoveToMain?: () => void;
  onOpenDoc?: () => void;
}

interface TreeNodeProps {
  node: BookmarkNode;
  selectedId: string;
  onSelect: (node: BookmarkNode) => void;
  level: number;
  onAction?: (action: 'addBookmark' | 'addFolder' | 'rename' | 'delete', node: BookmarkNode) => void;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  forceExpandIds?: Set<string>;
  expandedIds: Set<string>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  autoExpandVersion?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, selectedId, onSelect, level, onAction, menuOpenId, setMenuOpenId, confirmDeleteId, setConfirmDeleteId, expandedIds, setExpandedIds }) => {
  const isExpanded = expandedIds.has(node.id);
  
  // Only render folders in the sidebar
  if (!node.children && !node.url) return null; 
  if (node.url) return null; // Skip non-folder nodes in tree

  const isSelected = node.id === selectedId;
  const hasChildren = node.children && node.children.some(child => !child.url);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAction) return;
    setMenuOpenId(menuOpenId === node.id ? null : node.id);
    setConfirmDeleteId(null);
  };

  const triggerRect = typeof document !== 'undefined' 
    ? document.querySelector(`[data-menu-trigger="${node.id}"]`)?.getBoundingClientRect() 
    : null;
  const menuHeight = 190;
  const menuTop = triggerRect
    ? (() => {
        const maxTop = window.innerHeight - menuHeight - 8;
        const alignedTop = triggerRect.top - 10; // lift slightly above row for comfortable look
        if (alignedTop > maxTop) {
          return Math.max(8, maxTop); // nudge up only if needed
        }
        return Math.max(8, alignedTop);
      })()
    : 12;
  const menuLeft = triggerRect 
    ? Math.min(triggerRect.right + 15, window.innerWidth - 200)
    : 12;

  return (
    <div className="select-none">
      <div 
        className={`
          group flex items-center py-2 pr-3 cursor-pointer transition-all duration-200 rounded-lg mx-3 mb-0.5 relative
          ${isSelected 
            ? 'bg-white shadow-sm ring-1 ring-stone-200 text-primary-700 font-semibold' 
            : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-900'}
        `}
        data-node-id={node.id}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleSelect}
      >
        <span 
          onClick={hasChildren ? handleToggle : undefined}
          className={`
            p-0.5 rounded-md mr-1.5 hover:bg-stone-300/50 transition-colors
            ${!hasChildren ? 'opacity-0 pointer-events-none' : 'opacity-40 group-hover:opacity-100'}
          `}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        
        <span className={`mr-2.5 transition-colors ${isSelected ? 'text-primary-600' : 'text-stone-400 group-hover:text-stone-500'}`}>
           {isSelected || isExpanded ? <FolderOpen size={18} strokeWidth={2} /> : <Folder size={18} strokeWidth={2} />}
        </span>
        
        <span className="truncate text-[13px] flex-1 leading-[1.2] py-0.5">{node.title || 'Root'}</span>

        {onAction && (
          <div
            className={`ml-2 transition-opacity relative ${menuOpenId === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            data-menu-root={node.id}
          >
            <button
              onClick={handleMenuToggle}
              data-menu-root={node.id}
              data-menu-trigger={node.id}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpenId === node.id && (
              <div
                data-menu-root={node.id}
                className="fixed w-40 bg-white rounded-xl shadow-lg ring-1 ring-stone-200 py-1.5 z-[160]"
                style={{ top: menuTop, left: menuLeft }}
              >
                <button
                  className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onAction('addBookmark', node); setMenuOpenId(null); setConfirmDeleteId(null); }}
                >
                  <Plus size={13} /> Add bookmark
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onAction('addFolder', node); setMenuOpenId(null); setConfirmDeleteId(null); }}
                >
                  <Plus size={13} /> Add folder
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onAction('rename', node); setMenuOpenId(null); setConfirmDeleteId(null); }}
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                    confirmDeleteId === node.id ? 'text-red-700 bg-red-50 hover:bg-red-100' : 'text-red-600 hover:bg-red-50'
                  }`}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (confirmDeleteId !== node.id) {
                      setConfirmDeleteId(node.id);
                      return;
                    }
                    onAction('delete', node); 
                    setMenuOpenId(null); 
                    setConfirmDeleteId(null);
                  }}
                >
                  <Trash size={13} /> {confirmDeleteId === node.id ? 'Confirm delete' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && node.children && (
        <div className="mt-0.5 relative">
          {/* Guide line for tree */}
          <div 
             className="absolute left-6 top-0 bottom-0 w-px bg-stone-200/50" 
             style={{ left: `${level * 16 + 26}px` }}
          />
          {node.children.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              selectedId={selectedId} 
              onSelect={onSelect} 
              level={level + 1} 
            onAction={onAction}
            menuOpenId={menuOpenId}
            setMenuOpenId={setMenuOpenId}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
            expandedIds={expandedIds}
            setExpandedIds={setExpandedIds}
          />
        ))}
      </div>
    )}
  </div>
  );
};

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ nodes, selectedId, onSelect, onAction, forceExpandIds, autoExpandVersion, style, onMoveToMain, onOpenDoc }, ref) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    nodes.forEach(n => initial.add(n.id));
    return initial;
  });
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu-root]')) {
        setMenuOpenId(null);
        setConfirmDeleteId(null);
      }
    };
    const handleScroll = () => {
      setMenuOpenId(null);
      setConfirmDeleteId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  useEffect(() => {
    if (forceExpandIds && forceExpandIds.size) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        forceExpandIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [forceExpandIds, autoExpandVersion]);

  const visibleFolders = useMemo(() => {
    const list: { node: BookmarkNode; level: number }[] = [];
    const walk = (arr: BookmarkNode[], level: number) => {
      for (const n of arr) {
        if (n.url) continue;
        list.push({ node: n, level });
        if (expandedIds.has(n.id) && n.children) {
          walk(n.children, level + 1);
        }
      }
    };
    walk(nodes, 0);
    return list;
  }, [nodes, expandedIds]);

  const listRef = React.useRef<HTMLDivElement | null>(null);

  const scrollNodeIntoView = (id: string) => {
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
    if (!el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const diffTop = elRect.top - containerRect.top;
    const diffBottom = elRect.bottom - containerRect.bottom;
    if (diffTop < 0) {
      container.scrollBy({ top: diffTop - 8, behavior: 'smooth' });
    } else if (diffBottom > 0) {
      container.scrollBy({ top: diffBottom + 8, behavior: 'smooth' });
    }
  };

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = visibleFolders.findIndex(item => item.node.id === selectedId);
      if (idx === -1) return;
      const nextIdx = e.key === 'ArrowDown' ? Math.min(visibleFolders.length - 1, idx + 1) : Math.max(0, idx - 1);
      if (nextIdx !== idx) {
        const nextNode = visibleFolders[nextIdx].node;
        onSelect(nextNode);
        scrollNodeIntoView(nextNode.id);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onMoveToMain?.();
    } else if (e.key === 'Enter') {
      const current = visibleFolders.find(item => item.node.id === selectedId);
      if (current) {
        const hasSubFolders = current.node.children && current.node.children.some(c => !c.url);
        if (hasSubFolders) {
          setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(current.node.id)) next.delete(current.node.id);
            else next.add(current.node.id);
            return next;
          });
        } else {
          onSelect(current.node);
          onMoveToMain?.();
        }
      }
    }
  };

  const totalBookmarks = useMemo(() => {
    const countRecursive = (list: BookmarkNode[]): number => {
      let count = 0;
      for (const node of list) {
        if (node.url) {
          count++;
        }
        if (node.children) {
          count += countRecursive(node.children);
        }
      }
      return count;
    };
    return countRecursive(nodes);
  }, [nodes]);

  return (
    <aside 
      className="w-[280px] bg-zen-sidebar border-r border-stone-200/50 h-full flex flex-col shrink-0 relative overflow-visible z-50 focus:outline-none" 
      style={style}
      tabIndex={0}
      onKeyDown={handleKeyNav}
      ref={ref}
      onMouseEnter={() => document.body.setAttribute('data-sidebar-hover', 'true')}
      onMouseLeave={() => document.body.removeAttribute('data-sidebar-hover')}
    >
      <div className="p-6 pb-2">
        <div 
          className="flex items-center gap-3 mb-6 select-none"
        >
          <div className="bg-primary-500 p-2 rounded-xl shadow-md shadow-primary-500/20">
             <Compass size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 
            className="font-bold text-lg tracking-tight text-stone-800 hover:text-primary-600 transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onOpenDoc?.(); }}
          >
            BookmarkNav
          </h1>
        </div>
        
        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-3 mb-2">
          Library
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 sidebar-scroll"
        ref={listRef}
      >
        {nodes.map(node => (
          <TreeNode 
            key={node.id} 
            node={node} 
            selectedId={selectedId} 
            onSelect={onSelect} 
            level={0} 
            onAction={onAction}
            menuOpenId={menuOpenId}
            setMenuOpenId={setMenuOpenId}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
            expandedIds={expandedIds}
            setExpandedIds={setExpandedIds}
            forceExpandIds={forceExpandIds}
            autoExpandVersion={autoExpandVersion}
          />
        ))}
      </div>
      
      <div className="p-4 border-t border-stone-200/50">
         <div className="bg-white rounded-lg border border-stone-200/60 p-3 shadow-sm flex items-center justify-between">
           <span className="text-xs font-medium text-stone-500">Total Bookmarks</span>
           <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
             {totalBookmarks.toLocaleString()}
           </span>
         </div>
      </div>
    </aside>
  );
});
