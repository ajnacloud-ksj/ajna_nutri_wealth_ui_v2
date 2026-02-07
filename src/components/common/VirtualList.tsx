import React, { useCallback, useRef } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import AutoSizer from 'react-virtualized-auto-sizer';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight?: number | ((index: number) => number);
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  hasMore?: boolean;
  loadMore?: () => Promise<void>;
  className?: string;
  overscan?: number;
  threshold?: number;
}

/**
 * Optimized virtual scrolling list for large datasets
 */
export function VirtualList<T>({
  items,
  itemHeight = 100,
  renderItem,
  hasMore = false,
  loadMore,
  className,
  overscan = 3,
  threshold = 5,
}: VirtualListProps<T>) {
  const listRef = useRef<List>(null);
  const itemCount = hasMore ? items.length + 1 : items.length;

  // Check if an item is loaded
  const isItemLoaded = useCallback(
    (index: number) => !hasMore || index < items.length,
    [hasMore, items.length]
  );

  // Get item size
  const getItemSize = useCallback(
    (index: number) => {
      if (typeof itemHeight === 'function') {
        return itemHeight(index);
      }
      return itemHeight;
    },
    [itemHeight]
  );

  // Row renderer
  const Row = ({ index, style }: ListChildComponentProps) => {
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-green-600" />
        </div>
      );
    }

    const item = items[index];
    return <>{renderItem(item, index, style)}</>;
  };

  // If infinite loading is not needed
  if (!hasMore || !loadMore) {
    return (
      <div className={cn('h-full w-full', className)}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              itemCount={items.length}
              itemSize={getItemSize}
              width={width}
              overscanCount={overscan}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    );
  }

  // With infinite loading
  return (
    <div className={cn('h-full w-full', className)}>
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMore}
            threshold={threshold}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={(list) => {
                  // @ts-ignore
                  ref(list);
                  // @ts-ignore
                  listRef.current = list;
                }}
                height={height}
                itemCount={itemCount}
                itemSize={getItemSize}
                onItemsRendered={onItemsRendered}
                width={width}
                overscanCount={overscan}
              >
                {Row}
              </List>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  );
}

/**
 * Fixed size virtual list for better performance with uniform items
 */
export function FixedVirtualList<T>({
  items,
  itemHeight = 100,
  renderItem,
  className,
  overscan = 3,
}: {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  className?: string;
  overscan?: number;
}) {
  const Row = ({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    return <>{renderItem(item, index, style)}</>;
  };

  return (
    <div className={cn('h-full w-full', className)}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={() => itemHeight}
            width={width}
            overscanCount={overscan}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}