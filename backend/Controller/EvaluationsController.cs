using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UXScore.Models;

namespace UXScore.Controller;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class EvaluationsController(ApplicationDbContext context) : ControllerBase
{
    [HttpPost]
public async Task<IActionResult> CreateEvaluation([FromForm] IFormCollection form)
{
    try
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                          User.FindFirst(ClaimTypes.Email)?.Value ?? 
                          "Unknown";

        if (!Guid.TryParse(form["projectId"], out var projectId) || projectId == Guid.Empty)
        {
            return BadRequest(new { message = "Valid Project ID is required." });
        }

        var websiteUrl = form["websiteUrl"].ToString();
        if (string.IsNullOrEmpty(websiteUrl))
        {
            return BadRequest(new { message = "Website URL is required." });
        }

        var notes = form["notes"].ToString();

        var evaluation = new Evaluation
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            WebsiteUrl = websiteUrl,
            Notes = notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = currentUser,
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = currentUser,
            Project = null,
            CategoryScores = []
        };

        context.Evaluations.Add(evaluation);

        var categoryScoreIndex = 0;
        while (true)
        {
            var categoryIdKey = $"categoryScores[{categoryScoreIndex}].categoryId";
            var scoreKey = $"categoryScores[{categoryScoreIndex}].score";
            
            if (!form.ContainsKey(categoryIdKey) || !form.ContainsKey(scoreKey))
                break;

            if (Guid.TryParse(form[categoryIdKey], out var categoryId) && 
                int.TryParse(form[scoreKey], out var score) && 
                score is >= 1 and <= 5)
            {
                var comment = form[$"categoryScores[{categoryScoreIndex}].comment"].ToString();
                var annotation = form[$"categoryScores[{categoryScoreIndex}].annotation"].ToString();
                var screenshotKey = $"categoryScores[{categoryScoreIndex}].screenshot";

                var categoryScore = new CategoryScore
                {
                    Id = Guid.NewGuid(),
                    CategoryId = categoryId,
                    Score = score,
                    Comment = comment,
                    Annotation = annotation,
                    EvaluationId = evaluation.Id,
                    Category = null,
                    Evaluation = null
                };

                if (form.Files.Any(f => f.Name == screenshotKey))
                {
                    var screenshotFile = form.Files.First(f => f.Name == screenshotKey);
                    if (screenshotFile.Length > 0)
                    {
                        using var memoryStream = new MemoryStream();
                        await screenshotFile.CopyToAsync(memoryStream);
                        categoryScore.Screenshot = memoryStream.ToArray();
                    }
                }

                context.CategoryScores.Add(categoryScore);
            }

            categoryScoreIndex++;
        }

        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEvaluation), new { id = evaluation.Id }, new
        {
            id = evaluation.Id,
            projectId = evaluation.ProjectId,
            websiteUrl = evaluation.WebsiteUrl,
            notes = evaluation.Notes,
            createdAt = evaluation.CreatedAt,
            createdBy = evaluation.CreatedBy
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error creating evaluation: {ex.Message}");
        return StatusCode(500, new { message = "An error occurred while creating the evaluation.", error = ex.Message });
    }
}
    [HttpGet]
    public async Task<IActionResult> GetEvaluations([FromQuery] Guid projectId)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;

            var query = context.Evaluations
                .Include(e => e.CategoryScores)
                .Where(e => e.CreatedBy == currentUser || User.IsInRole("Admin"));

            if (projectId != Guid.Empty)
            {
                query = query.Where(e => e.ProjectId == projectId);
            }

            var evaluations = await query
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();

            var evaluationDtos = evaluations.Select(e => new
            {
                id = e.Id,
                projectId = e.ProjectId,
                websiteUrl = e.WebsiteUrl,
                notes = e.Notes,
                createdAt = e.CreatedAt,
                createdBy = e.CreatedBy,
                categoryScores = e.CategoryScores.Select(cs => new
                {
                    id = cs.Id,
                    categoryId = cs.CategoryId,
                    score = cs.Score,
                    comment = cs.Comment,
                    annotation = cs.Annotation,
                    screenshot = cs.Screenshot != null ? Convert.ToBase64String(cs.Screenshot) : null
                }).ToList()
            }).ToList();

            return Ok(evaluationDtos);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching evaluations: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while fetching evaluations.", error = ex.Message });
        }
    }
    
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEvaluation(Guid id)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;

            var evaluation = await context.Evaluations
                .Include(e => e.CategoryScores)
                .FirstOrDefaultAsync(e => e.Id == id && (e.CreatedBy == currentUser || User.IsInRole("Admin")));

            if (evaluation == null)
                return NotFound(new { message = "Evaluation not found" });

            var evaluationDto = new
            {
                id = evaluation.Id,
                projectId = evaluation.ProjectId,
                websiteUrl = evaluation.WebsiteUrl,
                notes = evaluation.Notes,
                createdAt = evaluation.CreatedAt,
                createdBy = evaluation.CreatedBy,
                categoryScores = evaluation.CategoryScores.Select(cs => new
                {
                    id = cs.Id,
                    categoryId = cs.CategoryId,
                    score = cs.Score,
                    comment = cs.Comment,
                    annotation = cs.Annotation,
                    screenshot = cs.Screenshot != null ? Convert.ToBase64String(cs.Screenshot) : null
                }).ToList()
            };

            return Ok(evaluationDto);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching evaluation: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while fetching the evaluation.", error = ex.Message });
        }
    }

   [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEvaluation(Guid id, [FromForm] IFormCollection form)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;

            var evaluation = await context.Evaluations
                .Include(e => e.CategoryScores)
                .Include(e => e.Project)
                .FirstOrDefaultAsync(e => e.Id == id && (e.CreatedBy == currentUser || User.IsInRole("Admin")));

            if (evaluation == null)
                return NotFound(new { message = "Evaluation not found" });

            var existingScreenshots = evaluation.CategoryScores
                .Where(cs => cs.Screenshot != null)
                .ToDictionary(cs => cs.CategoryId, cs => new { cs.Screenshot, cs.Annotation });

            var websiteUrl = form["websiteUrl"].ToString();
            var notes = form["notes"].ToString();

            if (!string.IsNullOrEmpty(websiteUrl))
            {
                evaluation.WebsiteUrl = websiteUrl;
            }
            evaluation.Notes = notes;
            evaluation.UpdatedAt = DateTime.UtcNow;
            evaluation.UpdatedBy = currentUser;

            context.CategoryScores.RemoveRange(evaluation.CategoryScores);

            var categoryScoreIndex = 0;
            while (true)
            {
                var categoryIdKey = $"categoryScores[{categoryScoreIndex}].categoryId";
                var scoreKey = $"categoryScores[{categoryScoreIndex}].score";
                
                if (!form.ContainsKey(categoryIdKey) || !form.ContainsKey(scoreKey))
                    break;

                if (Guid.TryParse(form[categoryIdKey], out var categoryId) && 
                    int.TryParse(form[scoreKey], out var score) && 
                    score is >= 1 and <= 5)
                {
                    var comment = form[$"categoryScores[{categoryScoreIndex}].comment"].ToString();
                    var annotation = form[$"categoryScores[{categoryScoreIndex}].annotation"].ToString();
                    var screenshotKey = $"categoryScores[{categoryScoreIndex}].screenshot";

                    var categoryScore = new CategoryScore
                    {
                        Id = Guid.NewGuid(),
                        CategoryId = categoryId,
                        Score = score,
                        Comment = comment,
                        Annotation = annotation,
                        EvaluationId = evaluation.Id,
                        Category = null,
                        Evaluation = null
                    };

                    if (form.Files.Any(f => f.Name == screenshotKey))
                    {
                        var screenshotFile = form.Files.First(f => f.Name == screenshotKey);
                        if (screenshotFile.Length > 0)
                        {
                            using var memoryStream = new MemoryStream();
                            await screenshotFile.CopyToAsync(memoryStream);
                            categoryScore.Screenshot = memoryStream.ToArray();
                        }
                    }
                    else if (existingScreenshots.ContainsKey(categoryId))
                    {
                        categoryScore.Screenshot = existingScreenshots[categoryId].Screenshot;
                        if (string.IsNullOrEmpty(annotation) && !string.IsNullOrEmpty(existingScreenshots[categoryId].Annotation))
                        {
                            categoryScore.Annotation = existingScreenshots[categoryId].Annotation;
                        }
                    }

                    context.CategoryScores.Add(categoryScore);
                }

                categoryScoreIndex++;
            }

            await context.SaveChangesAsync();
            return Ok(new { message = "Evaluation updated successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error updating evaluation: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while updating the evaluation.", error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEvaluation(Guid id)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;

            var evaluation = await context.Evaluations
                .Include(e => e.CategoryScores)
                .FirstOrDefaultAsync(e => e.Id == id && (e.CreatedBy == currentUser || User.IsInRole("Admin")));

            if (evaluation == null)
                return NotFound(new { message = "Evaluation not found" });

            context.Evaluations.Remove(evaluation);
            await context.SaveChangesAsync();

            return Ok(new { message = "Evaluation deleted successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting evaluation: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while deleting the evaluation.", error = ex.Message });
        }
    }
}