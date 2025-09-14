using System.ComponentModel.DataAnnotations;

namespace UXScore.DTOs;

public class ProjectDto(string? description, string[]? websites)
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(800)]
    public string? Description { get; set; } = description;

    public string[]? Websites { get; set; } = websites;
}