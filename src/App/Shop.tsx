import React from "react";
import Links from './Links'
import './Shop.scss'
import { AiOutlineClose } from 'react-icons/ai'
import { Link } from "react-router-dom";
import { makeDistanceLabelText } from "./distance-label";

type Props = {
  shop: Pwamap.ShopData;
  close: Function;
}

const Content = (props: Props) => {
  const mapNode = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<any>(null)
  const { shop } = props

  const clickHandler = () => {
    props.close()
    if(mapNode.current) {
      mapNode.current.remove()
      map.remove()
    }
  }

  React.useEffect(() => {
    if (!mapNode.current) {
      return
    }

    // @ts-ignore
    const nextMap = new window.geolonia.Map({
      container: mapNode.current,
      interactive: false,
      zoom: 14,
      style: `geolonia/gsi`,
    });
    setMap(nextMap)
  }, [shop, mapNode])

  const distanceTipText = makeDistanceLabelText(shop.distance)
  const category = shop['カテゴリ']
  const content = shop['紹介文']

  const toBreakLine = (text: string) => {
    return text.split(/(\r\n)|(\n)|(\r)/g).map((line, i) => {
      let result: any = '';
      if (line === '\r\n' || line === '\n' || line === '\r') {
        result = <br key={i} />
      } else if (line !== undefined) {
        result = line
      }
      return result
    })
  }

  // 複数の画像を表示
  const renderImages = () => {
    const images = [];
    
    if (shop['画像']) images.push(shop['画像']);
    if (shop['画像2']) images.push(shop['画像2']);
    if (shop['画像3']) images.push(shop['画像3']);
    if (shop['画像4']) images.push(shop['画像4']);
    if (shop['画像5']) images.push(shop['画像5']);
    
    return images.map((img, index) => (
      <img key={index} src={img} alt={`${shop['スポット名']} - 画像${index + 1}`} className="shop-image" />
    ));
  };

  return (
    <div className="shop-single">
      <div className="head">
        <button onClick={clickHandler}><AiOutlineClose size="16px" color="#FFFFFF" /> 閉じる</button>
      </div>
      <div className="container">
        {shop?
          <>
            <h2>{shop['スポット名']}</h2>
            <div>
              <span className="nowrap">
                <Link to={`/list?category=${category}`}>
                  <span onClick={clickHandler} className="category">{category}</span>
                </Link>
              </span>
              <span className="nowrap">{distanceTipText && <span className="distance">現在位置から {distanceTipText}</span> }</span>
            </div>

            <div className="shop-info-box">
              {shop['営業時間'] && (
                <div className="info-item">
                  <span className="info-label">営業時間:</span> {shop['営業時間']}
                </div>
              )}
              {shop['駐車場'] && (
                <div className="info-item">
                  <span className="info-label">駐車場:</span> {shop['駐車場']}
                </div>
              )}
              {shop['定休日'] && (
                <div className="info-item">
                  <span className="info-label">定休日:</span> {shop['定休日']}
                </div>
              )}
              {shop['住所'] && (
                <div className="info-item">
                  <span className="info-label">住所:</span> {shop['住所']}
                </div>
              )}
              {shop['創業年月'] && (
                <div className="info-item">
                  <span className="info-label">創業年月:</span> {shop['創業年月']}
                </div>
              )}
            </div>

            <div style={{margin: "24px 0"}}><Links data={shop} /></div>

            <div className="shop-images">
              {renderImages()}
            </div>

            <p style={{margin: "24px 0", wordBreak: "break-all"}}>{toBreakLine(content)}</p>

            <div
              ref={mapNode}
              style={{width: '100%', height: '200px', marginTop: "24px"}}
              data-lat={shop['緯度']}
              data-lng={shop['経度']}
              data-navigation-control="off"
            ></div>

            <p><a className="small" href={`http://maps.apple.com/?q=${shop['緯度']},${shop['経度']}`}>スポットまでの道順</a></p>

            <div className="action-buttons">
              {shop['TEL'] && (
                <a href={`tel:${shop['TEL']}`} className="action-button phone-button">
                  電話で予約する
                </a>
              )}
              {shop['公式サイト'] && (
                <a href={shop['公式サイト']} target="_blank" rel="noopener noreferrer" className="action-button web-button">
                  ネットで予約する
                </a>
              )}
            </div>
          </>
          :
          <></>
        }
      </div>
    </div>
  );
};

export default Content;