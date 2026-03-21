# Cinnect Load Testing Suite

Comprehensive k6 load testing suite for the Cinnect application.

## Prerequisites

1. **Install k6**
   ```bash
   # Windows (chocolatey)
   choco install k6

   # macOS
   brew install k6

   # Linux
   sudo apt-get install k6
   ```

## Running Tests

### Anonymous-Only Mode (No Setup Required)
Run load tests without authentication - tests all public endpoints:
```bash
k6 run k6-load-test.js
```

### With Authentication (Optional)
To include authenticated user flows, provide your real credentials via environment variables:
```bash
# Single user
k6 run -e TEST_USER_EMAIL=your@email.com -e TEST_USER_PASSWORD=yourpassword k6-load-test.js

# Multiple users (comma-separated)
k6 run -e TEST_USER_EMAIL=user1@email.com,user2@email.com -e TEST_USER_PASSWORD=pass1,pass2 k6-load-test.js
```

### With Custom Base URL
```bash
k6 run -e BASE_URL=https://your-staging-url.com k6-load-test.js
```

### Full Test Suite with Output
```bash
k6 run --out json=results.json k6-load-test.js
```

### Individual Scenarios

**Load Test Only** (20-50 VUs, 16 minutes):
```bash
k6 run --config scenarios/load-only.json k6-load-test.js
```

**Stress Test Only** (up to 150 VUs):
```bash
k6 run --config scenarios/stress-only.json k6-load-test.js
```

**Spike Test Only** (sudden 200 VU spike):
```bash
k6 run --config scenarios/spike-only.json k6-load-test.js
```

**Soak Test Only** (30 VUs for 30 minutes):
```bash
k6 run --config scenarios/soak-only.json k6-load-test.js
```

## Test Scenarios

| Scenario | Duration | Max VUs | Purpose |
|----------|----------|---------|---------|
| Load Test | 16 min | 50 | Normal traffic patterns |
| Stress Test | 18 min | 150 | Beyond normal capacity |
| Spike Test | 5 min | 200 | Sudden traffic bursts |
| Soak Test | 30 min | 30 | Memory leaks, long-running stability |

## User Flows Tested

1. **Anonymous Browsing**
   - Popular movies
   - Trending movies
   - Movie search
   - Leaderboard
   - Communities list
   - Public profiles

2. **Authenticated User**
   - Profile management
   - Settings
   - Stats
   - Watchlist/Favorites
   - Notifications
   - User reviews

3. **Content Creation**
   - Create reviews
   - Post interactions

4. **Social Interaction**
   - Community browsing
   - Post viewing/liking
   - Review interactions

## Thresholds

| Metric | Threshold |
|--------|-----------|
| HTTP Request Duration (p95) | < 3000ms |
| HTTP Request Duration (p99) | < 5000ms |
| HTTP Request Failure Rate | < 5% |
| Auth Errors | < 2% |
| Auth Response Time (p95) | < 2000ms |
| Movie API (p95) | < 1500ms |

## Output & Reports

### JSON Output
```bash
k6 run --out json=results.json k6-load-test.js
```

### CSV Output
```bash
k6 run --out csv=results.csv k6-load-test.js
```

### InfluxDB (for Grafana dashboards)
```bash
k6 run --out influxdb=http://localhost:8086/k6 k6-load-test.js
```

### Cloud (k6 Cloud)
```bash
k6 cloud k6-load-test.js
```

## Custom Metrics

The test suite tracks these custom metrics:

- `auth_errors` - Authentication failure rate
- `api_errors` - General API failure rate
- `content_creation_errors` - Content creation failure rate
- `auth_response_time` - Auth endpoint response times
- `movie_response_time` - Movie API response times
- `review_response_time` - Review API response times
- `post_response_time` - Post API response times
- `user_response_time` - User API response times
- `community_response_time` - Community API response times
- `leaderboard_response_time` - Leaderboard API response times
- `successful_logins` - Count of successful logins
- `successful_reviews` - Count of reviews created
- `successful_posts` - Count of posts created

## Troubleshooting

### "Connection refused" errors
- Ensure your server is running
- Check the BASE_URL is correct
- Verify firewall settings

### Running in anonymous-only mode
- This is normal if you didn't provide credentials
- Anonymous mode tests all public endpoints (movies, leaderboard, communities)
- To enable auth tests: `k6 run -e TEST_USER_EMAIL=... -e TEST_USER_PASSWORD=... k6-load-test.js`

### High error rates on authenticated endpoints
- Verify credentials are correct
- Check if account is verified/active
- Ensure JWT token handling is working

### Timeouts during spike test
- This might indicate actual performance issues
- Check server resources (CPU, memory)
- Review database connection pool settings

## Best Practices

1. **Don't run against production** without proper safeguards
2. **Start with load test** before stress testing
3. **Monitor server resources** during tests
4. **Create isolated test data** that can be cleaned up
5. **Run from a separate machine** to avoid resource contention
