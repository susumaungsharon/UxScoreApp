using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UXScore.DTOs;

namespace UXScore.Controller;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class UsersController(UserManager<IdentityUser> userManager, RoleManager<IdentityRole> roleManager)
    : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await userManager.Users
            .Select(u => new
            {
                u.Id,
                u.UserName,
                u.Email,
                u.EmailConfirmed,
                u.LockoutEnabled,
                u.LockoutEnd,
                u.AccessFailedCount
            })
            .ToListAsync();

        var usersWithRoles = new List<object>();
        foreach (var user in users)
        {
            var identityUser = await userManager.FindByIdAsync(user.Id);
            if (identityUser == null) continue;
            var roles = await userManager.GetRolesAsync(identityUser);
            
            usersWithRoles.Add(new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.EmailConfirmed,
                user.LockoutEnabled,
                IsLockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow,
                user.AccessFailedCount,
                Role = roles.FirstOrDefault() ?? "Evaluator"
            });
        }

        return Ok(usersWithRoles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        var roles = await userManager.GetRolesAsync(user);

        return Ok(new
        {
            user.Id,
            user.UserName,
            user.Email,
            user.EmailConfirmed,
            user.LockoutEnabled,
            IsLockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow,
            user.AccessFailedCount,
            Role = roles.FirstOrDefault() ?? "Evaluator"
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto createUserDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (!await roleManager.RoleExistsAsync("Evaluator"))
        {
            await roleManager.CreateAsync(new IdentityRole("Evaluator"));
            await roleManager.CreateAsync(new IdentityRole("Admin"));
        }

        var user = new IdentityUser { UserName = createUserDto.Username, Email = createUserDto.Username };
        var result = await userManager.CreateAsync(user, createUserDto.Password);
        
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        await userManager.AddToRoleAsync(user, createUserDto.Role);
        
        return Ok(new { message = "User registered successfully" });
    }
   
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto updateUserDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        user.Email = updateUserDto.Username;
        user.UserName = updateUserDto.Username;
        user.EmailConfirmed = updateUserDto.EmailConfirmed;

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            foreach (var error in updateResult.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }
            return BadRequest(ModelState);
        }

        if (!string.IsNullOrEmpty(updateUserDto.Password))
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var passwordResult = await userManager.ResetPasswordAsync(user, token, updateUserDto.Password);
            if (!passwordResult.Succeeded)
            {
                foreach (var error in passwordResult.Errors)
                {
                    ModelState.AddModelError(string.Empty, error.Description);
                }
                return BadRequest(ModelState);
            }
        }

        if (!string.IsNullOrEmpty(updateUserDto.Role))
        {
            var currentRoles = await userManager.GetRolesAsync(user);
            if (currentRoles.Any())
            {
                await userManager.RemoveFromRolesAsync(user, currentRoles);
            }
            
            if (await roleManager.RoleExistsAsync(updateUserDto.Role))
            {
                await userManager.AddToRoleAsync(user, updateUserDto.Role);
            }
        }
        
        var roles = await userManager.GetRolesAsync(user);
        return Ok(new
        {
            user.Id,
            user.UserName,
            user.Email,
            user.EmailConfirmed,
            Roles = roles
        });
    }

    [HttpPut("{id}/lock")]
    public async Task<IActionResult> LockUser(string id)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        var result = await userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
        if (!result.Succeeded)
            return BadRequest("Failed to lock user");

        return Ok(new { message = "User locked successfully" });
    }

    [HttpPut("{id}/unlock")]
    public async Task<IActionResult> UnlockUser(string id)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        var result = await userManager.SetLockoutEndDateAsync(user, null);
        if (!result.Succeeded)
            return BadRequest("Failed to unlock user");

        await userManager.ResetAccessFailedCountAsync(user);

        return Ok(new { message = "User unlocked successfully" });
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetAvailableRoles()
    {
        var roles = await roleManager.Roles
            .Select(r => r.Name)
            .ToListAsync();

        return Ok(roles);
    }
}