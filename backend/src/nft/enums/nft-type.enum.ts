/**
 * NFT 타입 (Prisma enum과 동일)
 */
export enum NftType {
  SBT = 'SBT', // Soul-Bound Token (User Pass 등)
  TIER = 'TIER', // 티어 NFT (Silver, Gold, Diamond)
  REWARD = 'REWARD', // 리워드 NFT
  CONNECTION = 'CONNECTION', // 연결 NFT
}

/**
 * NFT 티어 정의
 * 화면기획 My Page_5: 총 5단계 (Bronze, Silver, Gold, Platinum, Diamond)
 */
export enum NftTier {
  BRONZE = 1,
  SILVER = 2,
  GOLD = 3,
  PLATINUM = 4,
  DIAMOND = 5,
}
