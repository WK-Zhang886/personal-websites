import type { Metadata } from "next";
import TierApp from "../components/TierApp";

export const metadata: Metadata = {
  title: "我的评分宇宙",
  description: "上传封面，自由拖拽，整理属于你的动漫、游戏和电影排行榜。",
};

export default function Home() {
  return <TierApp />;
}

