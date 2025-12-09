import React, { useEffect } from 'react';
import { BookmarkNode } from '../types';
import { Folder, ArrowUpRight, Globe, MoreHorizontal, Pencil, Trash } from 'lucide-react';

interface BookmarkGridProps {
  items: BookmarkNode[];
  onFolderClick: (folder: BookmarkNode) => void;
  isSearching: boolean;
  onBookmarkAction?: (action: 'rename' | 'delete', bookmark: BookmarkNode) => void;
  activeId?: string | null;
}

const getFaviconUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
};

export const BookmarkGrid: React.FC<BookmarkGridProps> = ({ items, onFolderClick, isSearching, onBookmarkAction, activeId }) => {
  const [openBookmarkMenuId, setOpenBookmarkMenuId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  useEffect(() => {
    if (!openBookmarkMenuId) return;
    const handleClose = () => {
      setOpenBookmarkMenuId(null);
      setConfirmDeleteId(null);
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-bookmark-menu]')) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', handleClose, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('scroll', handleClose, true);
    };
  }, [openBookmarkMenuId]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-stone-400">
        <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4 text-stone-300">
           <Folder size={32} strokeWidth={1.5} />
        </div>
        <p className="text-lg font-medium text-stone-600">This folder is empty</p>
        <p className="text-sm">Add some bookmarks to get started</p>
      </div>
    );
  }

  const folders = items.filter(item => !item.url);
  const bookmarks = items.filter(item => item.url);

  const handleBookmarkAction = (action: 'rename' | 'delete', bookmark: BookmarkNode) => {
    if (!onBookmarkAction) return;
    if (action === 'delete' && confirmDeleteId !== bookmark.id) {
      setConfirmDeleteId(bookmark.id);
      return;
    }
    onBookmarkAction(action, bookmark);
    setConfirmDeleteId(null);
    setOpenBookmarkMenuId(null);
  };

  return (
    <div className="animate-fade-in space-y-10">
      {/* Folders Section */}
      {folders.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2">
               <Folder size={14} /> Folders
             </h3>
             <span className="text-xs text-stone-400 font-medium bg-stone-100 px-2 py-0.5 rounded-full">{folders.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {folders.map(folder => {
              const isActive = activeId === folder.id;
              return (
              <div 
                key={folder.id}
                onClick={() => onFolderClick(folder)}
                data-main-item-id={folder.id}
                className={`group relative flex items-center gap-3 p-4 bg-white rounded-xl shadow-soft-sm ring-1 ring-stone-900/5 cursor-pointer transition-all duration-200 ${
                  isActive ? 'shadow-soft-md ring-primary-500/30 -translate-y-0.5' : 'hover:shadow-soft-md hover:ring-primary-500/30 hover:-translate-y-0.5'
                }`}
              >
                <div className="bg-primary-50 text-primary-600 p-2.5 rounded-lg group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
                  <Folder size={20} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-700 truncate group-hover:text-primary-700 transition-colors">
                    {folder.title}
                  </div>
                  <div className="text-xs text-stone-400 whitespace-nowrap truncate max-w-[90px]">
                    {folder.children ? `${folder.children.length} items` : 'Empty'}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </section>
      )}

      {/* Bookmarks Section */}
      {bookmarks.length > 0 && (
        <section>
           {folders.length > 0 && (
            <div className="flex items-center justify-between mb-4 px-1">
               <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                 <Globe size={14} /> Bookmarks
               </h3>
               <span className="text-xs text-stone-400 font-medium bg-stone-100 px-2 py-0.5 rounded-full">{bookmarks.length}</span>
            </div>
           )}
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {bookmarks.map(bookmark => {
              const isActive = activeId === bookmark.id;
              const favicon = bookmark.url ? getFaviconUrl(bookmark.url) : null;
              const hostname = bookmark.url ? new URL(bookmark.url).hostname.replace('www.', '') : '';
              
              return (
                <a 
                  key={bookmark.id}
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  data-main-item-id={bookmark.id}
                  className={`group relative flex flex-col p-5 bg-white rounded-2xl shadow-soft-sm ring-1 ring-stone-900/5 transition-all duration-300 h-32 ${
                    isActive ? 'shadow-soft-xl ring-primary-500/20 -translate-y-1' : 'hover:shadow-soft-xl hover:ring-primary-500/20 hover:-translate-y-1'
                  }`}
                >
                  <div className="flex items-start justify-between mb-auto">
                    <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300">
                      {favicon ? (
                        <img 
                          src={favicon} 
                          alt="" 
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <Globe size={18} className={`text-stone-300 ${favicon ? 'hidden' : ''}`} />
                    </div>
                    
                    {onBookmarkAction ? (
                      <div 
                        className={`absolute top-4 right-4 text-stone-400 transition-opacity ${openBookmarkMenuId === bookmark.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        data-bookmark-menu
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenBookmarkMenuId(openBookmarkMenuId === bookmark.id ? null : bookmark.id);
                            setConfirmDeleteId(null);
                          }}
                          className="p-1.5 rounded-md hover:bg-stone-100 hover:text-stone-700"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {openBookmarkMenuId === bookmark.id && (
                          <div 
                            className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-lg ring-1 ring-stone-200 py-1.5 z-[160]" 
                            style={{ right: -10 }} 
                            data-bookmark-menu
                          >
                            <button
                              className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBookmarkAction('rename', bookmark); }}
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            <button
                              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                                confirmDeleteId === bookmark.id ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-red-500 hover:bg-red-50'
                              }`}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBookmarkAction('delete', bookmark); }}
                            >
                              <Trash size={13} /> {confirmDeleteId === bookmark.id ? 'Confirm delete' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 text-primary-500">
                        <ArrowUpRight size={18} />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <h4 className="font-semibold text-stone-800 text-sm line-clamp-1 mb-0.5 group-hover:text-primary-700 transition-colors" title={bookmark.title}>
                      {bookmark.title}
                    </h4>
                    <p className="text-[11px] text-stone-400 truncate font-medium">
                      {hostname}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
