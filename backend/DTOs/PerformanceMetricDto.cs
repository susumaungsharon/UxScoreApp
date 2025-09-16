using System.ComponentModel.DataAnnotations;

namespace UXScore.DTOs;

public class PerformanceMetricDto(
    int loadTimeMs,
    int responseTimeMs,
    int domContentLoadedMs,
    int firstPaintMs,
    int performanceScore,
    DateTime testDate,
    string? testLocation)
{
    [Required]
    [MaxLength(200)]
    public string WebsiteUrl { get; set; } = string.Empty;
    
    public int LoadTimeMs { get; } = loadTimeMs;
    public int ResponseTimeMs { get; } = responseTimeMs;
    public int DomContentLoadedMs { get; } = domContentLoadedMs;
    public int FirstPaintMs { get; set; } = firstPaintMs;

    [Range(0, 100)]
    public int PerformanceScore { get; } = performanceScore;

    public DateTime TestDate { get; set; } = testDate;

    [MaxLength(100)]
    public string? TestLocation { get; set; } = testLocation;
}