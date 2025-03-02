/* 
Full Path: /src/App/List.tsx
Last Modified: 2025-02-28 15:45:00
*/

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ShopListItem from './ShopListItem';
import Shop from './Shop';
import './List.scss';
import { useSearchParams } from "react-router-dom";
import InfiniteScroll from 'react-infinite-scroll-component';
import { askGeolocationPermission } from '../geolocation';
import * as turf from "@turf/turf";

// スケルトンローディングコンポーネント
const SkeletonItem = React.memo(() => (
  <div className="shop-list-item skeleton">
    <div className="skeleton-content">
      <div className="skeleton-title"></div>
      <div className="skeleton-text"></div>
    </div>
    <div className="skeleton-image"></div>
  </div>
));

type Props = {
  data: Pwamap.ShopData[];
};

// スワイプ判定用の閾値(px)
const SWIPE_THRESHOLD = 80;

// 距離計算を行う非同期関数
const calculateDistances = async (shopList: Pwamap.ShopData[], signal: AbortSignal) => {
  try {
    if (signal.aborted) return shopList;
    
    const currentPosition = await askGeolocationPermission();
    // もし現在位置が取得できなかった場合は、すべての店舗に distance: Infinity を設定
    if (!currentPosition || signal.aborted) {
      return shopList.map(shop => ({ ...shop, distance: Infinity }));
    }
    
    const from = turf.point(currentPosition);
    return shopList.map((shop) => {
      const lng = parseFloat(shop['経度']);
      const lat = parseFloat(shop['緯度']);
      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        return { ...shop, distance: Infinity };
      } else {
        const to = turf.point([lng, lat]);
        const distance = turf.distance(from, to, { units: 'meters' as 'meters' });
        return { ...shop, distance };
      }
    }).sort((a, b) => {
      // 未計算・不正な距離は Infinity として扱い、すべての店舗がリストに残るようにする
      const aDistance = (typeof a.distance === 'number' && !Number.isNaN(a.distance)) ? a.distance : Infinity;
      const bDistance = (typeof b.distance === 'number' && !Number.isNaN(b.distance)) ? b.distance : Infinity;
      return aDistance - bDistance;
    });
  } catch (error) {
    console.warn('位置情報取得エラー:', error);
    return shopList.map(shop => ({ ...shop, distance: Infinity }));
  }
};

const Content = (props: Props) => {
  const [shop, setShop] = useState<Pwamap.ShopData | undefined>(undefined);
  const [filteredData, setFilteredData] = useState<Pwamap.ShopData[]>([]);
  const [list, setList] = useState<Pwamap.ShopData[]>([]);
  const [page] = useState(20); // 初期表示件数
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDistanceCalculated, setIsDistanceCalculated] = useState(false);

  // マウント状態を追跡
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get('category');

  // カテゴリでデータをフィルタリング（メモ化）
  const filteredByCategory = useMemo(() => {
    if (!queryCategory) return props.data;
    return props.data.filter((shop) => shop['カテゴリ'] === queryCategory);
  }, [props.data, queryCategory]);

  // 初期データ設定（全件表示を目指す）
  useEffect(() => {
    setFilteredData(filteredByCategory);
    setList(filteredByCategory.slice(0, page));
    setHasMore(filteredByCategory.length > page);
  }, [filteredByCategory, page]);

  // 距離計算の実行：props.data の初回読み込み時に一度だけ実行
  useEffect(() => {
    if (props.data.length > 0 && !isDistanceCalculated) {
      setIsLoading(true);
      const controller = new AbortController();
      const { signal } = controller;
      calculateDistances(props.data, signal)
        .then(sortedData => {
          if (isMountedRef.current && !signal.aborted) {
            setFilteredData(sortedData);
            setList(sortedData.slice(0, page));
            setIsDistanceCalculated(true);
            setIsLoading(false);
          }
        })
        .catch(error => {
          if (error.name !== 'AbortError' && isMountedRef.current) {
            console.warn('距離計算エラー:', error);
            setIsLoading(false);
          }
        });
      return () => {
        controller.abort();
      };
    }
  }, [props.data, isDistanceCalculated, page]);

  // ポップアップ表示ハンドラ
  const popupHandler = useCallback((shop: Pwamap.ShopData) => {
    if (isMountedRef.current) {
      setShop(shop);
    }
  }, []);

  // ポップアップ閉じるハンドラ
  const closeHandler = useCallback(() => {
    if (isMountedRef.current) {
      setShop(undefined);
    }
  }, []);

  // 追加データ読み込みハンドラ
  const loadMore = useCallback(() => {
    if (!isMountedRef.current || list.length >= filteredData.length) {
      setHasMore(false);
      return;
    }
    const nextItems = filteredData.slice(list.length, list.length + 20);
    setList(prev => [...prev, ...nextItems]);
  }, [list.length, filteredData]);

  // --- スワイプ機能追加: タッチイベントの座標を管理 ---
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // タッチ開始
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = null;
    touchStartX.current = e.touches[0].clientX;
  };

  // タッチ終了
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipeGesture();
  };

  // スワイプ判定
  const handleSwipeGesture = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const deltaX = touchStartX.current - touchEndX.current;

    // 左右どちらへ一定以上スワイプしたら戻る
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      window.history.back();
    }
  };

  // スケルトンローダー
  const skeletonLoader = (
    <div className="skeleton-container">
      {Array(3).fill(0).map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} />
      ))}
    </div>
  );

  return (
    <div
      id="shop-list"
      className="shop-list"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {queryCategory && <div className="shop-list-category">{`カテゴリ：「${queryCategory}」`}</div>}

      <InfiniteScroll
        dataLength={list.length}
        next={loadMore}
        hasMore={hasMore}
        loader={<div className="list-loader" key="loader"></div>}
        scrollableTarget="shop-list"
        endMessage={<div className="list-end-message">すべての場所を表示しました</div>}
      >
        {list.length === 0 && isLoading ? skeletonLoader : 
          list.map((item, index) => (
            <div key={`shop-${index}-${item.index}`} className="shop">
              <ShopListItem
                data={item}
                popupHandler={popupHandler}
                queryCategory={queryCategory}
              />
            </div>
          ))
        }
      </InfiniteScroll>
      
      {shop && <Shop shop={shop} close={closeHandler} />}
    </div>
  );
};

export default React.memo(Content);
