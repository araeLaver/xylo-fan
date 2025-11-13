import { NftTier } from '../enums/nft-type.enum';

/**
 * User Pass (SBT-01) 메타데이터
 */
export const USER_PASS_METADATA = {
  name: 'XYLO User Pass',
  description: 'XYLO Fans community member badge. This is a Soul-Bound Token (SBT) that cannot be transferred.',
  imageUrl: 'https://cdn.xylo.world/nft/user-pass.png', // TODO: 실제 이미지 URL로 교체
  attributes: [
    { trait_type: 'Type', value: 'SBT' },
    { trait_type: 'Transferable', value: 'No' },
    { trait_type: 'Network', value: 'Polygon' },
  ],
};

/**
 * 티어 NFT 메타데이터 및 혜택
 *
 * 정책 기준 (SBT & NFT 정책 문서):
 * - Bronze: 20,000 ~ 100,000P (승격 보너스 1%)
 * - Silver: 100,001 ~ 500,000P (승격 보너스 2%)
 * - Gold: 500,001 ~ 1,000,000P (승격 보너스 3%)
 * - Platinum: 1,000,001 ~ 10,000,000P (승격 보너스 5%)
 * - Diamond: 10,000,001P ~ (승격 보너스 7%)
 */
export const TIER_NFT_CONFIG = {
  [NftTier.BRONZE]: {
    name: 'Bronze Tier NFT',
    description: 'Bronze tier membership NFT. Earn 100,000 points to upgrade to Silver.',
    imageUrl: 'https://cdn.xylo.world/nft/tier-bronze.png',
    pointsRequired: 20000,
    pointsMax: 100000,
    upgradeBonus: 0.01, // 1% 보너스
    boostMultiplier: 1.0,
    nextTier: NftTier.SILVER,
    nextTierPoints: 100001,
  },
  [NftTier.SILVER]: {
    name: 'Silver Tier NFT',
    description: 'Silver tier membership NFT with 2% upgrade bonus. Earn 500,000 total points to upgrade to Gold.',
    imageUrl: 'https://cdn.xylo.world/nft/tier-silver.png',
    pointsRequired: 100001,
    pointsMax: 500000,
    upgradeBonus: 0.02, // 2% 보너스
    boostMultiplier: 1.0,
    nextTier: NftTier.GOLD,
    nextTierPoints: 500001,
  },
  [NftTier.GOLD]: {
    name: 'Gold Tier NFT',
    description: 'Gold tier membership NFT with 3% upgrade bonus. Earn 1,000,000 total points to upgrade to Platinum.',
    imageUrl: 'https://cdn.xylo.world/nft/tier-gold.png',
    pointsRequired: 500001,
    pointsMax: 1000000,
    upgradeBonus: 0.03, // 3% 보너스
    boostMultiplier: 1.0,
    nextTier: NftTier.PLATINUM,
    nextTierPoints: 1000001,
  },
  [NftTier.PLATINUM]: {
    name: 'Platinum Tier NFT',
    description: 'Platinum tier membership NFT with 5% upgrade bonus. Earn 10,000,000 total points to upgrade to Diamond.',
    imageUrl: 'https://cdn.xylo.world/nft/tier-platinum.png',
    pointsRequired: 1000001,
    pointsMax: 10000000,
    upgradeBonus: 0.05, // 5% 보너스
    boostMultiplier: 1.0,
    nextTier: NftTier.DIAMOND,
    nextTierPoints: 10000001,
  },
  [NftTier.DIAMOND]: {
    name: 'Diamond Tier NFT',
    description: 'Diamond tier membership NFT with 7% upgrade bonus. The highest tier!',
    imageUrl: 'https://cdn.xylo.world/nft/tier-diamond.png',
    pointsRequired: 10000001,
    pointsMax: null,
    upgradeBonus: 0.07, // 7% 보너스
    boostMultiplier: 1.0,
    nextTier: null,
    nextTierPoints: null,
  },
};

/**
 * 컨트랙트 주소 (Polygon Mumbai Testnet)
 * TODO: Mainnet 배포 시 교체
 */
export const NFT_CONTRACT_ADDRESSES = {
  USER_PASS: '0x0000000000000000000000000000000000000000', // TODO: 실제 컨트랙트 주소
  TIER: '0x0000000000000000000000000000000000000000', // TODO: 실제 컨트랙트 주소
  CHAIN_ID: 80001, // Polygon Mumbai Testnet
};
