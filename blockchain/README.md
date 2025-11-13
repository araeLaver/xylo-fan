# Blockchain

Solidity 스마트 컨트랙트. Polygon 네트워크 배포 예정.

## Tech Stack

- Solidity ^0.8.20
- Hardhat
- OpenZeppelin Contracts
- ethers.js
- Polygon Mumbai (Testnet) → Polygon Mainnet

## Directory

```
blockchain/
├── contracts/        # .sol 파일들
├── scripts/          # 배포 스크립트
├── test/             # 컨트랙트 테스트
└── deploy/
```

## Setup

```bash
cd blockchain

npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts

npx hardhat init
```

## NFT 설계

### 1. SBT (Soul-Bound Token) - User Pass NFT

- ERC-721 기반, 양도 불가
- 가입 시 1개 자동 발급
- `_transfer()` 함수 오버라이드로 전송 차단

```solidity
// contracts/XYLOUserPass.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract XYLOUserPass is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    function _transfer(address from, address to, uint256 tokenId) internal override {
        revert("SBT: Transfer not allowed");
    }

    function mint(address to, string memory tokenURI) public onlyOwner {
        uint256 tokenId = _tokenIdCounter++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }
}
```

### 2. Tier NFT

- Bronze (0P) → Silver (1000P) → Gold (5000P) → Diamond (10000P)
- 백엔드에서 포인트 체크 후 업그레이드 요청
- 이전 티어 burn → 새 티어 mint

### 3. Connection NFT (YouTube, Discord)

- YouTube 채널 인증 시 발급
- Discord 서버 가입 시 발급
- 이벤트 티켓으로 burn 가능

### 4. Reward NFT

- 이벤트 보상
- Limited Edition (한정 수량)
- Burn 가능

## 백엔드 연동

백엔드(`backend/src/nft/nft.service.ts`)에서 ethers.js로 민팅 요청:

```typescript
// Backend example
import { ethers } from 'ethers';

async mintUserPassNFT(userId: string, walletAddress: string) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const tx = await contract.mint(walletAddress, metadataURI);
  const receipt = await tx.wait();

  // DB 저장
  await this.prisma.user_nfts.create({
    data: {
      user_id: userId,
      nft_type: 'SBT',
      token_id: receipt.events[0].args.tokenId.toString(),
      contract_address: CONTRACT_ADDRESS,
      transaction_hash: receipt.transactionHash,
    },
  });
}
```

## 배포

```bash
# 컴파일
npx hardhat compile

# 테스트
npx hardhat test

# 로컬 노드
npx hardhat node

# Mumbai Testnet 배포
npx hardhat run scripts/deploy.js --network mumbai

# Mainnet 배포 (프로덕션)
npx hardhat run scripts/deploy.js --network polygon
```

## Environment Variables

`.env`:
```bash
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_deployer_private_key
POLYGONSCAN_API_KEY=your_api_key

BACKEND_API_URL=http://localhost:3000/api/v1
BACKEND_API_KEY=your_webhook_secret
```

## 백엔드와 동기화할 데이터

- Token ID (NFT 고유 ID)
- Metadata URI (IPFS 또는 API URL)
- Owner Address (`users.wallet_address`)
- Transaction Hash

백엔드 DB(`user_nfts` 테이블)에 저장하여 API 응답에 사용.

## TODO

- [ ] 컨트랙트 작성
- [ ] Mumbai Testnet 배포
- [ ] 백엔드 연동 테스트
- [ ] 가스비 최적화
- [ ] 감사(Audit)
- [ ] Mainnet 배포

## References

- OpenZeppelin: https://docs.openzeppelin.com/contracts/
- Hardhat: https://hardhat.org/docs
- Polygon: https://wiki.polygon.technology/
- ERC-721: https://eips.ethereum.org/EIPS/eip-721
