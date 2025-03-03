/* 
Full Path: /src/App.tsx
Last Modified: 2025-02-28 17:45:00
*/

import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.scss";

import Home from './App/Home';
import List from './App/List';
import AboutUs from './App/AboutUs';
import Category from './App/Category';
import Images from './App/Images';

import Tabbar from './App/Tabbar';
import config from "./config.json";
import Papa from 'papaparse';
import { GeolocationProvider } from './context/GeolocationContext';

const sortShopList = async (shopList: Pwamap.ShopData[]) => {
  // 新着順にソート
  return shopList.sort((item1, item2) => {
    return Date.parse(item2['タイムスタンプ']) - Date.parse(item1['タイムスタンプ']);
  });
}

const App = () => {
  const [shopList, setShopList] = React.useState<Pwamap.ShopData[]>([]);

  React.useEffect(() => {
    fetch(config.data_url)
      .then((response) => {
        return response.ok ? response.text() : Promise.reject(response.status);
      })
      .then((data) => {
        Papa.parse(data, {
          header: true,
          complete: (results) => {
            const features = results.data;
            const nextShopList: Pwamap.ShopData[] = [];
            for (let i = 0; i < features.length; i++) {
              const feature = features[i] as Pwamap.ShopData;
              if (!feature['緯度'] || !feature['経度'] || !feature['スポット名']) continue;
              if (!feature['緯度'].match(/^[0-9]+(\.[0-9]+)?$/)) continue;
              if (!feature['経度'].match(/^[0-9]+(\.[0-9]+)?$/)) continue;
              const shop = { index: i, ...feature };
              nextShopList.push(shop);
            }
            sortShopList(nextShopList).then((sortedShopList) => {
              setShopList(sortedShopList);
            });
          }
        });
      });
  }, []);

  return (
    <GeolocationProvider>
      <div className="app">
        <div className="app-body">
          <Routes>
            <Route path="/" element={<Home data={shopList} />} />
            <Route path="/list" element={<List data={shopList} />} />
            <Route path="/category" element={<Category data={shopList} />} />
            <Route path="/images" element={<Images data={shopList} />} />
            <Route path="/about" element={<AboutUs />} />
          </Routes>
        </div>
        <div id="modal-root"></div>
        <div className="app-footer">
          <Tabbar />
        </div>
      </div>
    </GeolocationProvider>
  );
}

export default App;
