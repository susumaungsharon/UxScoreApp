using System.ComponentModel.DataAnnotations;

namespace UXScore.Models;

public class PerformanceMetric
{
    public Guid Id { get; init; } =  Guid.NewGuid();
    public required string WebsiteUrl { get; init; }
    public int LoadTimeMs { get; init; }
    public int ResponseTimeMs { get; init; }
    public int DomContentLoadedMs { get; init; }
    public int FirstPaintMs { get; init; }
    [Range(0, 100)] public int PerformanceScore { get; init; }
    public DateTime TestDate { get; init; }
    public required string? TestLocation { get; init; }

    public required DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public required string? CreatedBy { get; init; } = "Anonymous";
    public DateTime? UpdatedAt { get; init; }
    public string? UpdatedBy { get; init; }
}