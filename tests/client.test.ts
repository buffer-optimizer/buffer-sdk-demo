import { BufferClient, createBufferClient, BufferAPIError } from '../src';
import axios from 'axios';
import { createMockAxiosResponse, createMockProfile, createMockPost } from './setup';

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BufferClient', () => {
    let client: BufferClient;

    beforeEach(async () => {
        // Mock the token exchange
        mockedAxios.post.mockResolvedValueOnce(
            createMockAxiosResponse({ access_token: 'mock-token' })
        );

        client = await createBufferClient({
            accessToken: 'test-token',
            bufferSDK: {
                clientId: 'test-client-id',
                clientSecret: 'test-client-secret',
                redirectUri: 'http://localhost:3000/callback',
                sdkMockMode: true,
            },
        });
    });

    describe('Profiles API', () => {
        test('should list profiles', async () => {
            const profiles = await client.profiles.list();

            expect(profiles).toBeInstanceOf(Array);
            expect(profiles.length).toBeGreaterThan(0);
            expect(profiles[0]).toHaveProperty('id');
            expect(profiles[0]).toHaveProperty('service');
        });

        test('should get a specific profile', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;

            const profile = await client.profiles.get(profileId);

            expect(profile).toHaveProperty('id', profileId);
            expect(profile).toHaveProperty('service');
        });

        test('should throw error for non-existent profile', async () => {
            await expect(client.profiles.get('non-existent-id'))
                .rejects
                .toThrow(BufferAPIError);
        });
    });

    describe('Posts API', () => {
        test('should list posts for a profile', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;

            const posts = await client.posts.list(profileId);

            expect(posts).toBeInstanceOf(Array);
            if (posts.length > 0) {
                expect(posts[0]).toHaveProperty('id');
                expect(posts[0]).toHaveProperty('profile_id');
                expect(posts[0]).toHaveProperty('text');
            }
        });

        test('should create a new post', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;

            const postData = {
                text: 'Test post from SDK',
                scheduled_at: new Date(Date.now() + 3600000).toISOString(),
            };

            const post = await client.posts.create(profileId, postData);

            expect(post).toHaveProperty('id');
            expect(post).toHaveProperty('text', postData.text);
            expect(post).toHaveProperty('profile_id', profileId);
        });

        test('should get specific post', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;
            const posts = await client.posts.list(profileId);

            if (posts.length > 0) {
                const post = await client.posts.get(posts[0].id);
                expect(post).toHaveProperty('id', posts[0].id);
            }
        });

        test('should get post analytics', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;
            const posts = await client.posts.list(profileId);

            if (posts.length > 0) {
                const analytics = await client.posts.analytics(posts[0].id);
                expect(analytics).toHaveProperty('postId');
                expect(analytics).toHaveProperty('metrics');
                expect(analytics).toHaveProperty('engagementRate');
            }
        });
    });

    describe('Analytics API', () => {
        test('should get analytics summary', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;

            const summary = await client.analytics.summary(profileId, {
                timeRange: '30d'
            });

            expect(summary).toHaveProperty('profileId');
            expect(summary).toHaveProperty('totalPosts');
            expect(summary).toHaveProperty('averageEngagementRate');
            expect(summary).toHaveProperty('topMetrics');
        });

        test('should get posts analytics', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;

            const analytics = await client.analytics.posts(profileId, {
                timeRange: '7d'
            });

            expect(analytics).toBeInstanceOf(Array);
            if (analytics.length > 0) {
                expect(analytics[0]).toHaveProperty('postId');
                expect(analytics[0]).toHaveProperty('metrics');
                expect(analytics[0]).toHaveProperty('engagementRate');
            }
        });

        test('should handle custom date ranges', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;

            const analytics = await client.analytics.summary(profileId, {
                start: '2024-01-01',
                end: '2024-01-31'
            });

            expect(analytics).toHaveProperty('profileId');
            expect(analytics).toHaveProperty('totalPosts');
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors', async () => {
            // Temporarily disable mock mode to test real API calls
            const realClient = await createBufferClient({
                accessToken: 'invalid-token',
                bufferSDK: {
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    redirectUri: 'http://localhost:3000/callback',
                    sdkMockMode: false,
                },
            });

            // Mock axios to throw a network error
            mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

            await expect(realClient.profiles.list())
                .rejects
                .toThrow(BufferAPIError);
        });

        test('should handle rate limiting', async () => {
            const rateLimitedClient = await createBufferClient({
                accessToken: 'test-token',
                rateLimit: {
                    requests: 1,
                    window: 1000,
                },
                bufferSDK: {
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    redirectUri: 'http://localhost:3000/callback',
                    sdkMockMode: false,
                },
            });

            // Mock successful response for first call
            mockedAxios.get.mockResolvedValueOnce(
                createMockAxiosResponse({ data: [] })
            );

            // First call should succeed
            await rateLimitedClient.profiles.list();

            // Second call should be rate limited
            await expect(rateLimitedClient.profiles.list())
                .rejects
                .toThrow('Rate limit exceeded');
        });
    });

    describe('Mock Mode', () => {
        test('should work in mock mode', async () => {
            expect(client).toBeInstanceOf(BufferClient);

            const profiles = await client.profiles.list();
            expect(profiles).toBeInstanceOf(Array);
            expect(profiles.length).toBeGreaterThan(0);
        });

        test('should generate realistic mock data', async () => {
            const profiles = await client.profiles.list();
            const profileId = profiles[0].id;

            const posts = await client.posts.list(profileId, { count: 5 });
            expect(posts).toHaveLength(5);

            const analytics = await client.analytics.summary(profileId);
            expect(analytics.totalPosts).toBeGreaterThan(0);
            expect(analytics.averageEngagementRate).toBeGreaterThan(0);
        });
    });

    describe('Configuration', () => {
        test('should accept custom configuration', async () => {
            const customClient = await createBufferClient({
                accessToken: 'test-token',
                timeout: 5000,
                retryAttempts: 5,
                bufferSDK: {
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    redirectUri: 'http://localhost:3000/callback',
                    sdkMockMode: true,
                },
            });

            expect(customClient).toBeInstanceOf(BufferClient);
        });
    });
});