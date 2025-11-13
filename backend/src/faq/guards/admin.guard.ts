import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * 관리자 권한 가드
 *
 * TODO: 실제 운영 환경에서는 다음과 같이 구현:
 * 1. users 테이블에 role 컬럼 추가 (enum: 'user', 'admin')
 * 2. JWT payload에 role 포함
 * 3. req.user.role === 'admin' 체크
 *
 * 현재는 임시로 특정 userId만 허용 (개발용)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // TODO: 실제 role 기반 체크로 교체
    // 현재는 환경변수로 관리자 ID 목록 관리 (임시)
    const adminIds = process.env.ADMIN_USER_IDS?.split(',') || [];

    if (adminIds.length === 0) {
      // 관리자 설정 없으면 모든 인증된 사용자 허용 (개발용)
      return true;
    }

    if (!adminIds.includes(user.userId)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
