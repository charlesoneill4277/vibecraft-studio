import { aiUsageTracker } from '../usage-tracker';

describe('AI Usage Tracker', () => {
  const testUserId = 'test-user-123';
  const testProjectId = 'test-project-456';

  beforeEach(() => {
    // Reset tracker state for each test
    (aiUsageTracker as any).usageData = [];
    (aiUsageTracker as any).quotas = new Map();
  });

  test('should track usage correctly', async () => {
    const usage = await aiUsageTracker.trackUsage(
      testUserId,
      testProjectId,
      'openai',
      'gpt-4',
      1000,
      500,
      2000
    );

    expect(usage.userId).toBe(testUserId);
    expect(usage.projectId).toBe(testProjectId);
    expect(usage.provider).toBe('openai');
    expect(usage.model).toBe('gpt-4');
    expect(usage.inputTokens).toBe(1000);
    expect(usage.outputTokens).toBe(500);
    expect(usage.cost).toBeGreaterThan(0);
  });

  test('should get user usage statistics', async () => {
    // Track some usage first
    await aiUsageTracker.trackUsage(testUserId, testProjectId, 'openai', 'gpt-4', 1000, 500, 2000);
    await aiUsageTracker.trackUsage(testUserId, testProjectId, 'anthropic', 'claude-3-opus-20240229', 800, 400, 1500);

    const stats = await aiUsageTracker.getUserUsage(testUserId);
    
    expect(stats.totalRequests).toBe(2);
    expect(stats.totalTokens).toBe(2700); // 1000+500+800+400
    expect(stats.totalCost).toBeGreaterThan(0);
    expect(Object.keys(stats.byProvider)).toContain('openai');
    expect(Object.keys(stats.byProvider)).toContain('anthropic');
  });

  test('should set and check quotas', async () => {
    await aiUsageTracker.setQuota(testUserId, 'openai', 10000, 50.0);
    
    const quota = await aiUsageTracker.checkQuota(testUserId, 'openai');
    expect(quota.withinLimit).toBe(true);
    expect(quota.limit).toBe(10000);
    expect(quota.costLimit).toBe(50.0);
  });

  test('should estimate costs', () => {
    const cost = aiUsageTracker.estimateCost('openai', 'gpt-4', 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(typeof cost).toBe('number');
  });
});