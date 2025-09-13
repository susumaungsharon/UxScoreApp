using System.ComponentModel.DataAnnotations;

namespace UXScore.Models;

public sealed class CategoryScore
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CategoryId { get; init; }
    public required Category? Category { get; init; }

    [Range(1, 5)] public required int Score { get; init; }
    public string? Comment { get; init; } = string.Empty;
    
    public byte[]? Screenshot { get; set; }
    public string? Annotation { get; set; } = string.Empty;
    
    public required Guid EvaluationId { get; init; }
    public required Evaluation? Evaluation { get; init; }
}