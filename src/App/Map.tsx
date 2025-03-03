import React from "react";
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

const CSS: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
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

// マーカーを追加する関数
const setupMarkers = (map: any, data: Pwamap.ShopData[], onSelectShop: (shop: Pwamap.ShopData) => void, isInitialLoad: boolean = false) => {
  const textColor = '#000000';
  const textHaloColor = '#FFFFFF';
  
  const geojson = toGeoJson(data);
  
  console.log(`マーカー更新: データ数 ${data.length}件`);
  
  if (map.getSource('shops')) {
    console.log('既存のマーカーを更新します');
    
    // 関連レイヤーを一旦削除
    if (map.getLayer('shop-points')) map.removeLayer('shop-points');
    if (map.getLayer('shop-symbol')) map.removeLayer('shop-symbol');
    if (map.getLayer('clusters')) map.removeLayer('clusters');
    if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
    if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
    
    // ソースを更新
    map.getSource('shops').setData(geojson);
    
    // レイヤーを再作成
    addLayers(map, textColor, textHaloColor, onSelectShop);
    
    // クラスタリングを設定
    setCluster(map);
    
    return;
  }
  
  // 初回のソース作成
  map.addSource('shops', {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 25,
  });
  
  // レイヤーを追加
  addLayers(map, textColor, textHaloColor, onSelectShop);
  
  // クラスタリングを設定
  setCluster(map);
  
  // 初回ロード時のみ表示範囲を調整
  if (isInitialLoad && data.length > 0) {
    const bounds = geojsonExtent(geojson);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: 50
      });
    }
  }
};

// レイヤー追加の共通処理を関数化
const addLayers = (map: any, textColor: string, textHaloColor: string, onSelectShop: (shop: Pwamap.ShopData) => void) => {
  map.addLayer({
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
  
  map.addLayer({
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
  
  // イベントハンドラを設定
  setupEventHandlers(map, onSelectShop);
};

// イベントハンドラ設定の共通処理を関数化
const setupEventHandlers = (map: any, onSelectShop: (shop: Pwamap.ShopData) => void) => {
  map.on('mouseenter', 'shop-points', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'shop-points', () => {
    map.getCanvas().style.cursor = '';
  });
  map.on('mouseenter', 'shop-symbol', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'shop-symbol', () => {
    map.getCanvas().style.cursor = '';
  });
  
  map.on('click', 'shop-points', (event: any) => {
    if (!event.features[0].properties.cluster) {
      onSelectShop(event.features[0].properties);
    }
  });
  
  map.on('click', 'shop-symbol', (event: any) => {
    if (!event.features[0].properties.cluster) {
      onSelectShop(event.features[0].properties);
    }
  });
};

const Content = (props: Props) => {
  const mapNode = React.useRef<HTMLDivElement>(null);
  const [mapObject, setMapObject] = React.useState<any>();
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);
  const geolocateControlRef = React.useRef<any>(null);
  const hasTriggeredGeolocation = React.useRef<boolean>(false);
  
  // データが変更されたときにマーカーを更新
  React.useEffect(() => {
    if (!mapObject) return;
    
    console.log(`データ更新検知: ${props.data.length}件`);
    setupMarkers(mapObject, props.data, props.onSelectShop, !initialLoadComplete);
    
    if (!initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [mapObject, props.data, props.onSelectShop, initialLoadComplete]);
  
  // 選択された店舗が変更されたときに地図を移動
  React.useEffect(() => {
    if (!mapObject || !props.selectedShop) return;
    
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
  
  // 地図の初期化（一度だけ実行）
  React.useEffect(() => {
    if (!mapNode.current || mapObject) return;
    // @ts-ignore
    const { geolonia } = window;
    
    const map = new geolonia.Map({
      container: mapNode.current,
      style: 'geolonia/basic',
      center: [138.5, 37.9], // 新潟県の中心あたり
      zoom: 7, // 県全体が見えるようなズームレベル
      attributionControl: false,
      gestureHandling: true,
      lazy: false,
    });
    
    map.on('load', () => {
      hidePoiLayers(map);
      
      // ジオロケーションコントロールを追加
      if (!geolocateControlRef.current) {
        const geolocateControl = new geolonia.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          },
          trackUserLocation: true,
          showUserLocation: true
        });
        
        geolocateControlRef.current = geolocateControl;
        map.addControl(geolocateControl, 'top-right');
        
        // 位置情報のイベントリスナーを設定
        geolocateControl.on('geolocate', () => {
          console.log('位置情報が取得されました');
        });
        
        geolocateControl.on('error', (e: any) => {
          console.warn('位置情報の取得に失敗しました:', e.error);
        });
        
        // 地図の読み込み後に自動で位置情報を取得
        setTimeout(() => {
          if (!hasTriggeredGeolocation.current) {
            console.log('自動で位置情報を取得します');
            geolocateControl.trigger();
            hasTriggeredGeolocation.current = true;
          }
        }, 1000);
      }
      
      setMapObject(map);
      
      if (props.initialData && props.initialData.length > 0) {
        setupMarkers(map, props.initialData, props.onSelectShop, true);
        setInitialLoadComplete(true);
      }
    });
    
    const orientationChangeHandler = () => {
      map.resize();
    };
    window.addEventListener('orientationchange', orientationChangeHandler);
    
    return () => {
      window.removeEventListener('orientationchange', orientationChangeHandler);
      map.off('load', () => {});
    };
  }, [mapNode, mapObject, props.initialData, props.onSelectShop]);
  
  return (
    <div style={CSS}>
      <div
        ref={mapNode}
        className="geolonia custom-map-container"
        style={CSS}
        data-geolocate-control="off"
        data-marker="off"
        data-gesture-handling="off"
        data-loader="off"
        data-lazy-loading="off"
        data-scale-control="on"
      ></div>
    </div>
  );
};

export default Content;