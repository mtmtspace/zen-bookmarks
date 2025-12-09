export interface BookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;
  title: string;
  dateAdded?: number;
  dateGroupModified?: number;
  unmodifiable?: string;
  children?: BookmarkNode[];
}

export interface BreadcrumbItem {
  id: string;
  title: string;
}
