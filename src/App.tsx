import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getBookmarkTree, searchBookmarks, createBookmark, createFolder, updateTitle, updateBookmark, removeNode } from './services/bookmarkService';
import { BookmarkNode, BreadcrumbItem } from './types';
import { Sidebar } from './components/Sidebar';
import { BookmarkGrid } from './components/BookmarkGrid';
import { SearchBar } from './components/SearchBar';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';


const findNodeById = (nodes: BookmarkNode[], id: string): BookmarkNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const getBreadcrumbs = (nodes: BookmarkNode[], targetId: string): BreadcrumbItem[] => {
  const path: BreadcrumbItem[] = [];
  
  const findPath = (currentNodes: BookmarkNode[], target: string): boolean => {
    for (const node of currentNodes) {
      if (node.id === target) {
        path.unshift({ id: node.id, title: node.title || 'Root' });
        return true;
      }
      if (node.children) {
        if (findPath(node.children, target)) {
          path.unshift({ id: node.id, title: node.title || 'Root' });
          return true;
        }
      }
    }
    return false;
  };

  findPath(nodes, targetId);
  return path;
};

export default function App() {
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('__root__'); // virtual root to show top-level
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookmarkNode[]>([]);
  const [lastSearchSnapshot, setLastSearchSnapshot] = useState<{ query: string; results: BookmarkNode[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  type LastAction =
    | { type: 'add'; id: string; parentId: string; isFolder: boolean; title: string; url?: string }
    | { type: 'delete'; node: BookmarkNode; parentId?: string }
    | { type: 'update'; id: string; prevTitle: string; prevUrl?: string; nextTitle?: string; nextUrl?: string };

  const [undoStack, setUndoStack] = useState<LastAction[]>([]);
  const [redoStack, setRedoStack] = useState<LastAction[]>([]);
  const [promptConfig, setPromptConfig] = useState<{ 
    mode: 'addBookmark' | 'addFolder' | 'rename'; 
    parentId?: string; 
    targetId?: string; 
    initialTitle?: string; 
    initialUrl?: string;
  } | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptUrl, setPromptUrl] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [isResizing, setIsResizing] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const urlInputRef = React.useRef<HTMLInputElement>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLDivElement>(null);
  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [mainActiveId, setMainActiveId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [allowInvalidUrl, setAllowInvalidUrl] = useState(false);
  const [touchedUrl, setTouchedUrl] = useState(false);
  const [autoExpandVersion, setAutoExpandVersion] = useState(0);
  const [shouldFocusFirstMain, setShouldFocusFirstMain] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showAuthorImage, setShowAuthorImage] = useState(false);
  const authorImageSrc = '/微信图片_20251209105915_539_148.png';

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, 220), 420);
      setSidebarWidth(newWidth);
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing]);
  useEffect(() => {
    if (isResizing) {
      document.body.setAttribute('data-resizing', 'true');
    } else {
      document.body.removeAttribute('data-resizing');
    }
  }, [isResizing]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => {
          const next = Math.min(1.4, Math.max(0.8, z - e.deltaY * 0.0015));
          return parseFloat(next.toFixed(2));
        });
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    if (!promptConfig) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (promptConfig?.mode === 'addBookmark' && document.activeElement === titleInputRef.current) {
          urlInputRef.current?.focus();
          return;
        }
        handlePromptConfirm();
      }
    };
    window.addEventListener('keydown', handleKey);
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      if (promptConfig?.mode === 'addBookmark' && titleInputRef.current) {
        titleInputRef.current.select();
      }
    });
    return () => window.removeEventListener('keydown', handleKey);
  }, [promptConfig]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const data = await getBookmarkTree();
      const topLevel = data[0]?.children ?? data;
      setTree(topLevel);
      setSelectedFolderId('__root__');
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!shouldFocusFirstMain) return;
    const targetFolder = selectedFolderId === '__root__'
      ? { children: tree }
      : findNodeById(tree, selectedFolderId);
    const first = targetFolder?.children?.[0];
    if (first) {
      selectMainItem(first.id);
    } else {
      selectMainItem(null);
    }
    setShouldFocusFirstMain(false);
  }, [selectedFolderId, shouldFocusFirstMain, tree]);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length > 0) {
        setLastSearchSnapshot(null);
        const results = await searchBookmarks(searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };
    
    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeFolder = useMemo(() => {
    if (!tree.length) return null;
    if (selectedFolderId === '__root__') {
      return { id: '__root__', title: '', children: tree };
    }
    return findNodeById(tree, selectedFolderId);
  }, [tree, selectedFolderId]);

  const breadcrumbs = useMemo(() => {
    if (!tree.length || selectedFolderId === '__root__') return [];
    return getBreadcrumbs(tree, selectedFolderId);
  }, [tree, selectedFolderId]);

  const forcedExpandIds = useMemo(() => {
    // only expand ancestor nodes (not the selected node) once per selection
    const ids = new Set<string>();
    breadcrumbs.slice(0, -1).forEach((b) => ids.add(b.id));
    return ids;
  }, [breadcrumbs]);

  const displayItems = searchQuery 
    ? searchResults 
    : (activeFolder?.children || []);
  const flatMainItems = displayItems;

  const selectMainItem = (id: string | null) => {
    setMainActiveId(id);
    if (id) {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-main-item-id="${id}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  };

  const getLayoutItems = () => {
    const els = Array.from(document.querySelectorAll('[data-main-item-id]')) as HTMLElement[];
    return els
      .map(el => {
        const rect = el.getBoundingClientRect();
        return {
          id: el.dataset.mainItemId || el.getAttribute('data-main-item-id') || '',
          rect,
          centerX: rect.left + rect.width / 2,
        };
      })
      .filter(item => item.id);
  };

  const ROW_TOLERANCE = 24;
  const getRowItems = (currentTop: number, layout: ReturnType<typeof getLayoutItems>) =>
    layout.filter(item => Math.abs(item.rect.top - currentTop) < ROW_TOLERANCE);

  const findHorizontalNeighbor = (
    currentId: string | null,
    direction: 'left' | 'right'
  ) => {
    const layout = getLayoutItems();
    if (!layout.length) return { targetId: null, shouldFocusSidebar: false };
    const current = layout.find(i => i.id === currentId) || layout[0];
    const rowItems = getRowItems(current.rect.top, layout);
    const candidates = rowItems
      .filter(item =>
        direction === 'left'
          ? item.rect.left < current.rect.left - 1
          : item.rect.left > current.rect.left + 1
      )
      .sort((a, b) =>
        direction === 'left'
          ? b.rect.left - a.rect.left
          : a.rect.left - b.rect.left
      );
    if (candidates.length > 0) {
      return { targetId: candidates[0].id, shouldFocusSidebar: false };
    }
    const rowMinLeft = Math.min(...rowItems.map(i => i.rect.left));
    const isLeftMost = current.rect.left <= rowMinLeft + 1;
    return { targetId: current.id, shouldFocusSidebar: direction === 'left' && isLeftMost };
  };

  const findVerticalNeighbor = (
    currentId: string | null,
    direction: 'up' | 'down'
  ) => {
    const layout = getLayoutItems();
    if (!layout.length) return null;
    const current = layout.find(i => i.id === currentId) || layout[0];
    const candidates = layout.filter(item =>
      direction === 'down'
        ? item.rect.top > current.rect.top + ROW_TOLERANCE / 2
        : item.rect.top < current.rect.top - ROW_TOLERANCE / 2
    );
    if (!candidates.length) return current.id;
    const target = candidates
      .map(item => {
        const dy = Math.abs(item.rect.top - current.rect.top);
        const dx = Math.abs(item.centerX - current.centerX);
        return { item, dy, dx };
      })
      .sort((a, b) => (a.dy !== b.dy ? a.dy - b.dy : a.dx - b.dx))[0].item;
    return target.id;
  };

  const openActiveItem = () => {
    if (!mainActiveId) return;
    const item = displayItems.find(i => i.id === mainActiveId);
    if (!item) return;
    if (item.url) {
      window.open(item.url, '_blank');
    } else {
      handleFolderSelect(item);
      setShouldFocusFirstMain(true);
    }
  };

  const focusSidebarFirstVisible = () => {
    const firstFolder = tree.find((n) => !n.url);
    if (selectedFolderId === '__root__' && firstFolder) {
      setSelectedFolderId(firstFolder.id);
    }
    requestAnimationFrame(() => {
      sidebarRef.current?.focus();
    });
  };

  const focusMainFirstItem = () => {
    mainRef.current?.focus();
    if (displayItems.length > 0) {
      selectMainItem(displayItems[0].id);
    } else {
      setMainActiveId(null);
    }
  };

  useEffect(() => {
    const restoreNode = async (node: BookmarkNode, parentId?: string): Promise<string> => {
      if (node.url) {
        const created = await createBookmark(parentId || '__root__', node.title, node.url);
        return created.id;
      }
      const createdFolder = await createFolder(parentId || '__root__', node.title);
      if (node.children) {
        for (const child of node.children) {
          await restoreNode(child, createdFolder.id);
        }
      }
      return createdFolder.id;
    };

    const handleUndo = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const lastAction = undoStack[undoStack.length - 1];
        if (!lastAction) return;
        try {
          if (lastAction.type === 'add') {
            await removeNode(lastAction.id);
            setRedoStack(prev => [...prev, lastAction]);
            await refreshTree(selectedFolderId, false);
          } else if (lastAction.type === 'update') {
            if (lastAction.prevUrl === undefined && lastAction.nextUrl === undefined) {
              await updateTitle(lastAction.id, lastAction.prevTitle);
            } else {
              await updateBookmark(lastAction.id, lastAction.prevTitle, lastAction.prevUrl);
            }
            setRedoStack(prev => [...prev, lastAction]);
            await refreshTree(selectedFolderId, false);
          } else if (lastAction.type === 'delete') {
            const restoredId = await restoreNode(lastAction.node, lastAction.parentId);
            const redoDelete = { ...lastAction, node: { ...lastAction.node, id: restoredId } };
            setSelectedFolderId(lastAction.parentId || '__root__');
            setRedoStack(prev => [...prev, redoDelete]);
            await refreshTree(lastAction.parentId || '__root__', false);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setUndoStack(prev => prev.slice(0, -1));
        }
      }
    };
    const handleRedo = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        // treat Ctrl+Shift+Z same as redo
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'y') {
        // ctrl/cmd + y
      } else {
        return;
      }
      e.preventDefault();
      const next = redoStack[redoStack.length - 1];
      if (!next) return;
      try {
        if (next.type === 'add') {
          let newId = next.id;
          if (next.isFolder) {
            const created = await createFolder(next.parentId, next.title);
            newId = created.id;
          } else {
            const created = await createBookmark(next.parentId, next.title, next.url || '');
            newId = created.id;
          }
          setUndoStack(prev => [...prev, { ...next, id: newId }]);
          await refreshTree(selectedFolderId, false);
        } else if (next.type === 'update') {
          if (next.prevUrl === undefined && next.nextUrl === undefined) {
            await updateTitle(next.id, next.nextTitle ?? next.prevTitle);
          } else {
            await updateBookmark(next.id, next.nextTitle ?? next.prevTitle, next.nextUrl ?? next.prevUrl);
          }
          setUndoStack(prev => [...prev, next]);
          await refreshTree(selectedFolderId, false);
        } else if (next.type === 'delete') {
          await removeNode(next.node.id);
          setUndoStack(prev => [...prev, next]);
          await refreshTree(selectedFolderId, false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setRedoStack(prev => prev.slice(0, -1));
      }
    };
    const handlePaneSwitch = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (sidebarRef.current?.contains(activeEl) || mainRef.current?.contains(activeEl))) {
        return; // ���ڲ������������ɸ��Եļ����߼�����
      }
      if (e.key === 'ArrowLeft') {
        sidebarRef.current?.focus();
        setMainActiveId(null);
      } else if (e.key === 'ArrowRight') {
        mainRef.current?.focus();
        if (!mainActiveId && flatMainItems.length > 0) {
          setMainActiveId(flatMainItems[0].id);
          const el = document.querySelector(`[data-main-item-id="${flatMainItems[0].id}"]`) as HTMLElement | null;
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', handleUndo);
    window.addEventListener('keydown', handleRedo);
    window.addEventListener('keydown', handlePaneSwitch);
    return () => {
      window.removeEventListener('keydown', handleUndo);
      window.removeEventListener('keydown', handleRedo);
      window.removeEventListener('keydown', handlePaneSwitch);
    };
  }, [undoStack, redoStack, selectedFolderId, mainActiveId, flatMainItems]);

  const handleFolderSelect = (node: BookmarkNode) => {
    if (searchQuery.trim().length > 0) {
      setLastSearchSnapshot({ query: searchQuery, results: searchResults });
    }
    setSelectedFolderId(node.id);
    setAutoExpandVersion(v => v + 1);
    setSearchQuery('');
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = 0;
  };

  const handleBack = () => {
    if (lastSearchSnapshot) {
      setSearchQuery(lastSearchSnapshot.query);
      setSearchResults(lastSearchSnapshot.results);
      setLastSearchSnapshot(null);
      return;
    }
    if (breadcrumbs.length >= 2) {
      const parent = breadcrumbs[breadcrumbs.length - 2];
      setSelectedFolderId(parent.id);
    } else {
      setSelectedFolderId('__root__');
    }
  };

  const isRoot = selectedFolderId === '__root__';

  const refreshTree = async (nextSelectedId?: string, stayInRoot = false) => {
    setIsBusy(true);
    const data = await getBookmarkTree();
    const topLevel = data[0]?.children ?? data;
    setTree(topLevel);
    if (stayInRoot) {
      setSelectedFolderId('__root__');
    } else if (nextSelectedId) {
      setSelectedFolderId(nextSelectedId);
    }
    setIsBusy(false);
  };

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      // Require at least one dot and a simple TLD (e.g. .com .cn .cc)
      if (!/\.[a-z]{2,}$/.test(host)) return false;
      return Boolean(parsed.protocol && parsed.host);
    } catch {
      return false;
    }
  };

  const openPrompt = (
    mode: 'addBookmark' | 'addFolder' | 'rename', 
    opts?: { parentId?: string; targetId?: string; initialTitle?: string; initialUrl?: string }
  ) => {
    setPromptConfig({ mode, ...opts });
    setPromptValue(opts?.initialTitle ?? '');
    setPromptUrl(opts?.initialUrl ?? '');
    setFormError('');
    setAllowInvalidUrl(false);
    setTouchedUrl(false);
  };

  const handlePromptConfirm = async () => {
    if (!promptConfig) return;
    const closePrompt = () => {
      setPromptConfig(null);
      setPromptValue('');
      setPromptUrl('');
      setAllowInvalidUrl(false);
      setTouchedUrl(false);
      setFormError('');
    };
    try {
      if (promptConfig.mode === 'addFolder') {
        const parentId = promptConfig.parentId || selectedFolderId;
        const created = await createFolder(parentId, promptValue);
        setUndoStack(prev => [...prev, { type: 'add', id: created.id, parentId, isFolder: true, title: promptValue }]);
        setRedoStack([]);
        closePrompt();
        await refreshTree(created.id, false);
      } else if (promptConfig.mode === 'addBookmark') {
        const urlTrimmed = promptUrl.trim();
        if (!urlTrimmed) {
          setTouchedUrl(true);
          setFormError('');
          setAllowInvalidUrl(false);
          urlInputRef.current?.focus();
          return;
        }
        const validationTarget = /^https?:\/\//i.test(urlTrimmed) ? urlTrimmed : `https://${urlTrimmed}`;
        let finalUrl = validationTarget;
        const isValid = isValidUrl(validationTarget);
        if (!isValid && !allowInvalidUrl) {
          setFormError('网址格式可能不正确，再次点击确认将继续添加。');
          setAllowInvalidUrl(true);
          return;
        }
        setFormError('');
        setAllowInvalidUrl(false);
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = `https://${finalUrl}`;
        }
        const parentId = promptConfig.parentId || selectedFolderId;
        const created = await createBookmark(parentId, promptValue, finalUrl);
        setUndoStack(prev => [...prev, { type: 'add', id: created.id, parentId, isFolder: false, title: promptValue, url: finalUrl }]);
        setRedoStack([]);
        closePrompt();
        await refreshTree(parentId, false);
      } else if (promptConfig.mode === 'rename' && promptConfig.targetId) {
        const existing = findNodeById(tree, promptConfig.targetId);
        if (isEditingBookmarkUrl) {
          const urlTrimmed = promptUrl.trim();
          if (!urlTrimmed) {
            setTouchedUrl(true);
            setFormError('');
            setAllowInvalidUrl(false);
            urlInputRef.current?.focus();
            return;
          }
          const validationTarget = /^https?:\/\//i.test(urlTrimmed) ? urlTrimmed : `https://${urlTrimmed}`;
          let finalUrl = validationTarget;
          const isValid = isValidUrl(validationTarget);
          if (!isValid && !allowInvalidUrl) {
            setFormError('网址格式可能不正确，再次点击确认将继续添加。');
            setAllowInvalidUrl(true);
            return;
          }
          setFormError('');
          setAllowInvalidUrl(false);
          if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = `https://${finalUrl}`;
          }
          await updateBookmark(promptConfig.targetId, promptValue, finalUrl);
          if (existing) {
            setUndoStack(prev => [...prev, { type: 'update', id: promptConfig.targetId, prevTitle: existing.title, prevUrl: existing.url || '', nextTitle: promptValue, nextUrl: finalUrl }]);
            setRedoStack([]);
          }
        } else {
          await updateTitle(promptConfig.targetId, promptValue);
          if (existing) {
            setUndoStack(prev => [...prev, { type: 'update', id: promptConfig.targetId, prevTitle: existing.title, nextTitle: promptValue }]);
            setRedoStack([]);
          }
        }
        closePrompt();
        await refreshTree(selectedFolderId, false);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleDeleteCurrent = async () => {
    if (isRoot || isBusy) return;
    try {
      await removeNode(selectedFolderId);
      // go to parent if possible
      const parent = breadcrumbs[breadcrumbs.length - 1]?.id || '__root__';
      await refreshTree(parent, parent === '__root__');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFolderAction = async (action: 'addBookmark' | 'addFolder' | 'rename' | 'delete', node: BookmarkNode) => {
    try {
      if (action === 'addFolder') {
        openPrompt('addFolder', { parentId: node.id });
      } else if (action === 'addBookmark') {
        openPrompt('addBookmark', { parentId: node.id });
      } else if (action === 'rename') {
        openPrompt('rename', { targetId: node.id, initialTitle: node.title });
      } else if (action === 'delete') {
        // two-step confirm handled at call site; just delete here
        setUndoStack(prev => [...prev, { type: 'delete', node: node, parentId: node.parentId || selectedFolderId }]);
        setRedoStack([]);
        await removeNode(node.id);
        if (selectedFolderId === node.id) {
          setSelectedFolderId('__root__');
        }
        await refreshTree(undefined, true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookmarkAction = async (action: 'rename' | 'delete', node: BookmarkNode) => {
    try {
      if (action === 'rename') {
        openPrompt('rename', { targetId: node.id, initialTitle: node.title, initialUrl: node.url });
      } else if (action === 'delete') {
        setUndoStack(prev => [...prev, { type: 'delete', node, parentId: node.parentId || selectedFolderId }]);
        setRedoStack([]);
        await removeNode(node.id);
        await refreshTree(selectedFolderId, false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isEditingBookmarkUrl = promptConfig?.initialUrl !== undefined;
  const showUrlError = (promptConfig?.mode === 'addBookmark' || isEditingBookmarkUrl) && (
    (touchedUrl && !promptUrl.trim()) || (!!formError && !allowInvalidUrl)
  );

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zen-bg text-stone-400">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-zen-bg text-stone-800 font-sans overflow-visible select-none relative transition duration-200" style={{ zoom }}>
      <Sidebar 
        nodes={tree} 
        selectedId={selectedFolderId} 
        onSelect={handleFolderSelect} 
        onAction={handleFolderAction}
        forceExpandIds={forcedExpandIds}
        autoExpandVersion={autoExpandVersion}
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px`, zIndex: 50 } as any}
        ref={sidebarRef}
        onMoveToMain={focusMainFirstItem}
        onOpenDoc={() => setShowDocModal(true)}
      />

      <div
        className="w-2 bg-transparent hover:bg-[#efefef] transition-colors cursor-col-resize relative z-40 select-none"
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2" />
      </div>

      <main 
        className="flex-1 flex flex-col min-w-0 bg-zen-bg relative select-text focus:outline-none" 
        tabIndex={-1} 
        ref={mainRef}
        onKeyDown={(e) => {
          if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const targetId = findVerticalNeighbor(mainActiveId, e.key === 'ArrowDown' ? 'down' : 'up');
            if (targetId) {
              selectMainItem(targetId);
            }
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (e.key === 'ArrowRight') {
              const { targetId } = findHorizontalNeighbor(mainActiveId, 'right');
              if (targetId) {
                selectMainItem(targetId);
              }
            } else {
              const { targetId, shouldFocusSidebar } = findHorizontalNeighbor(mainActiveId, 'left');
              if (shouldFocusSidebar) {
                selectMainItem(null);
                if (isRoot && !searchQuery) {
                  focusSidebarFirstVisible();
                } else {
                  sidebarRef.current?.focus();
                }
              } else if (targetId) {
                selectMainItem(targetId);
              }
            }
          } else if (e.key === 'Enter') {
            e.preventDefault();
            openActiveItem();
          } else if (e.key === 'Backspace') {
            e.preventDefault();
            selectMainItem(null);
            handleBack();
            setShouldFocusFirstMain(true);
          }
        }}
      >
        <header className="px-6 py-4 flex items-center justify-between z-10 bg-zen-bg border-b border-stone-100">
          <div className="flex-1 w-full">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6" id="main-content" ref={mainContentRef}>
          <div className="w-full pb-6 pt-4">
            {!searchQuery && (
              <div className="flex items-center gap-3 mb-4 overflow-x-auto whitespace-nowrap pr-1">
                <div
                  className={`
                    overflow-hidden transition-all duration-300 ease-out shrink-0
                    ${isRoot ? 'w-0 opacity-0 scale-90' : 'w-9 opacity-100 scale-100'}
                  `}
                >
                  <button
                    onClick={handleBack}
                    className="p-1.5 rounded-lg border border-stone-200 text-stone-500 bg-white shadow-soft-sm transition-colors duration-300 ease-out hover:text-stone-800 hover:border-stone-300 w-9 h-9 flex items-center justify-center"
                    title={lastSearchSnapshot ? 'Back to search results' : 'Back to parent'}
                  >
                    <ArrowLeft size={16} />
                  </button>
                </div>
                <nav className={`
                  flex items-center text-sm text-stone-500 gap-0.5 transition-all duration-300 ease-out
                  ${isRoot ? 'ml-0' : 'ml-0'}
                `}>
                  <button 
                    onClick={() => {
                      setSelectedFolderId('__root__');
                      setSearchQuery('');
                      setLastSearchSnapshot(null);
                    }}
                    className="hover:text-primary-600 transition-colors p-1 rounded-md hover:bg-stone-100"
                    title="Go to Root"
                  >
                    <Home size={16} />
                  </button>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.id} className="flex items-center">
                      <ChevronRight size={14} className="mx-1 text-stone-300 shrink-0" />
                      <button
                        onClick={() => setSelectedFolderId(crumb.id)}
                        className={`
                          px-2 py-0.5 rounded-md transition-all duration-200 text-xs
                          ${index === breadcrumbs.length - 1 
                            ? 'font-semibold text-stone-900 bg-white shadow-sm ring-1 ring-stone-200' 
                            : 'hover:text-stone-900 hover:bg-stone-100'}
                        `}
                      >
                        {crumb.title}
                      </button>
                    </div>
                  ))}
                </nav>
              </div>
            )}

            {searchQuery && (
              <div className="mb-4 py-1">
                <p className="text-stone-400 text-xs">Found {searchResults.length} matches</p>
              </div>
            )}

            {searchQuery && lastSearchSnapshot && (
              <div className="flex items-center gap-3 mb-4 overflow-x-auto whitespace-nowrap pr-1">
                <button
                  onClick={handleBack}
                  className="p-2 rounded-lg border border-stone-200 text-stone-500 bg-white shadow-soft-sm transition-all duration-300 ease-out hover:text-stone-800 hover:border-stone-300 shrink-0"
                  title="Back to search results"
                >
                  <ArrowLeft size={16} />
                </button>
                <p className="text-stone-400 text-xs">Found {searchResults.length} matches</p>
              </div>
            )}

            <BookmarkGrid 
              items={displayItems} 
              onFolderClick={handleFolderSelect}
              isSearching={!!searchQuery}
              onBookmarkAction={handleBookmarkAction}
              activeId={mainActiveId}
            />
          </div>
        </div>
      </main>

      {promptConfig && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-[999]"
          onClick={() => setPromptConfig(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl p-5 w-[320px] space-y-3 border border-stone-100"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (promptConfig?.mode === 'addBookmark' && document.activeElement === titleInputRef.current && !promptUrl.trim()) {
                  urlInputRef.current?.focus();
                  return;
                }
                handlePromptConfirm();
              }
            }}
            tabIndex={-1}
          >
            <h3 className="text-sm font-semibold text-stone-700">
              {promptConfig.mode === 'addFolder' && 'New Folder'}
              {promptConfig.mode === 'addBookmark' && 'New Bookmark'}
              {promptConfig.mode === 'rename' && 'Edit'}
            </h3>
            <input
              ref={titleInputRef}
              value={promptValue}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (promptConfig?.mode === 'addBookmark') {
                    urlInputRef.current?.focus();
                  } else {
                    handlePromptConfirm();
                  }
                }
              }}
              onChange={(e) => { 
                setPromptValue(e.target.value); 
                setFormError(''); 
                setAllowInvalidUrl(false);
              }}
              placeholder="Title"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            {(promptConfig.mode === 'addBookmark' || isEditingBookmarkUrl) && (
              <input
                ref={urlInputRef}
                value={promptUrl}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePromptConfirm();
                  }
                }}
                onChange={(e) => { 
                  setPromptUrl(e.target.value); 
                  setFormError(''); 
                  setAllowInvalidUrl(false); 
                  if (touchedUrl && e.target.value.trim()) setTouchedUrl(false);
                }}
                placeholder="https://example.com"
                className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  showUrlError 
                    ? 'border border-red-100 ring-1 ring-red-50 focus:ring-red-100 focus:border-red-200'
                    : 'border border-stone-200 focus:ring-primary-500/20'
                }`}
              />
            )}
            {formError && (
              <p className="text-xs text-red-600">{formError}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPromptConfig(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 bg-white hover:border-stone-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePromptConfirm}
                disabled={isBusy}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors ${
                  isBusy ? 'bg-stone-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {showDocModal && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/30 flex items-center justify-center p-6"
          onClick={() => setShowDocModal(false)}
        >
          <div 
            className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl ring-1 ring-stone-200 p-8 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-stone-800">BookmarkNav 功能说明</h2>
                <p className="text-sm text-stone-500 mt-1">快速导航、搜索、分组与管理浏览器书签的轻量插件。</p>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                className="text-stone-400 hover:text-stone-700 p-2 rounded-lg hover:bg-stone-100 transition"
              >
                X
              </button>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-stone-700">
              <p>- 侧栏支持键盘导航、折叠、三点菜单（新增、重命名、删除）。</p>
              <p>- 主区域支持文件夹/书签卡片高亮、键盘切换、Enter 打开、Backspace 返回。</p>
              <p>- Ctrl + 滚轮可缩放界面；支持撤销/重做（Ctrl+Z / Ctrl+Y）。</p>
              <p>- 新建/编辑支持 URL 校验的二次确认，提示后再次确认即可继续保存。</p>
              <p>- 支持全局搜索（Ctrl+K），快速定位目标书签或文件夹。</p>
            </div>
            <div className="pt-2 text-xs text-stone-500 flex items-center justify-between">
              <button
                className="text-stone-600 hover:text-primary-600 hover:underline underline-offset-2 transition-colors"
                onClick={() => setShowAuthorImage(true)}
              >
                作者：mtmtspace
              </button>
              <button
                onClick={() => setShowDocModal(false)}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      {showAuthorImage && (
        <div
          className="fixed inset-0 z-[1100] bg-black/15 flex items-center justify-center"
          onClick={() => setShowAuthorImage(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={authorImageSrc} alt="mtmtspace" className="w-56 h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

