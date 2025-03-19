/* 
Full Path: /src/App/Map.tsx
Last Modified: 2025-03-19 16:45:00
*/

import React, { useRef, useCallback, useState } from "react";
// @ts-ignore
import geojsonExtent from '@mapbox/geojson-extent';
import toGeoJson from './toGeoJson';
import setCluster from './setCluster';

type Props = {
  data: Pwamap.ShopData[];
  selectedShop?: Pwamap.ShopData;
  onSelectShop: (shop: Pwamap.ShopData) => void;
  initialData?: Pwamap.ShopData[];
};

// 新潟県中心の座標（初期表示用フォールバック）
const NIIGATA_CENTER: [number, number] = [138.5, 37.9];
const DEFAULT_ZOOM = 8;

const CSS: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
};

const LOADER_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(255, 255, 255, 0.7)',
  padding: '5px 10px',
  borderRadius: '4px',
  fontSize: '12px',
  zIndex: 1,
};

const hidePoiLayers = (map: any) => {
  const hideLayers = [
    'poi',
    'poi-primary',
    'poi-r0-r9',
    'poi-r10-r24',
    'poi-r25',
    'poi-bus',
    'poi-entrance',
  ];

  for (let i = 0; i < hideLayers.length; i++) {
    const layerId = hideLayers[i];
    map.setLayoutProperty(layerId, 'visibility', 'none');
  }
};

const Content = (props: Props) => {
  const { onSelectShop } = props;
  const mapNode = React.useRef<HTMLDivElement>(null);
  const [mapObject, setMapObject] = React.useState<any>();
  const initialBoundsSet = useRef(false);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);

  // 既存のデータソースを更新する関数
  const updateDataSource = useCallback((map: any, data: Pwamap.ShopData[]) => {
    if (!map || !map.getSource('shops') || data.length === 0) return;
    
    const geojson = toGeoJson(data);
    map.getSource('shops').setData(geojson);
  }, []);

  // マーカーをマップに追加する関数をメモ化
  const addMarkers = useCallback((mapObject: any, data: any) => {
    if (!mapObject || data.length === 0) {
      return;
    }

    setIsLoadingMarkers(true);

    // 非同期でマーカーを追加
    setTimeout(() => {
      if (!mapObject.getSource('shops')) {
        const textColor = '#000000';
        const textHaloColor = '#FFFFFF';

        const geojson = toGeoJson(data);

        mapObject.addSource('shops', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 25,
        });

        mapObject.addLayer({
          id: 'shop-points',
          type: 'circle',
          source: 'shops',
          filter: ['all', ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 13,
            'circle-color': '#FF0000',
            'circle-opacity': 0.4,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-opacity': 1,
          },
        });

        mapObject.addLayer({
          id: 'shop-symbol',
          type: 'symbol',
          source: 'shops',
          filter: ['all', ['==', '$type', 'Point']],
          paint: {
            'text-color': textColor,
            'text-halo-color': textHaloColor,
            'text-halo-width': 2,
          },
          layout: {
            'text-field': "{スポット名}",
            'text-font': ['Noto Sans Regular'],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-anchor': 'top',
            'text-max-width': 12,
            'text-allow-overlap': false,
          },
        });

        mapObject.on('mouseenter', 'shop-points', () => {
          mapObject.getCanvas().style.cursor = 'pointer';
        });

        mapObject.on('mouseleave', 'shop-points', () => {
          mapObject.getCanvas().style.cursor = '';
        });

        mapObject.on('mouseenter', 'shop-symbol', () => {
          mapObject.getCanvas().style.cursor = 'pointer';
        });

        mapObject.on('mouseleave', 'shop-symbol', () => {
          mapObject.getCanvas().style.cursor = '';
        });

        mapObject.on('click', 'shop-points', (event: any) => {
          if (!event.features[0].properties.cluster) {
            onSelectShop(event.features[0].properties);
          }
        });

        mapObject.on('click', 'shop-symbol', (event: any) => {
          if (!event.features[0].properties.cluster) {
            onSelectShop(event.features[0].properties);
          }
        });

        setCluster(mapObject);
      } else {
        updateDataSource(mapObject, data);
      }
      
      setIsLoadingMarkers(false);
    }, 0);
  }, [onSelectShop, updateDataSource]);

  // マップデータが変わったらマーカーを更新
  React.useEffect(() => {
    if (!mapObject) return;
    
    if (mapObject.getSource('shops')) {
      // 既存のデータソースが存在する場合は更新
      updateDataSource(mapObject, props.data);
    } else {
      // データソースが存在しない場合は新規作成
      addMarkers(mapObject, props.data);
    }
  }, [mapObject, props.data, addMarkers, updateDataSource]);

  // 初回のみ、地図の表示範囲を調整
  React.useEffect(() => {
    if (!mapObject || props.data.length === 0 || initialBoundsSet.current) {
      return;
    }
    
    const geojson = toGeoJson(props.data);
    const bounds = geojsonExtent(geojson);

    if (bounds) {
      mapObject.fitBounds(bounds, {
        padding: 50
      });
      initialBoundsSet.current = true;
    }
  }, [mapObject, props.data]);

  // 選択された店舗があれば、その位置に地図を移動
  React.useEffect(() => {
    if (!mapObject || !props.selectedShop) {
      return;
    }
    
    const lat = parseFloat(props.selectedShop['緯度']);
    const lng = parseFloat(props.selectedShop['経度']);
    
    if (lat && lng) {
      mapObject.flyTo({
        center: [lng, lat],
        zoom: 17,
        essential: true
      });
    }
  }, [mapObject, props.selectedShop]);

  // 地図の初期化（一度だけ実行）- 高速化のため即時実行
  React.useEffect(() => {
    // マップノードが無いか、既にマップオブジェクトが存在する場合は何もしない
    if (!mapNode.current || mapObject) {
      return;
    }

    // @ts-ignore
    const { geolonia } = window;

    // 地図を初期化 - 即座に表示するために先に初期化
    const map = new geolonia.Map({
      container: mapNode.current,
      style: 'geolonia/basic',
      center: NIIGATA_CENTER,
      zoom: DEFAULT_ZOOM,
      interactive: true, // 即座に操作可能にする
      trackResize: true,
    });

    // 地図が読み込まれたときの処理
    const onMapLoad = () => {
      hidePoiLayers(map);
      setMapObject(map);
      
      // 非同期で位置情報を取得
      try {
        // ジオロケーションコントロールを追加（タイムアウト短縮）
        const geolocateControl = new geolonia.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
            timeout: 2000, // 2秒に短縮
            maximumAge: 0
          },
          trackUserLocation: true,
          showUserLocation: true
        });
        
        map.addControl(geolocateControl, 'top-right');
        
        // 非同期で位置情報を取得（マップ表示をブロックしない）
        setTimeout(() => {
          geolocateControl.trigger();
        }, 100);
        
        // エラーハンドリング - 失敗しても地図は表示されたまま
        geolocateControl.on('error', () => {
          console.warn('位置情報の取得に失敗しましたが、地図は使用できます');
        });
      } catch (error) {
        console.warn('位置情報コントロールの初期化に失敗しましたが、地図は使用できます', error);
      }
    };

    // 画面の向きが変わったときのハンドラー
    const orientationChangeHandler = () => {
      map.resize();
    };

    // イベントリスナーを登録
    map.on('load', onMapLoad);
    window.addEventListener('orientationchange', orientationChangeHandler);

    // クリーンアップ関数
    return () => {
      // イベントリスナーを削除
      window.removeEventListener('orientationchange', orientationChangeHandler);
      map.off('load', onMapLoad);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // 依存配列を空にして初期化を一度だけ実行

  return (
    <div style={CSS}>
      {isLoadingMarkers && <div style={LOADER_STYLE}>マーカーを読み込み中...</div>}
      <div
        ref={mapNode}
        style={CSS}
        data-geolocate-control="off"
        data-marker="off"
        data-gesture-handling="on"
        data-loader="off"
      ></div>
    </div>
  );
};

export default Content;