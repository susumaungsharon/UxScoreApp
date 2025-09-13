using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using UXScore.Models;

namespace UXScore;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : IdentityDbContext(options)
{
    public DbSet<Project> Projects { get; set; }
    public DbSet<Evaluation> Evaluations { get; set; }
    public DbSet<CategoryScore> CategoryScores { get; set; }
    public DbSet<PerformanceMetric> PerformanceMetrics { get; set; }
    public DbSet<Category> Categories { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(800);
            entity.Property(e => e.Websites)
                .HasConversion(
                    v => string.Join(',', v ?? new string [] { }),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries));
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.CreatedBy).HasMaxLength(200);
            entity.Property(e => e.UpdatedAt).IsRequired(false);
            entity.Property(e => e.UpdatedBy).HasMaxLength(200).IsRequired(false);
        });
        
        builder.Entity<Evaluation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WebsiteUrl).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.CreatedBy).HasMaxLength(200);
            entity.Property(e => e.UpdatedAt).IsRequired(false);
            entity.Property(e => e.UpdatedBy).HasMaxLength(200).IsRequired(false);
            
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Evaluations)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(800);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        builder.Entity<CategoryScore>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Score).IsRequired();
            entity.Property(e => e.Comment).HasMaxLength(800);
            entity.Property(e => e.Annotation).HasMaxLength(800);
            
            entity.HasOne(cs => cs.Evaluation)
                .WithMany(e => e.CategoryScores)
                .HasForeignKey(cs => cs.EvaluationId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(cs => cs.Category)
                .WithMany(c => c.CategoryScores)
                .HasForeignKey(cs => cs.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PerformanceMetric>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WebsiteUrl).HasMaxLength(2000);
            entity.Property(e => e.TestLocation).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.CreatedBy).HasMaxLength(200);
            entity.Property(e => e.UpdatedAt).IsRequired(false);
            entity.Property(e => e.UpdatedBy).HasMaxLength(200).IsRequired(false);
        });

        SeedCategories(builder);
    }

    private static void SeedCategories(ModelBuilder builder)
    {
        builder.Entity<Category>().HasData(
            new Category
            {
                Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440001"),
                Name = "Navigation and Flow",
                Description = "Ease of moving through the site; menu clarity; intuitive paths to key tasks (e.g., finding listings)",
                DisplayOrder = 1,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("00839fa9-1488-4f9b-9850-d9c9b63ceb88"),
                Name = "Search and Filters",
                Description = "Effectiveness of search bar, filters, sorting options for narrowing listings",
                DisplayOrder = 2,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("cc0b54e0-9d3e-4fd7-9223-75f1f2c8aea5"),
                Name = "Visual Design",
                Description = "Aesthetics, color scheme, typography, spacing, alignment, branding consistency",
                DisplayOrder = 3,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("06315079-4387-4368-bebc-cb2c352517eb"),
                Name = "Content & Info Clarity",
                Description = "Accuracy, structure, and readability of listing details, pricing, agent info, amenities",
                DisplayOrder = 4,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("3a97b348-3fc6-4f5a-b102-1f9ad0e0a1b4"),
                Name = "Responsiveness",
                Description = "Usability and layout behavior on mobile/tablet devices/desktop; adaptive design",
                DisplayOrder = 5,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("213bbc6c-9475-4bd1-87ee-4f6815a3e63c"),
                Name = "Performance",
                Description = "Page load time, smoothness of transitions/ interactions, image loading",
                DisplayOrder = 6,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("d95bbd50-e928-4eb2-ab6d-f11b31a89a47"),
                Name = "Accessibility",
                Description = "Compliance with accessibility practices: alt text, keyboard nav, contrast, ARIA roles",
                DisplayOrder = 7,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("b8d4dedd-a754-47f5-9962-b4cb3e15ddfd"),
                Name = "Interaction Feedback",
                Description = "Feedback from buttons, hover effects, active states, error/success messages",
                DisplayOrder = 8,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("4f753930-9442-4ae4-8a57-ed5d9ad62489"),
                Name = "Help and Support Info",
                Description =
                    "Clarity of contact details, FAQs, or support resources; availability of help during navigation",
                DisplayOrder = 9,
                IsActive = true
            },
            new Category
            {
                Id = Guid.Parse("b87b16d8-67ad-409a-a804-48976c134ec1"),
                Name = "Overall Experience",
                Description =
                    "General impression, perceived ease of use, and whether the site builds trust and engagement",
                DisplayOrder = 10,
                IsActive = true
            }
        );
    }
}