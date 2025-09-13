using System.ComponentModel.DataAnnotations;

namespace UXScore.DTOs;

public class LoginDto
{
    [Required]
    public required string Username { get; init; } = string.Empty;
    
    [Required]
    public required string Password { get; init; } = string.Empty;
}