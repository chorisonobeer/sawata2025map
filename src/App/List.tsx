/* 
Full Path: /src/App/List.tsx
Last Modified: 2025-02-28 15:45:00
*/

import React, { useState, useEffect, useMemo } from "react";
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

type ShopDataWithDistance = Pwamap.ShopData & { distance?: number };

const sortShopList = async (shopList: Pwamap.ShopData[]): Promise<ShopDataWithDistance[]> => {
  const currentPosition = await askGeolocationPermission();
  if (currentPosition) {
    const from = turf.point(currentPosition);
    const sortingShopList = shopList.map((shop) => {
      const lng = parseFloat(shop['経度']);
      const lat = parseFloat(shop['緯度']);
      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        return shop;
      } else {
        const to = turf.point([lng, lat]);
        const distance = turf.distance(from, to, {units: 'meters'});
        return { ...shop, distance };
      }
    });
    sortingShopList.sort((a, b) => {
      if (typeof a.distance !== 'number' || Number.isNaN(a.distance)) {
        return 1;
      } else if (typeof b.distance !== 'number' || Number.isNaN(b.distance)) {
        return -1;
      } else {
        return (a.distance as number) - (b.distance as number);
      }
    });
    return sortingShopList;
  } else {
    return shopList;
  }
};

const Content = (props: Props) => {

  const [shop, setShop] = useState<Pwamap.ShopData | undefined>();
  const [data, setData] = useState<Pwamap.ShopData[]>(props.data);
  const [list, setList] = useState<Pwamap.ShopData[]>([]);
  const [page, setPage] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get('category');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      let filteredData = props.data;

      if (queryCategory) {
        filteredData = props.data.filter((shop) => {
          return shop['カテゴリ'] === queryCategory;
        });
      }

      const orderBy = process.env.REACT_APP_ORDERBY;

      if (orderBy === 'distance') {
        const sortedData = await sortShopList(filteredData);
        if (isMounted) {
          setList(sortedData.slice(0, page));
          setData(sortedData);
        }
      } else {
        if (isMounted) {
          setList(filteredData.slice(0, page));
          setData(filteredData);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [props.data, queryCategory, page]);

  const popupHandler = (shop: Pwamap.ShopData) => {
    if (shop) {
      setShop(shop);
    }
  };

  const closeHandler = () => {
    setShop(undefined);
  };

  const loadMore = () => {

    if (list.length >= data.length) {
      setHasMore(false);
      return;
    }

    setList([...list, ...data.slice(page, page + 10)]);
    setPage(page + 10);
  };

  // skeletonLoader を定義して、InfiniteScroll の loader として利用する
  const skeletonLoader = useMemo(() => (
    <div className="skeleton-container">
      {Array(3).fill(0).map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} />
      ))}
    </div>
  ), []);

  return (
    <div id="shop-list" className="shop-list">
      {queryCategory && <div className="shop-list-category">{`カテゴリ：「${queryCategory}」`}</div>}

      <InfiniteScroll
        dataLength={list.length}
        next={loadMore}
        hasMore={hasMore}
        loader={<div className="list-loader" key="loader"></div>}
        scrollableTarget="shop-list"
      >
        {list.length === 0 ? skeletonLoader : 
          list.map((item) => (
            <div key={item.index} className="shop">
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
