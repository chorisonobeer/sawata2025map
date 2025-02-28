/* 
Full Path: /src/App/SearchFeature.tsx
Last Modified: 2025-02-28 14:45:00
*/

import React, { useState, useEffect, useCallback } from 'react';
import './SearchFeature.scss';

type SearchFeatureProps = {
  data: Pwamap.ShopData[];
  onSearchResults: (results: Pwamap.ShopData[]) => void;
  onSelectShop: (shop: Pwamap.ShopData) => void;
};

const SearchFeature: React.FC<SearchFeatureProps> = ({ data, onSearchResults, onSelectShop }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [results, setResults] = useState<Pwamap.ShopData[]>([]);
  const [showResults, setShowResults] = useState(false);

  // カテゴリ一覧を作成
  useEffect(() => {
    if (data.length > 0) {
      const uniqueCategories = Array.from(new Set(data.map(shop => shop['カテゴリ']))).filter(Boolean);
      setCategories(uniqueCategories);
    }
  }, [data]);

  // フィルタリング処理
  const filterShops = useCallback(() => {
    let filtered = data;

    // テキスト検索
    if (query.trim() !== '') {
      filtered = filtered.filter(shop => {
        return Object.entries(shop).some(([_, value]) => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query.toLowerCase());
          }
          return false;
        });
      });
    }

    // カテゴリでフィルタリング
    if (selectedCategory) {
      filtered = filtered.filter(shop => shop['カテゴリ'] === selectedCategory);
    }

    // 営業中でフィルタリング
    if (isOpenNow) {
      const now = new Date();
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

      filtered = filtered.filter(shop => {
        // 定休日チェック：カンマ、全角カンマ、空白で分割してチェック
        if (shop['定休日']) {
          const closedDays = shop['定休日']
            .split(/,|、|\s+/)
            .map(day => day.trim())
            .filter(day => day !== '');
          if (closedDays.some(day => day.includes(dayOfWeek))) {
            return false;
          }
        }

        // 営業時間チェック（10:00 - 17:00, 10時～17時などに対応）
        if (shop['営業時間']) {
          const timeRangeMatch = shop['営業時間'].match(/(\d{1,2})(?::(\d{2}))?\s*[：:時～-]\s*(\d{1,2})(?::(\d{2}))?/);
          if (timeRangeMatch) {
            const startHour = parseInt(timeRangeMatch[1], 10);
            const startMinute = timeRangeMatch[2] ? parseInt(timeRangeMatch[2], 10) : 0;
            const endHour = parseInt(timeRangeMatch[3], 10);
            const endMinute = timeRangeMatch[4] ? parseInt(timeRangeMatch[4], 10) : 0;
            const startTimeMinutes = startHour * 60 + startMinute;
            const endTimeMinutes = endHour * 60 + endMinute;
            // 対応：深夜営業の場合（例：22:00-02:00）
            if (endTimeMinutes < startTimeMinutes) {
              return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
            } else {
              return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
            }
          }
        }
        // 営業時間の形式が不明な場合はデフォルトで表示
        return true;
      });
    }

    // 駐車場でフィルタリング：1台以上あるものにする
    if (hasParking) {
      filtered = filtered.filter(shop => {
        if (!shop['駐車場']) return false;
        const parkingStr = shop['駐車場'].trim();
        const parkingCountMatch = parkingStr.match(/(\d+)/);
        if (parkingCountMatch) {
          const parkingCount = parseInt(parkingCountMatch[1], 10);
          return parkingCount >= 1;
        }
        return parkingStr.includes('有') || parkingStr.includes('あり');
      });
    }

    setResults(filtered);
    onSearchResults(filtered);
  }, [data, query, selectedCategory, isOpenNow, hasParking, onSearchResults]);

  // フィルター条件が変わったら再フィルタリング
  useEffect(() => {
    filterShops();
  }, [filterShops]);

  // 検索入力ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(e.target.value.trim() !== '');
  };

  // カテゴリ選択ハンドラー
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  // 結果アイテムクリックハンドラー
  const handleResultClick = (shop: Pwamap.ShopData) => {
    onSelectShop(shop);
    setShowResults(false);
  };

  return (
    <div className="search-feature">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="スポットを検索..."
          value={query}
          onChange={handleInputChange}
          className="search-input"
        />
      </div>
      
      <div className="filter-container">
        <div className="filter-item">
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className={`filter-select ${selectedCategory ? 'active' : ''}`}
          >
            <option value="">カテゴリ</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <button
            className={`filter-button ${isOpenNow ? 'active' : ''}`}
            onClick={() => setIsOpenNow(!isOpenNow)}
          >
            現在営業中
          </button>
        </div>
        <div className="filter-item">
          <button
            className={`filter-button ${hasParking ? 'active' : ''}`}
            onClick={() => setHasParking(!hasParking)}
          >
            駐車場有り
          </button>
        </div>
      </div>

      {showResults && (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="no-results">該当する店舗がありません</div>
          ) : (
            <div className="results-list">
              {results.map((shop, index) => (
                <div
                  key={`shop-result-${index}`}
                  className="result-item"
                  onClick={() => handleResultClick(shop)}
                >
                  <div className="result-info">
                    <div className="result-name" style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                      {shop['スポット名']}
                    </div>
                    <div className="result-hours" style={{ fontSize: '8pt', fontWeight: '600' }}>
                     営業時間： {shop['営業時間'] ? shop['営業時間'] : '営業時間不明'}
                    </div>
                    <div className="result-closed" style={{ fontSize: '8pt', fontWeight: '600' }}>
                      定休日：{shop['定休日'] ? shop['定休日'] : '定休日不明'}
                    </div>
                    <div className="result-address" style={{ fontSize: '8pt', fontWeight: '600' }}>
                     住所： {shop['住所'] ? shop['住所'] : '住所不明'}
                    </div>
                  </div>
                  <div className="result-image">
                    {shop['画像'] ? (
                      <img
                        src={shop['画像']}
                        alt={shop['スポット名']}
                        style={{ width: 'auto', height: '100%', margin: 0, display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: 'auto', height: '100%', background: '#ccc' }}></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFeature;
