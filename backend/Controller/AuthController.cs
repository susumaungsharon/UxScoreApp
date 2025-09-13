using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using UXScore.DTOs;

namespace UXScore.Controller;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly SignInManager<IdentityUser> _signInManager;
    private readonly IConfiguration _configuration;

    public AuthController(
        UserManager<IdentityUser> userManager,
        SignInManager<IdentityUser> signInManager,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto model)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _signInManager.PasswordSignInAsync(model.Username, model.Password, false, false);
        if (!result.Succeeded) 
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }

        var user = await _userManager.FindByNameAsync(model.Username);
        if (user == null)
        {
            return Unauthorized(new { message = "User not found" });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);
        
        return Ok(new { 
            token, 
            roles, 
            user = new { 
                id = user.Id, 
                username = user.UserName, 
                email = user.Email 
            } 
        });
    }

    private string GenerateJwtToken(IdentityUser user, IList<string> roles)
    {
        var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") 
            ?? _configuration["JwtSettings:SecretKey"]
            ?? throw new InvalidOperationException("JWT_SECRET_KEY not found");
            
        var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") 
            ?? _configuration["JwtSettings:Issuer"] 
            ?? "UXScore.API";
            
        var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") 
            ?? _configuration["JwtSettings:Audience"] 
            ?? "UXScore.Client";

        var claims = new List<Claim> 
        { 
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? throw new InvalidOperationException("Username is null")),
            new(ClaimTypes.Email, user.Email ?? throw new InvalidOperationException("Email is null"))
        };
        
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(1),
            signingCredentials: creds
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}