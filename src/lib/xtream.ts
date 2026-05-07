import axios from 'axios';
import { XtreamCredentials, XtreamAuthResponse, Category, Stream, Movie, Series } from '../types';

const API_VITE_PROXY = '/api/proxy';

export class XtreamClient {
  private creds: XtreamCredentials;

  constructor(creds: XtreamCredentials) {
    this.creds = creds;
  }

  private async fetchFromProxy(action: string, params: Record<string, string> = {}) {
    // Construct the actual target URL
    const baseUrl = this.creds.url.endsWith('/') ? this.creds.url : `${this.creds.url}/`;
    const targetUrl = new URL(`${baseUrl}player_api.php`);
    
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
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Xtream error while fetching ${action}:`, error);
      throw error;
    }
  }

  async authenticate(): Promise<XtreamAuthResponse> {
    return this.fetchFromProxy('');
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

  getStreamUrl(streamId: number, type: 'live' | 'movie' | 'series', extension: string = 'm3u8'): string {
    const baseUrl = this.creds.url.endsWith('/') ? this.creds.url : `${this.creds.url}/`;
    
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
