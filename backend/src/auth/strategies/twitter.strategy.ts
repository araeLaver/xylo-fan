import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitter';
import { ConfigService } from '@nestjs/config';

export interface TwitterProfile {
  id: string;
  username: string;
  displayName: string;
  photos?: Array<{ value: string }>;
  emails?: Array<{ value: string }>;
}

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  constructor(private configService: ConfigService) {
    super({
      consumerKey: configService.get<string>('TWITTER_CONSUMER_KEY') || '',
      consumerSecret: configService.get<string>('TWITTER_CONSUMER_SECRET') || '',
      callbackURL: configService.get<string>('TWITTER_CALLBACK_URL') || '',
      includeEmail: true,
    });
  }

  async validate(
    token: string,
    tokenSecret: string,
    profile: TwitterProfile,
  ): Promise<any> {
    return {
      xId: profile.id,
      xHandle: profile.username,
      xDisplayName: profile.displayName,
      profileImageUrl: profile.photos?.[0]?.value,
      email: profile.emails?.[0]?.value,
      accessToken: token,
      accessTokenSecret: tokenSecret,
    };
  }
}
