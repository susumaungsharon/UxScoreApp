using System;
using System.ComponentModel.DataAnnotations;

namespace UXScore.Models;

public class Category
{
    public Guid Id { get; init; }  = Guid.NewGuid();
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    public List<CategoryScore> CategoryScores { get; init; } = [];
}