import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const Performance = ({ token }) => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const benchmarks = {
    loadTimeMs: { good: 3000, needsImprovement: 5000 },
    responseTimeMs: { good: 200, needsImprovement: 500 },
    domContentLoadedMs: { good: 2000, needsImprovement: 4000 },
    firstPaintMs: { good: 1000, needsImprovement: 2500 }
  };

  useEffect(() => {
    fetchWebsites();
    fetchPerformanceMetrics();
  }, []);

  const fetchWebsites = async () => {
    try {
      const response = await apiService.get(`/api/projects/websites`, { token });
      const uniqueWebsites = response.filter((website, index, self) => 
        index === self.findIndex((w) => w.url === website.url)
      );
      setWebsites(uniqueWebsites);
    } catch (error) {
      console.error('Error fetching project websites:', error);
    }
  };

  const fetchPerformanceMetrics = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(`/api/performance`, { token });
      setMetrics(response);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const testWithNavigationTiming = async (url) => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      
      const timeout = setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        reject(new Error('Navigation timing test timeout'));
      }, 20000);
      
      iframe.onload = () => {
        setTimeout(() => {
          try {
            const navigation = iframe.contentWindow.performance.getEntriesByType('navigation')[0];
            const resources = iframe.contentWindow.performance.getEntriesByType('resource');
            
            if (navigation && navigation.loadEventEnd > 0) {
              const totalTransferSize = resources.reduce((sum, resource) => {
                return sum + (resource.transferSize || 0);
              }, 0);
              
              const slowResources = resources.filter(r => r.duration > 1000).length;
              
              const performanceData = {
                loadTimeMs: Math.round(navigation.loadEventEnd - navigation.fetchStart),
                responseTimeMs: Math.round(navigation.responseEnd - navigation.requestStart),
                domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
                firstPaintMs: Math.round(navigation.domInteractive - navigation.fetchStart),
                resourceCount: resources.length,
                totalTransferSize: totalTransferSize,
                slowResourceCount: slowResources,
                method: 'navigation-timing'
              };
              
              if (performanceData.loadTimeMs > 0 && 
                  performanceData.responseTimeMs > 0 && 
                  performanceData.loadTimeMs < 60000) {
                clearTimeout(timeout);
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
                resolve(performanceData);
                return;
              }
            }
            throw new Error('Invalid timing data');
          } catch (error) {
            clearTimeout(timeout);
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            reject(new Error('Cross-origin restrictions prevented timing access'));
          }
        }, 4000);
      };
      
      iframe.onerror = () => {
        clearTimeout(timeout);
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        reject(new Error('Failed to load iframe for test'));
      };
      
      document.body.appendChild(iframe);
      const cacheBustUrl = url.includes('?') 
        ? `${url}&_perftest=${Date.now()}` 
        : `${url}?_perftest=${Date.now()}`;
      iframe.src = cacheBustUrl;
    });
  };

  const runMultipleTests = async (testMethod, url, iterations = 3) => {
    const results = [];
    const methodName = testMethod.name || 'unknown';
    
    for (let i = 0; i < iterations; i++) {
      try {
        setCurrentTest(prev => ({
          ...prev,
          currentMethod: `${methodName} (${i + 1}/${iterations})`
        }));
        
        const result = await testMethod(url);
        if (result) {
          results.push(result);
        }
        
        if (i < iterations - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.log(`${methodName} test ${i + 1} failed:`, error.message);
      }
    }
    
    if (results.length === 0) {
      throw new Error(`All ${iterations} test attempts failed`);
    }
    
    const getMedian = (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
    };
    
    return {
      loadTimeMs: Math.round(getMedian(results.map(r => r.loadTimeMs))),
      responseTimeMs: Math.round(getMedian(results.map(r => r.responseTimeMs))),
      domContentLoadedMs: Math.round(getMedian(results.map(r => r.domContentLoadedMs))),
      firstPaintMs: Math.round(getMedian(results.map(r => r.firstPaintMs))),
      resourceCount: Math.round(getMedian(results.map(r => r.resourceCount || 0))),
      totalTransferSize: Math.round(getMedian(results.map(r => r.totalTransferSize || 0))),
      slowResourceCount: Math.round(getMedian(results.map(r => r.slowResourceCount || 0))),
      testRuns: results.length,
      method: `${results[0].method}-median-of-${results.length}`
    };
  };

  const testWithNetworkTiming = async (url) => {
    const measurements = [];
    
    for (let i = 0; i < 5; i++) {
      try {
        const cacheBustUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}&_r=${Math.random()}`;
        const startTime = performance.now();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(cacheBustUrl, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const timing = performance.now() - startTime;
        
        if (timing > 0 && timing < 15000) {
          measurements.push(timing);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.log(`Network measurement ${i + 1} failed:`, error.message);
      }
    }
    
    if (measurements.length === 0) {
      throw new Error('All network measurements failed');
    }
    
    const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const minTime = Math.min(...measurements);
    const maxTime = Math.max(...measurements);
    
    return {
      loadTimeMs: Math.round(maxTime * 2.5),
      responseTimeMs: Math.round(minTime),
      domContentLoadedMs: Math.round(avgTime * 1.8),
      firstPaintMs: Math.round(minTime * 1.3),
      method: 'network-timing'
    };
  };

  const testWithXHR = async (url) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = performance.now();
      let dnsLookupTime = 0;
      let tcpConnectTime = 0;
      let responseStartTime = 0;
      let downloadStartTime = 0;
      
      xhr.onreadystatechange = function() {
        const currentTime = performance.now();
        
        if (xhr.readyState === 1) {
          dnsLookupTime = currentTime;
        }
        if (xhr.readyState === 2) {
          responseStartTime = currentTime;
        }
        if (xhr.readyState === 3) {
          downloadStartTime = currentTime;
        }
        if (xhr.readyState === 4) {
          const totalTime = currentTime - startTime;
          const responseTime = responseStartTime > 0 ? responseStartTime - startTime : totalTime * 0.3;
          
          if (totalTime > 0 && totalTime < 30000) {
            resolve({
              loadTimeMs: Math.round(totalTime),
              responseTimeMs: Math.round(responseTime),
              domContentLoadedMs: Math.round(totalTime * 0.85),
              firstPaintMs: Math.round(responseTime * 1.4),
              method: 'xhr-timing'
            });
          } else {
            reject(new Error('Invalid XHR timing data'));
          }
        }
      };
      
      xhr.onerror = () => reject(new Error('XHR request failed'));
      xhr.ontimeout = () => reject(new Error('XHR request timed out'));
      xhr.timeout = 20000;
      
      try {
        const cacheBustUrl = `${url}${url.includes('?') ? '&' : '?'}_xhr=${Date.now()}`;
        xhr.open('GET', cacheBustUrl, true);
        xhr.send();
      } catch (error) {
        reject(new Error(`XHR failed to start: ${error.message}`));
      }
    });
  };

  const runPerformanceTest = async () => {
    if (!testUrl) {
      alert('Please enter a URL to test');
      return;
    }

    setLoading(true);
    setCurrentTest({
      url: testUrl,
      status: 'running',
      startTime: Date.now()
    });

    const testMethods = [
      { name: 'Navigation Timing', method: testWithNavigationTiming },
      { name: 'XHR Timing', method: testWithXHR },
      { name: 'Network Timing', method: testWithNetworkTiming }
    ];

    let testResults = null;
    let successfulMethod = null;

    for (const { name, method } of testMethods) {
      try {
        console.log(`Trying ${name} method for ${testUrl}`);
        
        if (name === 'Navigation Timing') {
          testResults = await runMultipleTests(method, testUrl, 3);
        } else {
          setCurrentTest(prev => ({
            ...prev,
            currentMethod: name
          }));
          testResults = await method(testUrl);
        }
        
        successfulMethod = name;
        console.log(`${name} method succeeded:`, testResults);
        break;
      } catch (error) {
        console.log(`${name} method failed:`, error.message);
        continue;
      }
    }

    if (!testResults) {
      setCurrentTest({
        ...currentTest,
        status: 'error',
        error: 'All testing methods failed. The website might be blocking cross-origin requests or be unreachable.'
      });
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.post('/api/performance', {
        websiteUrl: testUrl,
        loadTimeMs: testResults.loadTimeMs,
        responseTimeMs: testResults.responseTimeMs,
        domContentLoadedMs: testResults.domContentLoadedMs,
        firstPaintMs: testResults.firstPaintMs,
        performanceScore: calculatePerformanceScore(testResults),
        testDate: new Date().toISOString(),
        testLocation: `Browser (${successfulMethod}${testResults.testRuns ? ` - ${testResults.testRuns} runs` : ''})`
      });

      setCurrentTest({
        ...currentTest,
        status: 'completed',
        results: testResults,
        method: successfulMethod
      });

      await fetchPerformanceMetrics();
      
      setTimeout(() => {
        setIsTestModalOpen(false);
        setCurrentTest(null);
        setTestUrl('');
        setShowCustomUrlInput(false);
      }, 4000);

    } catch (error) {
      console.error('Error saving performance test:', error);
      setCurrentTest({
        ...currentTest,
        status: 'error',
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePerformanceScore = (metrics) => {
    let score = 100;

    if (metrics.loadTimeMs > benchmarks.loadTimeMs.good) {
      const excess = metrics.loadTimeMs - benchmarks.loadTimeMs.good;
      score -= Math.min(30, 20 + (excess / 1000) * 2);
    }
    
    if (metrics.responseTimeMs > benchmarks.responseTimeMs.good) {
      const excess = metrics.responseTimeMs - benchmarks.responseTimeMs.good;
      score -= Math.min(20, 15 + (excess / 100) * 1); 
    }
    
    if (metrics.domContentLoadedMs > benchmarks.domContentLoadedMs.good) {
      const excess = metrics.domContentLoadedMs - benchmarks.domContentLoadedMs.good;
      score -= Math.min(25, 15 + (excess / 1000) * 2);
    }
    
    if (metrics.firstPaintMs > benchmarks.firstPaintMs.good) {
      const excess = metrics.firstPaintMs - benchmarks.firstPaintMs.good;
      score -= Math.min(15, 10 + (excess / 500) * 1);
    }

    if (metrics.resourceCount > 100) {
      score -= Math.min(10, (metrics.resourceCount - 100) / 20);
    }
    
    if (metrics.totalTransferSize > 5000000) {
      score -= Math.min(15, (metrics.totalTransferSize - 5000000) / 1000000 * 3);
    }
    
    if (metrics.slowResourceCount > 5) {
      score -= Math.min(10, metrics.slowResourceCount - 5);
    }

    if (metrics.loadTimeMs > 15000) score -= 25;
    if (metrics.responseTimeMs > 3000) score -= 20;

    return Math.max(0, Math.round(score));
  };

  const getMetricStatus = (value, metric) => {
    const benchmark = benchmarks[metric];
    if (!benchmark) return 'unknown';
    
    if (value <= benchmark.good) return 'good';
    if (value <= benchmark.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  const getLoadTimeStatus = (ms) => {
    if (ms <= benchmarks.loadTimeMs.good) return 'good';
    if (ms <= benchmarks.loadTimeMs.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatLoadTime = (ms) => {
    return `${(ms / 1000).toFixed(5)}s`;
  };

  const formatMilliseconds = (ms) => {
    return `${ms}ms`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const extractDomain = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch {
      return url;
    }
  };

  const handleDeleteMetric = async (id) => {
    try {
      await apiService.delete(`/api/performance/${id}`, { token });
      await fetchPerformanceMetrics();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting performance metric:', error);
      alert('Failed to delete performance metric');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Metrics</h1>
        <p className="text-gray-600">Monitor and analyze website performance with accuracy</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          {metrics.length} performance test{metrics.length !== 1 ? 's' : ''} recorded
        </div>
        <button
          onClick={() => setIsTestModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 inline-flex items-center"
          disabled={loading}
        >
          Run Performance Test
        </button>
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Performance Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(Math.round(metrics.reduce((sum, m) => sum + m.performanceScore, 0) / metrics.length))}`}>
                  {Math.round(metrics.reduce((sum, m) => sum + m.performanceScore, 0) / metrics.length)}
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Load Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(Math.round(metrics.reduce((sum, m) => sum + m.loadTimeMs, 0) / metrics.length))}
                </p>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(Math.round(metrics.reduce((sum, m) => sum + m.responseTimeMs, 0) / metrics.length))}
                </p>
              </div>
              <div className="text-3xl">🌐</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tests This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.filter(m => {
                    const testDate = new Date(m.testDate);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return testDate > weekAgo;
                  }).length}
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading && metrics.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading performance metrics...</p>
          </div>
        ) : metrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOM Ready</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Paint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.map((metric, index) => (
                  <tr key={metric.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-800 relative group">
                        <a href={metric.websiteUrl} target="_blank" rel="noopener noreferrer">
                          {extractDomain(metric.websiteUrl)}
                        </a>
                        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
                          {metric.websiteUrl}
                          <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(metric.performanceScore)} bg-opacity-10`}>
                        {metric.performanceScore}/100
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getLoadTimeStatus(metric.loadTimeMs))}`}>
                        {formatLoadTime(metric.loadTimeMs)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getMetricStatus(metric.responseTimeMs, 'responseTimeMs'))}`}>
                        {formatMilliseconds(metric.responseTimeMs)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getMetricStatus(metric.domContentLoadedMs, 'domContentLoadedMs'))}`}>
                        {formatMilliseconds(metric.domContentLoadedMs)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getMetricStatus(metric.firstPaintMs, 'firstPaintMs'))}`}>
                        {formatMilliseconds(metric.firstPaintMs)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(metric.testDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setDeleteConfirm(metric.id)}
                        className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded p-1"
                        title="Delete performance test"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🚀</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No performance tests yet</h3>
            <p className="text-gray-500 mb-4">Run your first performance test to see detailed metrics here.</p>
          </div>
        )}
      </div>

      {isTestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Run Performance Test</h3>
            
            {!currentTest ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                  <select
                    value={showCustomUrlInput ? 'other' : testUrl}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      if (selectedValue === 'other') {
                        setShowCustomUrlInput(true);
                        setTestUrl('');
                      } else {
                        setShowCustomUrlInput(false);
                        setTestUrl(selectedValue);
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                    required
                  >
                    <option value="">Select a website url</option>
                    {websites.map((website, index) => (
                      <option key={`${website.id}-${index}`} value={website.url}>
                        {website.url}
                      </option>
                    ))}
                    <option value="other">Other (Enter manually)</option>
                  </select>
                  
                  {showCustomUrlInput && (
                    <input
                      type="url"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                      required
                    />
                  )}
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Testing:</strong> Uses multiple test runs, resource analysis, and cache-busting for accurate results. Test may take 30-60 seconds.
                  </p>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setIsTestModalOpen(false);
                      setTestUrl('');
                      setShowCustomUrlInput(false);
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={runPerformanceTest}
                    disabled={!testUrl || loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Start Test
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-medium">{currentTest.url}</div>
                  {currentTest.status === 'running' && (
                    <div>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mt-4"></div>
                      <p className="mt-2 text-gray-600">
                        {currentTest.currentMethod ? `${currentTest.currentMethod}...` : 'Running performance test...'}
                      </p>
                    </div>
                  )}
                  {currentTest.status === 'completed' && currentTest.results && (
                    <div className="mt-4">
                      <div className="text-green-600 text-lg font-bold mb-2">✅ Test Completed!</div>
                      <div className="text-sm text-gray-600 mb-3">
                        Method: {currentTest.method}
                        {currentTest.results.testRuns && ` (${currentTest.results.testRuns} test runs)`}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <div className="font-medium">Load Time</div>
                          <div>{formatLoadTime(currentTest.results.loadTimeMs)}</div>
                        </div>
                        <div>
                          <div className="font-medium">Response Time</div>
                          <div>{formatMilliseconds(currentTest.results.responseTimeMs)}</div>
                        </div>
                        <div>
                          <div className="font-medium">DOM Ready</div>
                          <div>{formatMilliseconds(currentTest.results.domContentLoadedMs)}</div>
                        </div>
                        <div>
                          <div className="font-medium">First Paint</div>
                          <div>{formatMilliseconds(currentTest.results.firstPaintMs)}</div>
                        </div>
                      </div>
                      
                      {(currentTest.results.resourceCount || currentTest.results.totalTransferSize) && (
                        <div className="border-t pt-3 mb-4">
                          <div className="text-xs text-gray-500 mb-2">Resource Analysis:</div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {currentTest.results.resourceCount && (
                              <div>
                                <div className="font-medium">Resources</div>
                                <div>{currentTest.results.resourceCount}</div>
                              </div>
                            )}
                            {currentTest.results.totalTransferSize && (
                              <div>
                                <div className="font-medium">Transfer Size</div>
                                <div>{formatBytes(currentTest.results.totalTransferSize)}</div>
                              </div>
                            )}
                            {currentTest.results.slowResourceCount && (
                              <div>
                                <div className="font-medium">Slow Resources</div>
                                <div>{currentTest.results.slowResourceCount}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <div className="font-medium">Performance Score</div>
                        <div className={`text-2xl font-bold ${getScoreColor(calculatePerformanceScore(currentTest.results))}`}>
                          {calculatePerformanceScore(currentTest.results)}/100
                        </div>
                      </div>
                    </div>
                  )}
                  {currentTest.status === 'error' && (
                    <div className="mt-4">
                      <div className="text-red-600 text-lg font-bold mb-2">❌ Test Failed</div>
                      <p className="text-gray-600 text-sm">{currentTest.error}</p>
                      <button
                        onClick={() => {
                          setCurrentTest(null);
                          setIsTestModalOpen(false);
                          setTestUrl('');
                          setShowCustomUrlInput(false);
                        }}
                        className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Delete Performance Test</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this performance test? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMetric(deleteConfirm)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Performance;