using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace UXScore.Models;

public sealed class Project
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Name { get; init; }
    public string? Description { get; init; }
    public string[]? Websites { get; init; }
    
    public ICollection<Evaluation>? Evaluations { get; init; }

    public required DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public required string? CreatedBy { get; set; } = "Anonymous";
    public DateTime? UpdatedAt { get; init; }
    public string? UpdatedBy { get; init; }
}