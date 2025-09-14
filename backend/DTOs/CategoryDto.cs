using System.ComponentModel.DataAnnotations;

namespace UXScore.DTOs;

public class CategoryDto(string name, string? description, int displayOrder)
{
    [Required]
    public string Name { get; set; } = name;

    public string? Description { get; set; } = description;
    public bool IsActive { get; } = true;
    public int DisplayOrder { get; set; } = displayOrder;
}