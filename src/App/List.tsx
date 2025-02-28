import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ShopListItem from './ShopListItem'
import Shop from './Shop'
import './List.scss'
import { useSearchParams } from "react-router-dom";
import InfiniteScroll from 'react-infinite-scroll-component';
import { askGeolocationPermission } from '../geolocation'
import * as turf from "@turf/turf"

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
}

// 距離計算を行う非同期関数
const calculateDistances = async (shopList: Pwamap.ShopData[], signal: AbortSignal) => {
  try {
    if (signal.aborted) return shopList;
    
    const currentPosition = await askGeolocationPermission();
    if (!currentPosition || signal.aborted) return shopList;
    
    const from = turf.point(currentPosition);
    return shopList.map((shop) => {
      const lng = parseFloat(shop['経度'])
      const lat = parseFloat(shop['緯度'])
      if(Number.isNaN(lng) || Number.isNaN(lat)) {
        return shop
      } else {
        const to = turf.point([lng, lat])
        const distance = turf.distance(from, to, {units: 'meters' as 'meters'});
        return { ...shop, distance }
      }
    }).sort((a,b) => {
      if(typeof a.distance !== 'number' || Number.isNaN(a.distance)) {
        return 1
      } else if (typeof b.distance !== 'number' || Number.isNaN(b.distance)) {
        return -1
      } else {
        return a.distance - b.distance
      }
    });
  } catch (error) {
    console.warn('位置情報取得エラー:', error);
    return shopList;
  }
}

const Content = (props: Props) => {
  const [shop, setShop] = useState<Pwamap.ShopData | undefined>(undefined);
  const [filteredData, setFilteredData] = useState<Pwamap.ShopData[]>([]);
  const [list, setList] = useState<Pwamap.ShopData[]>([]);
  const [page, setPage] = useState(20); // 初期表示を20件に増加
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDistanceCalculated, setIsDistanceCalculated] = useState(false);

  // マウント状態を追跡
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get('category');

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // 実行中の非同期処理をキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // カテゴリでデータをフィルタリング（メモ化）
  const filteredByCategory = useMemo(() => {
    if (!queryCategory) return props.data;
    return props.data.filter((shop) => shop['カテゴリ'] === queryCategory);
  }, [props.data, queryCategory]);

  // 初期データ設定
  useEffect(() => {
    // 初期表示のためのデータをすぐに設定
    setFilteredData(filteredByCategory);
    setList(filteredByCategory.slice(0, page));
    setHasMore(filteredByCategory.length > page);
    
    // 位置情報取得と距離計算を非同期で開始（UIをブロックしない）
    const orderBy = process.env.REACT_APP_ORDERBY;
    if (orderBy === 'distance' && !isDistanceCalculated) {
      setIsLoading(true);
      
      // 前回の非同期処理があればキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 新しい AbortController を作成
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      
      calculateDistances(filteredByCategory, signal)
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
    }
    
    // クリーンアップ関数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [filteredByCategory, page, isDistanceCalculated]);

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

  // 追加データ読み込みハンドラ（メモ化して最適化）
  const loadMore = useCallback(() => {
    if (!isMountedRef.current || list.length >= filteredData.length) {
      setHasMore(false);
      return;
    }
    
    const nextItems = filteredData.slice(list.length, list.length + 20);
    setList(prev => [...prev, ...nextItems]);
  }, [list.length, filteredData]);

  // スケルトンローダー（リスト項目がロード中の場合に表示）
  const skeletonLoader = (
    <div className="skeleton-container">
      {Array(3).fill(0).map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} />
      ))}
    </div>
  );

  return (
    <div id="shop-list" className="shop-list">
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