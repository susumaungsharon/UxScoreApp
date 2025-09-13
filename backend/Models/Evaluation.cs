namespace UXScore.Models;

public sealed class Evaluation
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string WebsiteUrl { get; set; }
    public string? Notes { get; set; }
    public List<CategoryScore> CategoryScores { get; init; } = [];
    public Guid ProjectId { get; init; }
    public required Project? Project { get; init; }
    public required DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public required string? CreatedBy { get; set; } = "Anonymous";
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}