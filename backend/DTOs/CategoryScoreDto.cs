using System.ComponentModel.DataAnnotations;

namespace UXScore.DTOs;

public abstract class CategoryScoreDto(
    Guid categoryId,
    int score,
    string? annotation,
    string? comment,
    IFormFile? screenshot)
{
    [Required]
    public Guid CategoryId { get; set; } = categoryId;

    [Required]
    [Range(1, 5)]
    public int Score { get; set; } = score;

    [MaxLength(800)]
    public string? Comment { get; set; } = comment;

    [MaxLength(800)]
    public string? Annotation { get; set; } = annotation;

    public IFormFile? Screenshot { get; set; } = screenshot;
}