import axios from 'axios';
import { XtreamCredentials, XtreamAuthResponse, Category, Stream, Movie, Series } from '../types';

const API_VITE_PROXY = '/api/proxy';

export class XtreamClient {
  private creds: XtreamCredentials;
  private apiEndpoint: string = 'player_api.php';

  constructor(creds: XtreamCredentials) {
    this.creds = creds;
  }

  private async fetchFromProxy(action: string, params: Record<string, string> = {}) {
    // Construct the actual target URL
    let baseUrl = this.creds.url.trim();
    
    // Remove existing player_api.php, panel_api.php, or enigma2.php
    baseUrl = baseUrl.replace(/\/(player_api|panel_api|enigma2|get|xml)\.php$/, '')
                    .replace(/(player_api|panel_api|enigma2|get|xml)\.php$/, '');
    
    // Ensure trailing slash
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    const targetUrl = new URL(`${baseUrl}${this.apiEndpoint}`);
    
    targetUrl.searchParams.append('username', this.creds.username);
    targetUrl.searchParams.append('password', this.creds.password);
    targetUrl.searchParams.append('action', action);
    
    Object.entries(params).forEach(([key, value]) => {
      targetUrl.searchParams.append(key, value);
    });

    try {
      const response = await axios.get(API_VITE_PROXY, {
        params: {
          targetUrl: targetUrl.toString()
        },
        timeout: 240000
      });
      return response.data;
    } catch (error: any) {
      // Suppress noisy EPG errors if it's a provider internal error
      if (action === 'get_short_epg' || action === 'get_simple_data_table') {
        console.warn(`EPG Fetch failed for ${action}:`, error.message);
        return null;
      }
      console.error(`Xtream error while fetching ${action}:`, error);
      throw error;
    }
  }

  async authenticate(): Promise<XtreamAuthResponse> {
    try {
      this.apiEndpoint = 'player_api.php';
      return await this.fetchFromProxy('');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('player_api.php not found, trying panel_api.php fallback...');
        this.apiEndpoint = 'panel_api.php';
        try {
          return await this.fetchFromProxy('');
        } catch (fallbackError: any) {
           if (fallbackError.response?.status === 404) {
              console.warn('panel_api.php not found, trying enigma2.php fallback...');
              this.apiEndpoint = 'enigma2.php';
              try {
                return await this.fetchFromProxy('');
              } catch (e) {
                // If all fails, reset to default and throw original error or best error
                this.apiEndpoint = 'player_api.php';
                throw fallbackError;
              }
           }
           throw fallbackError;
        }
      }
      throw error;
    }
  }

  async getLiveCategories(): Promise<Category[]> {
    return this.fetchFromProxy('get_live_categories');
  }

  async getLiveStreams(categoryId?: string): Promise<Stream[]> {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    return this.fetchFromProxy('get_live_streams', params);
  }

  async getVodCategories(): Promise<Category[]> {
    return this.fetchFromProxy('get_vod_categories');
  }

  async getVodStreams(categoryId?: string): Promise<Movie[]> {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    return this.fetchFromProxy('get_vod_streams', params);
  }

  async getSeriesCategories(): Promise<Category[]> {
    return this.fetchFromProxy('get_series_categories');
  }

  async getSeries(categoryId?: string): Promise<Series[]> {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    return this.fetchFromProxy('get_series', params);
  }

  async getSeriesInfo(seriesId: number): Promise<any> {
    const params: Record<string, string> = { series_id: seriesId.toString() };
    return this.fetchFromProxy('get_series_info', params);
  }

  async getShortEPG(streamId: number): Promise<any> {
    const params: Record<string, string> = { stream_id: streamId.toString() };
    return this.fetchFromProxy('get_short_epg', params);
  }

  async getLiveStreamEPG(streamId: number): Promise<any> {
    const params: Record<string, string> = { stream_id: streamId.toString() };
    return this.fetchFromProxy('get_simple_data_table', params);
  }

  getStreamUrl(streamId: number, type: 'live' | 'movie' | 'series', extension: string = 'ts'): string {
    let baseUrl = this.creds.url.trim();
    
    // Remove player_api.php or panel_api.php if accidentally included
    baseUrl = baseUrl.replace(/\/player_api\.php$/, '').replace(/player_api\.php$/, '');
    baseUrl = baseUrl.replace(/\/panel_api\.php$/, '').replace(/panel_api\.php$/, '');
    
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    // Some servers use different paths
    if (type === 'live') {
      return `${baseUrl}live/${this.creds.username}/${this.creds.password}/${streamId}.${extension}`;
    } else if (type === 'movie') {
      return `${baseUrl}movie/${this.creds.username}/${this.creds.password}/${streamId}.${extension}`;
    } else {
      return `${baseUrl}series/${this.creds.username}/${this.creds.password}/${streamId}.${extension}`;
    }
  }
}
