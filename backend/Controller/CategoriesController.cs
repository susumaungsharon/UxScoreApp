using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UXScore.DTOs;
using UXScore.Models;

namespace UXScore.Controller;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CategoriesController(ApplicationDbContext context) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await context.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new { c.Id, c.Name, c.Description })
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetCategoriesAdmin()
    {
        var categories = await context.Categories
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetCategory(Guid id)
    {
        var category = await context.Categories.FindAsync(id);
        if (category == null)
            return NotFound();

        return Ok(category);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryDto categoryDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var category = new Category
        {
            Name = categoryDto.Name,
            Description = categoryDto.Description,
            IsActive = categoryDto.IsActive,
            DisplayOrder = categoryDto.DisplayOrder,
        };

        context.Categories.Add(category);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] CategoryDto categoryDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var category = await context.Categories.FindAsync(id);
        if (category == null)
            return NotFound();

        category.Name = categoryDto.Name;
        category.Description = categoryDto.Description;
        category.IsActive = categoryDto.IsActive;
        category.DisplayOrder = categoryDto.DisplayOrder;

        await context.SaveChangesAsync();
        return Ok(category);
    }

    [HttpPut("{id:guid}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ToggleCategoryStatus(Guid id)
    {
        var category = await context.Categories.FindAsync(id);
        if (category == null)
            return NotFound();

        category.IsActive = !category.IsActive;

        await context.SaveChangesAsync();
        return Ok(category);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var category = await context.Categories.FindAsync(id);
        if (category == null)
            return NotFound();

        try
        {
            context.Categories.Remove(category);
            await context.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateException)
        {
            return BadRequest("Cannot delete category that is in use by evaluations.");
        }
    }
}