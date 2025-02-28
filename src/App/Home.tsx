/* 
Full Path: /src/App/Home.tsx
Last Modified: 2025-02-28 13:00:00
*/

import React, { useState, useEffect, useCallback } from 'react';
import Map from './Map';
import Shop from './Shop';
import SearchFeature from './SearchFeature';
import './Home.scss';

type HomeProps = {
  data: Pwamap.ShopData[];
};

const Home: React.FC<HomeProps> = (props) => {
  const [data, setData] = useState<Pwamap.ShopData[]>([]);
  const [selectedShop, setSelectedShop] = useState<Pwamap.ShopData | undefined>(undefined);
  const [filteredShops, setFilteredShops] = useState<Pwamap.ShopData[]>([]);

  // 親コンポーネントから渡されたデータを設定
  useEffect(() => {
    if (props.data.length > 0) {
      setData(props.data);
      setFilteredShops(props.data);
    }
  }, [props.data]);

  // 検索結果を受け取るハンドラを useCallback でメモ化
  const handleSearchResults = useCallback((results: Pwamap.ShopData[]) => {
    setFilteredShops(results);
  }, []);

  // 店舗選択ハンドラを useCallback でメモ化
  const handleSelectShop = useCallback((shop: Pwamap.ShopData) => {
    setSelectedShop(shop);
  }, []);

  // Shop閉じる処理を useCallback でメモ化
  const handleCloseShop = useCallback(() => {
    setSelectedShop(undefined);
  }, []);

  return (
    <div className="home">
      <SearchFeature 
        data={data}
        onSelectShop={handleSelectShop}
        onSearchResults={handleSearchResults}
      />
      <Map 
        data={filteredShops} 
        selectedShop={selectedShop}
        onSelectShop={handleSelectShop}
        initialData={props.data}
      />
      {selectedShop && (
        <Shop 
          shop={selectedShop} 
          close={handleCloseShop} 
        />
      )}
    </div>
  );
};

export default Home;
