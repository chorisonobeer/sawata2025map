/* 
Full Path: /src/App/Shop.tsx
Last Modified: 2025-02-28 16:35:00
*/

import React, { useEffect, useRef } from "react";
import Links from "./Links";
import "./Shop.scss";
import { AiOutlineClose } from "react-icons/ai";
import { Link } from "react-router-dom";
import { makeDistanceLabelText } from "./distance-label";

type Props = {
  shop: Pwamap.ShopData;
  close: () => void;
};

const SWIPE_THRESHOLD = 80;

const Shop: React.FC<Props> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // タッチイベント用の座標
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // マウント時に .slide-in クラスを付与して右側からスライドイン
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current?.classList.add("slide-in");
      }, 10);
    }
  }, []);

  // タッチ開始イベント
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = null;
    touchStartX.current = e.touches[0].clientX;
  };

  // タッチ終了イベント
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipeGesture();
  };

  // スワイプ判定
  const handleSwipeGesture = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const deltaX = touchStartX.current - touchEndX.current;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      window.history.back();
    }
  };

  const handleClose = () => {
    props.close();
  };

  const distanceTipText =
    props.shop.distance !== undefined
      ? makeDistanceLabelText(props.shop.distance)
      : "距離不明";

  const category = props.shop["カテゴリ"] || "";
  const content = props.shop["紹介文"] || "";
  const imageUrl = props.shop["画像"];
  const spotName = props.shop["スポット名"] || "店名不明";

  const hours = props.shop["営業時間"] || "営業時間不明";
  const closed = props.shop["定休日"] || "定休日不明";
  const address = props.shop["住所"] || "住所不明";
  const tel = props.shop["TEL"];
  const site = props.shop["公式サイト"];

  return (
    <div
      className="shop-single"
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}  /* 追加: 水平タッチをカスタム処理させる */
    >
      <div className="head">
        <button onClick={handleClose}>
          <AiOutlineClose size="16px" color="#FFFFFF" /> 閉じる
        </button>
      </div>
      <div className="container">
        <h2 className="shop-title">{spotName}</h2>

        {/* カテゴリと距離を同じ行で並べる */}
        <div className="tag-box">
          {category && (
            <Link to={`/list?category=${category}`}>
              <span className="category">{category}</span>
            </Link>
          )}
          {distanceTipText && (
            <span className="distance">現在位置から {distanceTipText}</span>
          )}
        </div>

        {/* SNS リンクをカテゴリの下に配置 */}
        <Links data={props.shop} />

        <div className="shop-info-box">
          <div className="info-item">
            <span className="info-label">営業時間:</span> {hours}
          </div>
          <div className="info-item">
            <span className="info-label">定休日:</span> {closed}
          </div>
          <div className="info-item">
            <span className="info-label">住所:</span> {address}
          </div>
        </div>

        {imageUrl && (
          <div className="shop-images">
            <img src={imageUrl} alt={spotName} className="shop-image" />
          </div>
        )}

        {content && (
          <p style={{ margin: "24px 0", wordBreak: "break-all" }}>{content}</p>
        )}

        <div className="action-buttons">
          {tel && (
            <a href={`tel:${tel}`} className="action-button phone-button">
              電話で予約する
            </a>
          )}
          {site && (
            <a
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              className="action-button web-button"
            >
              ネットで予約する
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
