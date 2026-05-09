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
        },
        timeout: 120000
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

  async getShortEPG(streamId: number): Promise<any> {
    const params: Record<string, string> = { stream_id: streamId.toString() };
    return this.fetchFromProxy('get_short_epg', params);
  }

  async getLiveStreamEPG(streamId: number): Promise<any> {
    const params: Record<string, string> = { stream_id: streamId.toString() };
    return this.fetchFromProxy('get_simple_data_table', params);
  }

  getStreamUrl(streamId: number, type: 'live' | 'movie' | 'series', extension: string = 'ts'): string {
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
