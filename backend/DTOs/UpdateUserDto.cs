using System.ComponentModel.DataAnnotations;

namespace UXScore.DTOs;

public class UpdateUserDto
{
    [Required]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;
    
    public string Role { get; set; } = "Evaluator";

    public bool EmailConfirmed { get; set; } = true;
}