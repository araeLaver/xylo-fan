# XYLO 스마트 컨트랙트 설계

> 작성일: 2025-01-07
> 대상: 블록체인 개발자
> 목적: ERC-3525 기반 SBT 및 NFT 스마트 컨트랙트 설계

---

## 📋 목차

1. [개요](#1-개요)
2. [XYLOUserPass (SBT) 컨트랙트](#2-xylouserpass-sbt-컨트랙트)
3. [XYLONFTCollection 컨트랙트](#3-xylonftcollection-컨트랙트)
4. [RWAVault 컨트랙트](#4-rwavault-컨트랙트)
5. [XLTToken 컨트랙트](#5-xlttoken-컨트랙트)
6. [배포 전략](#6-배포-전략)

---

## 1. 개요

### 1.1 네트워크

| 환경 | 네트워크 | Chain ID | 용도 |
|------|----------|----------|------|
| 개발 | Polygon Mumbai Testnet | 80001 | 로컬 테스트 |
| 스테이징 | Polygon Mumbai Testnet | 80001 | 통합 테스트 |
| 프로덕션 | Polygon Mainnet | 137 | 실제 운영 |

**선택 이유: Polygon**
- ✅ 낮은 가스비 ($0.01~$0.05)
- ✅ 빠른 블록 확정 시간 (2초)
- ✅ 이더리움 호환 (EVM)
- ✅ 활발한 생태계

### 1.2 사용 표준

| 컨트랙트 | 표준 | 용도 |
|----------|------|------|
| XYLOUserPass | ERC-3525 | Soul-Bound Token (비양도형) |
| XYLONFTCollection | ERC-721 | 일반 NFT (양도 가능) |
| RWAVault | Custom | RWA 수익 금고 |
| XLTToken | ERC-20 | 거버넌스/유틸리티 토큰 |

### 1.3 ERC-3525 표준 개요

**Semi-Fungible Token (SFT)**
```
ERC-721 (고유성) + ERC-20 (교환 가능성) = ERC-3525

특징:
- 각 토큰은 고유한 tokenId (ERC-721)
- 같은 슬롯(slot) 내에서 Value 전송 가능 (ERC-20)
- SLOT으로 카테고리 분류
```

**XYLO 적용**
```
SLOT-01: 콘텐츠 확산 포인트
SLOT-02: 신규 팬 유입 포인트
SLOT-03: 팬 협업 이벤트 포인트
SLOT-04: 실물 판매형 수익 포인트
SLOT-05: 브랜드 협찬형 포인트
SLOT-06: MVP Boost 포인트 (300P 고정)
```

---

## 2. XYLOUserPass (SBT) 컨트랙트

### 2.1 컨트랙트 구조

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@solvprotocol/erc-3525/contracts/ERC3525.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract XYLOUserPass is ERC3525, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    // 슬롯 상수
    uint256 public constant SLOT_CONTENT = 1;      // SLOT-01
    uint256 public constant SLOT_MGM = 2;          // SLOT-02
    uint256 public constant SLOT_EVENT = 3;        // SLOT-03
    uint256 public constant SLOT_PROFIT = 4;       // SLOT-04
    uint256 public constant SLOT_SPONSOR = 5;      // SLOT-05
    uint256 public constant SLOT_BOOST = 6;        // SLOT-06

    // 사용자당 1개 제한
    mapping(address => uint256) public userToTokenId;
    mapping(uint256 => address) public tokenIdToUser;

    // SBT 메타데이터
    struct SBTMetadata {
        uint256 totalPoints;
        uint256 contentPoints;
        uint256 mgmPoints;
        uint256 eventPoints;
        uint256 profitPoints;
        uint256 sponsorPoints;
        uint256 boostPoints;
        uint256 sbtValue; // SLOT-01~05 합계
        uint256 mintedAt;
        uint256 lastUpdatedAt;
    }

    mapping(uint256 => SBTMetadata) public tokenMetadata;

    // 이벤트
    event UserPassMinted(address indexed user, uint256 indexed tokenId);
    event PointsUpdated(uint256 indexed tokenId, uint256 slot, uint256 newValue);
    event SBTValueCalculated(uint256 indexed tokenId, uint256 sbtValue);

    constructor()
        ERC3525("XYLO User Pass", "XUSERPASS", 18)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
    }

    /**
     * @dev User Pass 발행 (1인당 1개만)
     */
    function mintUserPass(address user)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        returns (uint256)
    {
        require(userToTokenId[user] == 0, "Already minted");

        uint256 newTokenId = _mint(user, SLOT_CONTENT, 0);

        userToTokenId[user] = newTokenId;
        tokenIdToUser[newTokenId] = user;

        tokenMetadata[newTokenId] = SBTMetadata({
            totalPoints: 0,
            contentPoints: 0,
            mgmPoints: 0,
            eventPoints: 0,
            profitPoints: 0,
            sponsorPoints: 0,
            boostPoints: 0,
            sbtValue: 0,
            mintedAt: block.timestamp,
            lastUpdatedAt: block.timestamp
        });

        emit UserPassMinted(user, newTokenId);
        return newTokenId;
    }

    /**
     * @dev 슬롯별 포인트 업데이트
     */
    function updateSlotValue(
        uint256 tokenId,
        uint256 slot,
        uint256 newValue
    )
        external
        onlyRole(UPDATER_ROLE)
        whenNotPaused
    {
        require(_exists(tokenId), "Token does not exist");
        require(slot >= 1 && slot <= 6, "Invalid slot");

        SBTMetadata storage metadata = tokenMetadata[tokenId];

        if (slot == SLOT_CONTENT) {
            metadata.contentPoints = newValue;
        } else if (slot == SLOT_MGM) {
            metadata.mgmPoints = newValue;
        } else if (slot == SLOT_EVENT) {
            metadata.eventPoints = newValue;
        } else if (slot == SLOT_PROFIT) {
            metadata.profitPoints = newValue;
        } else if (slot == SLOT_SPONSOR) {
            metadata.sponsorPoints = newValue;
        } else if (slot == SLOT_BOOST) {
            metadata.boostPoints = newValue;
        }

        // SBT Value 계산 (SLOT-01~05)
        metadata.sbtValue =
            metadata.contentPoints +
            metadata.mgmPoints +
            metadata.eventPoints +
            metadata.profitPoints +
            metadata.sponsorPoints;

        // Total Points (SLOT-01~06)
        metadata.totalPoints = metadata.sbtValue + metadata.boostPoints;
        metadata.lastUpdatedAt = block.timestamp;

        emit PointsUpdated(tokenId, slot, newValue);
        emit SBTValueCalculated(tokenId, metadata.sbtValue);
    }

    /**
     * @dev 배치 업데이트 (가스 최적화)
     */
    function batchUpdateSlots(
        uint256 tokenId,
        uint256[] calldata slots,
        uint256[] calldata values
    )
        external
        onlyRole(UPDATER_ROLE)
        whenNotPaused
    {
        require(slots.length == values.length, "Length mismatch");

        for (uint256 i = 0; i < slots.length; i++) {
            updateSlotValue(tokenId, slots[i], values[i]);
        }
    }

    /**
     * @dev 전송 금지 (Soul-Bound)
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        revert("SBT: Transfer not allowed");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        revert("SBT: Transfer not allowed");
    }

    /**
     * @dev 토큰 URI (메타데이터)
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Token does not exist");

        SBTMetadata memory metadata = tokenMetadata[tokenId];
        address owner = tokenIdToUser[tokenId];

        // JSON 메타데이터 생성
        return string(abi.encodePacked(
            'data:application/json;utf8,',
            '{"name":"XYLO User Pass #', _toString(tokenId), '",',
            '"description":"Soul-Bound Token for XYLO × WITCHES fan activities",',
            '"image":"https://api.xylomvp.world/nft/userpass/', _toString(tokenId), '/image",',
            '"attributes":[',
                '{"trait_type":"Total Points","value":', _toString(metadata.totalPoints), '},',
                '{"trait_type":"Contents","value":', _toString(metadata.contentPoints), '},',
                '{"trait_type":"MGM","value":', _toString(metadata.mgmPoints), '},',
                '{"trait_type":"Event","value":', _toString(metadata.eventPoints), '},',
                '{"trait_type":"Profit","value":', _toString(metadata.profitPoints), '},',
                '{"trait_type":"Sponsor","value":', _toString(metadata.sponsorPoints), '},',
                '{"trait_type":"Boost","value":', _toString(metadata.boostPoints), '},',
                '{"trait_type":"SBT Value","value":', _toString(metadata.sbtValue), '},',
                '{"trait_type":"Owner","value":"', _toAsciiString(owner), '"}',
            ']}'
        ));
    }

    // Helper functions
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";

        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }

        return string(buffer);
    }

    function _toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = '0';
        s[1] = 'x';
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i+2] = _char(hi);
            s[2*i+3] = _char(lo);
        }
        return string(s);
    }

    function _char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    // Pausable
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // AccessControl override
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC3525, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### 2.2 주요 함수

| 함수 | 권한 | 설명 |
|------|------|------|
| `mintUserPass(address)` | MINTER_ROLE | User Pass 발행 (1인당 1개) |
| `updateSlotValue(tokenId, slot, value)` | UPDATER_ROLE | 슬롯별 포인트 업데이트 |
| `batchUpdateSlots(tokenId, slots[], values[])` | UPDATER_ROLE | 배치 업데이트 (가스 절약) |
| `transferFrom()` | - | **전송 금지** (revert) |
| `tokenURI(tokenId)` | Public | 메타데이터 조회 |

### 2.3 이벤트

```solidity
event UserPassMinted(address indexed user, uint256 indexed tokenId);
event PointsUpdated(uint256 indexed tokenId, uint256 slot, uint256 newValue);
event SBTValueCalculated(uint256 indexed tokenId, uint256 sbtValue);
```

---

## 3. XYLONFTCollection 컨트랙트

### 3.1 컨트랙트 구조

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract XYLONFTCollection is ERC721URIStorage, AccessControl, Pausable {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    Counters.Counter private _tokenIdCounter;

    // NFT 타입
    enum NFTType { TIER, REWARD, CONNECTION }

    struct NFTMetadata {
        NFTType nftType;
        uint8 tier;           // 1~5 (티어형만)
        bool isBurnable;      // 소각 가능 여부
        bool isBurned;        // 소각 여부
        string eventId;       // 이벤트 연동 (리워드형)
        uint256 mintedAt;
        uint256 burnedAt;
    }

    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(address => mapping(NFTType => uint256)) public userNFTCount;

    event NFTMinted(address indexed to, uint256 indexed tokenId, NFTType nftType);
    event NFTBurned(uint256 indexed tokenId, address indexed burner);
    event TierUpgraded(uint256 indexed oldTokenId, uint256 indexed newTokenId, uint8 newTier);

    constructor() ERC721("XYLO NFT Collection", "XNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
    }

    /**
     * @dev 티어형 NFT 발행
     */
    function mintTierNFT(address to, uint8 tier, string memory uri)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        returns (uint256)
    {
        require(tier >= 1 && tier <= 5, "Invalid tier");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        nftMetadata[tokenId] = NFTMetadata({
            nftType: NFTType.TIER,
            tier: tier,
            isBurnable: false,
            isBurned: false,
            eventId: "",
            mintedAt: block.timestamp,
            burnedAt: 0
        });

        userNFTCount[to][NFTType.TIER]++;

        emit NFTMinted(to, tokenId, NFTType.TIER);
        return tokenId;
    }

    /**
     * @dev 리워드형 NFT 발행
     */
    function mintRewardNFT(address to, string memory eventId, string memory uri)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        returns (uint256)
    {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        nftMetadata[tokenId] = NFTMetadata({
            nftType: NFTType.REWARD,
            tier: 0,
            isBurnable: false,
            isBurned: false,
            eventId: eventId,
            mintedAt: block.timestamp,
            burnedAt: 0
        });

        userNFTCount[to][NFTType.REWARD]++;

        emit NFTMinted(to, tokenId, NFTType.REWARD);
        return tokenId;
    }

    /**
     * @dev 커넥션형 NFT 발행 (소각 가능)
     */
    function mintConnectionNFT(address to, string memory uri)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        returns (uint256)
    {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        nftMetadata[tokenId] = NFTMetadata({
            nftType: NFTType.CONNECTION,
            tier: 0,
            isBurnable: true,
            isBurned: false,
            eventId: "",
            mintedAt: block.timestamp,
            burnedAt: 0
        });

        userNFTCount[to][NFTType.CONNECTION]++;

        emit NFTMinted(to, tokenId, NFTType.CONNECTION);
        return tokenId;
    }

    /**
     * @dev NFT 소각 (커넥션형만)
     */
    function burnNFT(uint256 tokenId)
        external
        whenNotPaused
    {
        require(_isApprovedOrOwner(msg.sender, tokenId) || hasRole(BURNER_ROLE, msg.sender),
                "Not authorized");

        NFTMetadata storage metadata = nftMetadata[tokenId];
        require(metadata.isBurnable, "Not burnable");
        require(!metadata.isBurned, "Already burned");

        metadata.isBurned = true;
        metadata.burnedAt = block.timestamp;

        address owner = ownerOf(tokenId);
        _burn(tokenId);

        emit NFTBurned(tokenId, owner);
    }

    /**
     * @dev 티어 업그레이드 (기존 NFT 소각 후 새로 발행)
     */
    function upgradeTier(uint256 oldTokenId, string memory newUri)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        returns (uint256)
    {
        require(_exists(oldTokenId), "Token does not exist");
        NFTMetadata memory oldMetadata = nftMetadata[oldTokenId];
        require(oldMetadata.nftType == NFTType.TIER, "Not a tier NFT");
        require(oldMetadata.tier < 5, "Already max tier");

        address owner = ownerOf(oldTokenId);
        uint8 newTier = oldMetadata.tier + 1;

        // 기존 NFT 소각
        _burn(oldTokenId);

        // 새 NFT 발행
        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(owner, newTokenId);
        _setTokenURI(newTokenId, newUri);

        nftMetadata[newTokenId] = NFTMetadata({
            nftType: NFTType.TIER,
            tier: newTier,
            isBurnable: false,
            isBurned: false,
            eventId: "",
            mintedAt: block.timestamp,
            burnedAt: 0
        });

        emit TierUpgraded(oldTokenId, newTokenId, newTier);
        return newTokenId;
    }

    // Pausable
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // AccessControl override
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### 3.2 주요 함수

| 함수 | 권한 | 설명 |
|------|------|------|
| `mintTierNFT(to, tier, uri)` | MINTER_ROLE | 티어형 NFT 발행 (1~5) |
| `mintRewardNFT(to, eventId, uri)` | MINTER_ROLE | 리워드형 NFT 발행 |
| `mintConnectionNFT(to, uri)` | MINTER_ROLE | 커넥션형 NFT 발행 (소각 가능) |
| `burnNFT(tokenId)` | Owner or BURNER_ROLE | NFT 소각 (커넥션형만) |
| `upgradeTier(oldTokenId, newUri)` | MINTER_ROLE | 티어 업그레이드 |

---

## 4. RWAVault 컨트랙트

### 4.1 컨트랙트 구조

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract RWAVault is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant CALCULATOR_ROLE = keccak256("CALCULATOR_ROLE");

    // Vault 상태
    uint256 public totalDeposited;
    uint256 public totalSBTValue;
    uint256 public mvpEndDate;
    bool public claimEnabled;

    // 사용자별 클레임 상태
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public claimAmount;

    event Deposited(address indexed depositor, uint256 amount, string source);
    event TotalSBTValueUpdated(uint256 newTotal);
    event ClaimEnabled(uint256 timestamp);
    event Claimed(address indexed user, uint256 amount);

    constructor(uint256 _mvpEndDate) {
        mvpEndDate = _mvpEndDate;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEPOSITOR_ROLE, msg.sender);
        _grantRole(CALCULATOR_ROLE, msg.sender);
    }

    /**
     * @dev Vault에 수익 예치
     */
    function deposit(string memory source)
        external
        payable
        onlyRole(DEPOSITOR_ROLE)
        whenNotPaused
    {
        require(msg.value > 0, "Amount must be greater than 0");
        require(block.timestamp < mvpEndDate, "MVP has ended");

        totalDeposited += msg.value;

        emit Deposited(msg.sender, msg.value, source);
    }

    /**
     * @dev 전체 SBT Value 업데이트 (클레임 비율 계산용)
     */
    function updateTotalSBTValue(uint256 newTotal)
        external
        onlyRole(CALCULATOR_ROLE)
    {
        totalSBTValue = newTotal;
        emit TotalSBTValueUpdated(newTotal);
    }

    /**
     * @dev 클레임 활성화 (MVP 종료 후)
     */
    function enableClaim()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(block.timestamp >= mvpEndDate, "MVP not ended yet");
        require(!claimEnabled, "Already enabled");

        claimEnabled = true;
        emit ClaimEnabled(block.timestamp);
    }

    /**
     * @dev 사용자별 클레임 가능 금액 계산
     */
    function calculateClaimAmount(uint256 userSBTValue)
        public
        view
        returns (uint256)
    {
        if (totalSBTValue == 0) return 0;

        // 클레임 금액 = (개인 SBT Value ÷ 전체 SBT Value) × Vault 가치
        return (totalDeposited * userSBTValue) / totalSBTValue;
    }

    /**
     * @dev XLT 클레임 (MVP 종료 후)
     */
    function claim(address user, uint256 userSBTValue)
        external
        onlyRole(CALCULATOR_ROLE)
        nonReentrant
        whenNotPaused
    {
        require(claimEnabled, "Claim not enabled");
        require(!hasClaimed[user], "Already claimed");
        require(userSBTValue > 0, "No SBT value");

        uint256 amount = calculateClaimAmount(userSBTValue);
        require(amount > 0, "Nothing to claim");
        require(address(this).balance >= amount, "Insufficient balance");

        hasClaimed[user] = true;
        claimAmount[user] = amount;

        (bool success, ) = user.call{value: amount}("");
        require(success, "Transfer failed");

        emit Claimed(user, amount);
    }

    // Admin functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(address payable to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        (bool success, ) = to.call{value: balance}("");
        require(success, "Transfer failed");
    }

    receive() external payable {
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value, "Direct");
    }
}
```

---

## 5. XLTToken 컨트랙트

### 5.1 컨트랙트 구조

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract XLTToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 10억 개

    constructor() ERC20("XYLO Token", "XLT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
```

---

## 6. 배포 전략

### 6.1 배포 순서

```
1. XLTToken 배포
   ↓
2. RWAVault 배포 (MVP 종료일 설정)
   ↓
3. XYLOUserPass 배포
   ↓
4. XYLONFTCollection 배포
   ↓
5. 권한 설정 (MINTER_ROLE, UPDATER_ROLE 등)
   ↓
6. 백엔드 서버에 컨트랙트 주소 등록
```

### 6.2 Hardhat 배포 스크립트

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 1. XLT Token
  const XLTToken = await hre.ethers.getContractFactory("XLTToken");
  const xltToken = await XLTToken.deploy();
  await xltToken.deployed();
  console.log("XLTToken deployed to:", xltToken.address);

  // 2. RWA Vault (MVP 종료일: 2025-06-30)
  const mvpEndDate = Math.floor(new Date("2025-06-30").getTime() / 1000);
  const RWAVault = await hre.ethers.getContractFactory("RWAVault");
  const rwaVault = await RWAVault.deploy(mvpEndDate);
  await rwaVault.deployed();
  console.log("RWAVault deployed to:", rwaVault.address);

  // 3. XYLO User Pass (SBT)
  const XYLOUserPass = await hre.ethers.getContractFactory("XYLOUserPass");
  const userPass = await XYLOUserPass.deploy();
  await userPass.deployed();
  console.log("XYLOUserPass deployed to:", userPass.address);

  // 4. XYLO NFT Collection
  const XYLONFTCollection = await hre.ethers.getContractFactory("XYLONFTCollection");
  const nftCollection = await XYLONFTCollection.deploy();
  await nftCollection.deployed();
  console.log("XYLONFTCollection deployed to:", nftCollection.address);

  // 권한 설정
  const MINTER_ROLE = await userPass.MINTER_ROLE();
  const UPDATER_ROLE = await userPass.UPDATER_ROLE();

  // 백엔드 서버 주소에 권한 부여 (실제 배포 시 교체)
  const BACKEND_ADDRESS = "0xYourBackendWalletAddress";

  await userPass.grantRole(MINTER_ROLE, BACKEND_ADDRESS);
  await userPass.grantRole(UPDATER_ROLE, BACKEND_ADDRESS);
  await nftCollection.grantRole(MINTER_ROLE, BACKEND_ADDRESS);

  console.log("Roles granted to backend:", BACKEND_ADDRESS);

  // 컨트랙트 주소 저장
  const addresses = {
    xltToken: xltToken.address,
    rwaVault: rwaVault.address,
    userPass: userPass.address,
    nftCollection: nftCollection.address,
    network: hre.network.name,
    deployer: deployer.address
  };

  console.log("\nDeployed Addresses:");
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 6.3 환경변수 (.env)

```bash
# Mumbai Testnet
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
MUMBAI_CHAIN_ID=80001

# Polygon Mainnet
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137

# Private Key (절대 노출 금지!)
PRIVATE_KEY=your_private_key_here

# Etherscan API (컨트랙트 검증용)
POLYGONSCAN_API_KEY=your_api_key_here

# Backend Wallet
BACKEND_WALLET_ADDRESS=0x...
```

---

**작성자**: Blockchain Team
**최종 업데이트**: 2025-01-07
**문서 버전**: 1.0
