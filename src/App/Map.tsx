/* 
Full Path: /src/App/Map.tsx
Last Modified: 2025-02-28 13:30:00
*/

import React from "react";
// @ts-ignore
import geojsonExtent from '@mapbox/geojson-extent';
import toGeoJson from './toGeoJson';
import setCluster from './setCluster';

type Props = {
  data: Pwamap.ShopData[];
  selectedShop?: Pwamap.ShopData;
  onSelectShop: (shop: Pwamap.ShopData) => void;
  initialData?: Pwamap.ShopData[]; // 初期データを追加
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
const setupMarkers = (map: any, data: Pwamap.ShopData[], onSelectShop: (shop: Pwamap.ShopData) => void) => {
  const textColor = '#000000';
  const textHaloColor = '#FFFFFF';
  
  const geojson = toGeoJson(data);
  
  if (map.getSource('shops')) {
    map.getSource('shops').setData(geojson);
    return;
  }
  
  map.addSource('shops', {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 25,
  });
  
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
  
  setCluster(map);
  
  // 表示範囲を調整
  const bounds = geojsonExtent(geojson);
  if (bounds) {
    map.fitBounds(bounds, {
      padding: 50
    });
  }
};

const Content = (props: Props) => {
  const mapNode = React.useRef<HTMLDivElement>(null);
  const [mapObject, setMapObject] = React.useState<any>();
  
  // データが変更されたときにマーカーを更新
  React.useEffect(() => {
    if (!mapObject || props.data.length === 0) return;
    setupMarkers(mapObject, props.data, props.onSelectShop);
  }, [mapObject, props.data, props.onSelectShop]);
  
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
      style: 'geolonia/gsi',
//      attributionControl: false,
    });
    
    map.on('load', () => {
      hidePoiLayers(map);
      setMapObject(map);
      
      if (props.initialData && props.initialData.length > 0) {
        setupMarkers(map, props.initialData, props.onSelectShop);
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
        data-geolocate-control="on"
        data-marker="off"
        data-gesture-handling="off"
      ></div>
    </div>
  );
};

export default Content;
