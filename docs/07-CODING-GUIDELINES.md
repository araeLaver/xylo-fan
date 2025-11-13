# XYLO 개발 컨벤션 및 코딩 가이드

> 작성일: 2025-01-07
> 대상: 전체 개발팀
> 목적: 코드 품질 및 일관성 유지

---

## 📋 목차

1. [일반 원칙](#1-일반-원칙)
2. [TypeScript 컨벤션](#2-typescript-컨벤션)
3. [NestJS 컨벤션](#3-nestjs-컨벤션)
4. [React 컨벤션](#4-react-컨벤션)
5. [Solidity 컨벤션](#5-solidity-컨벤션)
6. [Git 컨벤션](#6-git-컨벤션)
7. [테스트 가이드](#7-테스트-가이드)

---

## 1. 일반 원칙

### 1.1 코드 작성 철학

```
SOLID 원칙 준수
├── Single Responsibility: 하나의 클래스는 하나의 책임만
├── Open/Closed: 확장에는 열려있고, 수정에는 닫혀있게
├── Liskov Substitution: 하위 타입은 상위 타입을 대체 가능
├── Interface Segregation: 인터페이스를 작게 분리
└── Dependency Inversion: 구체적인 것이 아닌 추상에 의존
```

**DRY (Don't Repeat Yourself)**:
- 중복 코드 최소화
- 공통 로직은 유틸리티 함수로 추출
- 반복되는 타입은 interface/type으로 정의

**KISS (Keep It Simple, Stupid)**:
- 과도한 추상화 지양
- 명확하고 읽기 쉬운 코드 작성
- 복잡한 로직은 주석으로 설명

### 1.2 네이밍 컨벤션

| 항목 | 규칙 | 예시 |
|------|------|------|
| **변수/함수** | camelCase | `getUserPoints`, `totalAmount` |
| **클래스/인터페이스** | PascalCase | `UserService`, `IAuthConfig` |
| **상수** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| **파일명 (TS)** | kebab-case | `user.service.ts`, `auth.controller.ts` |
| **컴포넌트 파일 (React)** | PascalCase | `MyPage.tsx`, `LeaderboardTable.tsx` |
| **Private 멤버** | _ prefix | `_calculatePoints()`, `_cache` |

### 1.3 주석 규칙

```typescript
/**
 * 사용자 포인트를 계산합니다.
 *
 * @param userId - 사용자 ID
 * @param category - 포인트 카테고리 (CONTENT, MGM 등)
 * @param amount - 포인트 수량
 * @returns 업데이트된 총 포인트
 * @throws {NotFoundException} 사용자를 찾을 수 없는 경우
 *
 * @example
 * ```typescript
 * const totalPoints = await calculatePoints('uuid', 'CONTENT', 100);
 * ```
 */
async calculatePoints(
  userId: string,
  category: PointCategory,
  amount: number
): Promise<number> {
  // 구현...
}
```

**주석 작성 가이드**:
- ✅ **함수/클래스 설명**: JSDoc 형식 사용
- ✅ **복잡한 로직**: 단계별 설명
- ✅ **TODO**: `// TODO: 유튜브 크롤링 최적화` 형식
- ❌ **자명한 코드**: 불필요한 주석 금지

---

## 2. TypeScript 컨벤션

### 2.1 타입 정의

```typescript
// ❌ Bad: any 사용
function getUser(id: any): any {
  return fetch(`/users/${id}`);
}

// ✅ Good: 명확한 타입 정의
interface User {
  id: string;
  xHandle: string;
  email?: string;
}

async function getUser(id: string): Promise<User> {
  const response = await fetch(`/users/${id}`);
  return response.json();
}
```

### 2.2 Interface vs Type

```typescript
// ✅ Interface: 확장 가능한 객체 구조
interface BaseUser {
  id: string;
  name: string;
}

interface AdminUser extends BaseUser {
  role: 'ADMIN';
  permissions: string[];
}

// ✅ Type: Union, Intersection, Mapped Types
type PointCategory = 'CONTENT' | 'MGM' | 'EVENT' | 'PROFIT' | 'SPONSOR' | 'BOOST';

type Nullable<T> = T | null;

type ReadonlyUser = Readonly<User>;
```

### 2.3 Enum vs Union Type

```typescript
// ✅ Enum: 런타임에 값이 필요한 경우
export enum NFTType {
  SBT = 'SBT',
  TIER = 'TIER',
  REWARD = 'REWARD',
  CONNECTION = 'CONNECTION'
}

// ✅ Union Type: 타입 체크만 필요한 경우
export type SocialPlatform = 'X' | 'YOUTUBE' | 'INSTAGRAM' | 'DISCORD';
```

### 2.4 Optional Chaining & Nullish Coalescing

```typescript
// ✅ Optional Chaining
const subscriberCount = user?.youtubeChannel?.subscriberCount;

// ✅ Nullish Coalescing
const displayName = user.xDisplayName ?? user.xHandle ?? 'Anonymous';

// ❌ Bad: 중첩 if 문
if (user) {
  if (user.youtubeChannel) {
    const count = user.youtubeChannel.subscriberCount;
  }
}
```

### 2.5 비동기 처리

```typescript
// ✅ async/await (권장)
async function fetchUserPoints(userId: string): Promise<UserPoints> {
  try {
    const points = await this.prisma.userPoint.findUnique({
      where: { userId }
    });

    if (!points) {
      throw new NotFoundException('User points not found');
    }

    return points;
  } catch (error) {
    this.logger.error(`Failed to fetch points: ${error.message}`);
    throw error;
  }
}

// ❌ Promise chaining (지양)
function fetchUserPoints(userId: string): Promise<UserPoints> {
  return this.prisma.userPoint
    .findUnique({ where: { userId } })
    .then(points => {
      if (!points) throw new NotFoundException();
      return points;
    })
    .catch(error => {
      this.logger.error(error);
      throw error;
    });
}
```

---

## 3. NestJS 컨벤션

### 3.1 모듈 구조

```typescript
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({ name: 'points' })
  ],
  controllers: [PointsController],
  providers: [
    PointsService,
    PointsCalculator,
    PointsRepository
  ],
  exports: [PointsService] // 다른 모듈에서 사용 시
})
export class PointsModule {}
```

### 3.2 Controller 패턴

```typescript
@Controller('api/v1/points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('me')
  @ApiOperation({ summary: '내 포인트 조회' })
  @ApiResponse({ status: 200, type: UserPointsDto })
  async getMyPoints(@CurrentUser() user: User): Promise<UserPointsDto> {
    return this.pointsService.getUserPoints(user.id);
  }

  @Post('transactions')
  @Roles('ADMIN')
  @ApiOperation({ summary: '포인트 수동 지급 (관리자)' })
  async createTransaction(
    @Body() dto: CreatePointTransactionDto
  ): Promise<PointTransaction> {
    return this.pointsService.createTransaction(dto);
  }
}
```

### 3.3 Service 레이어

```typescript
@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async addPoints(
    userId: string,
    category: PointCategory,
    amount: number,
    reason?: string
  ): Promise<void> {
    // 1. Validation
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // 2. DB Transaction
    await this.prisma.$transaction(async (tx) => {
      // 포인트 거래 기록
      await tx.pointTransaction.create({
        data: { userId, category, amount, reason }
      });

      // 사용자 포인트 집계 (Trigger로 자동 처리됨)
    });

    // 3. Cache Invalidation
    await this.redis.del(`user:${userId}:points`);

    // 4. Event Emit
    this.eventEmitter.emit('points.added', {
      userId,
      category,
      amount
    });

    this.logger.log(`Added ${amount} ${category} points to user ${userId}`);
  }
}
```

### 3.4 DTO 패턴

```typescript
// DTOs with validation
export class CreatePointTransactionDto {
  @IsUUID()
  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @IsEnum(PointCategory)
  @ApiProperty({ enum: PointCategory })
  category: PointCategory;

  @IsInt()
  @Min(1)
  @Max(10000)
  @ApiProperty({ minimum: 1, maximum: 10000 })
  amount: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiProperty({ required: false, maxLength: 500 })
  reason?: string;
}
```

### 3.5 에러 처리

```typescript
// Custom Exception
export class InsufficientPointsException extends BadRequestException {
  constructor(required: number, current: number) {
    super({
      message: 'Insufficient points',
      required,
      current
    });
  }
}

// Exception Filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      success: false,
      error: {
        code: this.getErrorCode(exception),
        message: this.getErrorMessage(exception),
        timestamp: new Date().toISOString(),
        path: request.url
      }
    });
  }
}
```

---

## 4. React 컨벤션

### 4.1 컴포넌트 구조

```tsx
// ✅ Functional Component + TypeScript
interface LeaderboardTableProps {
  period: 'ALL' | '1D' | '1W' | '1M' | '3M';
  onUserClick?: (userId: string) => void;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  period,
  onUserClick
}) => {
  // 1. Hooks
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Effects
  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  // 3. Handlers
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await api.getLeaderboard({ period });
      setData(response.data.items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (userId: string) => {
    onUserClick?.(userId);
  };

  // 4. Render
  if (loading) return <Skeleton />;

  return (
    <Table>
      {/* 렌더링 로직 */}
    </Table>
  );
};
```

### 4.2 Hooks 사용

```typescript
// Custom Hook
export const useUserPoints = (userId: string) => {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const response = await api.getUserPoints(userId);
        setPoints(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, [userId]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchPoints();
  }, [userId]);

  return { points, loading, error, refetch };
};
```

### 4.3 State Management (Zustand)

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  login: (token, user) => set({
    accessToken: token,
    user,
    isAuthenticated: true
  }),

  logout: () => set({
    accessToken: null,
    user: null,
    isAuthenticated: false
  })
}));
```

---

## 5. Solidity 컨벤션

### 5.1 계약 구조

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title XYLOUserPass
 * @notice ERC-3525 기반 Soul-Bound Token
 * @dev 비양도형 토큰으로 전송 불가
 */
contract XYLOUserPass is ERC3525, AccessControl, Pausable {
    // 1. Type declarations
    struct SBTMetadata { ... }

    // 2. State variables
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    mapping(address => uint256) public userToTokenId;

    // 3. Events
    event UserPassMinted(address indexed user, uint256 indexed tokenId);

    // 4. Modifiers
    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "Not a minter");
        _;
    }

    // 5. Constructor
    constructor() ERC3525("XYLO User Pass", "XUSERPASS", 18) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // 6. External functions
    // 7. Public functions
    // 8. Internal functions
    // 9. Private functions
}
```

### 5.2 보안 패턴

```solidity
// ✅ Checks-Effects-Interactions 패턴
function withdrawFunds() external {
    // 1. Checks
    require(balance[msg.sender] > 0, "No balance");

    // 2. Effects
    uint256 amount = balance[msg.sender];
    balance[msg.sender] = 0;

    // 3. Interactions
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}

// ✅ Reentrancy Guard 사용
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function claim() external nonReentrant {
    // ...
}
```

---

## 6. Git 컨벤션

### 6.1 브랜치 전략 (Git Flow)

```
main (프로덕션)
  ↑
develop (개발)
  ↑
  ├── feature/login-oauth       # 새 기능
  ├── fix/points-calculation    # 버그 수정
  ├── refactor/user-service     # 리팩토링
  └── docs/api-documentation    # 문서 업데이트
```

### 6.2 Commit 메시지 규칙

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (로직 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 설정, 패키지 업데이트

**예시**:
```bash
feat(auth): add Twitter OAuth login

- Implemented passport-twitter strategy
- Added /auth/twitter/callback endpoint
- Created JWT token generation logic

Closes #42
```

### 6.3 Pull Request 규칙

**PR 제목**:
```
[Feature] 유튜브 채널 인증 기능 구현
[Fix] 포인트 계산 오류 수정
[Refactor] UserService 코드 정리
```

**PR Description Template**:
```markdown
## 변경 사항
- 유튜브 채널 인증 API 구현
- 인증코드 검증 로직 추가

## 테스트
- [x] 단위 테스트 작성
- [x] E2E 테스트 통과
- [x] 로컬 환경 테스트 완료

## 스크린샷
(UI 변경 시 추가)

## 체크리스트
- [x] ESLint 통과
- [x] 타입 에러 없음
- [x] 문서 업데이트
```

---

## 7. 테스트 가이드

### 7.1 단위 테스트 (Jest)

```typescript
describe('PointsService', () => {
  let service: PointsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PointsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get(PointsService);
    prisma = module.get(PrismaService);
  });

  describe('addPoints', () => {
    it('should add points successfully', async () => {
      // Arrange
      const userId = 'uuid';
      const category = PointCategory.CONTENT;
      const amount = 100;

      jest.spyOn(prisma.pointTransaction, 'create').mockResolvedValue({
        id: 'tx-id',
        userId,
        category,
        amount
      } as any);

      // Act
      await service.addPoints(userId, category, amount);

      // Assert
      expect(prisma.pointTransaction.create).toHaveBeenCalledWith({
        data: { userId, category, amount, reason: undefined }
      });
    });

    it('should throw error for negative amount', async () => {
      // Arrange & Act & Assert
      await expect(
        service.addPoints('uuid', PointCategory.CONTENT, -100)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

### 7.2 E2E 테스트

```typescript
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/twitter/callback (GET)', () => {
    return request(app.getHttpServer())
      .get('/auth/twitter/callback')
      .query({
        oauth_token: 'test_token',
        oauth_verifier: 'test_verifier'
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('user');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

**작성자**: Dev Team
**최종 업데이트**: 2025-01-07
**문서 버전**: 1.0
