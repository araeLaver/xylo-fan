import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Res,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { TestService } from './test.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(private readonly testService: TestService) {}

  /**
   * 테스트 페이지 HTML 제공
   * GET /api/v1/test
   */
  @Get()
  getTestPage(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube Shorts 테스트</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: white;
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .search-box {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      margin-bottom: 30px;
    }

    .input-group {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    input {
      flex: 1;
      padding: 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
    }

    button {
      padding: 15px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    button:active {
      transform: translateY(0);
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      border-left: 4px solid #2196f3;
    }

    .results {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      margin-top: 20px;
    }

    .channel-info {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 10px;
      margin-bottom: 20px;
    }

    .channel-info img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
    }

    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
    }

    .tab {
      padding: 10px 20px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      font-size: 16px;
      font-weight: 500;
      color: #666;
      transition: all 0.3s;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .video-card {
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
      background: white;
    }

    .video-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }

    .video-card.selected {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }

    .video-card img {
      width: 100%;
      height: 180px;
      object-fit: cover;
    }

    .video-info {
      padding: 15px;
    }

    .video-title {
      font-weight: 600;
      margin-bottom: 10px;
      color: #333;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .video-meta {
      display: flex;
      gap: 15px;
      font-size: 13px;
      color: #666;
      margin-bottom: 10px;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 5px;
    }

    .badge.shorts {
      background: #ff6b6b;
      color: white;
    }

    .badge.eligible {
      background: #51cf66;
      color: white;
    }

    .badge.public {
      background: #4dabf7;
      color: white;
    }

    .save-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }

    .error {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }

    .summary-card h3 {
      font-size: 2rem;
      margin-bottom: 5px;
    }

    .summary-card p {
      font-size: 0.9rem;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎬 YouTube Shorts 테스트 도구</h1>

    <!-- 채널 인증 섹션 -->
    <div class="search-box" style="background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%); border: 2px solid #667eea;">
      <h2 style="margin-bottom: 20px; color: #667eea;">🔐 1단계: 채널 인증</h2>
      <div class="info">
        <strong>💡 인증 절차:</strong>
        <ol style="margin-top: 10px; margin-left: 20px;">
          <li>채널 URL 또는 ID 입력 (예: https://youtube.com/@username 또는 UCxxxxxxxxxx)</li>
          <li>"인증코드 요청" 버튼 클릭하여 인증 코드 발급</li>
          <li>YouTube 채널 설명(Description)에 인증 코드 추가</li>
          <li>"인증 확인" 버튼으로 인증 완료</li>
        </ol>
      </div>

      <div class="input-group">
        <input
          type="text"
          id="channelUrlOrId"
          placeholder="YouTube 채널 URL 또는 ID"
          value=""
        />
        <button onclick="registerChannel()" id="registerBtn">🔑 인증코드 요청</button>
      </div>

      <div id="verificationResult"></div>

      <!-- 인증 완료된 채널 목록 -->
      <div style="margin-top: 30px; padding-top: 30px; border-top: 2px dashed #667eea;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; color: #667eea;">📋 내 인증 채널</h3>
          <button onclick="loadMyChannels()" id="loadMyChannelsBtn" style="padding: 8px 16px; font-size: 14px;">
            🔄 새로고침
          </button>
        </div>
        <div id="myChannelsList"></div>
      </div>
    </div>

    <!-- 자동 저장 섹션 -->
    <div class="search-box" style="background: linear-gradient(135deg, #51cf6622 0%, #5eea9a22 100%); border: 2px solid #51cf66;">
      <h2 style="margin-bottom: 20px; color: #51cf66;">⚡ 2단계: 자동 저장</h2>
      <div class="info">
        <strong>💡 자동 저장 기능:</strong>
        <p style="margin-top: 10px;">인증된 채널에서 특정 태그가 포함된 쇼츠를 자동으로 검색하고 DB에 저장합니다.</p>
      </div>

      <div class="input-group">
        <select id="verifiedChannelSelect" style="flex: 1; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; background: white;">
          <option value="">먼저 인증된 채널을 선택하세요</option>
        </select>
        <button onclick="loadVerifiedChannels()" id="loadChannelsBtn">🔄 채널 목록 새로고침</button>
      </div>

      <div class="input-group" style="margin-top: 10px;">
        <input
          type="text"
          id="tagsInput"
          placeholder="태그 입력 (쉼표로 구분, 예: #WITCHES, #XYLO)"
          value="#WITCHES, #XYLO"
          style="flex: 2;"
        />
        <input
          type="number"
          id="maxResultsInput"
          placeholder="최대 결과 수"
          value="50"
          style="flex: 1;"
        />
        <button onclick="autoSaveShorts()" id="autoSaveBtn">💾 자동 저장 실행</button>
      </div>

      <div id="autoSaveResult"></div>
    </div>

    <!-- 수동 검색 및 저장 섹션 -->
    <div class="search-box">
      <h2 style="margin-bottom: 20px;">🔍 3단계: 수동 검색 및 저장 (선택사항)</h2>
      <div class="info">
        <strong>💡 사용 방법:</strong>
        <ol style="margin-top: 10px; margin-left: 20px;">
          <li>YouTube 채널 ID를 입력하세요 (예: UCxxxxxxxxxxxxxxxxxx)</li>
          <li>"쇼츠 검색" 버튼을 클릭하여 최근 30일 영상을 조회합니다</li>
          <li>저장할 영상을 선택하고 "선택한 영상 저장" 버튼을 클릭합니다</li>
          <li>"저장된 쇼츠 보기" 버튼으로 DB에 저장된 쇼츠를 확인할 수 있습니다</li>
        </ol>
      </div>

      <div class="input-group">
        <input
          type="text"
          id="channelId"
          placeholder="YouTube 채널 ID (예: UCxxxxxxxxxxxxxxxxxx)"
          value=""
        />
        <button onclick="searchShorts()" id="searchBtn">🔍 쇼츠 검색</button>
        <button onclick="getSavedShorts()" id="savedBtn">📦 저장된 쇼츠 보기</button>
      </div>
    </div>

    <div id="results"></div>
  </div>

  <script>
    let selectedVideos = new Set();
    let currentData = null;

    async function searchShorts() {
      const channelId = document.getElementById('channelId').value.trim();
      if (!channelId) {
        alert('채널 ID를 입력해주세요');
        return;
      }

      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = '<div class="results"><div class="loading"><div class="spinner"></div><p>쇼츠를 검색하고 있습니다...</p></div></div>';

      try {
        const response = await fetch(\`/api/v1/test/search-shorts?channelId=\${channelId}&maxResults=50\`);
        const data = await response.json();
        currentData = data;
        selectedVideos.clear();

        displayResults(data);
      } catch (error) {
        resultsDiv.innerHTML = \`<div class="results"><div class="error">❌ 오류 발생: \${error.message}</div></div>\`;
      }
    }

    async function getSavedShorts() {
      const channelId = document.getElementById('channelId').value.trim();
      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = '<div class="results"><div class="loading"><div class="spinner"></div><p>저장된 쇼츠를 불러오고 있습니다...</p></div></div>';

      try {
        const url = channelId
          ? \`/api/v1/test/saved-shorts?channelId=\${channelId}\`
          : '/api/v1/test/saved-shorts';

        const response = await fetch(url);
        const data = await response.json();

        displaySavedShorts(data);
      } catch (error) {
        resultsDiv.innerHTML = \`<div class="results"><div class="error">❌ 오류 발생: \${error.message}</div></div>\`;
      }
    }

    function displayResults(data) {
      const { channel, shorts, videos, summary } = data;

      let html = '<div class="results">';

      // 채널 정보
      html += \`
        <div class="channel-info">
          <img src="\${channel.thumbnailUrl}" alt="\${channel.title}" />
          <div>
            <h2>\${channel.title}</h2>
            <p>구독자: \${parseInt(channel.subscriberCount).toLocaleString()}명</p>
            <p>채널 ID: \${channel.id}</p>
          </div>
        </div>
      \`;

      // 요약 정보
      html += \`
        <div class="summary">
          <div class="summary-card">
            <h3>\${summary.totalVideos}</h3>
            <p>전체 영상</p>
          </div>
          <div class="summary-card">
            <h3>\${summary.shortsCount}</h3>
            <p>쇼츠 (≤60초)</p>
          </div>
          <div class="summary-card">
            <h3>\${summary.regularVideosCount}</h3>
            <p>일반 영상</p>
          </div>
          <div class="summary-card">
            <h3>\${summary.eligibleCount}</h3>
            <p>적격 영상</p>
          </div>
        </div>
      \`;

      // 탭
      html += \`
        <div class="tabs">
          <button class="tab active" onclick="showTab('shorts')">쇼츠 (\${shorts.length})</button>
          <button class="tab" onclick="showTab('videos')">일반 영상 (\${videos.length})</button>
        </div>
      \`;

      // 쇼츠 그리드
      html += '<div id="shortsTab" class="video-grid">';
      shorts.forEach(video => {
        html += createVideoCard(video, true);
      });
      html += '</div>';

      // 일반 영상 그리드
      html += '<div id="videosTab" class="video-grid" style="display:none;">';
      videos.forEach(video => {
        html += createVideoCard(video, false);
      });
      html += '</div>';

      // 저장 버튼
      html += \`
        <div class="save-section">
          <p style="margin-bottom: 15px;">선택된 영상: <strong id="selectedCount">0</strong>개</p>
          <button onclick="saveSelected()" id="saveBtn" disabled>💾 선택한 영상 저장</button>
          <div id="saveResult"></div>
        </div>
      \`;

      html += '</div>';
      document.getElementById('results').innerHTML = html;
    }

    function createVideoCard(video, isShorts) {
      const tags = video.tags.join(', ');
      return \`
        <div class="video-card" onclick="toggleSelect('\${video.videoId}', event)">
          <img src="\${video.thumbnailUrl}" alt="\${video.title}" />
          <div class="video-info">
            <div class="video-title">\${video.title}</div>
            <div class="video-meta">
              <span>👁️ \${video.viewCount.toLocaleString()}</span>
              <span>👍 \${video.likeCount.toLocaleString()}</span>
              <span>💬 \${video.commentCount.toLocaleString()}</span>
            </div>
            <div>
              \${isShorts ? '<span class="badge shorts">Shorts</span>' : ''}
              \${video.isEligible ? '<span class="badge eligible">#태그 ✓</span>' : ''}
              <span class="badge public">\${video.privacyStatus}</span>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #999;">
              \${video.duration}초 | \${new Date(video.publishedAt).toLocaleDateString()}
            </div>
            \${tags ? \`<div style="margin-top: 8px; font-size: 11px; color: #666;">\${tags}</div>\` : ''}
          </div>
        </div>
      \`;
    }

    function displaySavedShorts(data) {
      const { total, shorts } = data;

      let html = '<div class="results">';
      html += \`<h2>📦 저장된 쇼츠 (\${total}개)</h2>\`;

      if (shorts.length === 0) {
        html += '<p style="text-align: center; padding: 40px; color: #999;">저장된 쇼츠가 없습니다.</p>';
      } else {
        html += '<div class="video-grid">';
        shorts.forEach(short => {
          html += \`
            <div class="video-card" onclick="window.open('\${short.url}', '_blank')">
              <img src="\${short.thumbnailUrl}" alt="\${short.title}" />
              <div class="video-info">
                <div class="video-title">\${short.title}</div>
                <div class="video-meta">
                  <span>👁️ \${(short.viewCount || 0).toLocaleString()}</span>
                  <span>👍 \${(short.likeCount || 0).toLocaleString()}</span>
                  <span>💬 \${(short.commentCount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span class="badge shorts">Shorts</span>
                  \${short.isEligible ? '<span class="badge eligible">#태그 ✓</span>' : ''}
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #666;">
                  <strong>\${short.channel.title}</strong><br/>
                  \${new Date(short.publishedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          \`;
        });
        html += '</div>';
      }

      html += '</div>';
      document.getElementById('results').innerHTML = html;
    }

    function showTab(tab) {
      document.getElementById('shortsTab').style.display = tab === 'shorts' ? 'grid' : 'none';
      document.getElementById('videosTab').style.display = tab === 'videos' ? 'grid' : 'none';

      document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
    }

    function toggleSelect(videoId, event) {
      if (selectedVideos.has(videoId)) {
        selectedVideos.delete(videoId);
      } else {
        selectedVideos.add(videoId);
      }

      event.currentTarget.classList.toggle('selected');
      document.getElementById('selectedCount').textContent = selectedVideos.size;
      document.getElementById('saveBtn').disabled = selectedVideos.size === 0;
    }

    async function saveSelected() {
      const channelId = document.getElementById('channelId').value.trim();
      if (!channelId || selectedVideos.size === 0) return;

      const saveBtn = document.getElementById('saveBtn');
      saveBtn.disabled = true;
      saveBtn.textContent = '💾 저장 중...';

      try {
        const response = await fetch('/api/v1/test/save-shorts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            videoIds: Array.from(selectedVideos)
          })
        });

        const result = await response.json();

        document.getElementById('saveResult').innerHTML = \`
          <div class="success">
            ✅성공적으로 저장되었습니다!<br/>
            채널: \${result.channelTitle}<br/>
            저장된 영상: \${result.savedCount}개
          </div>
        \`;

        // 선택 초기화
        selectedVideos.clear();
        document.querySelectorAll('.video-card.selected').forEach(card => {
          card.classList.remove('selected');
        });
        document.getElementById('selectedCount').textContent = '0';

      } catch (error) {
        document.getElementById('saveResult').innerHTML = \`
          <div class="error">❌ 저장 실패: \${error.message}</div>
        \`;
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 선택한 영상 저장';
      }
    }

    // ==================== 채널 인증 관련 함수 ====================
    let currentChannelId = '';

    // 페이지 로드 시 내 채널 목록 불러오기
    window.addEventListener('DOMContentLoaded', () => {
      loadMyChannels();
    });

    async function loadMyChannels() {
      const loadBtn = document.getElementById('loadMyChannelsBtn');
      loadBtn.disabled = true;
      loadBtn.textContent = '🔄 로딩 중...';

      try {
        const response = await fetch('/api/v1/test/verified-channels');
        const result = await response.json();

        if (result.channels && result.channels.length > 0) {
          const channelCards = result.channels.map(channel => \`
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 15px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; color: #667eea;">✅ \${channel.title}</h4>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  채널 ID: \${channel.channelId}<br/>
                  구독자: \${parseInt(channel.subscriberCount || 0).toLocaleString()}명 |
                  동영상: \${parseInt(channel.videoCount || 0).toLocaleString()}개
                </p>
              </div>
              <button
                onclick="deleteChannelFromStep1('\${channel.channelId}', '\${channel.title}')"
                style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap; margin-left: 15px;"
                onmouseover="this.style.background='#c82333'"
                onmouseout="this.style.background='#dc3545'"
              >
                🗑️ 삭제
              </button>
            </div>
          \`).join('');

          document.getElementById('myChannelsList').innerHTML = \`
            <div style="margin-top: 10px;">
              <p style="color: #667eea; font-weight: bold; margin-bottom: 10px;">총 \${result.channels.length}개의 채널</p>
              \${channelCards}
            </div>
          \`;
        } else {
          document.getElementById('myChannelsList').innerHTML = \`
            <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; color: #666;">
              <p style="margin: 0;">아직 인증된 채널이 없습니다.</p>
              <p style="margin: 5px 0 0 0; font-size: 14px;">위에서 채널 URL을 입력하고 인증코드를 요청하세요.</p>
            </div>
          \`;
        }
      } catch (error) {
        document.getElementById('myChannelsList').innerHTML = \`
          <div class="error" style="margin-top: 10px;">❌ 오류 발생: \${error.message}</div>
        \`;
      } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = '🔄 새로고침';
      }
    }

    async function deleteChannelFromStep1(channelId, channelTitle) {
      if (!confirm(\`정말로 "\${channelTitle}" 채널을 삭제하시겠습니까?\\n\\n⚠️ DB에서만 삭제되며, 나중에 다시 인증할 수 있습니다.\`)) {
        return;
      }

      try {
        const response = await fetch(\`/api/v1/test/delete-channel/\${channelId}?channelId=\${channelId}\`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
          alert(\`✅ "\${channelTitle}" 채널이 삭제되었습니다.\\n다시 등록하려면 "인증코드 요청"을 사용하세요.\`);
          // 내 채널 목록 새로고침
          loadMyChannels();
          // 2단계 채널 목록도 새로고침
          if (typeof loadVerifiedChannels === 'function') {
            loadVerifiedChannels();
          }
        } else {
          throw new Error(result.error || '채널 삭제 실패');
        }
      } catch (error) {
        alert(\`❌ 채널 삭제 중 오류가 발생했습니다: \${error.message}\`);
      }
    }

    async function registerChannel() {
      const channelUrlOrId = document.getElementById('channelUrlOrId').value.trim();
      if (!channelUrlOrId) {
        alert('채널 URL 또는 ID를 입력해주세요');
        return;
      }

      const registerBtn = document.getElementById('registerBtn');
      registerBtn.disabled = true;
      registerBtn.textContent = '🔑 요청 중...';

      try {
        const response = await fetch('/api/v1/test/register-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelUrlOrId })
        });

        const result = await response.json();

        if (result.success) {
          currentChannelId = result.channel.channelId;

          // 이미 인증 완료된 채널
          if (result.status === 'already_verified') {
            document.getElementById('verificationResult').innerHTML = \`
              <div style="margin-top: 15px; background: #d1ecf1; border: 2px solid #0c5460; border-radius: 8px; padding: 20px;">
                <h3 style="margin-bottom: 15px; color: #0c5460;">✅ 이미 인증 완료</h3>
                <p><strong>채널명:</strong> \${result.channel.title}</p>
                <p><strong>채널 ID:</strong> \${result.channel.channelId}</p>
                <p style="margin-top: 15px; color: #0c5460;">이 채널은 이미 인증이 완료되었습니다. 바로 사용하실 수 있습니다.</p>
              </div>
            \`;
            return;
          }

          // 인증 대기 중 (기존 코드 재사용)
          if (result.status === 'verification_pending') {
            const instructionsHtml = result.instructions ? result.instructions.map(inst => \`<li>\${inst}</li>\`).join('') : '';
            document.getElementById('verificationResult').innerHTML = \`
              <div style="margin-top: 15px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px;">
                <h3 style="margin-bottom: 15px; color: #856404;">⏳ 인증 대기 중</h3>
                <p><strong>채널명:</strong> \${result.channel.title}</p>
                <p><strong>채널 ID:</strong> \${result.channel.channelId}</p>
                <div style="background: #fff; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p style="margin: 0; color: #856404; font-weight: bold;">ℹ️ \${result.message}</p>
                </div>
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #ffc107;" />
                <h4 style="margin-bottom: 10px; color: #856404;">📋 인증 코드:</h4>
                <div style="background: white; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; text-align: center; margin: 10px 0;">
                  \${result.channel.verificationCode}
                </div>
                <h4 style="margin: 15px 0 10px 0; color: #856404;">📝 인증 방법:</h4>
                <ol style="margin-left: 20px; line-height: 1.8; color: #856404;">
                  \${instructionsHtml}
                </ol>
                <button onclick="verifyChannel('\${currentChannelId}')" style="margin-top: 15px; width: 100%;">
                  🔍 인증 확인
                </button>
              </div>
            \`;
            return;
          }

          // 새로 인증 코드 발급
          const instructionsHtml = result.instructions ? result.instructions.map(inst => \`<li>\${inst}</li>\`).join('') : '';
          document.getElementById('verificationResult').innerHTML = \`
            <div class="success" style="margin-top: 15px;">
              <h3 style="margin-bottom: 10px;">✅ 인증코드 발급</h3>
              <p><strong>채널명:</strong> \${result.channel.title}</p>
              <p><strong>채널 ID:</strong> \${result.channel.channelId}</p>
              <hr style="margin: 15px 0; border: none; border-top: 1px solid #c3e6cb;" />
              <h4 style="margin-bottom: 10px; color: #155724;">📋 인증 코드:</h4>
              <div style="background: white; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; text-align: center; margin: 10px 0;">
                \${result.channel.verificationCode}
              </div>
              <h4 style="margin: 15px 0 10px 0; color: #155724;">📝 인증 방법:</h4>
              <ol style="margin-left: 20px; line-height: 1.8;">
                \${instructionsHtml}
              </ol>
              <button onclick="verifyChannel('\${currentChannelId}')" style="margin-top: 15px; width: 100%;">
                🔍 인증 확인
              </button>
            </div>
          \`;
        } else {
          throw new Error(result.error || '인증코드 요청 실패');
        }
      } catch (error) {
        document.getElementById('verificationResult').innerHTML = \`
          <div class="error" style="margin-top: 15px;">❌ 오류 발생: \${error.message}</div>
        \`;
      } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = '🔑 인증코드 요청';
      }
    }

    async function verifyChannel(channelId) {
      if (!channelId) {
        alert('채널 ID가 없습니다. 먼저 채널을 등록해주세요.');
        return;
      }

      try {
        const response = await fetch('/api/v1/test/verify-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId })
        });

        const result = await response.json();

        if (result.success) {
          if (result.alreadyVerified) {
            document.getElementById('verificationResult').innerHTML = \`
              <div class="info" style="margin-top: 15px; background: #d1ecf1; border-left-color: #0c5460;">
                ℹ️ 이 채널은 이미 인증되었습니다.
              </div>
            \`;
          } else if (result.verified) {
            document.getElementById('verificationResult').innerHTML = \`
              <div class="success" style="margin-top: 15px;">
                <h3>🎉 채널 인증 완료!</h3>
                <p>채널이 성공적으로 인증되었습니다.</p>
                <p>이제 자동 저장 기능을 사용할 수 있습니다.</p>
              </div>
            \`;
            // 1단계 내 채널 목록 새로고침
            loadMyChannels();
            // 2단계 인증된 채널 목록 새로고침
            loadVerifiedChannels();
          } else {
            // 인증 실패 - 인증 대기 상태로 표시
            const instructionsHtml = result.instructions
              ? result.instructions.map(inst => \`<li>\${inst}</li>\`).join('')
              : '';

            document.getElementById('verificationResult').innerHTML = \`
              <div style="margin-top: 15px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px;">
                <h3 style="margin-bottom: 15px; color: #856404;">⏳ 인증 대기</h3>

                <div style="background: #fff; border-left: 4px solid #dc3545; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                  <h4 style="margin: 0 0 10px 0; color: #dc3545;">❌ 인증 실패 사유:</h4>
                  <p style="margin: 0; color: #721c24; line-height: 1.6;">\${result.message || '채널 설명에서 인증 코드를 찾을 수 없습니다.'}</p>
                </div>

                <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                  <h4 style="margin: 0 0 10px 0; color: #0066cc;">📋 발급된 인증 코드:</h4>
                  <div style="background: white; padding: 12px; border-radius: 5px; font-family: monospace; font-size: 16px; font-weight: bold; color: #667eea; text-align: center;">
                    \${result.expectedCode || ''}
                  </div>
                </div>

                \${instructionsHtml ? \`
                  <div style="background: #fff; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #856404;">📝 인증 방법:</h4>
                    <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #856404;">
                      \${instructionsHtml}
                    </ol>
                  </div>
                \` : ''}

                <button onclick="verifyChannel('\${channelId}')" style="width: 100%; margin-top: 10px;">
                  🔍 다시 인증 확인
                </button>
              </div>
            \`;
          }
        } else {
          throw new Error(result.error || '인증 확인 실패');
        }
      } catch (error) {
        document.getElementById('verificationResult').innerHTML = \`
          <div class="error" style="margin-top: 15px;">❌ 오류 발생: \${error.message}</div>
        \`;
      }
    }

    // ==================== 인증된 채널 관련 함수 ====================
    async function loadVerifiedChannels() {
      const loadBtn = document.getElementById('loadChannelsBtn');
      loadBtn.disabled = true;
      loadBtn.textContent = '🔄 로딩 중...';

      try {
        const response = await fetch('/api/v1/test/verified-channels');
        const result = await response.json();

        const selectElement = document.getElementById('verifiedChannelSelect');
        selectElement.innerHTML = '<option value="">채널을 선택하세요</option>';

        if (result.success && result.channels.length > 0) {
          result.channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.channelId;
            option.textContent = \`\${channel.title} (구독자: \${parseInt(channel.subscriberCount || 0).toLocaleString()}명)\`;
            selectElement.appendChild(option);
          });

          // 채널 카드 목록 생성
          const channelCards = result.channels.map(channel => \`
            <div style="background: white; border: 2px solid #28a745; border-radius: 8px; padding: 15px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; color: #155724;">📺 \${channel.title}</h4>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  채널 ID: \${channel.channelId}<br/>
                  구독자: \${parseInt(channel.subscriberCount || 0).toLocaleString()}명 |
                  동영상: \${parseInt(channel.videoCount || 0).toLocaleString()}개
                </p>
              </div>
              <button
                onclick="deleteChannel('\${channel.channelId}', '\${channel.title}')"
                style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap; margin-left: 15px;"
                onmouseover="this.style.background='#c82333'"
                onmouseout="this.style.background='#dc3545'"
              >
                🗑️ 삭제
              </button>
            </div>
          \`).join('');

          document.getElementById('autoSaveResult').innerHTML = \`
            <div class="success" style="margin-top: 15px;">
              <h4 style="margin-bottom: 15px;">✅ \${result.channels.length}개의 인증된 채널</h4>
              \${channelCards}
            </div>
          \`;
        } else {
          document.getElementById('autoSaveResult').innerHTML = \`
            <div class="info" style="margin-top: 15px; background: #fff3cd; border-left-color: #856404; color: #856404;">
              ℹ️ 인증된 채널이 없습니다. 먼저 채널을 등록하고 인증해주세요.
            </div>
          \`;
        }
      } catch (error) {
        document.getElementById('autoSaveResult').innerHTML = \`
          <div class="error" style="margin-top: 15px;">❌ 오류 발생: \${error.message}</div>
        \`;
      } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = '🔄 채널 목록 새로고침';
      }
    }

    async function deleteChannel(channelId, channelTitle) {
      if (!confirm(\`정말로 "\${channelTitle}" 채널을 삭제하시겠습니까?\\n\\n⚠️ DB에서만 삭제되며, 나중에 다시 인증할 수 있습니다.\`)) {
        return;
      }

      try {
        const response = await fetch(\`/api/v1/test/delete-channel/\${channelId}?channelId=\${channelId}\`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
          alert(\`✅ "\${channelTitle}" 채널이 삭제되었습니다.\\n다시 등록하려면 "인증코드 요청"을 사용하세요.\`);
          // 채널 목록 새로고침
          loadVerifiedChannels();
        } else {
          throw new Error(result.error || '채널 삭제 실패');
        }
      } catch (error) {
        alert(\`❌ 채널 삭제 중 오류가 발생했습니다: \${error.message}\`);
      }
    }

    async function autoSaveShorts() {
      const channelId = document.getElementById('verifiedChannelSelect').value;
      const tagsInput = document.getElementById('tagsInput').value.trim();
      const maxResults = parseInt(document.getElementById('maxResultsInput').value) || 50;

      if (!channelId) {
        alert('인증된 채널을 선택해주세요');
        return;
      }

      const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
      if (tags.length === 0) {
        alert('최소 1개 이상의 태그를 입력해주세요');
        return;
      }

      const autoSaveBtn = document.getElementById('autoSaveBtn');
      autoSaveBtn.disabled = true;
      autoSaveBtn.textContent = '💾 자동 저장 중...';

      document.getElementById('autoSaveResult').innerHTML = \`
        <div class="loading" style="margin-top: 15px; padding: 20px;">
          <div class="spinner"></div>
          <p>쇼츠를 검색하고 저장하고 있습니다...</p>
        </div>
      \`;

      try {
        const response = await fetch('/api/v1/test/auto-save-shorts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, tags, maxResults })
        });

        const result = await response.json();

        if (result.success) {
          let html = \`
            <div class="success" style="margin-top: 15px;">
              <h3>🎉 자동 저장 완료!</h3>
              <p><strong>검색된 영상:</strong> \${result.searched}개</p>
              <p><strong>적격 쇼츠:</strong> \${result.eligible}개</p>
              <p><strong>저장된 영상:</strong> \${result.saved}개</p>
              <p><strong>검색 태그:</strong> \${result.tags.join(', ')}</p>
          \`;

          if (result.videos && result.videos.length > 0) {
            html += '<hr style="margin: 15px 0;" /><h4>저장된 영상 목록:</h4><ul style="margin-left: 20px; line-height: 1.8;">';
            result.videos.forEach(video => {
              html += \`<li><strong>\${video.title}</strong> - 👁️ \${video.viewCount.toLocaleString()} 👍 \${video.likeCount.toLocaleString()}</li>\`;
            });
            html += '</ul>';
          }

          html += '</div>';
          document.getElementById('autoSaveResult').innerHTML = html;
        } else {
          throw new Error(result.error || '자동 저장 실패');
        }
      } catch (error) {
        document.getElementById('autoSaveResult').innerHTML = \`
          <div class="error" style="margin-top: 15px;">❌ 오류 발생: \${error.message}</div>
        \`;
      } finally {
        autoSaveBtn.disabled = false;
        autoSaveBtn.textContent = '💾 자동 저장 실행';
      }
    }

    // 페이지 로드 시 인증된 채널 목록 불러오기
    window.addEventListener('DOMContentLoaded', () => {
      loadVerifiedChannels();
    });
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * 통합 테스트 대시보드 페이지
   * GET /api/v1/test/dashboard
   */
  @Get('dashboard')
  getDashboard(@Res() res: Response) {
    try {
      const dashboardPath = path.join(
        __dirname,
        'templates',
        'dashboard.html',
      );
      const html = fs.readFileSync(dashboardPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      this.logger.error(
        `[대시보드] HTML 파일 로드 실패: ${error.message}`,
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`
        <html>
          <body>
            <h1>대시보드 로드 실패</h1>
            <p>템플릿 파일을 찾을 수 없습니다.</p>
            <p>Error: ${error.message}</p>
          </body>
        </html>
      `);
    }
  }

  /**
   * YouTube API Raw 응답 조회 (테스트용)
   * GET /api/v1/test/youtube-raw?videoId=xxx
   */
  @Get('youtube-raw')
  async getYoutubeRawResponse(@Query('videoId') videoId: string) {
    try {
      if (!videoId) {
        return {
          success: false,
          error: 'videoId 파라미터가 필요합니다',
        };
      }

      const result = await this.testService.getYoutubeRawResponse(videoId);
      return result;
    } catch (error: any) {
      this.logger.error(`[YouTube Raw Response] 오류: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 쇼츠 검색
   * GET /api/v1/test/search-shorts?channelId=UCxxx&maxResults=20
   */
  @Get('search-shorts')
  async searchShorts(
    @Query('channelId') channelId: string,
    @Query('maxResults') maxResults?: number,
  ) {
    try {
      const result = await this.testService.searchShorts(
        channelId,
        maxResults ? parseInt(maxResults.toString()) : 20,
      );
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 쇼츠 저장
   * POST /api/v1/test/save-shorts
   */
  @Post('save-shorts')
  async saveShorts(
    @Body() body: { channelId: string; videoIds: string[] },
  ) {
    try {
      const result = await this.testService.saveShorts(
        body.channelId,
        body.videoIds,
      );
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 저장된 쇼츠 조회
   * GET /api/v1/test/saved-shorts?channelId=UCxxx&limit=50
   */
  @Get('saved-shorts')
  async getSavedShorts(
    @Query('channelId') channelId?: string,
    @Query('limit') limit?: number,
  ) {
    try {
      const result = await this.testService.getSavedShorts(
        channelId,
        limit ? parseInt(limit.toString()) : 50,
      );
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 채널 등록 및 인증 코드 발급
   * POST /api/v1/test/register-channel
   */
  @Post('register-channel')
  async registerChannel(
    @Body() body: { channelUrlOrId: string; userId?: string },
  ) {
    try {
      if (!body.channelUrlOrId) {
        return {
          success: false,
          error: '채널 URL 또는 ID를 입력해주세요',
        };
      }

      const result = await this.testService.registerChannelForTest(
        body.channelUrlOrId,
        body.userId || '00000000-0000-0000-0000-000000000000',
      );
      return result;
    } catch (error: any) {
      this.logger.error(`[채널 등록 API] 오류 발생: ${error.message}`);

      // 사용자 친화적인 에러 메시지 반환
      return {
        success: false,
        error: error.message || '채널 등록 중 오류가 발생했습니다',
      };
    }
  }

  /**
   * 채널 인증 확인
   * POST /api/v1/test/verify-channel
   */
  @Post('verify-channel')
  async verifyChannel(@Body() body: { channelId: string }) {
    try {
      if (!body.channelId) {
        return {
          success: false,
          error: '채널 ID를 입력해주세요',
        };
      }

      const result = await this.testService.verifyChannelForTest(
        body.channelId,
      );
      return result;
    } catch (error: any) {
      this.logger.error(`[채널 인증 API] 오류 발생: ${error.message}`);

      // 사용자 친화적인 에러 메시지 반환
      return {
        success: false,
        error: error.message || '채널 인증 확인 중 오류가 발생했습니다',
      };
    }
  }

  /**
   * 인증된 채널 목록 조회
   * GET /api/v1/test/verified-channels
   */
  @Get('verified-channels')
  async getVerifiedChannels() {
    try {
      const result = await this.testService.getVerifiedChannels();
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 채널 삭제 (DB에서만 삭제, 재인증 가능)
   * DELETE /api/v1/test/delete-channel/:channelId
   */
  @Delete('delete-channel/:channelId')
  async deleteChannel(
    @Query('channelId') channelId: string,
    @Query('userId') userId?: string,
  ) {
    try {
      if (!channelId) {
        return {
          success: false,
          error: '채널 ID를 입력해주세요',
        };
      }

      const result = await this.testService.deleteChannelForTest(
        channelId,
        userId || '00000000-0000-0000-0000-000000000000',
      );
      return result;
    } catch (error: any) {
      this.logger.error(`[채널 삭제 API] 오류 발생: ${error.message}`);

      return {
        success: false,
        error: error.message || '채널 삭제 중 오류가 발생했습니다',
      };
    }
  }

  /**
   * 인증된 채널의 적격 쇼츠 자동 검색 및 저장
   * POST /api/v1/test/auto-save-shorts
   */
  @Post('auto-save-shorts')
  async autoSaveShorts(
    @Body()
    body: {
      channelId: string;
      tags?: string[];
      maxResults?: number;
    },
  ) {
    try {
      const result = await this.testService.searchAndSaveEligibleShorts(
        body.channelId,
        body.tags || ['#WITCHES', '#XYLO'],
        body.maxResults || 50,
      );
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
