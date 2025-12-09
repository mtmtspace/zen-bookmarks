import { BookmarkNode } from '../types';

declare const chrome: any;

// Mock data for development/preview environment
const MOCK_TREE: BookmarkNode[] = [
  {
    id: '0',
    title: 'Root',
    children: [
      {
        id: '1',
        parentId: '0',
        title: 'Bookmarks Bar',
        children: [
          {
            id: '101',
            parentId: '1',
            title: 'Social',
            children: [
              { id: '1011', parentId: '101', title: 'Twitter', url: 'https://twitter.com' },
              { id: '1012', parentId: '101', title: 'Instagram', url: 'https://instagram.com' },
              { id: '1013', parentId: '101', title: 'LinkedIn', url: 'https://linkedin.com' },
            ]
          },
          {
            id: '102',
            parentId: '1',
            title: 'Development',
            children: [
              { id: '1021', parentId: '102', title: 'GitHub', url: 'https://github.com' },
              { id: '1022', parentId: '102', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
              { id: '1023', parentId: '102', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
              { id: '1024', parentId: '102', title: 'Tailwind CSS', url: 'https://tailwindcss.com' },
              { id: '1025', parentId: '102', title: 'React', url: 'https://react.dev' },
            ]
          },
          { id: '103', parentId: '1', title: 'YouTube', url: 'https://youtube.com' },
          { id: '104', parentId: '1', title: 'Gmail', url: 'https://gmail.com' },
        ]
      },
      {
        id: '2',
        parentId: '0',
        title: 'Other Bookmarks',
        children: [
          {
            id: '201',
            parentId: '2',
            title: 'Recipes',
            children: [
              { id: '2011', parentId: '201', title: 'Serious Eats', url: 'https://seriouseats.com' },
            ]
          },
          { id: '202', parentId: '2', title: 'News', url: 'https://news.google.com' }
        ]
      }
    ]
  }
];

// Helper to check if we are in a Chrome Extension environment
const isExtension = typeof chrome !== 'undefined' && !!chrome.bookmarks;

export const getBookmarkTree = (): Promise<BookmarkNode[]> => {
  return new Promise((resolve) => {
    if (isExtension) {
      chrome.bookmarks.getTree((tree: any) => {
        resolve(tree as BookmarkNode[]);
      });
    } else {
      // Simulate async delay for realistic feel
      setTimeout(() => resolve(MOCK_TREE), 100);
    }
  });
};

export const searchBookmarks = (query: string): Promise<BookmarkNode[]> => {
  return new Promise((resolve) => {
    if (isExtension) {
      // Search both bookmarks and folders by title/url
      chrome.bookmarks.getTree((tree: any) => {
        const results: BookmarkNode[] = [];
        const q = query.toLowerCase();

        const walk = (nodes: BookmarkNode[]) => {
          for (const node of nodes) {
            const titleMatch = (node.title || '').toLowerCase().includes(q);
            const urlMatch = node.url ? node.url.toLowerCase().includes(q) : false;
            if (titleMatch || urlMatch) {
              results.push({ ...node });
            }
            if (node.children) {
              walk(node.children);
            }
          }
        };

        walk(tree as BookmarkNode[]);
        resolve(results);
      });
    } else {
      // Simple recursive search implementation for mock data
      const results: BookmarkNode[] = [];
      const searchRecursive = (nodes: BookmarkNode[]) => {
        for (const node of nodes) {
          if (node.title.toLowerCase().includes(query.toLowerCase()) || 
              (node.url && node.url.toLowerCase().includes(query.toLowerCase()))) {
            // Clone to avoid modifying the tree structure in results
            results.push({ ...node }); 
          }
          if (node.children) {
            searchRecursive(node.children);
          }
        }
      };
      
      setTimeout(() => {
        searchRecursive(MOCK_TREE);
        resolve(results);
      }, 100);
    }
  });
};

export const createFolder = (parentId: string, title: string): Promise<BookmarkNode> => {
  return new Promise((resolve, reject) => {
    if (isExtension) {
      chrome.bookmarks.create({ parentId, title }, (node: any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(node as BookmarkNode);
        }
      });
    } else {
      const newNode: BookmarkNode = {
        id: `mock-${Date.now()}`,
        parentId,
        title,
        children: [],
      };
      // naive insert into mock tree
      const insert = (nodes: BookmarkNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === parentId) {
            if (!node.children) node.children = [];
            node.children.push(newNode);
            return true;
          }
          if (node.children && insert(node.children)) return true;
        }
        return false;
      };
      insert(MOCK_TREE);
      resolve(newNode);
    }
  });
};

export const createBookmark = (parentId: string, title: string, url: string): Promise<BookmarkNode> => {
  return new Promise((resolve, reject) => {
    if (isExtension) {
      chrome.bookmarks.create({ parentId, title, url }, (node: any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(node as BookmarkNode);
        }
      });
    } else {
      const newNode: BookmarkNode = {
        id: `mock-${Date.now()}`,
        parentId,
        title,
        url,
      };
      const insert = (nodes: BookmarkNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === parentId) {
            if (!node.children) node.children = [];
            node.children.push(newNode);
            return true;
          }
          if (node.children && insert(node.children)) return true;
        }
        return false;
      };
      insert(MOCK_TREE);
      resolve(newNode);
    }
  });
};

export const updateTitle = (id: string, title: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isExtension) {
      chrome.bookmarks.update(id, { title }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } else {
      const walk = (nodes: BookmarkNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === id) {
            node.title = title;
            return true;
          }
          if (node.children && walk(node.children)) return true;
        }
        return false;
      };
      walk(MOCK_TREE);
      resolve();
    }
  });
};

export const updateBookmark = (id: string, title?: string, url?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isExtension) {
      chrome.bookmarks.update(id, { title, url }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } else {
      const walk = (nodes: BookmarkNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === id) {
            if (typeof title === 'string') node.title = title;
            if (typeof url === 'string') node.url = url;
            return true;
          }
          if (node.children && walk(node.children)) return true;
        }
        return false;
      };
      walk(MOCK_TREE);
      resolve();
    }
  });
};

export const removeNode = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isExtension) {
      chrome.bookmarks.removeTree(id, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } else {
      const remove = (nodes: BookmarkNode[]): BookmarkNode[] => {
        return nodes.filter(node => {
          if (node.id === id) return false;
          if (node.children) node.children = remove(node.children);
          return true;
        });
      };
      const root = MOCK_TREE[0];
      if (root && root.children) {
        root.children = remove(root.children);
      }
      resolve();
    }
  });
};
