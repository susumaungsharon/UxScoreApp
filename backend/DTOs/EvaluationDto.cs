using System.ComponentModel.DataAnnotations;

namespace UXScore.DTOs;

public class EvaluationDto(string? notes, Guid projectId)
{
    [Required]
    public Guid ProjectId { get; set; } = projectId;

    [Required]
    [MaxLength(200)]
    public string WebsiteUrl { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Notes { get; set; } = notes;

    public ICollection<CategoryScoreDto> CategoryScores { get; set; } = [];
}