// Global test setup
import { jest } from '@jest/globals';

// Mock axios globally for tests
jest.mock('axios');

// Set up global test timeout
jest.setTimeout(10000);

// Global test environment setup
beforeAll(() => {
    // Setup code that runs before all tests
});

afterAll(() => {
    // Cleanup code that runs after all tests
});

beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
});

// Export mock helpers
export const createMockAxiosResponse = <T>(data: T) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
});

export const createMockProfile = (overrides = {}) => ({
    id: 'test-profile-id',
    service: 'x' as const,
    service_username: 'testuser',
    service_id: '123456789',
    formatted_username: '@testuser',
    avatar: 'https://example.com/avatar.jpg',
    timezone: 'America/Los_Angeles',
    schedules: [],
    default: true,
    ...overrides,
});

export const createMockPost = (overrides = {}) => ({
    id: 'test-post-id',
    profile_id: 'test-profile-id',
    status: 'sent' as const,
    text: 'Test post content',
    text_formatted: 'Test post content',
    created_at: Date.now(),
    due_at: Date.now() + 3600000,
    sent_at: Date.now(),
    statistics: {
        reach: 1000,
        clicks: 50,
        retweets: 10,
        favorites: 25,
        mentions: 5,
        comments: 8,
        shares: 12,
    },
    ...overrides,
});