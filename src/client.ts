// Re-export the BufferClient class and factory function
// This file should contain your BufferClient implementation from index.ts
// Moving it here for better organization

import {
    BufferProfile,
    BufferPost,
    PostAnalytics,
    AnalyticsSummary,
    PostListOptions,
    CreatePostData,
    AnalyticsOptions,
    APIResponse,
    BufferAPIError,
    AuthTokens,
    TimeRange,
    SocialPlatform
} from './types';

import axios from 'axios';

// Note: The actual BufferClient implementation would go here
// For the package structure, I'm showing the organization
// Your existing BufferClient class from index.ts should be moved here

export interface HTTPClient {
    get<T = any>(url: string, config?: any): Promise<{ data: T }>;
    post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>;
    put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>;
    delete<T = any>(url: string, config?: any): Promise<{ data: T }>;
    defaults?: any;
    interceptors?: any;
}

export interface BufferClientConfig {
    accessToken: string;
    baseUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    rateLimit?: {
        requests: number;
        window: number;
    };
    bufferSDK?: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        sdkMockMode: boolean;
    } | any
}

// Your BufferClient class implementation would go here
// Copy the entire class from your index.ts file

export class BufferClient {
    // Implementation details...
    // (Copy your existing BufferClient class here)
}

export const createBufferClient = async (config: Partial<BufferClientConfig>): Promise<BufferClient> => {
    return await (new BufferClient(config)).initialize();
};